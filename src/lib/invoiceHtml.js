import { DEFAULT_TEMPLATE } from '../pages/InvoiceTemplate'

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

function esc(s) { return s || '' }

function getPaymentDetail(invoice, tpl) {
  const method = invoice?.paymentMethod || ''
  const detail = invoice?.paymentDetail || ''
  const companyName = tpl?.companyName || ''
  if (method === 'qr_code') return { label: 'QR Code', detail: 'Scan QR code to pay' }
  if (method === 'bank_transfer' && detail) {
    const bank = BANK_OPTIONS.find(b => b.value === detail)
    return bank ? { label: 'Bank ' + bank.label, detail: bank.accountNumber + ' - ' + companyName } : null
  }
  if (method === 'e_wallet' && detail) {
    const ew = EWALLET_OPTIONS.find(e => e.value === detail)
    return ew ? { label: ew.label, detail: E_WALLET_PHONE + ' - ' + companyName } : null
  }
  return null
}

function invoiceLineItems(invoice) {
  const codes = Array.isArray(invoice.uniqueCodes) && invoice.uniqueCodes.length > 0
    ? invoice.uniqueCodes
    : Array.isArray(invoice.ticketDetails) && invoice.ticketDetails.length > 0
      ? invoice.ticketDetails.map((ticket) => ticket.uniqueCode)
      : []

  if (codes.length > 0) {
    return codes.map((code) => ({
      name: invoice.itemName || 'Invoice Item',
      code: code || '-',
      quantity: 1,
      price: Number(invoice.pricePerUnit || 0),
      total: Number(invoice.pricePerUnit || 0),
    }))
  }

  return [{
    name: invoice.itemName || 'Invoice Item',
    code: invoice.itemCode || '-',
    quantity: Number(invoice.quantity) || 1,
    price: Number(invoice.pricePerUnit || 0),
    total: Number(invoice.totalAmount || 0),
  }]
}

function invoiceSummaryItem(invoice) {
  const lineItems = invoiceLineItems(invoice)
  return {
    name: invoice.itemName || lineItems[0]?.name || 'Invoice Item',
    code: invoice.itemCode || lineItems.map((item) => item.code).join(', ') || '-',
    quantity: Number(invoice.quantity || lineItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0) || 1),
    price: Number(invoice.pricePerUnit || lineItems[0]?.price || 0),
    total: Number(invoice.totalAmount || lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0)),
  }
}

function logoCell(accent, logoSrc, logoInitial) {
  if (logoSrc) {
    return '<td style="vertical-align:middle;padding-right:8px;"><img src="' + esc(logoSrc) + '" alt="Logo" width="120" height="48" style="display:block;border:0;max-width:120px;max-height:48px;" /></td>'
  }
  if (logoInitial) {
    return '<td style="vertical-align:middle;"><span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:4px;background:' + esc(accent) + ';color:#fff;font-weight:bold;font-size:14px;text-align:center;margin-right:8px;">' + esc(logoInitial) + '</span></td>'
  }
  return ''
}

