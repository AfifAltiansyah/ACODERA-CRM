import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { getPaymentDetail } from './paymentOptions.ts'

const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'noreply@acodera.com'

const DEFAULT_TEMPLATE = {
  companyName: 'Acodera CRM', logoInitial: 'A', logoUrl: '',
  accentColor: '#1e40af', address: 'Jl. Sudirman No. 123, Jakarta 10220',
  email: 'noreply@acodera.com', phone: '021-1234-5678',
  website: 'acodera-crm.netlify.app', footerText: 'Thank you for your business!',
  taxRate: 0, currencySymbol: 'Rp',
}

function resolveTemplate(template: any) {
  const tpl = { ...DEFAULT_TEMPLATE, ...(template || {}) }
  if (tpl.companyName === null || tpl.companyName === undefined) tpl.companyName = DEFAULT_TEMPLATE.companyName
  return tpl
}

function invoiceLineItems(txn: any) {
  if (Array.isArray(txn.lineItems) && txn.lineItems.length > 0) {
    return txn.lineItems.map((item: any) => ({
      name: item.name || txn.item_name || txn.ticket_title || 'Invoice Item',
      code: item.code || item.unique_code || '-',
      quantity: Number(item.quantity || 1),
      price: Number(item.price_per_unit ?? item.pricePerUnit ?? txn.price_per_unit ?? 0),
      total: Number(item.total_amount ?? item.totalAmount ?? item.price_per_unit ?? item.pricePerUnit ?? txn.price_per_unit ?? 0),
    }))
  }

  return [{
    name: txn.item_name || txn.ticket_title || 'Invoice Item',
    code: txn.itemCode || txn.unique_code || txn.transaction_id || '-',
    quantity: Number(txn.quantity || 1),
    price: Number(txn.price_per_unit || txn.total_amount || 0),
    total: Number(txn.total_amount || 0),
  }]
}

function invoiceSummaryItem(txn: any) {
  const lineItems = invoiceLineItems(txn)
  const code = txn.itemCode || lineItems.map((item) => item.code).join(', ') || txn.unique_code || txn.transaction_id || '-'
  return {
    name: txn.item_name || txn.ticket_title || lineItems[0]?.name || 'Invoice Item',
    code,
    quantity: Number(txn.quantity || lineItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0) || 1),
    price: Number(txn.price_per_unit || lineItems[0]?.price || 0),
    total: Number(txn.total_amount || lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0)),
  }
}

function summarizeInvoiceRows(rows: any[], ticket?: any) {
  if (!rows || rows.length === 0) return null
  const first = rows[0]
  const ticketTitle = ticket?.title || first.item_name || first.ticket_title || ''
  const lineItems = rows.map((row) => ({
    name: ticketTitle || row.item_name || row.ticket_title || 'Invoice Item',
    code: row.unique_code || row.itemCode || '-',
    quantity: Number(row.quantity || 1),
    price_per_unit: Number(row.price_per_unit || 0),
    total_amount: Number(row.total_amount || row.price_per_unit || 0),
    barcode: row.barcode || '',
  }))
  const quantity = lineItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0)
  const totalAmount = lineItems.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)

  return {
    ...first,
    quantity,
    total_amount: totalAmount,
    price_per_unit: Number(first.price_per_unit || 0),
    itemCode: lineItems.map((item) => item.code).join(', '),
    unique_code: first.unique_code,
    item_name: ticketTitle || first.item_name || first.ticket_title || '',
    ticket_title: ticketTitle || first.ticket_title || '',
    lineItems,
  }
}

