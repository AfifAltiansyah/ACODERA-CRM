import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
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

function formatCurrency(amount, symbol) {
  const cur = symbol || '$'
  return `${cur}${Number(amount || 0).toLocaleString()}`
}

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

function buildInvoiceElement(invoice, templateOverrides) {
  const tpl = { ...DEFAULT_TEMPLATE, ...(templateOverrides || {}) }
  if (!tpl.companyName) tpl.companyName = DEFAULT_TEMPLATE.companyName
  if (!tpl.logoInitial) tpl.logoInitial = DEFAULT_TEMPLATE.logoInitial
  if (!tpl.currencySymbol) tpl.currencySymbol = DEFAULT_TEMPLATE.currencySymbol || 'Rp'
  if (!tpl.taxRate) tpl.taxRate = DEFAULT_TEMPLATE.taxRate || 0
  if (!tpl.accentColor) tpl.accentColor = DEFAULT_TEMPLATE.accentColor || '#1e40af'

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

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;'
  container.innerHTML = `
<div style="padding:40px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid ${accent};">
    <div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        ${logoSrc
          ? `<img src="${logoSrc}" alt="Logo" style="width:auto;height:auto;max-width:120px;max-height:60px;object-fit:contain;" />`
          : `<div style="width:40px;height:40px;border-radius:8px;background:${accent};display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-weight:bold;font-size:18px;">${tpl.logoInitial}</span></div>`
        }
        <h1 style="margin:0;font-size:24px;font-weight:700;color:${accent};">${tpl.companyName}</h1>
      </div>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${tpl.address}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#64748b;">${tpl.email} | ${tpl.phone}</p>
    </div>
    <div style="text-align:right;">
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
        <td style="padding:16px;font-size:14px;text-align:right;border-bottom:1px solid #e2e8f0;">${formatCurrency(invoice.pricePerUnit, cur)}</td>
        <td style="padding:16px;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #e2e8f0;">${formatCurrency(invoice.totalAmount, cur)}</td>
      </tr>
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:40px;">
    <div style="width:280px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#64748b;">
        <span>Subtotal</span>
        <span>${formatCurrency(invoice.totalAmount, cur)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:14px;color:#64748b;">
        <span>Tax (${tpl.taxRate || 0}%)</span>
        <span>${formatCurrency(taxAmount, cur)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:12px 0;margin-top:8px;border-top:2px solid ${accent};font-size:18px;font-weight:700;color:${accent};">
        <span>Total Due</span>
        <span>${formatCurrency(totalWithTax, cur)}</span>
      </div>
    </div>
  </div>

  <div style="text-align:center;padding-top:24px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">${tpl.footerText} | ${tpl.companyName} | ${tpl.website}</p>
  </div>
</div>`

  return container
}

async function resolveLogoDataUrl(logoUrl) {
  if (!logoUrl || logoUrl.trim() === '') return null
  if (logoUrl.startsWith('data:')) return logoUrl
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[PDF] Logo load timed out:', logoUrl)
      resolve(null)
    }, 5000)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      clearTimeout(timeout)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => {
      clearTimeout(timeout)
      console.warn('[PDF] Logo image failed to load:', logoUrl)
      resolve(null)
    }
    img.src = logoUrl
  })
}

export async function generateInvoicePdfBase64(invoice, templateOverrides) {
  const tpl = { ...DEFAULT_TEMPLATE, ...(templateOverrides || {}) }
  if (!tpl.companyName) tpl.companyName = DEFAULT_TEMPLATE.companyName
  if (!tpl.logoInitial) tpl.logoInitial = DEFAULT_TEMPLATE.logoInitial
  if (!tpl.currencySymbol) tpl.currencySymbol = DEFAULT_TEMPLATE.currencySymbol || 'Rp'
  if (!tpl.taxRate) tpl.taxRate = DEFAULT_TEMPLATE.taxRate || 0
  if (!tpl.accentColor) tpl.accentColor = DEFAULT_TEMPLATE.accentColor || '#1e40af'

  const logoDataUrl = await resolveLogoDataUrl(tpl.logoUrl)
  const effectiveTemplate = logoDataUrl ? { ...tpl, logoUrl: logoDataUrl } : tpl

  const container = buildInvoiceElement(invoice, effectiveTemplate)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight))

    const base64 = pdf.output('datauristring').split(',')[1]
    return base64
  } finally {
    document.body.removeChild(container)
  }
}