export function generateInvoiceHtml(invoice, templateOverrides) {
  const tpl = { ...DEFAULT_TEMPLATE, ...(templateOverrides || {}) }
  if (tpl.companyName === null || tpl.companyName === undefined) tpl.companyName = DEFAULT_TEMPLATE.companyName
  if (tpl.logoInitial === null || tpl.logoInitial === undefined) tpl.logoInitial = DEFAULT_TEMPLATE.logoInitial

  const accent = tpl.accentColor || '#1e40af'
  const statusColor = invoice.status === 'paid' ? '#16a34a' : invoice.status === 'cancelled' ? '#dc2626' : '#ca8a04'
  const statusLabel = invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Pending'
  const paymentDetail = getPaymentDetail(invoice, tpl)
  const taxAmount = (invoice.totalAmount || 0) * ((tpl.taxRate || 0) / 100)
  const totalWithTax = (invoice.totalAmount || 0) + taxAmount
  const cur = tpl.currencySymbol || '$'
  const summaryItem = invoiceSummaryItem(invoice)

  const customerName = invoice.customerName || 'Walk-in Customer'
  const customerEmail = invoice.customerEmail || '—'
  const customerPhone = invoice.customerPhone || '—'

  const logoCellHtml = logoCell(accent, tpl.logoUrl, tpl.logoInitial)
  const addressHtml = tpl.address ? '<p style="margin:4px 0 0;font-size:11px;color:#64748b;">' + esc(tpl.address) + '</p>' : ''
  const contactHtml = esc(tpl.email || '') + (tpl.phone ? ' | ' + esc(tpl.phone) : '')

  let ticketNameHtml = ''
  if (invoice.itemName) {
    ticketNameHtml = '<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px;" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px 12px;background:#f0f7ff;border-radius:6px;"><p style="margin:0;font-size:11px;color:#0066cc;"><strong>Ticket:</strong> ' + esc(invoice.itemName) + '</p></td></tr></table>'
  }

  let customerPhoneHtml = ''
  if (customerPhone !== '—') {
    customerPhoneHtml = '<p style="margin:4px 0 0;font-size:13px;color:#64748b;">' + esc(customerPhone) + '</p>'
  }

  let paymentInfoBlock = ''
  if (paymentDetail) {
    paymentInfoBlock = '<p style="margin:0 0 6px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">Payment Details</p>' +
      '<p style="margin:0;font-size:13px;color:#334155;"><strong>Method:</strong> ' + esc(paymentDetail.label) + '</p>' +
      '<p style="margin:4px 0 0;font-size:13px;color:#334155;"><strong>Info:</strong> ' + esc(paymentDetail.detail) + '</p>'
  }

  let taxRowHtml = ''
  if ((tpl.taxRate || 0) > 0) {
    taxRowHtml = '<tr><td style="padding:4px 0;font-size:12px;color:#64748b;text-align:left;">Tax (' + esc(String(tpl.taxRate)) + '%)</td><td style="padding:4px 0;font-size:12px;color:#64748b;text-align:right;">' + cur + taxAmount.toLocaleString() + '</td></tr>'
  }

  const itemRowsHtml = (
    '<tr>' +
    '<td style="padding:12px;font-size:13px;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;">' +
    (summaryItem.name ? '<div style="font-weight:600;margin-bottom:1px;">' + esc(summaryItem.name) + '</div>' : '') +
    '<span style="font-family:monospace;font-size:11px;color:#64748b;">' + esc(summaryItem.code || '-') + '</span>' +
    '</td>' +
    '<td style="padding:12px;font-size:13px;text-align:center;border-bottom:1px solid #f1f5f9;white-space:nowrap;">' + esc(String(summaryItem.quantity || 1)) + '</td>' +
    '<td style="padding:12px;font-size:13px;text-align:right;border-bottom:1px solid #f1f5f9;white-space:nowrap;">' + cur + Number(summaryItem.price || 0).toLocaleString() + '</td>' +
    '<td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;white-space:nowrap;">' + cur + Number(summaryItem.total || 0).toLocaleString() + '</td>' +
    '</tr>'
  )
  const subtotalStr = cur + Number(invoice.totalAmount || 0).toLocaleString()
  const totalWithTaxStr = cur + totalWithTax.toLocaleString()

  return '<div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,Helvetica,sans-serif;padding:24px 32px;">' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;border-bottom:2px solid ' + esc(accent) + ';margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">' +
    '<tr>' +
    '<td style="width:55%;vertical-align:top;padding-bottom:12px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    logoCellHtml +
    '<td style="vertical-align:middle;"><span style="font-size:16px;font-weight:700;color:' + esc(accent) + ';">' + esc(tpl.companyName) + '</span></td>' +
    '</tr></table>' +
    addressHtml +
    '<p style="margin:2px 0 0;font-size:11px;color:#64748b;">' + contactHtml + '</p>' +
    '</td>' +
    '<td style="width:45%;vertical-align:top;text-align:right;padding-bottom:12px;">' +
    '<p style="margin:0;font-size:16px;font-weight:700;color:' + esc(accent) + ';">INVOICE</p>' +
    '<p style="margin:4px 0 0;font-size:12px;font-weight:600;color:#334155;">' + esc(invoice.transactionId) + '</p>' +
    '<p style="margin:4px 0 0;font-size:11px;color:#64748b;">Date: ' + esc(invoice.dateTime) + '</p>' +
    '<span style="display:inline-block;margin-top:6px;padding:2px 12px;border-radius:10px;font-size:11px;font-weight:600;color:' + esc(statusColor) + ';border:1px solid ' + esc(statusColor) + '30;">' + esc(statusLabel) + '</span>' +
    '</td></tr></table>' +
    ticketNameHtml +
    '<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;table-layout:fixed;" cellpadding="0" cellspacing="0" border="0">' +
    '<colgroup><col style="width:52%;" /><col style="width:10%;" /><col style="width:19%;" /><col style="width:19%;" /></colgroup>' +
    '<tr>' +
    '<td style="width:50%;vertical-align:top;">' +
    '<p style="margin:0 0 6px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">Bill To</p>' +
    '<p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">' + esc(customerName) + '</p>' +
    '<p style="margin:4px 0 0;font-size:13px;color:#64748b;">' + esc(customerEmail) + '</p>' +
    customerPhoneHtml +
    '</td>' +
    '<td style="width:50%;vertical-align:top;text-align:right;">' + paymentInfoBlock + '</td>' +
    '</tr></table>' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">' +
    '<tr style="background:#f1f5f9;">' +
    '<th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Item</th>' +
    '<th style="padding:8px 12px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Qty</th>' +
    '<th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Price/Unit</th>' +
    '<th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Total</th>' +
    '</tr>' +
    itemRowsHtml + '</table>' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">' +
    '<tr><td style="width:60%;"></td><td style="width:40%;">' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0" border="0">' +
    '<tr><td style="padding:4px 0;font-size:12px;color:#64748b;text-align:left;">Subtotal</td><td style="padding:4px 0;font-size:12px;color:#64748b;text-align:right;">' + subtotalStr + '</td></tr>' +
    taxRowHtml +
    '<tr><td style="padding:8px 0 0;font-size:14px;font-weight:700;color:' + esc(accent) + ';text-align:left;border-top:2px solid ' + esc(accent) + ';">Total Due</td><td style="padding:8px 0 0;font-size:14px;font-weight:700;color:' + esc(accent) + ';text-align:right;border-top:2px solid ' + esc(accent) + ';">' + totalWithTaxStr + '</td></tr>' +
    '</table></td></tr></table>' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;" cellpadding="0" cellspacing="0" border="0">' +
    '<tr><td style="padding-top:12px;text-align:center;"><p style="margin:0;font-size:10px;color:#94a3b8;">' + esc(tpl.footerText) + ' | ' + esc(tpl.companyName) + ' | ' + esc(tpl.website) + '</p></td></tr>' +
    '</table></div>'
}