export async function normalizeInvoiceByTransactionId(supabase: any, transactionId: string) {
  const { data: rows, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('transaction_id', String(transactionId))
    .order('unique_code', { ascending: true })

  if (error) throw error
  if (!rows || rows.length === 0) return null

  let ticket: any = null
  const ticketId = rows[0].ticket_id
  if (ticketId) {
    const { data } = await supabase
      .from('tickets')
      .select('title, abbreviation')
      .eq('id', ticketId)
      .single()
    ticket = data || null
  }

  return summarizeInvoiceRows(rows, ticket)
}

export function generateInvoiceHtml(
  txn: any, template: any, statusLabel: string, branchId?: string
) {
  const tpl = resolveTemplate(template)
  const companyName = tpl.companyName
  const accent = tpl.accentColor
  const logoSrc = tpl.logoUrl
  const logoInitial = tpl.logoInitial ?? companyName.charAt(0)
  const address = tpl.address
  const email = tpl.email || SENDER_EMAIL
  const phone = tpl.phone
  const website = tpl.website
  const footerText = tpl.footerText
  const taxRate = tpl.taxRate
  const cur = tpl.currencySymbol
  const customerName = txn.buyer_name || 'Walk-in Customer'
  const customerEmail = txn.buyer_email || ''
  const customerPhone = txn.buyer_phone || ''
  const paymentDetail = getPaymentDetail(txn.payment_method || '', txn.payment_detail || '', companyName, branchId)
  const taxAmount = (txn.total_amount || 0) * (taxRate / 100)
  const totalWithTax = (txn.total_amount || 0) + taxAmount
  const statusColor = statusLabel === 'Paid' ? '#16a34a' : statusLabel === 'Cancelled' ? '#dc2626' : '#ca8a04'
  const summaryItem = invoiceSummaryItem(txn)
  const ticketName = txn.item_name || txn.ticket_title || ''
  const ticketNameHtml = ticketName
    ? `<tr><td style="padding:12px 24px;background:#f0f7ff;border-left:3px solid #3b82f6;"><p style="margin:0;font-size:13px;color:#1e40af;"><strong>Ticket:</strong> ${ticketName}</p></td></tr>`
    : ''
  const itemRowsHtml = `
    <tr>
      <td style="padding:14px 16px;font-size:13px;border-bottom:1px solid #e5e7eb;word-break:break-word;">${summaryItem.name ? `<div style="font-weight:600;color:#111827;margin-bottom:2px;">${summaryItem.name}</div>` : ''}<span style="font-size:11px;color:#6b7280;font-family:monospace;">${summaryItem.code}</span></td>
      <td style="padding:14px 16px;font-size:13px;text-align:center;border-bottom:1px solid #e5e7eb;color:#374151;">${summaryItem.quantity}</td>
      <td style="padding:14px 16px;font-size:13px;text-align:right;border-bottom:1px solid #e5e7eb;color:#374151;">${cur}${Number(summaryItem.price || 0).toLocaleString()}</td>
      <td style="padding:14px 16px;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;color:#111827;">${cur}${Number(summaryItem.total || 0).toLocaleString()}</td>
    </tr>`

  let paymentInfoHtml = ''
  if (paymentDetail) {
    paymentInfoHtml = `
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;width:130px;">Payment Method</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${paymentDetail.label}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Payment Info</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${paymentDetail.detail}</td>
      </tr>`
  }

  return `<table role="presentation" style="width:100%;border-collapse:collapse;background:#f9fafb;" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:24px 16px;">
<table role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;border-collapse:collapse;border:1px solid #e5e7eb;" cellpadding="0" cellspacing="0" border="0">

  <!-- Header -->
  <tr>
    <td style="padding:24px 24px 20px;border-bottom:3px solid ${accent};">
      <table role="presentation" style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:55%;vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${logoSrc ? `<td style="vertical-align:middle;padding-right:12px;"><img src="${logoSrc}" alt="${companyName}" style="display:block;border:0;max-width:80px;max-height:60px;width:auto;height:auto;" /></td>` : ''}
                <td style="vertical-align:middle;">
                  ${!logoSrc && logoInitial ? `<span style="display:inline-block;width:40px;height:40px;line-height:40px;background:${accent};color:#fff;font-weight:bold;font-size:18px;text-align:center;margin-right:10px;">${logoInitial}</span>` : ''}
                  <span style="font-size:20px;font-weight:700;color:${accent};">${companyName}</span>
                </td>
              </tr>
            </table>
            ${address ? `<p style="margin:8px 0 0;font-size:12px;color:#6b7280;">${address}</p>` : ''}
            <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${email}${phone ? ' | ' + phone : ''}</p>
          </td>
          <td style="width:45%;vertical-align:top;text-align:right;">
            <p style="margin:0;font-size:24px;font-weight:700;color:${accent};letter-spacing:1px;">INVOICE</p>
            <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#374151;">${txn.transaction_id || ''}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${txn.purchased_at ? new Date(txn.purchased_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <span style="display:inline-block;margin-top:8px;padding:4px 16px;font-size:12px;font-weight:600;color:${statusColor};background:${statusColor}12;border:1px solid ${statusColor}40;">${statusLabel}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${ticketNameHtml ? `<tr><td style="padding:0 24px;">${ticketNameHtml}</td></tr>` : ''}

  <!-- Bill To & Payment -->
  <tr>
    <td style="padding:20px 24px;">
      <table role="presentation" style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:50%;vertical-align:top;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Bill To</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${customerName}</p>
            ${customerEmail ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${customerEmail}</p>` : ''}
            ${customerPhone ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${customerPhone}</p>` : ''}
          </td>
          <td style="width:50%;vertical-align:top;text-align:right;">
            ${paymentDetail ? `
            <p style="margin:0 0 8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Payment Details</p>
            <p style="margin:0;font-size:13px;color:#374151;"><strong>Method:</strong> ${paymentDetail.label}</p>
            <p style="margin:3px 0 0;font-size:13px;color:#374151;"><strong>Info:</strong> ${paymentDetail.detail}</p>
            ` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Items Table -->
  <tr>
    <td style="padding:0 24px 20px;">
      <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;" cellpadding="0" cellspacing="0" border="0">
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;">Item</th>
          <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;">Qty</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;">Price</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;">Total</th>
        </tr>
        ${itemRowsHtml}
      </table>
    </td>
  </tr>

  <!-- Totals -->
  <tr>
    <td style="padding:0 24px 20px;">
      <table role="presentation" style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:60%;"></td>
          <td style="width:40%;">
            <table role="presentation" style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;text-align:left;">Subtotal</td>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;text-align:right;">${cur}${Number(txn.total_amount || 0).toLocaleString()}</td>
              </tr>
              ${taxRate > 0 ? `<tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;text-align:left;">Tax (${taxRate}%)</td>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;text-align:right;">${cur}${taxAmount.toLocaleString()}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:${accent};text-align:left;border-top:2px solid ${accent};">Total Due</td>
                <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:${accent};text-align:right;border-top:2px solid ${accent};">${cur}${totalWithTax.toLocaleString()}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">${footerText} | ${companyName}${website ? ' | ' + website : ''}</p>
    </td>
  </tr>

</table>
</td></tr>
</table>`
}

export function generateInvoiceReminderHtml(
  txn: any, template: any, statusLabel: string, branchId?: string
) {
  const tpl = resolveTemplate(template)
  const companyName = tpl.companyName
  const accent = tpl.accentColor
  const logoSrc = tpl.logoUrl
  const logoInitial = tpl.logoInitial ?? companyName.charAt(0)
  const address = tpl.address
  const email = tpl.email || SENDER_EMAIL
  const phone = tpl.phone
  const website = tpl.website
  const footerText = tpl.footerText
  const taxRate = tpl.taxRate
  const cur = tpl.currencySymbol
  const customerName = txn.buyer_name || 'Customer'
  const paymentDetail = getPaymentDetail(txn.payment_method || '', txn.payment_detail || '', companyName, branchId)
  const lineItems = invoiceLineItems(txn)
  const itemName = txn.item_name || txn.ticket_title || lineItems[0]?.name || 'Invoice Item'
  const itemCode = lineItems.map((item) => item.code).join(', ')
  const taxAmount = (txn.total_amount || 0) * (taxRate / 100)
  const totalWithTax = (txn.total_amount || 0) + taxAmount

  let paymentInfoHtml = ''
  if (paymentDetail) {
    paymentInfoHtml = `
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;width:130px;">Payment Method</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${paymentDetail.label}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Payment Info</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${paymentDetail.detail}</td>
      </tr>`
  }

  return `<table role="presentation" style="width:100%;border-collapse:collapse;background:#f9fafb;" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:24px 16px;">
<table role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;border-collapse:collapse;border:1px solid #e5e7eb;" cellpadding="0" cellspacing="0" border="0">

  <!-- Header -->
  <tr>
    <td style="padding:24px 24px 20px;border-bottom:3px solid ${accent};">
      <table role="presentation" style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:55%;vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${logoSrc ? `<td style="vertical-align:middle;padding-right:12px;"><img src="${logoSrc}" alt="${companyName}" style="display:block;border:0;max-width:80px;max-height:60px;width:auto;height:auto;" /></td>` : ''}
                <td style="vertical-align:middle;">
                  ${!logoSrc && logoInitial ? `<span style="display:inline-block;width:40px;height:40px;line-height:40px;background:${accent};color:#fff;font-weight:bold;font-size:18px;text-align:center;margin-right:10px;">${logoInitial}</span>` : ''}
                  <span style="font-size:20px;font-weight:700;color:${accent};">${companyName}</span>
                </td>
              </tr>
            </table>
            ${address ? `<p style="margin:8px 0 0;font-size:12px;color:#6b7280;">${address}</p>` : ''}
            <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${email}${phone ? ' | ' + phone : ''}</p>
          </td>
          <td style="width:45%;vertical-align:top;text-align:right;">
            <p style="margin:0;font-size:22px;font-weight:700;color:${accent};letter-spacing:1px;">PAYMENT REMINDER</p>
            <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#374151;">${txn.transaction_id || ''}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:24px;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;">Dear <strong>${customerName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">This is a reminder that your payment for <strong style="color:#111827;">${itemName}</strong> is still pending. Please complete your payment at your earliest convenience.</p>

      <!-- Invoice Details Table -->
      <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;margin-bottom:20px;" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="background:${accent};padding:12px 16px;" colspan="2"><p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;color:#fff;">Invoice Details</p></td></tr>
        <tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;width:130px;">Invoice ID</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${txn.transaction_id || ''}</td></tr>
        <tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Date</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</td></tr>
        <tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Code</td><td style="padding:10px 16px;font-size:11px;font-weight:600;color:#111827;font-family:monospace;border-bottom:1px solid #e5e7eb;">${itemCode}</td></tr>
        <tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Quantity</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${txn.quantity || 1}</td></tr>
        <tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Subtotal</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${cur}${Number(txn.total_amount || 0).toLocaleString()}</td></tr>
        ${taxRate > 0 ? `<tr><td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Tax (${taxRate}%)</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${cur}${taxAmount.toLocaleString()}</td></tr>` : ''}
        ${paymentInfoHtml}
        <tr><td style="padding:14px 16px;font-size:16px;font-weight:700;color:${accent};border-top:2px solid ${accent};background:${accent}08;" colspan="2">Total Due: ${cur}${totalWithTax.toLocaleString()}</td></tr>
      </table>

      <!-- Status -->
      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:20px;" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:12px;background:#fef2f2;text-align:center;border:1px solid #fecaca;"><p style="margin:0;font-size:14px;font-weight:600;color:#dc2626;">Status: ${statusLabel}</p></td></tr>
      </table>

      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">If you have already made this payment, please disregard this reminder. For any questions or concerns, feel free to reply to this email.</p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      ${address ? `<p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-align:center;">${address}</p>` : ''}
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">${footerText} | ${companyName}${website ? ' | ' + website : ''}</p>
    </td>
  </tr>

</table>
</td></tr>
</table>`
}

export async function generateInvoicePdf(inv: any, template: any, branchId?: string) {
  try {
    console.log('[PDF] Starting generation for', inv?.transaction_id || 'unknown', 'branch:', branchId, 'has_template:', !!template)
    const tpl = resolveTemplate(template)
    const cur = tpl.currencySymbol
    const taxRate = tpl.taxRate
    const taxAmount = (inv.total_amount || 0) * (taxRate / 100)
    const totalWithTax = (inv.total_amount || 0) + taxAmount
    const accentHex = tpl.accentColor
    const accent = rgb(
      parseInt(accentHex.slice(1, 3), 16) / 255,
      parseInt(accentHex.slice(3, 5), 16) / 255,
      parseInt(accentHex.slice(5, 7), 16) / 255,
    )
    const customerName = inv.buyer_name || 'Walk-in Customer'
    const customerEmail = inv.buyer_email || ''
    const customerPhone = inv.buyer_phone || ''
    const dt = inv.purchased_at ? new Date(inv.purchased_at) : new Date(inv.created_at)
    const dateTime = dt.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    const statusLabel = inv.status === 'paid' ? 'Paid' : inv.status === 'cancelled' ? 'Cancelled' : 'Pending'
    const statusColor = inv.status === 'paid' ? rgb(0.086, 0.639, 0.29) : inv.status === 'cancelled' ? rgb(0.863, 0.149, 0.149) : rgb(0.796, 0.541, 0.016)
    const summaryItem = invoiceSummaryItem(inv)
    const paymentDetail = getPaymentDetail(inv.payment_method || '', inv.payment_detail || '', tpl.companyName, branchId)

    console.log('[PDF] Creating document...')
    let pdfDoc
    try {
      pdfDoc = await PDFDocument.create()
    } catch (e) {
      console.error('[PDF] PDFDocument.create() failed:', e instanceof Error ? e.message : String(e))
      return null
    }
    
    let font, fontBold
    try {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      console.log('[PDF] Fonts embedded successfully')
    } catch (e) {
      console.error('[PDF] Font embedding failed:', e instanceof Error ? e.message : String(e))
      return null
    }

    const page = pdfDoc.addPage([595.28, 841.89])
    const { width, height } = page.getSize()
    const M = 50 // margin
    const contentW = width - M * 2

    // Helper functions
    function drawText(text: string, x: number, y: number, fnt: any, size: number, color: any) {
      page.drawText(String(text || ''), { x, y, font: fnt, size, color: color || rgb(0, 0, 0) })
    }
    function textW(text: string, fnt: any, size: number) {
      return fnt.widthOfTextAtSize(String(text || ''), size)
    }
    function wrapText(text: string, fnt: any, size: number, maxW: number): string[] {
      const source = String(text || '')
      if (!source) return ['']
      const lines: string[] = []
      const words = source.split(/\s+/)
      for (const word of words) {
        const chunks: string[] = []
        let chunk = ''
        for (const char of word) {
          const next = chunk + char
          if (chunk && fnt.widthOfTextAtSize(next, size) > maxW) {
            chunks.push(chunk)
            chunk = char
          } else {
            chunk = next
          }
        }
        if (chunk) chunks.push(chunk)
        for (const part of chunks) {
          const last = lines[lines.length - 1] || ''
          const nextLine = last ? `${last} ${part}` : part
          if (last && fnt.widthOfTextAtSize(nextLine, size) <= maxW) {
            lines[lines.length - 1] = nextLine
          } else {
            lines.push(part)
          }
        }
      }
      return lines.length > 0 ? lines : ['']
    }
    function drawWrapped(text: string, x: number, y: number, fnt: any, size: number, color: any, maxW: number, lh: number) {
      const lines = wrapText(text, fnt, size, maxW)
      lines.forEach((line, i) => drawText(line, x, y - i * lh, fnt, size, color))
      return lines.length * lh
    }
    function drawRight(text: string, rightX: number, y: number, fnt: any, size: number, color: any) {
      drawText(text, rightX - textW(text, fnt, size), y, fnt, size, color)
    }
    function drawRect(x: number, y: number, w: number, h: number, fill: any) {
      page.drawRectangle({ x, y, width: w, height: h, color: fill })
    }
    function drawLine(x1: number, y1: number, x2: number, y2: number, color: any, thick = 1) {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color: color || rgb(0.85, 0.85, 0.85), thickness: thick })
    }

    async function embedLogo() {
      if (!tpl.logoUrl) return null
      try {
        const res = await fetch(tpl.logoUrl)
        if (!res.ok) return null
        const buf = new Uint8Array(await res.arrayBuffer())
        if (buf[0] === 0x89) return await pdfDoc.embedPng(buf)
        if (buf[0] === 0xFF) return await pdfDoc.embedJpg(buf)
        const ext = tpl.logoUrl.split('.').pop()?.toLowerCase()
        if (ext === 'png') return await pdfDoc.embedPng(buf)
        if (ext === 'jpg' || ext === 'jpeg') return await pdfDoc.embedJpg(buf)
      } catch (e) { console.error('[PDF] Logo embed failed:', e) }
      return null
    }

    // ── Layout ──────────────────────────────────────────────────
    let y = height - M

    // ── Header: Logo (left) | Company (left) | INVOICE (right-aligned) ──
    const logo = await embedLogo()
    let leftColX = M
    const rightColX = width - M - 180

    // Logo / Initial square
    if (logo) {
      const dims = logo.scaleToFit(48, 48)
      page.drawImage(logo, { x: M, y: y - dims.height, width: dims.width, height: dims.height })
      leftColX = M + dims.width + 12
    } else if (tpl.logoInitial) {
      drawRect(M, y - 48, 48, 48, accent)
      drawText(tpl.logoInitial, M + 14, y - 14, fontBold, 22, rgb(1, 1, 1))
      leftColX = M + 60
    }

    // Company name - top aligned with logo
    drawText(tpl.companyName, leftColX, y - 6, fontBold, 18, accent)
    if (tpl.address) {
      drawText(tpl.address, leftColX, y - 22, font, 9, rgb(0.45, 0.45, 0.5))
    }
    drawText(`${tpl.email}${tpl.phone ? ' | ' + tpl.phone : ''}`, leftColX, y - (tpl.address ? 36 : 18), font, 9, rgb(0.45, 0.45, 0.5))

    // Right column: INVOICE title and details (right-aligned)
    drawRight('INVOICE', width - M, y - 6, fontBold, 24, accent)
    drawText(inv.transaction_id || '', rightColX, y - 24, font, 10, rgb(0.3, 0.3, 0.38))
    drawText(dateTime, rightColX, y - 38, font, 9, rgb(0.45, 0.45, 0.5))

    // Status badge - right-aligned
    const badgeW = textW(statusLabel, fontBold, 10) + 24
    const badgeH = 22
    const badgeY = y - 64
    drawRect(width - M - badgeW, badgeY, badgeW, badgeH, rgb(0.96, 0.96, 0.97))
    page.drawRectangle({
      x: width - M - badgeW, y: badgeY, width: badgeW, height: badgeH,
      borderColor: rgb(0.9, 0.9, 0.92), borderWidth: 0.5,
    })
    drawText(statusLabel, width - M - badgeW + 12, badgeY + 7, fontBold, 10, statusColor)

    y -= 94

    // ── Accent line ──
    drawLine(M, y, width - M, y, accent, 2.5)
    y -= 28

    // ── Bill To (left) | Payment Details (right) ──
    drawText('BILL TO', M, y, fontBold, 8, rgb(0.55, 0.55, 0.6))
    drawText('PAYMENT DETAILS', rightColX, y, fontBold, 8, rgb(0.55, 0.55, 0.6))
    y -= 16

    // Left: customer info
    let leftY = y
    drawText(customerName, M, leftY, fontBold, 12, rgb(0.06, 0.06, 0.14))
    leftY -= 14
    if (customerEmail) {
      drawText(customerEmail, M, leftY, font, 9, rgb(0.4, 0.4, 0.45))
      leftY -= 14
    }
    if (customerPhone) {
      drawText(customerPhone, M, leftY, font, 9, rgb(0.4, 0.4, 0.45))
      leftY -= 14
    }

    // Right: payment details
    let rightY = y
    if (paymentDetail) {
      drawText(`Method: ${paymentDetail.label}`, rightColX, rightY, font, 9, rgb(0.2, 0.2, 0.28))
      rightY -= 14
      if (paymentDetail.detail && paymentDetail.detail !== paymentDetail.label) {
        drawText(`Info: ${paymentDetail.detail}`, rightColX, rightY, font, 9, rgb(0.2, 0.2, 0.28))
        rightY -= 14
      }
    }

    y = Math.min(leftY, rightY) - 4

    // ── Ticket name (if exists) ──
    const ticketName = inv.item_name || inv.ticket_title || ''
    if (ticketName) {
      const ticketLines = wrapText(`Ticket: ${ticketName}`, font, 10, contentW - 24)
      const ticketH = Math.max(28, 14 + ticketLines.length * 13)
      drawRect(M, y - ticketH + 4, contentW, ticketH, rgb(0.94, 0.97, 1))
      page.drawRectangle({ x: M, y: y - ticketH + 4, width: contentW, height: ticketH, borderColor: rgb(0.68, 0.82, 1), borderWidth: 0.5 })
      drawWrapped(`Ticket: ${ticketName}`, M + 12, y - 7, font, 10, rgb(0, 0.4, 0.8), contentW - 24, 13)
      y -= ticketH + 14
    }

    // ── Items Table ──
    const col1X = M
    const col1W = contentW * 0.44
    const col2X = col1X + col1W
    const col2W = contentW * 0.10
    const col3X = col2X + col2W
    const col3W = contentW * 0.23
    const col4X = col3X + col3W
    const col4W = contentW - col1W - col2W - col3W

    const rEdge = width - M

    // Table header row
    const headerH = 24
    drawRect(M, y - headerH + 4, contentW, headerH, rgb(0.94, 0.96, 0.98))
    drawLine(M, y - headerH + 4, width - M, y - headerH + 4, rgb(0.88, 0.9, 0.94))
    drawLine(M, y + 4, width - M, y + 4, rgb(0.88, 0.9, 0.94))
    drawText('Item', col1X + 10, y + 4 - 6, fontBold, 8, rgb(0.4, 0.4, 0.48))
    drawText('Qty', col2X + col2W / 2 - textW('Qty', fontBold, 8) / 2, y + 4 - 6, fontBold, 8, rgb(0.4, 0.4, 0.48))
    drawText('Price', col3X + col3W - 10 - textW('Price', fontBold, 8), y + 4 - 6, fontBold, 8, rgb(0.4, 0.4, 0.48))
    drawText('Total', rEdge - 10 - textW('Total', fontBold, 8), y + 4 - 6, fontBold, 8, rgb(0.4, 0.4, 0.48))
    y -= headerH + 4

    // Table data row
    const nameLines = wrapText(summaryItem.name || 'Invoice Item', fontBold, 11, col1W - 20)
    const codeLines = wrapText(summaryItem.code || '-', font, 8, col1W - 20)
    const rowH = Math.max(40, 16 + nameLines.length * 14 + codeLines.length * 10)

    drawLine(M, y, rEdge, y, rgb(0.92, 0.94, 0.96))

    // Left column: item name + code
    let cellY = y - 10
    nameLines.forEach((line, i) => drawText(line, col1X + 10, cellY - i * 14, fontBold, 11, rgb(0.06, 0.06, 0.14)))
    const codeStartY = cellY - nameLines.length * 14 - 3
    codeLines.forEach((line, i) => drawText(line, col1X + 10, codeStartY - i * 10, font, 8, rgb(0.45, 0.45, 0.5)))

    // Right columns: vertically centered
    const cellMidY = y - rowH / 2 + 3
    drawText(String(summaryItem.quantity || 1), col2X + col2W / 2 - textW(String(summaryItem.quantity || 1), font, 10) / 2, cellMidY, font, 10, rgb(0, 0, 0))
    drawRight(`${cur}${Number(summaryItem.price || 0).toLocaleString()}`, col3X + col3W - 10, cellMidY, font, 10, rgb(0, 0, 0))
    drawRight(`${cur}${Number(summaryItem.total || 0).toLocaleString()}`, rEdge - 10, cellMidY, fontBold, 10, rgb(0, 0, 0))

    // Bottom line of data row
    drawLine(M, y - rowH, rEdge, y - rowH, rgb(0.92, 0.94, 0.96))
    y -= rowH + 4

    // ── Totals (right-aligned) ──
    const totalsLabelX = rEdge - 200
    drawLine(totalsLabelX, y, rEdge, y, rgb(0.92, 0.94, 0.96))
    y -= 18

    drawText('Subtotal', totalsLabelX, y, font, 11, rgb(0.45, 0.45, 0.5))
    drawRight(`${cur}${Number(inv.total_amount || 0).toLocaleString()}`, rEdge, y, font, 11, rgb(0.45, 0.45, 0.5))
    y -= 18

    if (taxRate > 0) {
      drawText(`Tax (${taxRate}%)`, totalsLabelX, y, font, 11, rgb(0.45, 0.45, 0.5))
      drawRight(`${cur}${taxAmount.toLocaleString()}`, rEdge, y, font, 11, rgb(0.45, 0.45, 0.5))
      y -= 18
    }

    drawLine(totalsLabelX, y, rEdge, y, accent, 2)
    y -= 22

    drawText('Total Due', totalsLabelX, y, fontBold, 16, accent)
    drawRight(`${cur}${totalWithTax.toLocaleString()}`, rEdge, y, fontBold, 16, accent)

    // ── Footer ──
    const footerY = 36
    drawLine(M, footerY + 16, width - M, footerY + 16, rgb(0.88, 0.9, 0.94))
    const footerText = `${tpl.footerText} | ${tpl.companyName}${tpl.website ? ' | ' + tpl.website : ''}`
    const footerW = textW(footerText, font, 9)
    drawText(footerText, (width - footerW) / 2, footerY, font, 9, rgb(0.55, 0.55, 0.6))

    console.log('[PDF] Saving document...')
    const pdfBytes = await pdfDoc.save()
    const bytes = new Uint8Array(pdfBytes)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    console.log('[PDF] Generated successfully, size:', base64.length)
    return base64
  } catch (err) {
    console.error('[PDF] Generation failed:', err instanceof Error ? err.message : String(err))
    if (err instanceof Error && err.stack) console.error('[PDF] Stack:', err.stack)
    return null
  }
}

