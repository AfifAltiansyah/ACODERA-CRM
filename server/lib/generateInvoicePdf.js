import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

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

function getPaymentDetail(method, detail, companyName) {
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

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  } : { r: 0.118, g: 0.251, b: 0.686 }
}

async function fetchImageAsUint8Array(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return new Uint8Array(await res.arrayBuffer())
  } catch { return null }
}

async function embedLogo(pdfDoc, tpl) {
  if (!tpl.logoUrl) return null
  try {
    const bytes = await fetchImageAsUint8Array(tpl.logoUrl)
    if (!bytes || bytes.length < 2) return null
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await pdfDoc.embedPng(bytes)
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) return await pdfDoc.embedJpg(bytes)
    const ext = tpl.logoUrl.split('.').pop()?.toLowerCase()
    if (ext === 'png') return await pdfDoc.embedPng(bytes)
    if (ext === 'jpg' || ext === 'jpeg') return await pdfDoc.embedJpg(bytes)
  } catch (e) {
    console.error('[PDF] Failed to embed logo:', e.message)
  }
  return null
}

export async function generateInvoicePdfBase64(invoice, templateOverrides) {
  const DEFAULT_TEMPLATE = {
    companyName: 'Acodera CRM',
    logoInitial: 'A',
    logoUrl: '',
    accentColor: '#1e40af',
    address: 'Jl. Sudirman No. 123, Jakarta 10220',
    email: 'contact@acodera.com',
    phone: '+62 21 555 0100',
    website: 'https://acodera.com',
    footerText: 'Thank you for your business!',
    taxRate: 0,
    currencySymbol: 'Rp',
  }

  const tpl = { ...DEFAULT_TEMPLATE, ...(templateOverrides || {}) }
  if (tpl.companyName === null || tpl.companyName === undefined) tpl.companyName = DEFAULT_TEMPLATE.companyName
  if (tpl.logoInitial === null || tpl.logoInitial === undefined) tpl.logoInitial = DEFAULT_TEMPLATE.logoInitial

  const accent = hexToRgb(tpl.accentColor || '#1e40af')
  const cur = tpl.currencySymbol || '$'
  const taxRate = tpl.taxRate || 0
  const taxAmount = (invoice.totalAmount || 0) * (taxRate / 100)
  const totalWithTax = (invoice.totalAmount || 0) + taxAmount
  const paymentDetail = getPaymentDetail(invoice.paymentMethod, invoice.paymentDetail, tpl.companyName)
  const statusColor = invoice.status === 'paid' ? { r: 0.086, g: 0.639, b: 0.29 } : { r: 0.796, g: 0.541, b: 0.016 }
  const statusLabel = invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Pending'
  const customerName = invoice.customerName || 'Walk-in Customer'

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const margin = 56
  let y = height - 48

  // Helper functions
  function drawText(text, x, yPos, fnt, size, color) {
    page.drawText(text, { x, y: yPos, font: fnt, size, color: color || rgb(0, 0, 0) })
  }

  function drawRect(x, yPos, w, h, fillColor) {
    page.drawRectangle({ x, y: yPos, width: w, height: h, color: fillColor })
  }

  function drawLine(x1, y1, x2, y2, color, lineWidth) {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color: color || rgb(0.8, 0.8, 0.8), thickness: lineWidth || 1 })
  }

  // Header bar
  drawRect(0, height - 88, width, 88, accent)
  const logo = await embedLogo(pdfDoc, tpl)
  let nameX = margin
  if (logo) {
    const logoDims = logo.scaleToFit(36, 36)
    page.drawImage(logo, { x: margin, y: height - 48 - logoDims.height, width: logoDims.width, height: logoDims.height })
    nameX = margin + logoDims.width + 12
  }
  drawText(tpl.companyName, nameX, height - 58, fontBold, 20, rgb(1, 1, 1))
  drawText('INVOICE', width - margin - fontBold.widthOfTextAtSize('INVOICE', 24), height - 54, fontBold, 24, rgb(1, 1, 1))
  drawText(invoice.transactionId || '', width - margin - fontBold.widthOfTextAtSize(invoice.transactionId || '', 12), height - 78, font, 12, rgb(0.85, 0.85, 0.85))
  drawText(`Date: ${invoice.dateTime || ''}`, width - margin - font.widthOfTextAtSize(`Date: ${invoice.dateTime || ''}`, 10), height - 92, font, 10, rgb(0.85, 0.85, 0.85))

  // Status badge
  const statusText = statusLabel
  const statusW = fontBold.widthOfTextAtSize(statusText, 10) + 24
  const statusX = width - margin - statusW
  drawRect(statusX, height - 112, statusW, 20, rgb(1, 1, 1))
  page.drawRectangle({ x: statusX, y: height - 112, width: statusW, height: 20, color: rgb(1, 1, 1), opacity: 0.9, borderColor: statusColor, borderWidth: 1 })
  drawText(statusText, statusX + 12, height - 107, fontBold, 10, statusColor)

  y = height - 130

  // Company info
  drawText(tpl.address, margin, y, font, 10, rgb(0.392, 0.392, 0.482))
  y -= 16
  drawText(`${tpl.email} | ${tpl.phone}`, margin, y, font, 10, rgb(0.392, 0.392, 0.482))
  y -= 24

  // Divider
  drawLine(margin, y, width - margin, y, accent, 2)
  y -= 24

  // Bill To
  drawText('Bill To', margin, y, fontBold, 9, rgb(0.58, 0.58, 0.62))
  y -= 18
  drawText(customerName, margin, y, fontBold, 13, rgb(0.059, 0.059, 0.141))
  y -= 18
  if (invoice.customerEmail) {
    drawText(invoice.customerEmail, margin, y, font, 11, rgb(0.392, 0.392, 0.482))
    y -= 16
  }
  if (invoice.customerPhone) {
    drawText(invoice.customerPhone, margin, y, font, 11, rgb(0.392, 0.392, 0.482))
    y -= 16
  }

  // Payment Details (right side)
  if (paymentDetail) {
    const payX = width / 2 + 20
    drawText('Payment Details', payX, y + 20, fontBold, 9, rgb(0.58, 0.58, 0.62))
    drawText(`Method: ${paymentDetail.label}`, payX, y + 2, font, 11, rgb(0.2, 0.2, 0.28))
    drawText(`Info: ${paymentDetail.detail}`, payX, y - 14, font, 11, rgb(0.2, 0.2, 0.28))
  }

  y -= 40

  // Ticket info
  if (invoice.itemName) {
    drawRect(margin, y - 24, width - margin * 2, 28, rgb(0.941, 0.969, 1))
    page.drawRectangle({ x: margin, y: y - 24, width: width - margin * 2, height: 28, borderColor: rgb(0.702, 0.851, 1), borderWidth: 1 })
    drawText(`Ticket: ${invoice.itemName}`, margin + 12, y - 6, font, 10, rgb(0, 0.4, 0.8))
    y -= 36
  }

  // Table header
  const cols = [
    { header: 'Item', x: margin, w: width * 0.4 },
    { header: 'Qty', x: margin + width * 0.4, w: width * 0.1 },
    { header: 'Price/Unit', x: margin + width * 0.5, w: width * 0.2 },
    { header: 'Total', x: margin + width * 0.7, w: width * 0.2 },
  ]

  drawRect(margin, y - 22, width - margin * 2, 22, rgb(0.945, 0.961, 0.976))
  for (const col of cols) {
    drawText(col.header, col.x + 8, y - 6, fontBold, 8, rgb(0.392, 0.392, 0.482))
  }
  y -= 28

  // Table row
  drawLine(margin, y, width - margin, y, rgb(0.886, 0.91, 0.941), 1)
  const itemText = invoice.itemCode || '-'
  drawText(itemText, margin + 8, y - 14, font, 11, rgb(0.392, 0.392, 0.482))
  drawText(String(invoice.quantity || 1), cols[1].x + cols[1].w / 2 - font.widthOfTextAtSize(String(invoice.quantity || 1), 11) / 2, y - 14, font, 11, rgb(0, 0, 0))
  const priceText = `${cur}${Number(invoice.pricePerUnit || 0).toLocaleString()}`
  drawText(priceText, cols[2].x + cols[2].w - 8 - font.widthOfTextAtSize(priceText, 11), y - 14, font, 11, rgb(0, 0, 0))
  const totalText = `${cur}${Number(invoice.totalAmount || 0).toLocaleString()}`
  drawText(totalText, cols[3].x + cols[3].w - 8 - fontBold.widthOfTextAtSize(totalText, 11), y - 14, fontBold, 11, rgb(0, 0, 0))
  y -= 28

  // Totals
  const totalX = width - margin - 200
  const subtotalText = `Subtotal: ${cur}${Number(invoice.totalAmount || 0).toLocaleString()}`
  drawText(subtotalText, totalX, y, font, 11, rgb(0.392, 0.392, 0.482))
  y -= 18
  const taxText = `Tax (${taxRate}%): ${cur}${taxAmount.toLocaleString()}`
  drawText(taxText, totalX, y, font, 11, rgb(0.392, 0.392, 0.482))
  y -= 24
  drawLine(totalX, y, width - margin, y, accent, 2)
  y -= 20
  const dueText = `Total Due: ${cur}${totalWithTax.toLocaleString()}`
  drawText(dueText, totalX, y, fontBold, 16, accent)

  // Footer
  y = 40
  drawLine(margin, y + 20, width - margin, y + 20, rgb(0.886, 0.91, 0.941), 1)
  const footerText = `${tpl.footerText} | ${tpl.companyName} | ${tpl.website}`
  const footerW = font.widthOfTextAtSize(footerText, 9)
  drawText(footerText, (width - footerW) / 2, y + 6, font, 9, rgb(0.58, 0.58, 0.62))

  const pdfBytes = await pdfDoc.save()
  const base64 = Buffer.from(pdfBytes).toString('base64')
  return base64
}
