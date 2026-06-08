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
  const lineItems = invoiceLineItems(txn)
  const itemRowsHtml = lineItems.map((item) => `
    <tr>
      <td style="padding:12px;font-size:13px;border-bottom:1px solid #f1f5f9;">${item.name}<br/><span style="font-size:10px;color:#94a3b8;font-family:monospace;">${item.code}</span></td>
      <td style="padding:12px;font-size:13px;text-align:center;border-bottom:1px solid #f1f5f9;">${item.quantity}</td>
      <td style="padding:12px;font-size:13px;text-align:right;border-bottom:1px solid #f1f5f9;">${cur}${Number(item.price || 0).toLocaleString()}</td>
      <td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${cur}${Number(item.total || 0).toLocaleString()}</td>
    </tr>`).join('')

  let paymentInfoHtml = ''
  if (paymentDetail) {
    paymentInfoHtml = `
      <div style="text-align:right;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Payment Details</p>
        <p style="margin:0;font-size:14px;color:#334155;"><strong>Method:</strong> ${paymentDetail.label}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#334155;"><strong>Info:</strong> ${paymentDetail.detail}</p>
      </div>`
  }

  return `<div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,Helvetica,sans-serif;padding:24px 32px;">

  <table role="presentation" style="width:100%;border-collapse:collapse;border-bottom:2px solid ${accent};margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="width:55%;vertical-align:top;padding-bottom:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${logoSrc ? `<td style="vertical-align:middle;padding-right:8px;"><img src="${logoSrc}" alt="Logo" width="120" height="48" style="display:block;border:0;max-width:120px;max-height:48px;" /></td>` : ''}
            <td style="vertical-align:middle;">
              ${!logoSrc && logoInitial ? `<span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:4px;background:${accent};color:#fff;font-weight:bold;font-size:14px;text-align:center;margin-right:8px;">${logoInitial}</span>` : ''}
              <span style="font-size:16px;font-weight:700;color:${accent};">${companyName}</span>
            </td>
          </tr>
        </table>
        ${address ? `<p style="margin:4px 0 0;font-size:11px;color:#64748b;">${address}</p>` : ''}
        <p style="margin:2px 0 0;font-size:11px;color:#64748b;">${email}${phone ? ' | ' + phone : ''}</p>
      </td>
      <td style="width:45%;vertical-align:top;text-align:right;padding-bottom:12px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:${accent};">INVOICE</p>
        <p style="margin:4px 0 0;font-size:12px;font-weight:600;color:#334155;">${txn.transaction_id || ''}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#64748b;">Date: ${txn.purchased_at ? new Date(txn.purchased_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}</p>
        <span style="display:inline-block;margin-top:6px;padding:2px 12px;border-radius:10px;font-size:11px;font-weight:600;color:${statusColor};background:${statusColor}15;border:1px solid ${statusColor}30;">${statusLabel}</span>
      </td>
    </tr>
  </table>

  <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="width:50%;vertical-align:top;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">Bill To</p>
        <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">${customerName}</p>
        ${customerEmail ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;">${customerEmail}</p>` : ''}
        ${customerPhone ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;">${customerPhone}</p>` : ''}
      </td>
      <td style="width:50%;vertical-align:top;text-align:right;">
        ${paymentInfoHtml}
      </td>
    </tr>
  </table>

  <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">
    <tr style="background:#f1f5f9;">
      <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Item</th>
      <th style="padding:8px 12px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Qty</th>
      <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Price/Unit</th>
      <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Total</th>
    </tr>
    ${itemRowsHtml}
  </table>

  <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="width:60%;"></td>
      <td style="width:40%;">
        <table role="presentation" style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:4px 0;font-size:12px;color:#64748b;text-align:left;">Subtotal</td>
            <td style="padding:4px 0;font-size:12px;color:#64748b;text-align:right;">${cur}${Number(txn.total_amount || 0).toLocaleString()}</td>
          </tr>
          ${taxRate > 0 ? `<tr>
            <td style="padding:4px 0;font-size:12px;color:#64748b;text-align:left;">Tax (${taxRate}%)</td>
            <td style="padding:4px 0;font-size:12px;color:#64748b;text-align:right;">${cur}${taxAmount.toLocaleString()}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:8px 0 0;font-size:14px;font-weight:700;color:${accent};text-align:left;border-top:2px solid ${accent};">Total Due</td>
            <td style="padding:8px 0 0;font-size:14px;font-weight:700;color:${accent};text-align:right;border-top:2px solid ${accent};">${cur}${totalWithTax.toLocaleString()}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding-top:12px;text-align:center;">
        <p style="margin:0;font-size:10px;color:#94a3b8;">${footerText} | ${companyName}${website ? ' | ' + website : ''}</p>
      </td>
    </tr>
  </table>
</div>`
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
        <td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;width:140px;">Payment Method</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${paymentDetail.label}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Payment Details</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${paymentDetail.detail}</td>
      </tr>`
  }

  return `<div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,Helvetica,sans-serif;padding:24px 32px;">

  <table role="presentation" style="width:100%;border-collapse:collapse;border-bottom:2px solid ${accent};margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="width:55%;vertical-align:top;padding-bottom:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${logoSrc ? `<td style="vertical-align:middle;padding-right:8px;"><img src="${logoSrc}" alt="Logo" width="120" height="48" style="display:block;border:0;max-width:120px;max-height:48px;" /></td>` : ''}
            <td style="vertical-align:middle;">
              ${!logoSrc && logoInitial ? `<span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:4px;background:${accent};color:#fff;font-weight:bold;font-size:14px;text-align:center;margin-right:8px;">${logoInitial}</span>` : ''}
              <span style="font-size:16px;font-weight:700;color:${accent};">${companyName}</span>
            </td>
          </tr>
        </table>
        ${address ? `<p style="margin:4px 0 0;font-size:11px;color:#64748b;">${address}</p>` : ''}
        <p style="margin:2px 0 0;font-size:11px;color:#64748b;">${email}${phone ? ' | ' + phone : ''}</p>
      </td>
      <td style="width:45%;vertical-align:top;text-align:right;padding-bottom:12px;">
        <p style="margin:0;font-size:15px;font-weight:700;color:${accent};">PAYMENT REMINDER</p>
        <p style="margin:4px 0 0;font-size:11px;color:#64748b;">${txn.transaction_id || ''}</p>
      </td>
    </tr>
  </table>

  <p style="margin:16px 0 12px;font-size:14px;color:#334155;">Dear <strong>${customerName}</strong>,</p>
  <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.5;">This is a reminder that your payment for <strong style="color:#0f172a;">${itemName}</strong> is still pending. Please complete your payment at your earliest convenience.</p>

  <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:16px;" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="background:${accent};padding:10px 16px;" colspan="2"><p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#fff;">Invoice Details</p></td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;width:140px;">Invoice ID</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${txn.transaction_id || ''}</td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Date</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'2-digit' })}</td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Code</td><td style="padding:10px 16px;font-size:11px;font-weight:600;color:#0f172a;font-family:monospace;border-bottom:1px solid #e2e8f0;">${itemCode}</td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Quantity</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${txn.quantity || 1}</td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Subtotal</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${cur}${Number(txn.total_amount || 0).toLocaleString()}</td></tr>
    ${taxRate > 0 ? `<tr><td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Tax (${taxRate}%)</td><td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${cur}${taxAmount.toLocaleString()}</td></tr>` : ''}
    ${paymentInfoHtml}
    <tr><td style="padding:12px 16px;font-size:14px;font-weight:700;color:${accent};border-top:2px solid ${accent};background:${accent}10;" colspan="2">Total Due &nbsp; ${cur}${totalWithTax.toLocaleString()}</td></tr>
  </table>

  <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px;" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:12px;background:#fef2f2;border-radius:6px;text-align:center;"><p style="margin:0;font-size:13px;font-weight:600;color:#dc2626;">Status: ${statusLabel}</p></td></tr>
  </table>

  <p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.5;">If you have already made this payment, please disregard this reminder. For any questions or concerns, feel free to reply to this email.</p>

  <table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding-top:12px;text-align:center;">
      ${address ? `<p style="margin:0 0 2px;font-size:10px;color:#94a3b8;">${address}</p>` : ''}
      <p style="margin:0;font-size:10px;color:#94a3b8;">${footerText} | ${companyName}${website ? ' | ' + website : ''}</p>
    </td></tr>
  </table>
</div>`
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
    const dt = inv.purchased_at ? new Date(inv.purchased_at) : new Date(inv.created_at)
    const dateTime = dt.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })

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
    const margin = 56

    function drawText(text: string, x: number, y: number, fnt: any, size: number, color: any) {
      page.drawText(text, { x, y, font: fnt, size, color: color || rgb(0, 0, 0) })
    }
    function wrapText(text: string, fnt: any, size: number, maxWidth: number): string[] {
      const source = String(text || '')
      if (!source) return ['']
      const lines: string[] = []
      const words = source.split(/\s+/)

      for (const word of words) {
        const chunks: string[] = []
        let chunk = ''
        for (const char of word) {
          const next = chunk + char
          if (chunk && fnt.widthOfTextAtSize(next, size) > maxWidth) {
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
          if (last && fnt.widthOfTextAtSize(nextLine, size) <= maxWidth) {
            lines[lines.length - 1] = nextLine
          } else {
            lines.push(part)
          }
        }
      }

      return lines.length > 0 ? lines : ['']
    }
    function drawWrappedText(text: string, x: number, y: number, fnt: any, size: number, color: any, maxWidth: number, lineHeight = size + 2) {
      const lines = wrapText(text, fnt, size, maxWidth)
      lines.forEach((line, index) => {
        drawText(line, x, y - index * lineHeight, fnt, size, color)
      })
      return lines.length * lineHeight
    }
    function drawRect(x: number, y: number, w: number, h: number, fillColor: any) {
      page.drawRectangle({ x, y, width: w, height: h, color: fillColor })
    }
    function drawLine(x1: number, y1: number, x2: number, y2: number, color: any, lineWidth = 1) {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        color: color || rgb(0.8, 0.8, 0.8),
        thickness: lineWidth,
      })
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

    const rightColX = width * 0.52
    const logo = await embedLogo()
    let nameX = margin
    if (logo) {
      const logoDims = logo.scaleToFit(32, 32)
      page.drawImage(logo, { x: margin, y: yPos - logoDims.height, width: logoDims.width, height: logoDims.height })
      nameX = margin + logoDims.width + 8
    } else if (tpl.logoInitial) {
      drawRect(margin, yPos - 28, 28, 28, accent)
      drawText(tpl.logoInitial, margin + 7, yPos - 10, fontBold, 14, rgb(1, 1, 1))
      nameX = margin + 36
    }
    drawText(tpl.companyName, nameX, yPos - 12, fontBold, 16, accent)

    const invText = 'INVOICE'
    drawText(invText, rightColX, yPos - 12, fontBold, 18, accent)
    yPos -= 22

    if (tpl.address) {
      drawText(tpl.address, margin, yPos, font, 9, rgb(0.392, 0.392, 0.482))
    }
    const tidText = inv.transaction_id || ''
    drawText(tidText, rightColX, yPos - 2, font, 11, rgb(0.392, 0.392, 0.482))
    yPos -= 14

    const contactLine = `${tpl.email}${tpl.phone ? ' | ' + tpl.phone : ''}`
    drawText(contactLine, margin, yPos, font, 9, rgb(0.392, 0.392, 0.482))
    const dateText = `Date: ${dateTime}`
    drawText(dateText, rightColX, yPos - 2, font, 9, rgb(0.392, 0.392, 0.482))
    yPos -= 14

    const statusLabel = inv.status === 'paid' ? 'Paid' : inv.status === 'cancelled' ? 'Cancelled' : 'Pending'
    const statusColor = inv.status === 'paid' ? rgb(0.086, 0.639, 0.29) : inv.status === 'cancelled' ? rgb(0.863, 0.149, 0.149) : rgb(0.796, 0.541, 0.016)
    const statusW = font.widthOfTextAtSize(statusLabel, 9) + 16
    drawRect(rightColX, yPos - 3, statusW, 16, rgb(0.96, 0.96, 0.98))
    drawText(statusLabel, rightColX + 8, yPos + 8, font, 9, statusColor)
    yPos -= 6

    drawLine(margin, yPos, width - margin, yPos, accent, 2)
    yPos -= 20

    drawText('Bill To', margin, yPos, fontBold, 8, rgb(0.58, 0.58, 0.62))
    yPos -= 14
    drawText(customerName, margin, yPos, fontBold, 13, rgb(0.059, 0.059, 0.141))
    yPos -= 16
    if (inv.buyer_email) { drawText(inv.buyer_email, margin, yPos, font, 10, rgb(0.392, 0.392, 0.482)); yPos -= 14 }
    if (inv.buyer_phone) { drawText(inv.buyer_phone, margin, yPos, font, 10, rgb(0.392, 0.392, 0.482)); yPos -= 14 }

    const saveBillToY = yPos

    const paymentDetail = getPaymentDetail(inv.payment_method || '', inv.payment_detail || '', tpl.companyName, branchId)
    if (paymentDetail) {
      const payX = rightColX
      drawText('Payment Details', payX, saveBillToY, fontBold, 8, rgb(0.58, 0.58, 0.62))
      drawText(`Method: ${paymentDetail.label}`, payX, saveBillToY - 16, font, 10, rgb(0.2, 0.2, 0.28))
      drawText(`Info: ${paymentDetail.detail}`, payX, saveBillToY - 30, font, 10, rgb(0.2, 0.2, 0.28))
    }
    yPos -= 30

    if (inv.item_name || inv.ticket_title) {
      const ticketName = inv.item_name || inv.ticket_title
      drawRect(margin, yPos - 24, width - margin * 2, 28, rgb(0.941, 0.969, 1))
      page.drawRectangle({
        x: margin, y: yPos - 24,
        width: width - margin * 2, height: 28,
        borderColor: rgb(0.702, 0.851, 1), borderWidth: 1,
      })
      drawText(`Ticket: ${ticketName}`, margin + 12, yPos - 6, font, 10, rgb(0, 0.4, 0.8))
      yPos -= 36
    }

    const lineItems = invoiceLineItems(inv)

    const tableWidth = width - margin * 2
    const cols = [
      { header: 'Item', x: margin, w: 240 },
      { header: 'Qty', x: margin + 240, w: 48 },
      { header: 'Price/Unit', x: margin + 288, w: 92 },
      { header: 'Total', x: margin + 380, w: tableWidth - 380 },
    ]
    drawRect(margin, yPos - 22, tableWidth, 22, rgb(0.945, 0.961, 0.976))
    for (const col of cols) {
      drawText(col.header, col.x + 8, yPos - 6, fontBold, 8, rgb(0.392, 0.392, 0.482))
    }
    yPos -= 28
    for (const item of lineItems) {
      const qty = String(item.quantity || 1)
      const priceText = `${cur}${Number(item.price || 0).toLocaleString()}`
      const totalText = `${cur}${Number(item.total || 0).toLocaleString()}`
      const nameLines = wrapText(item.name || 'Invoice Item', fontBold, 9, cols[0].w - 16)
      const codeLines = wrapText(item.code || '-', font, 8, cols[0].w - 16)
      const rowHeight = Math.max(30, 10 + (nameLines.length * 11) + (codeLines.length * 10))

      drawLine(margin, yPos, width - margin, yPos, rgb(0.886, 0.91, 0.941), 1)
      let itemY = yPos - 12
      itemY -= drawWrappedText(item.name || 'Invoice Item', margin + 8, itemY, fontBold, 9, rgb(0.059, 0.059, 0.141), cols[0].w - 16, 11)
      drawWrappedText(item.code || '-', margin + 8, itemY + 1, font, 8, rgb(0.392, 0.392, 0.482), cols[0].w - 16, 10)
      drawText(qty, cols[1].x + cols[1].w / 2 - font.widthOfTextAtSize(qty, 10) / 2, yPos - 14, font, 10, rgb(0, 0, 0))
      drawText(priceText, cols[2].x + cols[2].w - 8 - font.widthOfTextAtSize(priceText, 10), yPos - 14, font, 10, rgb(0, 0, 0))
      drawText(totalText, cols[3].x + cols[3].w - 8 - fontBold.widthOfTextAtSize(totalText, 10), yPos - 14, fontBold, 10, rgb(0, 0, 0))
      yPos -= rowHeight
    }

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
    const footerLine = `${tpl.footerText} | ${tpl.companyName} | ${tpl.website}`
    drawText(footerLine, (width - font.widthOfTextAtSize(footerLine, 9)) / 2, yPos + 6, font, 9, rgb(0.58, 0.58, 0.62))

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