export function replaceTemplateVars(
  htmlBody: string,
  subject: string,
  data: Record<string, any>,
  tpl: any,
  defaults: { contactName?: string; contactEmail?: string; event?: string; senderEmail?: string },
): { htmlBody: string; subject: string } {
  const { contactName, contactEmail, event, senderEmail } = defaults
  const replacements: Record<string, string> = {
    '{{name}}': data?.buyer_name || contactName || 'Customer',
    '{{email}}': data?.buyer_email || contactEmail || '',
    '{{event}}': event || '',
    '{{companyInitial}}': tpl?.logoInitial || 'A',
    '{{companyName}}': tpl?.companyName || 'Acodera CRM',
    '{{companyAddress}}': tpl?.address || '',
    '{{companyEmail}}': tpl?.email || senderEmail || SENDER_EMAIL,
    '{{companyPhone}}': tpl?.phone || '',
    '{{companyWebsite}}': tpl?.website || '',
    '{{invoiceStatus}}': data?.status === 'paid' ? 'Paid' : data?.status === 'overdue' ? 'Overdue' : 'Pending',
    '{{invoiceDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
    '{{transactionId}}': data?.transaction_id || '',
    '{{invoice_id}}': data?.transaction_id || '',
    '{{itemName}}': data?.item_name || data?.unique_code || 'Item',
    '{{quantity}}': String(data?.quantity || 1),
    '{{amount}}': String(Number(data?.total_amount || 0)),
    '{{totalAmount}}': String(Number(data?.total_amount || 0)),
    '{{pricePerUnit}}': data?.price_per_unit ? String(data.price_per_unit) : String(Number(data?.total_amount || 0)),
    '{{paymentMethod}}': data?.payment_method || '—',
    '{{paymentDetail}}': data?.payment_detail || '—',
    '{{buyer_phone}}': data?.buyer_phone || '—',
    '{{itemCode}}': data?.itemCode || data?.unique_code || '—',
    '{{taxAmount}}': tpl?.taxRate ? String(Number(data?.total_amount || 0) * (Number(tpl.taxRate) / 100)) : '0',
    '{{totalWithTax}}': tpl?.taxRate
      ? String(Number(data?.total_amount || 0) + Number(data?.total_amount || 0) * (Number(tpl.taxRate) / 100))
      : String(Number(data?.total_amount || 0)),
  }

  let newHtml = htmlBody
  let newSubject = subject
  for (const [key, val] of Object.entries(replacements)) {
    newHtml = newHtml.replaceAll(key, val)
    newSubject = newSubject.replaceAll(key, val)
  }

  if (data) {
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'string' || typeof val === 'number') {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        newHtml = newHtml.replace(regex, String(val))
        newSubject = newSubject.replace(regex, String(val))
      }
    }
  }

  return { htmlBody: newHtml, subject: newSubject }
}

