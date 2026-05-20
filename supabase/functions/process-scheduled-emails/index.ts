// Supabase Edge Function: process-scheduled-emails
// Called every minute by pg_cron (Supabase PostgreSQL cron) to send scheduled emails
// Auth: requires Authorization header with Supabase anon key or service role key

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { sendEmail } from '../_shared/brevo.ts'
import { getPaymentDetail, refreshPaymentOptions } from '../_shared/paymentOptions.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || 'https://acodera-crm.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'noreply@acodera.com'

function generateInvoiceReminderHtml(txn: any, template: any, statusLabel: string, branchId?: string) {
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
  const paymentDetail = getPaymentDetail(txn.payment_method || '', txn.payment_detail || '', companyName, branchId)
  const itemName = txn.unique_code || txn.transaction_id || 'Invoice Item'

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
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.5;">If you have already made this payment, please disregard this reminder.</p>
  </div>
  <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
    ${address ? `<p style="margin:0 0 4px;font-size:11px;color:#94a3b8;">${address}</p>` : ''}
    <p style="margin:0;font-size:12px;color:#94a3b8;">${footerText} | ${companyName} | ${email}${phone ? ' | ' + phone : ''}${website ? ' | ' + website : ''}</p>
  </div>
</div>
</body>
</html>`
}

async function generateInvoicePdf(inv: any, template: any, branchId?: string) {
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

    const paymentDetail = getPaymentDetail(inv.payment_method || '', inv.payment_detail || '', tpl.companyName, branchId)
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
    // These env vars are automatically provided by Supabase to Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Supabase credentials not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify service role key in apikey header (called by pg_cron with the Supabase service key)
    const apiKey = req.headers.get('apikey')
    if (apiKey !== supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date().toISOString()

    // ─── Handle invoice.overdue automations ────────────────────────────
    const { data: overdueAutos } = await supabase
      .from('automations')
      .select('*')
      .eq('trigger_event', 'invoice.overdue')
      .eq('status', 'active')

    if (overdueAutos && overdueAutos.length > 0) {
      const { data: pendingInvoices } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'pending')

      if (pendingInvoices && pendingInvoices.length > 0) {
        const seen = new Set<string>()
        for (const inv of pendingInvoices) {
          if (!inv.buyer_email || seen.has(inv.buyer_email)) continue
          seen.add(inv.buyer_email)

          for (const auto of overdueAutos) {
            // Skip if already sent to this buyer in the last 24h
            const { data: recent } = await supabase
              .from('automation_logs')
              .select('id')
              .eq('automation_id', auto.id)
              .eq('contact_email', inv.buyer_email)
              .eq('status', 'sent')
              .gte('sent_at', new Date(Date.now() - 86400000).toISOString())
              .limit(1)
            if (recent && recent.length > 0) continue

            // Fetch invoice template for this branch
            let invoiceTemplate: any = null
            if (inv.branch) {
              try {
                const { data: users, error: tplErr } = await supabase
                  .from('users')
                  .select('invoice_template')
                  .eq('branch_id', inv.branch)
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

              // Load per-branch payment options from DB
              if (inv.branch) {
                await refreshPaymentOptions(inv.branch)
              }
            }

            // Generate invoice preview HTML if no custom body
            let subject = auto.subject || `Payment Reminder - ${inv.transaction_id}`
            let htmlBody: string
            if (!auto.body || auto.body.trim() === '') {
              htmlBody = generateInvoiceReminderHtml(inv, invoiceTemplate, 'Pending', inv.branch)
            } else {
              htmlBody = auto.body
              const tpl = invoiceTemplate || {}
              htmlBody = htmlBody.replace(/\{\{name\}\}/g, inv.buyer_name || 'Customer')
              htmlBody = htmlBody.replace(/\{\{email\}\}/g, inv.buyer_email || '')
              htmlBody = htmlBody.replace(/\{\{event\}\}/g, 'invoice.overdue')
              htmlBody = htmlBody.replace(/\{\{companyInitial\}\}/g, (tpl.logoInitial ?? 'A'))
              htmlBody = htmlBody.replace(/\{\{companyName\}\}/g, (tpl.companyName ?? 'Acodera CRM'))
              htmlBody = htmlBody.replace(/\{\{companyAddress\}\}/g, (tpl.address || ''))
              htmlBody = htmlBody.replace(/\{\{companyEmail\}\}/g, (tpl.email || SENDER_EMAIL))
              htmlBody = htmlBody.replace(/\{\{companyPhone\}\}/g, (tpl.phone || ''))
              htmlBody = htmlBody.replace(/\{\{companyWebsite\}\}/g, (tpl.website || ''))
              htmlBody = htmlBody.replace(/\{\{invoiceStatus\}\}/g, 'Pending')
              htmlBody = htmlBody.replace(/\{\{invoiceDate\}\}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }))
              htmlBody = htmlBody.replace(/\{\{invoice_id\}\}/g, inv.transaction_id || '')
              htmlBody = htmlBody.replace(/\{\{transactionId\}\}/g, inv.transaction_id || '')
              htmlBody = htmlBody.replace(/\{\{itemName\}\}/g, (inv.item_name || inv.unique_code || 'Item'))
              htmlBody = htmlBody.replace(/\{\{quantity\}\}/g, String(inv.quantity || 1))
              htmlBody = htmlBody.replace(/\{\{amount\}\}/g, String(Number(inv.total_amount) || 0))
              htmlBody = htmlBody.replace(/\{\{totalAmount\}\}/g, String(Number(inv.total_amount) || 0))
              htmlBody = htmlBody.replace(/\{\{paymentMethod\}\}/g, (inv.payment_method || '—'))
              htmlBody = htmlBody.replace(/\{\{paymentDetail\}\}/g, (inv.payment_detail || '—'))
              htmlBody = htmlBody.replace(/\{\{buyer_phone\}\}/g, (inv.buyer_phone || '—'))
              htmlBody = htmlBody.replace(/\{\{pricePerUnit\}\}/g, (inv.price_per_unit ? String(inv.price_per_unit) : String(Number(inv.total_amount || 0))))
              htmlBody = htmlBody.replace(/\{\{itemCode\}\}/g, (inv.unique_code || '—'))
              htmlBody = htmlBody.replace(/\{\{taxAmount\}\}/g, (tpl.taxRate ? String(Number(inv.total_amount || 0) * (Number(tpl.taxRate) / 100)) : '0'))
              htmlBody = htmlBody.replace(/\{\{totalWithTax\}\}/g, (tpl.taxRate ? String(Number(inv.total_amount || 0) + Number(inv.total_amount || 0) * (Number(tpl.taxRate) / 100)) : String(Number(inv.total_amount || 0))))
              for (const [key, val] of Object.entries(inv)) {
                if (typeof val === 'string' || typeof val === 'number') {
                  const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
                  htmlBody = htmlBody.replace(regex, String(val))
                  subject = subject.replace(regex, String(val))
                }
              }
            }

            // Generate PDF attachment
            const pdfBase64 = await generateInvoicePdf(inv, invoiceTemplate, inv.branch)

            try {
              const result = await sendEmail({
                to: inv.buyer_email,
                subject,
                htmlContent: htmlBody,
                fromName: auto.from_name || 'Acodera CRM',
                attachments: pdfBase64 ? [{ name: `Invoice-${inv.transaction_id}.pdf`, content: pdfBase64 }] : undefined,
              })

              if (result.success) {
                await supabase.from('automation_logs').insert([{
                  automation_id: auto.id, contact_email: inv.buyer_email, subject, status: 'sent',
                  error: result.messageId ? `messageId: ${result.messageId}` : null,
                }])
              } else {
                await supabase.from('automation_logs').insert([{
                  automation_id: auto.id, contact_email: inv.buyer_email, subject,
                  status: 'failed', error: result.error,
                }])
              }
            } catch (err) {
              await supabase.from('automation_logs').insert([{
                automation_id: auto.id, contact_email: inv.buyer_email, subject,
                status: 'failed', error: err instanceof Error ? err.message : String(err),
              }])
            }
          }
        }
      }
    }

    // ─── Expire pending invoices & return tickets to available ─────────
    const { data: expired } = await supabase
      .from('transactions')
      .select('id, transaction_id, unique_code, total_amount, buyer_name, buyer_email, branch')
      .eq('status', 'pending')
      .lt('expires_at', now)

    if (expired && expired.length > 0) {
      for (const txn of expired) {
        await supabase.from('automation_logs').insert([{
          contact_email: txn.buyer_email || '',
          subject: `Invoice ${txn.transaction_id} expired`,
          status: 'expired',
          error: JSON.stringify({
            transaction_id: txn.transaction_id,
            amount: txn.total_amount,
            buyer: txn.buyer_name,
          }),
          branch: txn.branch || null,
        }])
        await supabase.from('transactions').update({
          status: 'available',
          transaction_id: `TKT-AVAIL-${txn.unique_code}`,
          buyer_name: '', buyer_email: '', buyer_phone: '',
          payment_method: '', payment_detail: '',
          purchased_at: null, expires_at: null,
        }).eq('id', txn.id)
      }
    }

    // ─── Process scheduled emails ──────────────────────────────────────
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', now)
      .limit(100)

    if (fetchError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch: ' + fetchError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending emails', sent: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    let failed = 0

    for (const email of pendingEmails) {
      const { error: updateError } = await supabase
        .from('scheduled_emails')
        .update({ status: 'sending' })
        .eq('id', email.id)

      if (updateError) {
        failed++
        continue
      }

      let emailAttachments: Array<{ name: string; content: string }> | undefined
      if (email.attachments) {
        try {
          const parsed = typeof email.attachments === 'string' ? JSON.parse(email.attachments) : email.attachments
          if (Array.isArray(parsed)) emailAttachments = parsed
        } catch { /* ignore */ }
      }

      try {
        const result = await sendEmail({
          to: email.to_email,
          subject: email.subject,
          htmlContent: email.body || `<p>${email.subject}</p>`,
          fromName: email.from_name || 'Acodera CRM',
          attachments: emailAttachments,
        })

        if (result.success) {
          await supabase
            .from('scheduled_emails')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', email.id)

          if (email.automation_id) {
            try {
              await supabase.from('automation_logs').insert([{
                automation_id: email.automation_id,
                contact_email: email.to_email,
                subject: email.subject,
                status: 'sent',
              }])
            } catch { /* ignore */ }
          }
          sent++
        } else {
          const errorMsg = result.error || 'Unknown error'
          await supabase
            .from('scheduled_emails')
            .update({ status: 'failed', error: errorMsg })
            .eq('id', email.id)

          if (email.automation_id) {
            try {
              await supabase.from('automation_logs').insert([{
                automation_id: email.automation_id,
                contact_email: email.to_email,
                subject: email.subject,
                status: 'failed',
                error: errorMsg,
              }])
            } catch { /* ignore */ }
          }
          failed++
        }
      } catch (err) {
        await supabase
          .from('scheduled_emails')
          .update({ status: 'failed', error: err.message })
          .eq('id', email.id)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: pendingEmails.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})