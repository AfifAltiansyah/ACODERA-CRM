import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || 'https://acodera-crm.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'noreply@acodera.com'
const AUTOMATION_SECRET = Deno.env.get('AUTOMATION_SECRET')

const BANK_OPTIONS = [
  { value: 'bca', label: 'BCA', accountNumber: '81934138145' },
  { value: 'bri', label: 'BRI', accountNumber: '0819341381450' },
  { value: 'bni', label: 'BNI', accountNumber: '0819341381451' },
]

const EWALLET_OPTIONS = [
  { value: 'dana', label: 'Dana' },
  { value: 'shopeepay', label: 'ShopeePay' },
  { value: 'linkaja', label: 'LinkAja' },
  { value: 'ovo', label: 'OVO' },
]

const E_WALLET_PHONE = '081934138145'

function getPaymentDetail(method: string, detail: string, companyName: string) {
  if (method === 'qr_code') return { label: 'QR Code', detail: 'Scan QR code to pay' }
  if (method === 'bank_transfer' && detail) {
    const bank = BANK_OPTIONS.find(b => b.value === detail)
    return bank ? { label: `Bank ${bank.label}`, detail: `${bank.accountNumber} - ${companyName}` } : null
  }
  if (method === 'e_wallet' && detail) {
    const ew = EWALLET_OPTIONS.find(e => e.value === detail)
    return ew ? { label: ew.label, detail: `${E_WALLET_PHONE} - ${companyName}` } : null
  }
  return null
}

