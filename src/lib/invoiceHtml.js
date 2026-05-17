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

function getPaymentDetail(invoice, tpl) {
  const method = invoice?.paymentMethod || ''
  const detail = invoice?.paymentDetail || ''
  const companyName = tpl?.companyName || ''
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

export function generateInvoiceReminderHtml(invoice, templateOverrides) {
  const tpl = { ...DEFAULT_TEMPLATE, ...(templateOverrides || {}) }
  if (!tpl.companyName) tpl.companyName = DEFAULT_TEMPLATE.companyName
  if (!tpl.logoInitial) tpl.logoInitial = DEFAULT_TEMPLATE.logoInitial

  const accent = tpl.accentColor || '#1e40af'
  const logoSrc = tpl.logoUrl
  const logoInitial = tpl.logoInitial
  const companyName = tpl.companyName
  const paymentDetail = getPaymentDetail(invoice, tpl)
  const taxRate = tpl.taxRate || 0
  const taxAmount = (invoice.totalAmount || 0) * (taxRate / 100)
  const totalWithTax = (invoice.totalAmount || 0) + taxAmount
  const customerName = invoice.customerName || 'Customer'
  const customerEmail = invoice.customerEmail || '—'
  const customerPhone = invoice.customerPhone || '—'
  const ticketTitle = invoice.itemName || invoice.itemCode || 'Ticket'
  const cur = tpl.currencySymbol || '$'

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
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice Reminder - ${invoice.transactionId}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:794px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">

  <div style="background:${accent};padding:24px 40px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${logoSrc
        ? `<img src="${logoSrc}" alt="Logo" style="width:auto;height:auto;max-width:100px;max-height:48px;object-fit:contain;" />`
        : (logoInitial ? `<div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-weight:bold;font-size:16px;">${logoInitial}</span></div>` : '')
      }
      ${companyName ? `<span style="color:#fff;font-size:18px;font-weight:700;">${companyName}</span>` : ''}
    </div>
    <span style="color:rgba(255,255,255,0.85);font-size:14px;">Payment Reminder</span>
  </div>

  <div style="padding:40px;">
    <p style="margin:0 0 24px;font-size:15px;color:#334155;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">This is a reminder that your payment for <strong style="color:#0f172a;">${ticketTitle}</strong> is still pending. Please complete your payment at your earliest convenience.</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:40px;">
      <div>
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Bill To</p>
        <p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">${customerName}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#64748b;">${customerEmail}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#64748b;">${customerPhone}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Payment Details</p>
        ${paymentDetail ? `
          <p style="margin:0;font-size:14px;color:#334155;"><span style="font-weight:500;">Method:</span> ${paymentDetail.label}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#334155;"><span style="font-weight:500;">Info:</span> ${paymentDetail.detail}</p>
        ` : ''}
      </div>
    </div>

    <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:24px;">
      <div style="background:${accent};padding:12px 16px;">
        <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#fff;">Invoice Details</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;width:140px;">Invoice ID</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${invoice.transactionId}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;">Event / Ticket</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:${accent};border-bottom:1px solid #e2e8f0;">${ticketTitle}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;">Date</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${invoice.dateTime}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;">Quantity</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${invoice.quantity}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#64748b;border-bottom:1px solid #e2e8f0;">Subtotal</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${cur}${Number(invoice.totalAmount || 0).toLocaleString()}</td>
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
      <p style="margin:0;font-size:14px;font-weight:600;color:#dc2626;">Status: Pending Payment</p>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.5;">If you have already made this payment, please disregard this reminder. For any questions or concerns, feel free to reply to this email.</p>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">A detailed invoice PDF is attached below for your reference.</p>
  </div>

  <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">${tpl.footerText} | ${companyName} | ${tpl.website}</p>
  </div>
</div>
</body>
</html>`
}

export function generateInvoiceHtml(invoice, templateOverrides) {
  const tpl = { ...DEFAULT_TEMPLATE, ...(templateOverrides || {}) }
  if (tpl.companyName === null || tpl.companyName === undefined) tpl.companyName = DEFAULT_TEMPLATE.companyName
  if (tpl.logoInitial === null || tpl.logoInitial === undefined) tpl.logoInitial = DEFAULT_TEMPLATE.logoInitial

  const accent = tpl.accentColor || '#1e40af'
  const logoSrc = tpl.logoUrl
  const statusColor = invoice.status === 'paid' ? '#16a34a' : invoice.status === 'cancelled' ? '#dc2626' : '#ca8a04'
  const statusLabel = invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Pending'
  const paymentDetail = getPaymentDetail(invoice, tpl)
  const taxAmount = (invoice.totalAmount || 0) * ((tpl.taxRate || 0) / 100)
  const totalWithTax = (invoice.totalAmount || 0) + taxAmount
  const cur = tpl.currencySymbol || '$'

  const customerName = invoice.customerName || 'Walk-in Customer'
  const customerEmail = invoice.customerEmail || '—'
  const customerPhone = invoice.customerPhone || '—'
  const customerAddress = invoice.customerAddress || ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${invoice.transactionId}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:794px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">

  <div style="background:${accent};padding:24px 40px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${logoSrc
        ? `<img src="${logoSrc}" alt="Logo" style="width:auto;height:auto;max-width:100px;max-height:48px;object-fit:contain;" />`
        : (tpl.logoInitial ? `<div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-weight:bold;font-size:16px;">${tpl.logoInitial}</span></div>` : '')
      }
      ${tpl.companyName ? `<span style="color:#fff;font-size:18px;font-weight:700;">${tpl.companyName}</span>` : ''}
    </div>
    <span style="color:rgba(255,255,255,0.85);font-size:14px;">Invoice</span>
  </div>

  <div style="padding:40px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid ${accent};">
      <div>
        <h2 style="margin:0;font-size:28px;font-weight:700;color:${accent};letter-spacing:1px;">INVOICE</h2>
        <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#334155;">${invoice.transactionId}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Date: ${invoice.dateTime}</p>
        <span style="display:inline-block;margin-top:8px;padding:4px 16px;border-radius:9999px;font-size:12px;font-weight:600;color:${statusColor};background:${statusColor}15;border:1px solid ${statusColor}30;">${statusLabel}</span>
      </div>
    </div>

    ${invoice.itemName ? `
    <div style="margin-bottom:24px;padding:12px 16px;background:#f0f7ff;border-radius:8px;border:1px solid #b3d9ff;">
      <p style="margin:0;font-size:13px;color:#0066cc;"><span style="font-weight:600;">Ticket:</span> ${invoice.itemName}</p>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:40px;">
      <div>
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Bill To</p>
        <p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">${customerName}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#64748b;">${customerEmail}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#64748b;">${customerPhone}</p>
        ${customerAddress ? `<p style="margin:4px 0 0;font-size:14px;color:#64748b;">${customerAddress}</p>` : ''}
      </div>
      <div style="text-align:right;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Payment Details</p>
        ${paymentDetail ? `
          <p style="margin:0;font-size:14px;color:#334155;"><span style="font-weight:500;">Method:</span> ${paymentDetail.label}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#334155;"><span style="font-weight:500;">Info:</span> ${paymentDetail.detail}</p>
        ` : ''}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
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
          <td style="padding:16px;font-size:14px;border-bottom:1px solid #e2e8f0;">
            ${invoice.itemName ? `<div style="font-weight:500;margin-bottom:2px;">${invoice.itemName}</div>` : ''}
            <div style="font-family:monospace;font-size:12px;color:#64748b;">${invoice.itemCode || '-'}</div>
          </td>
          <td style="padding:16px;font-size:14px;text-align:center;border-bottom:1px solid #e2e8f0;">${invoice.quantity}</td>
          <td style="padding:16px;font-size:14px;text-align:right;border-bottom:1px solid #e2e8f0;">${cur}${Number(invoice.pricePerUnit || 0).toLocaleString()}</td>
          <td style="padding:16px;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #e2e8f0;">${cur}${Number(invoice.totalAmount || 0).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:40px;">
      <div style="width:280px;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#64748b;">
          <span>Subtotal</span>
          <span>${cur}${Number(invoice.totalAmount || 0).toLocaleString()}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:14px;color:#64748b;">
          <span>Tax (${tpl.taxRate || 0}%)</span>
          <span>${cur}${taxAmount.toLocaleString()}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;margin-top:8px;border-top:2px solid ${accent};font-size:18px;font-weight:700;color:${accent};">
          <span>Total Due</span>
          <span>${cur}${totalWithTax.toLocaleString()}</span>
        </div>
      </div>
    </div>

    <div style="text-align:center;padding-top:24px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">${tpl.footerText} | ${tpl.companyName} | ${tpl.website}</p>
    </div>
  </div>
</div>
</body>
</html>`
}