export function getNextRunAt(frequency: string, from = new Date()) {
  const d = new Date(from)
  switch (frequency) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'biweekly': d.setDate(d.getDate() + 14); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
    default: d.setMonth(d.getMonth() + 1); break
  }
  return d.toISOString()
}

export async function fetchInvoiceTemplate(supabase: any, branch: string): Promise<any> {
  try {
    if (!branch) return null
    const { data: users } = await supabase
      .from('users')
      .select('invoice_template, role')
      .eq('branch_id', branch)
      .limit(50)

    if (users && users.length > 0) {
      const parseTemplate = (raw: any) => {
        if (!raw) return null
        if (typeof raw === 'object') return raw
        if (typeof raw === 'string' && raw !== '{}' && raw !== '') {
          try { return JSON.parse(raw) } catch { return null }
        }
        return null
      }

      // Prefer the branch owner's template
      const owner = users.find((u: any) => u.role === 'owner')
      const ownerTpl = owner ? parseTemplate(owner.invoice_template) : null
      if (ownerTpl && Object.keys(ownerTpl).length > 0) return ownerTpl

      // Fallback: first user with a valid non-empty template
      for (const u of users) {
        const tpl = parseTemplate(u.invoice_template)
        if (tpl && Object.keys(tpl).length > 0) return tpl
      }
    }
  } catch (e) {
    console.error('Failed to fetch invoice template:', e)
  }
  return null
}

export function logEmailResult(
  supabase: any,
  automationId: string,
  email: string,
  subject: string,
  status: string,
  error?: string,
) {
  return supabase.from('automation_logs').insert([{
    automation_id: automationId,
    contact_email: email,
    subject,
    status,
    error: error || null,
  }])
}