export function generateInvoiceReminderHtml(invoice, templateOverrides) {
  const tpl = { ...DEFAULT_TEMPLATE, ...(templateOverrides || {}) }
  if (!tpl.companyName) tpl.companyName = DEFAULT_TEMPLATE.companyName
  if (!tpl.logoInitial) tpl.logoInitial = DEFAULT_TEMPLATE.logoInitial

  const accent = tpl.accentColor || '#1e40af'
  const paymentDetail = getPaymentDetail(invoice, tpl)
  const taxRate = tpl.taxRate || 0
  const taxAmount = (invoice.totalAmount || 0) * (taxRate / 100)
  const totalWithTax = (invoice.totalAmount || 0) + taxAmount
  const customerName = invoice.customerName || 'Customer'
  const ticketTitle = invoice.itemName || invoice.itemCode || 'Ticket'
  const cur = tpl.currencySymbol || '$'

  const logoCellHtml = logoCell(accent, tpl.logoUrl, tpl.logoInitial)
  const addressHtml = tpl.address ? '<p style="margin:4px 0 0;font-size:11px;color:#64748b;">' + esc(tpl.address) + '</p>' : ''
  const contactHtml = esc(tpl.email || '') + (tpl.phone ? ' | ' + esc(tpl.phone) : '')

  let paymentInfoHtml = ''
  if (paymentDetail) {
    paymentInfoHtml = '<tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;width:140px;">Payment Method</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">' + esc(paymentDetail.label) + '</td></tr>' +
      '<tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Payment Details</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">' + esc(paymentDetail.detail) + '</td></tr>'
  }

  let taxRowHtml = ''
  if (taxRate > 0) {
    taxRowHtml = '<tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Tax (' + taxRate + '%)</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">' + cur + taxAmount.toLocaleString() + '</td></tr>'
  }

  const totalDueStr = cur + totalWithTax.toLocaleString()
  const subtotalStr = cur + Number(invoice.totalAmount || 0).toLocaleString()

  return '<div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,Helvetica,sans-serif;padding:24px 32px;">' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;border-bottom:2px solid ' + esc(accent) + ';margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">' +
    '<tr>' +
    '<td style="width:55%;vertical-align:top;padding-bottom:12px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    logoCellHtml +
    '<td style="vertical-align:middle;"><span style="font-size:16px;font-weight:700;color:' + esc(accent) + ';">' + esc(tpl.companyName) + '</span></td>' +
    '</tr></table>' +
    addressHtml +
    '<p style="margin:2px 0 0;font-size:11px;color:#64748b;">' + contactHtml + '</p>' +
    '</td>' +
    '<td style="width:45%;vertical-align:top;text-align:right;padding-bottom:12px;">' +
    '<p style="margin:0;font-size:15px;font-weight:700;color:' + esc(accent) + ';">PAYMENT REMINDER</p>' +
    '<p style="margin:4px 0 0;font-size:11px;color:#64748b;">' + esc(invoice.transactionId) + '</p>' +
    '</td></tr></table>' +
    '<p style="margin:16px 0 12px;font-size:14px;color:#334155;">Dear <strong>' + esc(customerName) + '</strong>,</p>' +
    '<p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.5;">This is a reminder that your payment for <strong style="color:#0f172a;">' + esc(ticketTitle) + '</strong> is still pending. Please complete your payment at your earliest convenience.</p>' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:16px;" cellpadding="0" cellspacing="0" border="0">' +
    '<tr><td style="background:' + esc(accent) + ';padding:10px 16px;" colspan="2"><p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#fff;">Invoice Details</p></td></tr>' +
    '<tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;width:140px;">Invoice ID</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">' + esc(invoice.transactionId) + '</td></tr>' +
    '<tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Date</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) + '</td></tr>' +
    '<tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Quantity</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">' + esc(String(invoice.quantity)) + '</td></tr>' +
    '<tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Subtotal</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">' + subtotalStr + '</td></tr>' +
    taxRowHtml + paymentInfoHtml +
    '<tr><td style="padding:12px 16px;font-size:14px;font-weight:700;color:' + esc(accent) + ';border-top:2px solid ' + esc(accent) + ';background:' + esc(accent) + '10;" colspan="2">Total Due &nbsp; ' + totalDueStr + '</td></tr>' +
    '</table>' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px;" cellpadding="0" cellspacing="0" border="0">' +
    '<tr><td style="padding:12px;background:#fef2f2;border-radius:6px;text-align:center;"><p style="margin:0;font-size:13px;font-weight:600;color:#dc2626;">Status: Pending Payment</p></td></tr>' +
    '</table>' +
    '<p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.5;">If you have already made this payment, please disregard this reminder. For any questions or concerns, feel free to reply to this email.</p>' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;" cellpadding="0" cellspacing="0" border="0">' +
    '<tr><td style="padding-top:12px;text-align:center;">' +
    (tpl.address ? '<p style="margin:0 0 2px;font-size:10px;color:#94a3b8;">' + esc(tpl.address) + '</p>' : '') +
    '<p style="margin:0;font-size:10px;color:#94a3b8;">' + esc(tpl.footerText) + ' | ' + esc(tpl.companyName) + (tpl.website ? ' | ' + esc(tpl.website) : '') + '</p>' +
    '</td></tr></table></div>'
}
