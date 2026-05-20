import { query } from '../../db.js'
import { generateInvoicePdfBase64 } from '../generateInvoicePdf.js'

const EVENT_BASE = 'https://rthxlprgtfuhntpcdhsh.supabase.co/functions/v1/trigger-automation'
const AUTOMATION_SECRET = process.env.AUTOMATION_SECRET || ''

async function getInvoiceTemplateForBranch(branch) {
  try {
    if (!branch) return null
    const users = await query('users', q =>
      q.select('invoice_template').eq('branch_id', branch).limit(1)
    )
    if (users && users.length > 0 && users[0].invoice_template) {
      const raw = users[0].invoice_template
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    }
  } catch (err) {
    console.error('[processor] Failed to fetch invoice template:', err)
  }
  return null
}

export async function processPayment(webhookData) {
  const { transactionId, status, grossAmount, buyerEmail, gateway } = webhookData

  // Find the transaction
  const rows = await query('SELECT * FROM transactions WHERE transaction_id = ?', [transactionId])
  if (rows.length === 0) {
    console.log(`[webhook] Transaction not found: ${transactionId}`)
    return { processed: false, reason: 'not_found' }
  }

  const txn = rows[0]
  const oldStatus = txn.status
  const newStatus = mapToCrmStatus(status)

  if (!newStatus || newStatus === oldStatus) {
    return { processed: false, reason: 'no_change' }
  }

  // Update the transaction
  if (newStatus === 'paid') {
    await query(
      'UPDATE transactions SET status = ?, purchased_at = NOW(), payment_method = ?, payment_detail = ? WHERE transaction_id = ?',
      [newStatus, gateway, 'Paid via ' + gateway, transactionId]
    )
  } else if (newStatus === 'cancelled') {
    // Reset to available (same as deleteInvoice logic)
    await query(
      "UPDATE transactions SET status = 'available', transaction_id = CONCAT('TKT-AVAIL-', unique_code), buyer_name = '', buyer_email = '', buyer_phone = '', payment_method = '', payment_detail = '', purchased_at = NULL, expires_at = NULL WHERE transaction_id = ?",
      [transactionId]
    )
  }

  // Fire trigger-automation event
  if (newStatus === 'paid' && oldStatus !== 'paid') {
    try {
      // Fetch invoice template to include in trigger payload
      const invoiceTemplate = await getInvoiceTemplateForBranch(txn.branch)

      // Generate PDF attachment
      let pdfBase64 = null
      try {
        const dt = txn.purchased_at ? new Date(txn.purchased_at) : new Date(txn.created_at)
        const invoice = {
          transactionId: txn.transaction_id,
          dateTime: dt.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }),
          itemCode: txn.unique_code || '',
          itemName: '',
          quantity: txn.quantity || 1,
          pricePerUnit: Number(txn.price_per_unit || 0),
          totalAmount: Number(txn.total_amount || 0),
          customerName: txn.buyer_name || '',
          customerEmail: txn.buyer_email || '',
          customerPhone: txn.buyer_phone || '',
          paymentMethod: txn.payment_method || '',
          paymentDetail: txn.payment_detail || '',
          status: newStatus,
        }
        pdfBase64 = await generateInvoicePdfBase64(invoice, invoiceTemplate)
      } catch (pdfErr) {
        console.error('[webhook] Failed to generate PDF:', pdfErr)
      }

      const headers = { 'Content-Type': 'application/json' }
      if (AUTOMATION_SECRET) headers['apikey'] = AUTOMATION_SECRET
      await fetch(`${EVENT_BASE}?event=invoice.paid`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contact_email: buyerEmail || txn.buyer_email || '',
          contact_name: txn.buyer_name || '',
          data: {
            invoice_id: transactionId,
            amount: grossAmount || txn.total_amount || 0,
            buyer_email: buyerEmail || txn.buyer_email || '',
            buyer_name: txn.buyer_name || '',
            payment_method: txn.payment_method || '',
            payment_detail: txn.payment_detail || '',
            total_amount: txn.total_amount || 0,
            price_per_unit: txn.price_per_unit || 0,
            quantity: txn.quantity || 1,
            unique_code: txn.unique_code || '',
            transaction_id: txn.transaction_id || '',
          },
          ...(invoiceTemplate ? { invoice_template: invoiceTemplate } : {}),
          ...(pdfBase64 ? { pdf_attachment: { filename: `Invoice-${transactionId}.pdf`, content: pdfBase64 } } : {}),
        }),
      })
    } catch (err) {
      console.error('[webhook] Failed to fire automation:', err)
    }
  }

  return { processed: true, oldStatus, newStatus }
}

function mapToCrmStatus(gatewayStatus) {
  const paidStatuses = ['settlement', 'capture', 'success', 'completed', 'paid']
  const cancelledStatuses = ['expire', 'cancel', 'deny', 'failure', 'failed', 'refund', 'chargeback']

  const s = (gatewayStatus || '').toLowerCase()
  if (paidStatuses.includes(s)) return 'paid'
  if (cancelledStatuses.includes(s)) return 'cancelled'
  return null
}