function generateInvoiceHtml(txn: any, template: any, statusLabel: string) {
  const tpl = template || {}
  const companyName = tpl.companyName ?? 'Acodera CRM'
  const accent = tpl.accentColor || '#1e40af'
  const logoSrc = tpl.logoUrl || ''
  const logoInitial = tpl.logoInitial ?? companyName.charAt(0)
  const address = tpl.address || ''
  const email = tpl.email || SENDER_EMAIL
  const phone = tpl.phone || ''
  const website = tpl.website || ''
  const footerText = tpl.footerText || 'Thank you for your business!'
  const taxRate = tpl.taxRate || 0
  const cur = tpl.currencySymbol || '$'

  const customerName = txn.buyer_name || 'Walk-in Customer'
  const customerEmail = txn.buyer_email || ''
  const customerPhone = txn.buyer_phone || ''
  const paymentDetail = getPaymentDetail(txn.payment_method || '', txn.payment_detail || '', companyName)
  const taxAmount = (txn.total_amount || 0) * (taxRate / 100)
  const totalWithTax = (txn.total_amount || 0) + taxAmount

  const statusColor = statusLabel === 'Paid' ? '#16a34a' : statusLabel === 'Cancelled' ? '#dc2626' : '#ca8a04'

  let paymentInfoHtml = ''
  if (paymentDetail) {
    paymentInfoHtml = `
      <div style="text-align:right;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Payment Details</p>
        <p style="margin:0;font-size:14px;color:#334155;"><strong>Method:</strong> ${paymentDetail.label}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#334155;"><strong>Info:</strong> ${paymentDetail.detail}</p>
      </div>`
  }

  const itemCode = txn.unique_code || txn.transaction_id || '-'
  const itemName = txn.item_name || txn.ticket_title || 'Invoice Item'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${txn.transaction_id || ''}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:794px;margin:0 auto;background:#fff;padding:48px 56px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid ${accent};margin-bottom:32px;">
    <div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        ${logoSrc
          ? `<img src="${logoSrc}" alt="Logo" style="width:auto;height:auto;max-width:120px;max-height:60px;object-fit:contain;" />`
          : (logoInitial ? `<div style="width:40px;height:40px;border-radius:8px;background:${accent};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:18px;">${logoInitial}</div>` : '')
        }
        ${companyName ? `<h1 style="margin:0;font-size:22px;font-weight:700;color:${accent};">${companyName}</h1>` : ''}
      </div>
      ${address ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;">${address}</p>` : ''}
      <p style="margin:2px 0 0;font-size:13px;color:#64748b;">${email}${phone ? ' | ' + phone : ''}</p>
    </div>
    <div style="text-align:right;">
      <h2 style="margin:0;font-size:24px;font-weight:700;color:${accent};letter-spacing:1px;">INVOICE</h2>
      <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#334155;">${txn.transaction_id || ''}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Date: ${txn.purchased_at ? new Date(txn.purchased_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}</p>
      <span style="display:inline-block;margin-top:8px;padding:4px 16px;border-radius:9999px;font-size:12px;font-weight:600;color:${statusColor};background:${statusColor}15;border:1px solid ${statusColor}30;">${statusLabel}</span>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:32px;">
    <div>
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Bill To</p>
      <p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">${customerName}</p>
      ${customerEmail ? `<p style="margin:4px 0 0;font-size:14px;color:#64748b;">${customerEmail}</p>` : ''}
      ${customerPhone ? `<p style="margin:4px 0 0;font-size:14px;color:#64748b;">${customerPhone}</p>` : ''}
    </div>
    ${paymentInfoHtml}
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:2px solid #e2e8f0;">Item</th>
        <th style="padding:12px 16px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:2px solid #e2e8f0;">Qty</th>
        <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:2px solid #e2e8f0;">Price/Unit</th>
        <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:2px solid #e2e8f0;">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:16px;font-size:14px;border-bottom:1px solid #e2e8f0;">${itemName}</td>
        <td style="padding:16px;font-size:14px;text-align:center;border-bottom:1px solid #e2e8f0;">${txn.quantity || 1}</td>
        <td style="padding:16px;font-size:14px;text-align:right;border-bottom:1px solid #e2e8f0;">${cur}${Number(txn.price_per_unit || txn.total_amount || 0).toLocaleString()}</td>
        <td style="padding:16px;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #e2e8f0;">${cur}${Number(txn.total_amount || 0).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
    <div style="width:260px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#64748b;">
        <span>Subtotal</span>
        <span>${cur}${Number(txn.total_amount || 0).toLocaleString()}</span>
      </div>
      ${taxRate > 0 ? `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#64748b;">
        <span>Tax (${taxRate}%)</span>
        <span>${cur}${taxAmount.toLocaleString()}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:12px 0;margin-top:8px;border-top:2px solid ${accent};font-size:18px;font-weight:700;color:${accent};">
        <span>Total Due</span>
        <span>${cur}${totalWithTax.toLocaleString()}</span>
      </div>
    </div>
  </div>

  <div style="text-align:center;padding-top:24px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">${footerText} | ${companyName}${website ? ' | ' + website : ''}</p>
  </div>
</div>
</body>
</html>`
}

function generateInvoiceReminderHtml(txn: any, template: any, statusLabel: string) {
  const tpl = template || {}
  const companyName = tpl.companyName ?? 'Acodera CRM'
  const accent = tpl.accentColor || '#1e40af'
  const logoSrc = tpl.logoUrl || ''
  const logoInitial = tpl.logoInitial ?? companyName.charAt(0)
  const address = tpl.address || ''
  const email = tpl.email || SENDER_EMAIL
  const phone = tpl.phone || ''
  const website = tpl.website || ''
  const footerText = tpl.footerText || 'Thank you for your business!'
  const taxRate = tpl.taxRate || 0
  const taxAmount = (txn.total_amount || 0) * (taxRate / 100)
  const totalWithTax = (txn.total_amount || 0) + taxAmount
  const cur = tpl.currencySymbol || '$'

  const customerName = txn.buyer_name || 'Customer'
  const paymentDetail = getPaymentDetail(txn.payment_method || '', txn.payment_detail || '', companyName)
  const itemName = txn.item_name || txn.unique_code || 'Invoice Item'

  let paymentInfoHtml = ''
  if (paymentDetail) {
    paymentInfoHtml = `
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;width:140px;">Payment Method</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${paymentDetail.label}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;">Payment Details</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${paymentDetail.detail}</td>
      </tr>`
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payment Reminder - ${txn.transaction_id || ''}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:794px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:${accent};padding:24px 40px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${logoSrc
        ? `<img src="${logoSrc}" alt="Logo" style="width:auto;height:auto;max-width:100px;max-height:48px;object-fit:contain;" />`
        : (logoInitial ? `<div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:16px;">${logoInitial}</div>` : '')
      }
      ${companyName ? `<span style="color:#fff;font-size:18px;font-weight:700;">${companyName}</span>` : ''}
    </div>
    <span style="color:rgba(255,255,255,0.85);font-size:14px;">Payment Reminder</span>
  </div>
  <div style="padding:32px 40px;">
    <p style="margin:0 0 24px;font-size:15px;color:#334155;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">This is a reminder that your payment for <strong style="color:#0f172a;">${itemName}</strong> is still pending. Please complete your payment at your earliest convenience.</p>
    <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:24px;">
      <div style="background:${accent};padding:12px 16px;">
        <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#fff;">Invoice Details</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;width:140px;">Invoice ID</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${txn.transaction_id || ''}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;">Date</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;">Quantity</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${txn.quantity || 1}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;">Subtotal</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${cur}${Number(txn.total_amount || 0).toLocaleString()}</td>
        </tr>
        ${taxRate > 0 ? `<tr>
          <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;">Tax (${taxRate}%)</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${cur}${taxAmount.toLocaleString()}</td>
        </tr>` : ''}
        ${paymentInfoHtml}
      </table>
      <div style="padding:16px;background:${accent}10;border-top:2px solid ${accent};display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:16px;font-weight:700;color:${accent};">Total Due</span>
        <span style="font-size:20px;font-weight:700;color:${accent};">${cur}${totalWithTax.toLocaleString()}</span>
      </div>
    </div>
    <div style="text-align:center;padding:16px;background:#fef2f2;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;font-weight:600;color:#dc2626;">Status: ${statusLabel}</p>
    </div>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.5;">If you have already made this payment, please disregard this reminder. For any questions or concerns, feel free to reply to this email.</p>
  </div>
  <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
    ${address ? `<p style="margin:0 0 4px;font-size:11px;color:#94a3b8;">${address}</p>` : ''}
    <p style="margin:0;font-size:12px;color:#94a3b8;">${footerText} | ${companyName} | ${email}${phone ? ' | ' + phone : ''}${website ? ' | ' + website : ''}</p>
  </div>
</div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (AUTOMATION_SECRET) {
      const auth = req.headers.get('authorization')
      if (auth !== `Bearer ${AUTOMATION_SECRET}`) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const url = new URL(req.url)
    const event = url.searchParams.get('event')

    if (!event) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing ?event= parameter' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty body ok */ }

    const contactEmail = (body.contact_email as string) || ''
    const contactName = (body.contact_name as string) || ''
    const extraData: Record<string, unknown> = (body.data as Record<string, unknown>) || {}
    const attachment: Record<string, string> | undefined = body.attachment as Record<string, string> | undefined
    const pdfAttachment: Record<string, string> | undefined = body.pdf_attachment as Record<string, string> | undefined
    const payloadTemplate: Record<string, unknown> | undefined = body.invoice_template as Record<string, unknown> | undefined

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Supabase credentials not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: automations, error: fetchError } = await supabase
      .from('automations')
      .select('*')
      .eq('trigger_event', event)
      .eq('status', 'active')

    if (fetchError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to query automations: ' + fetchError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!automations || automations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, event, message: 'No active automations for this event', triggered: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const auto of automations) {
      const isEmail = auto.type === 'Email Drip' || auto.type === 'Marketing Campaign' || auto.type === 'Invoice Reminder'
      let recipients: string[] = []

      if (contactEmail) {
        recipients = [contactEmail]
      } else if (auto.type === 'Invoice Reminder' || event === 'invoice.overdue' || event === 'invoice.paid') {
        if (extraData.buyer_email) {
          recipients = [String(extraData.buyer_email)]
        } else {
          const { data: invoices, error: invErr } = await supabase
            .from('transactions')
            .select('buyer_email')
            .eq('status', 'pending')
          if (!invErr && invoices) {
            const seen = new Set()
            recipients = invoices.map((i: { buyer_email: string }) => i.buyer_email).filter((e: string) => e && e.trim() !== '' && !seen.has(e) && seen.add(e))
          }
        }
      } else if (isEmail || event === 'contact.created' || event === 'contact.updated' || event === 'contact.subscribed') {
        const { data: contacts, error: conErr } = await supabase
          .from('contacts')
          .select('email')
        if (!conErr && contacts) {
          const seen = new Set()
          if (contactEmail) {
            recipients = [contactEmail]
          } else {
            recipients = contacts.map((c: { email: string }) => c.email).filter((e: string) => e && e.trim() !== '' && !seen.has(e) && seen.add(e))
          }
        }
      } else if (event === 'ticket.purchased') {
        if (extraData.buyer_email) {
          recipients = [String(extraData.buyer_email)]
        }
      } else if (event === 'deal.won' || event === 'deal.lost' || event === 'deal.stage_change' || event === 'deal.created') {
        if (extraData.email) {
          recipients = [String(extraData.email)]
        }
      } else if (event === 'review.submitted') {
        if (extraData.email) {
          recipients = [String(extraData.email)]
        }
      }

      if (recipients.length === 0 && isEmail) {
        results.push({ automation_id: auto.id, name: auto.name, status: 'skipped', reason: 'No recipients' })
        continue
      }

      let subject = auto.subject || `Notification: ${event}`
      let htmlBody = auto.body || `<p>${subject}</p>`
      const fromName = auto.from_name || 'Acodera CRM'

      // For invoice events, fetch actual transaction data and generate invoice preview
      const isInvoiceEvent = event === 'invoice.paid' || event === 'invoice.overdue'
      let invoiceTemplate: any = payloadTemplate || null
      let txnData: any = null

      if (isInvoiceEvent && extraData.invoice_id) {
        try {
          const { data: txns } = await supabase
            .from('transactions')
            .select('*')
            .eq('transaction_id', String(extraData.invoice_id))
            .limit(1)

          if (txns && txns.length > 0) {
            txnData = txns[0]

            // Only fetch from DB if not provided in payload
            if (!invoiceTemplate && txnData.branch) {
              try {
                const { data: users, error: tplErr } = await supabase
                  .from('users')
                  .select('invoice_template')
                  .eq('branch_id', txnData.branch)
                  .limit(1)
                if (!tplErr && users && users.length > 0) {
                  const raw = users[0].invoice_template
                  if (raw) {
                    invoiceTemplate = typeof raw === 'string' ? JSON.parse(raw) : raw
                  }
                }
              } catch (e) {
                console.error('Failed to fetch invoice template:', e)
              }
            }

            const statusLabel = event === 'invoice.paid' ? 'Paid' : 'Pending'

            // Generate invoice HTML if no custom body is set, or as fallback
            if (!auto.body || auto.body.trim() === '') {
              if (event === 'invoice.overdue' || auto.type === 'Invoice Reminder') {
                htmlBody = generateInvoiceReminderHtml(txnData, invoiceTemplate, statusLabel)
              } else {
                htmlBody = generateInvoiceHtml(txnData, invoiceTemplate, statusLabel)
              }
              subject = auto.subject || (event === 'invoice.paid'
                ? `Payment Received - ${txnData.transaction_id}`
                : `Payment Reminder - ${txnData.transaction_id}`)
            }
          }
        } catch (err) {
          console.error('Failed to fetch invoice data:', err)
        }
      }

      // Apply template variable replacement
      const tpl = invoiceTemplate || {}
      htmlBody = htmlBody.replace(/\{\{name\}\}/g, (txnData?.buyer_name || contactName || 'Customer'))
      htmlBody = htmlBody.replace(/\{\{email\}\}/g, (txnData?.buyer_email || contactEmail || ''))
      htmlBody = htmlBody.replace(/\{\{event\}\}/g, event)
      htmlBody = htmlBody.replace(/\{\{companyInitial\}\}/g, (tpl.logoInitial || 'A'))
      htmlBody = htmlBody.replace(/\{\{companyName\}\}/g, (tpl.companyName || 'Acodera CRM'))
      htmlBody = htmlBody.replace(/\{\{companyAddress\}\}/g, (tpl.address || 'Indonesia'))
      htmlBody = htmlBody.replace(/\{\{companyEmail\}\}/g, (tpl.email || SENDER_EMAIL))
      htmlBody = htmlBody.replace(/\{\{companyPhone\}\}/g, (tpl.phone || '+62 21 555 0100'))
      htmlBody = htmlBody.replace(/\{\{companyWebsite\}\}/g, (tpl.website || 'https://acodera.com'))
      htmlBody = htmlBody.replace(/\{\{invoiceStatus\}\}/g, event === 'invoice.paid' ? 'Paid' : event === 'invoice.overdue' ? 'Overdue' : 'Pending')
      htmlBody = htmlBody.replace(/\{\{invoiceDate\}\}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }))
      htmlBody = htmlBody.replace(/\{\{paymentMethod\}\}/g, (txnData?.payment_method || extraData.paymentMethod ? String(extraData.paymentMethod) : '—'))
      htmlBody = htmlBody.replace(/\{\{paymentDetail\}\}/g, (txnData?.payment_detail || extraData.paymentDetail ? String(extraData.paymentDetail) : '—'))
      htmlBody = htmlBody.replace(/\{\{itemName\}\}/g, (txnData?.item_name || extraData.invoice_id ? `Invoice ${extraData.invoice_id}` : 'Item'))
      htmlBody = htmlBody.replace(/\{\{quantity\}\}/g, String(txnData?.quantity || 1))
      htmlBody = htmlBody.replace(/\{\{pricePerUnit\}\}/g, (txnData?.price_per_unit ? String(txnData.price_per_unit) : extraData.amount ? String(extraData.amount) : '—'))
      htmlBody = htmlBody.replace(/\{\{buyer_phone\}\}/g, (txnData?.buyer_phone || '—'))
      htmlBody = htmlBody.replace(/\{\{transactionId\}\}/g, (txnData?.transaction_id || String(extraData.invoice_id || '')))
      htmlBody = htmlBody.replace(/\{\{totalAmount\}\}/g, (txnData?.total_amount ? String(txnData.total_amount) : extraData.amount ? String(extraData.amount) : '0'))
      htmlBody = htmlBody.replace(/\{\{itemCode\}\}/g, (txnData?.unique_code || '—'))
      htmlBody = htmlBody.replace(/\{\{taxAmount\}\}/g, (tpl.taxRate && txnData?.total_amount ? String(Number(txnData.total_amount) * (Number(tpl.taxRate) / 100)) : '0'))
      htmlBody = htmlBody.replace(/\{\{totalWithTax\}\}/g, (tpl.taxRate && txnData?.total_amount ? String(Number(txnData.total_amount) + Number(txnData.total_amount) * (Number(tpl.taxRate) / 100)) : String(txnData?.total_amount || '0')))
      for (const [key, val] of Object.entries(extraData)) {
        if (typeof val === 'string' || typeof val === 'number') {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
          htmlBody = htmlBody.replace(regex, String(val))
          subject = subject.replace(regex, String(val))
        }
      }

      if (isEmail && BREVO_API_KEY) {
        let sent = 0
        let failed = 0
        for (const email of recipients) {
          try {
            const emailResp = await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sender: { name: fromName, email: SENDER_EMAIL },
                to: [{ email }],
                subject,
                htmlContent: htmlBody,
                ...(attachment ? { attachment: [attachment] } : {}),
                ...(pdfAttachment ? { attachment: [...(attachment ? [attachment] : []), pdfAttachment] } : {}),
              }),
            })
            const emailData = await emailResp.json()
            if (emailResp.ok) {
              sent++
              await supabase.from('automation_logs').insert([{
                automation_id: auto.id,
                contact_email: email,
                subject,
                status: 'sent',
              }])
            } else {
              failed++
              await supabase.from('automation_logs').insert([{
                automation_id: auto.id,
                contact_email: email,
                subject,
                status: 'failed',
                error: emailData.message || JSON.stringify(emailData),
              }])
            }
          } catch (err) {
            failed++
            await supabase.from('automation_logs').insert([{
              automation_id: auto.id,
              contact_email: email,
              subject,
              status: 'failed',
              error: err.message,
            }])
          }
        }
        results.push({ automation_id: auto.id, name: auto.name, status: 'sent', sent, failed })
      } else if (isEmail && !BREVO_API_KEY) {
        results.push({ automation_id: auto.id, name: auto.name, status: 'skipped', reason: 'BREVO_API_KEY not set' })
      } else {
        for (const email of recipients) {
          await supabase.from('automation_logs').insert([{
            automation_id: auto.id,
            contact_email: email,
            subject,
            status: 'triggered',
          }])
        }
        results.push({ automation_id: auto.id, name: auto.name, status: 'triggered', recipients: recipients.length })
      }
    }

    return new Response(
      JSON.stringify({ success: true, event, triggered: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})