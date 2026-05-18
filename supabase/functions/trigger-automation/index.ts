import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

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

async function generateInvoicePdf(inv: any, template: any) {
  try {
    const DEFAULT_TEMPLATE = {
      companyName: 'Acodera CRM', logoInitial: 'A', logoUrl: '',
      accentColor: '#1e40af', address: '', email: '', phone: '',
      website: '', footerText: 'Thank you for your business!', taxRate: 0, currencySymbol: 'Rp',
    }
    const tpl = { ...DEFAULT_TEMPLATE, ...(template || {}) }
    if (tpl.companyName === null || tpl.companyName === undefined) tpl.companyName = DEFAULT_TEMPLATE.companyName
    const cur = tpl.currencySymbol || 'Rp'
    const taxRate = tpl.taxRate || 0
    const taxAmount = (inv.total_amount || 0) * (taxRate / 100)
    const totalWithTax = (inv.total_amount || 0) + taxAmount
    const accentHex = tpl.accentColor || '#1e40af'
    const accent = { r: parseInt(accentHex.slice(1, 3), 16) / 255, g: parseInt(accentHex.slice(3, 5), 16) / 255, b: parseInt(accentHex.slice(5, 7), 16) / 255 }
    const customerName = inv.buyer_name || 'Walk-in Customer'
    const dt = inv.purchased_at ? new Date(inv.purchased_at) : new Date(inv.created_at)
    const dateTime = dt.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89])
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const margin = 56

    function drawText(text: string, x: number, y: number, fnt: any, size: number, color: any) {
      page.drawText(text, { x, y, font: fnt, size, color: color || rgb(0, 0, 0) })
    }
    function drawRect(x: number, y: number, w: number, h: number, fillColor: any) {
      page.drawRectangle({ x, y, width: w, height: h, color: fillColor })
    }
    function drawLine(x1: number, y1: number, x2: number, y2: number, color: any, lineWidth = 1) {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color: color || rgb(0.8, 0.8, 0.8), thickness: lineWidth })
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
    let yPos = height - 48
    drawRect(0, height - 88, width, 88, accent)
    const logo = await embedLogo()
    let nameX = margin
    if (logo) {
      const logoDims = logo.scaleToFit(36, 36)
      page.drawImage(logo, { x: margin, y: height - 48 - logoDims.height, width: logoDims.width, height: logoDims.height })
      nameX = margin + logoDims.width + 12
    } else if (tpl.logoInitial) {
      drawRect(margin, height - 48 - 36, 36, 36, accent)
      drawText(tpl.logoInitial, margin + 10, height - 30, fontBold, 16, rgb(1, 1, 1))
      nameX = margin + 36 + 12
    }
    drawText(tpl.companyName, nameX, height - 58, fontBold, 20, rgb(1, 1, 1))
    const invText = 'INVOICE'
    drawText(invText, width - margin - fontBold.widthOfTextAtSize(invText, 24), height - 54, fontBold, 24, rgb(1, 1, 1))
    const tidText = inv.transaction_id || ''
    drawText(tidText, width - margin - fontBold.widthOfTextAtSize(tidText, 12), height - 78, font, 12, rgb(0.85, 0.85, 0.85))
    const dateText = `Date: ${dateTime}`
    drawText(dateText, width - margin - font.widthOfTextAtSize(dateText, 10), height - 92, font, 10, rgb(0.85, 0.85, 0.85))

    const statusLabel = 'Pending'
    const statusW = fontBold.widthOfTextAtSize(statusLabel, 10) + 24
    drawRect(width - margin - statusW, height - 112, statusW, 20, rgb(1, 1, 1))
    drawText(statusLabel, width - margin - statusW + 12, height - 107, fontBold, 10, rgb(0.796, 0.541, 0.016))

    yPos = height - 130
    drawText(tpl.address, margin, yPos, font, 10, rgb(0.392, 0.392, 0.482))
    yPos -= 16
    drawText(`${tpl.email} | ${tpl.phone}`, margin, yPos, font, 10, rgb(0.392, 0.392, 0.482))
    yPos -= 24
    drawLine(margin, yPos, width - margin, yPos, accent, 2)
    yPos -= 24

    drawText('Bill To', margin, yPos, fontBold, 9, rgb(0.58, 0.58, 0.62))
    yPos -= 18
    drawText(customerName, margin, yPos, fontBold, 13, rgb(0.059, 0.059, 0.141))
    yPos -= 18
    if (inv.buyer_email) { drawText(inv.buyer_email, margin, yPos, font, 11, rgb(0.392, 0.392, 0.482)); yPos -= 16 }
    if (inv.buyer_phone) { drawText(inv.buyer_phone, margin, yPos, font, 11, rgb(0.392, 0.392, 0.482)); yPos -= 16 }

    const paymentDetail = getPaymentDetail(inv.payment_method || '', inv.payment_detail || '', tpl.companyName)
    if (paymentDetail) {
      const payX = width / 2 + 20
      drawText('Payment Details', payX, yPos + 20, fontBold, 9, rgb(0.58, 0.58, 0.62))
      drawText(`Method: ${paymentDetail.label}`, payX, yPos + 2, font, 11, rgb(0.2, 0.2, 0.28))
      drawText(`Info: ${paymentDetail.detail}`, payX, yPos - 14, font, 11, rgb(0.2, 0.2, 0.28))
    }
    yPos -= 40

    if (inv.item_name || inv.ticket_title) {
      const ticketName = inv.item_name || inv.ticket_title
      drawRect(margin, yPos - 24, width - margin * 2, 28, rgb(0.941, 0.969, 1))
      page.drawRectangle({ x: margin, y: yPos - 24, width: width - margin * 2, height: 28, borderColor: rgb(0.702, 0.851, 1), borderWidth: 1 })
      drawText(`Ticket: ${ticketName}`, margin + 12, yPos - 6, font, 10, rgb(0, 0.4, 0.8))
      yPos -= 36
    }

    const itemCode = inv.unique_code || '-'
    const qty = inv.quantity || 1
    const priceText = `${cur}${Number(inv.price_per_unit || 0).toLocaleString()}`
    const totalText = `${cur}${Number(inv.total_amount || 0).toLocaleString()}`

    drawRect(margin, yPos - 22, width - margin * 2, 22, rgb(0.945, 0.961, 0.976))
    const cols = [
      { header: 'Item', x: margin, w: width * 0.4 },
      { header: 'Qty', x: margin + width * 0.4, w: width * 0.1 },
      { header: 'Price/Unit', x: margin + width * 0.5, w: width * 0.2 },
      { header: 'Total', x: margin + width * 0.7, w: width * 0.2 },
    ]
    for (const col of cols) { drawText(col.header, col.x + 8, yPos - 6, fontBold, 8, rgb(0.392, 0.392, 0.482)) }
    yPos -= 28
    drawLine(margin, yPos, width - margin, yPos, rgb(0.886, 0.91, 0.941), 1)
    drawText(itemCode, margin + 8, yPos - 14, font, 11, rgb(0.392, 0.392, 0.482))
    drawText(String(qty), cols[1].x + cols[1].w / 2 - font.widthOfTextAtSize(String(qty), 11) / 2, yPos - 14, font, 11, rgb(0, 0, 0))
    drawText(priceText, cols[2].x + cols[2].w - 8 - font.widthOfTextAtSize(priceText, 11), yPos - 14, font, 11, rgb(0, 0, 0))
    drawText(totalText, cols[3].x + cols[3].w - 8 - fontBold.widthOfTextAtSize(totalText, 11), yPos - 14, fontBold, 11, rgb(0, 0, 0))
    yPos -= 28

    const totalX = width - margin - 200
    drawText(`Subtotal: ${cur}${Number(inv.total_amount || 0).toLocaleString()}`, totalX, yPos, font, 11, rgb(0.392, 0.392, 0.482))
    yPos -= 18
    drawText(`Tax (${taxRate}%): ${cur}${taxAmount.toLocaleString()}`, totalX, yPos, font, 11, rgb(0.392, 0.392, 0.482))
    yPos -= 24
    drawLine(totalX, yPos, width - margin, yPos, accent, 2)
    yPos -= 20
    drawText(`Total Due: ${cur}${totalWithTax.toLocaleString()}`, totalX, yPos, fontBold, 16, accent)

    yPos = 40
    drawLine(margin, yPos + 20, width - margin, yPos + 20, rgb(0.886, 0.91, 0.941), 1)
    const footerText = `${tpl.footerText} | ${tpl.companyName} | ${tpl.website}`
    drawText(footerText, (width - font.widthOfTextAtSize(footerText, 9)) / 2, yPos + 6, font, 9, rgb(0.58, 0.58, 0.62))

    const pdfBytes = await pdfDoc.save()
    return btoa(String.fromCharCode(...new Uint8Array(pdfBytes)))
  } catch (err) {
    console.error('[PDF] Generation failed:', err)
    return null
  }
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
      .eq('schedule_type', 'immediate')
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
      const isInvoiceEvent = event === 'invoice.created' || event === 'invoice.paid' || event === 'invoice.overdue'
      let invoiceTemplate: any = payloadTemplate || null
      let txnData: any = null
      let serverPdfBase64: string | null = null

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

            // Generate PDF server-side (replaces client-side PDF attachment)
            serverPdfBase64 = await generateInvoicePdf(txnData, invoiceTemplate)
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
                ...((attachment || pdfAttachment || serverPdfBase64) ? {
                  attachment: [{
                    name: `Invoice-${(txnData?.transaction_id || extraData.invoice_id || 'document')}.pdf`,
                    content: (attachment?.content || pdfAttachment?.content || serverPdfBase64 || ''),
                  }]
                } : {}),
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