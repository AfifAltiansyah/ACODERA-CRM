import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { DEFAULT_TEMPLATE } from '../pages/InvoiceTemplate'
import { generateInvoiceHtml } from './invoiceHtml'

function buildInvoiceElement(invoice, templateOverrides) {
  const tpl = { ...DEFAULT_TEMPLATE, ...(templateOverrides || {}) }
  if (!tpl.companyName) tpl.companyName = DEFAULT_TEMPLATE.companyName
  if (!tpl.logoInitial) tpl.logoInitial = DEFAULT_TEMPLATE.logoInitial
  if (!tpl.currencySymbol) tpl.currencySymbol = DEFAULT_TEMPLATE.currencySymbol || 'Rp'
  if (!tpl.taxRate) tpl.taxRate = DEFAULT_TEMPLATE.taxRate || 0
  if (!tpl.accentColor) tpl.accentColor = DEFAULT_TEMPLATE.accentColor || '#1e40af'

  // Match the invoice HTML's own max-width (600px) so the captured image has no
  // large empty side margins — keeps the PDF proportioned like the on-screen preview.
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:600px;background:#fff;color:#0f172a;'
  container.innerHTML = generateInvoiceHtml(invoice, tpl)

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
    // Preserve aspect ratio — never squash the image to fit the page height.
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // If the invoice is taller than one page, paginate across multiple A4 pages
    // instead of compressing it into a single page (which distorted the layout).
    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight
    while (heightLeft > 0) {
      position -= pdfHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    const base64 = pdf.output('datauristring').split(',')[1]
    return base64
  } finally {
    document.body.removeChild(container)
  }
}
