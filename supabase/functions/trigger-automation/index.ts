import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { sendEmail } from '../_shared/brevo.ts'
import { refreshPaymentOptions } from '../_shared/paymentOptions.ts'
import {
  generateInvoiceHtml,
  generateInvoiceReminderHtml,
  generateInvoicePdf,
  replaceTemplateVars,
  fetchInvoiceTemplate,
  logEmailResult,
} from '../_shared/invoice.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || 'https://acodera-crm.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'noreply@acodera.com'
const AUTOMATION_SECRET = Deno.env.get('AUTOMATION_SECRET')

function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!AUTOMATION_SECRET) {
      return corsResponse({ success: false, error: 'AUTOMATION_SECRET not configured' }, 500)
    }

    const apiKeyHeader = req.headers.get('apikey')
    const authHeader = req.headers.get('authorization')

    if (apiKeyHeader === AUTOMATION_SECRET) {
      // Service-to-service call authorized
    } else if (authHeader?.startsWith('Bearer ')) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      if (!supabaseUrl || !supabaseKey) {
        return corsResponse({ success: false, error: 'Supabase credentials not configured' }, 500)
      }
      const supabaseAuth = createClient(supabaseUrl, supabaseKey)
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(authHeader.slice(7))
      if (userError || !user) {
        return corsResponse({ success: false, error: 'Unauthorized' }, 401)
      }
    } else {
      return corsResponse({ success: false, error: 'Unauthorized' }, 401)
    }

    const url = new URL(req.url)
    const event = url.searchParams.get('event')

    if (!event) {
      return corsResponse({ success: false, error: 'Missing ?event= parameter' })
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
      return corsResponse({ success: false, error: 'Supabase credentials not configured' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: automations, error: fetchError } = await supabase
      .from('automations')
      .select('*')
      .eq('trigger_event', event)
      .eq('schedule_type', 'immediate')
      .eq('status', 'active')

    if (fetchError) {
      return corsResponse({ success: false, error: 'Failed to query automations: ' + fetchError.message })
    }

    if (!automations || automations.length === 0) {
      return corsResponse({ success: true, event, message: 'No active automations for this event', triggered: 0 })
    }

    const results = []

    for (const auto of automations) {
      const isEmail = auto.type === 'Email Drip' || auto.type === 'Marketing Campaign' || auto.type === 'Invoice Reminder'
      let recipients: string[] = []

      if (contactEmail) {
        recipients = [contactEmail]
      } else if (auto.type === 'Invoice Reminder' || event === 'invoice.overdue' || event === 'invoice.paid' || event === 'invoice.cancelled') {
        if (extraData.buyer_email) {
          recipients = [String(extraData.buyer_email)]
        } else {
          const { data: invoices } = await supabase
            .from('transactions')
            .select('buyer_email')
            .eq('status', 'pending')
          if (invoices) {
            const seen = new Set()
            recipients = invoices.map((i: { buyer_email: string }) => i.buyer_email)
              .filter((e: string) => e && e.trim() !== '' && !seen.has(e) && seen.add(e))
          }
        }
      } else if (isEmail || event === 'contact.created' || event === 'contact.updated' || event === 'contact.subscribed') {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('email')
        if (contacts) {
          const seen = new Set()
          if (contactEmail) {
            recipients = [contactEmail]
          } else {
            recipients = contacts.map((c: { email: string }) => c.email)
              .filter((e: string) => e && e.trim() !== '' && !seen.has(e) && seen.add(e))
          }
        }
      } else if (event === 'ticket.purchased') {
        if (extraData.buyer_email) recipients = [String(extraData.buyer_email)]
      } else if (event === 'deal.won' || event === 'deal.lost' || event === 'deal.stage_change' || event === 'deal.created') {
        if (extraData.email) recipients = [String(extraData.email)]
      } else if (event === 'review.submitted') {
        if (extraData.email) recipients = [String(extraData.email)]
      }

      if (recipients.length === 0 && isEmail) {
        results.push({ automation_id: auto.id, name: auto.name, status: 'skipped', reason: 'No recipients' })
        continue
      }

      let subject = auto.subject || `Notification: ${event}`
      let htmlBody = auto.body || `<p>${subject}</p>`
      const fromName = auto.from_name || 'Acodera CRM'

      const isInvoiceEvent = event === 'invoice.created' || event === 'invoice.paid' || event === 'invoice.overdue' || event === 'invoice.cancelled'
      let invoiceTemplate: any = payloadTemplate || null
      let txnData: any = null
      let serverPdfBase64: string | null = null

      if (isInvoiceEvent) {
        try {
          let invoiceId = extraData.invoice_id as string | undefined

          if (invoiceId) {
            const { data: txns } = await supabase
              .from('transactions')
              .select('*')
              .eq('transaction_id', String(invoiceId))
              .limit(1)

            if (txns && txns.length > 0) {
              txnData = txns[0]
            }
          }

          if (!txnData && extraData.buyer_email) {
            const { data: txns } = await supabase
              .from('transactions')
              .select('*')
              .eq('buyer_email', String(extraData.buyer_email))
              .order('created_at', { ascending: false })
              .limit(1)

            if (txns && txns.length > 0) {
              txnData = txns[0]
            }
          }

          if (txnData) {
            txnData.item_name = extraData.itemName || extraData.item_name || txnData.item_name || ''
            txnData.itemCode = extraData.itemCode || txnData.itemCode || txnData.unique_code || ''
            txnData.ticket_title = extraData.ticket_title || txnData.ticket_title || ''

            if (txnData.ticket_id) {
              try {
                const { data: tk } = await supabase
                  .from('tickets')
                  .select('title, abbreviation')
                  .eq('id', txnData.ticket_id)
                  .single()
                if (tk) {
                  txnData.ticket_title = txnData.ticket_title || tk.title || ''
                  txnData.item_name = txnData.item_name || tk.title || ''
                  txnData.itemCode = txnData.itemCode || tk.abbreviation || ''
                }
              } catch { /* ignore */ }
            }

            if (txnData.branch) {
              await refreshPaymentOptions(txnData.branch)
            }

            if (!invoiceTemplate && txnData.branch) {
              invoiceTemplate = await fetchInvoiceTemplate(supabase, txnData.branch)
            }

            const statusLabel = event === 'invoice.paid' ? 'Paid' : event === 'invoice.overdue' ? 'Overdue' : event === 'invoice.cancelled' ? 'Cancelled' : 'Pending'

            if (event === 'invoice.overdue' || auto.type === 'Invoice Reminder') {
              htmlBody = generateInvoiceReminderHtml(txnData, invoiceTemplate, statusLabel, txnData.branch)
            } else {
              htmlBody = generateInvoiceHtml(txnData, invoiceTemplate, statusLabel, txnData.branch)
            }
            subject = auto.subject || (event === 'invoice.paid'
              ? `Payment Received - ${txnData.transaction_id}`
              : event === 'invoice.overdue'
                ? `Payment Overdue - ${txnData.transaction_id}`
                : event === 'invoice.cancelled'
                  ? `Invoice Cancelled - ${txnData.transaction_id}`
                  : `Invoice Created - ${txnData.transaction_id}`)

            serverPdfBase64 = await generateInvoicePdf(txnData, invoiceTemplate, txnData.branch)
            if (serverPdfBase64) {
              console.log('[trigger-automation] PDF generated server-side for', txnData.transaction_id, 'length:', serverPdfBase64.length)
            } else {
              console.error('[trigger-automation] PDF generation returned null for', txnData.transaction_id)
            }
          } else {
            console.warn('[trigger-automation] No transaction found for invoice event', event, 'invoice_id:', extraData.invoice_id)
          }
        } catch (err) {
          console.error('[trigger-automation] Failed to fetch invoice data:', err)
        }
      }

      const replaced = replaceTemplateVars(htmlBody, subject, txnData || extraData, invoiceTemplate || {}, {
        contactName,
        contactEmail,
        event,
        senderEmail: SENDER_EMAIL,
      })
      htmlBody = replaced.htmlBody
      subject = replaced.subject

      if (isEmail) {
        let sent = 0
        let failed = 0
        for (const email of recipients) {
          try {
            // Prefer server-generated PDF, then frontend attachment, then pdf_attachment
            const attachmentContent = serverPdfBase64 || attachment?.content || pdfAttachment?.content
            const invoiceFileName = txnData?.transaction_id || extraData.invoice_id || attachment?.name?.replace('.pdf', '') || 'document'
            const emailAttachments = attachmentContent
              ? [{ name: `Invoice-${invoiceFileName}.pdf`, content: attachmentContent }]
              : undefined

            if (emailAttachments) {
              console.log('[trigger-automation] Attaching PDF:', emailAttachments[0].name, 'size:', emailAttachments[0].content.length)
            } else {
              console.warn('[trigger-automation] No PDF attachment available for', email)
            }

            const result = await sendEmail({ to: email, subject, htmlContent: htmlBody, fromName, attachments: emailAttachments })

            if (result.success) {
              sent++
              await logEmailResult(supabase, auto.id, email, subject, 'sent')
            } else {
              failed++
              await logEmailResult(supabase, auto.id, email, subject, 'failed', result.error)
            }
          } catch (err) {
            failed++
            await logEmailResult(supabase, auto.id, email, subject, 'failed', err instanceof Error ? err.message : String(err))
          }
        }
        results.push({ automation_id: auto.id, name: auto.name, status: 'sent', sent, failed })
      } else {
        for (const email of recipients) {
          await logEmailResult(supabase, auto.id, email, subject, 'triggered')
        }
        results.push({ automation_id: auto.id, name: auto.name, status: 'triggered', recipients: recipients.length })
      }
    }

    return corsResponse({ success: true, event, triggered: results.length, results })
  } catch (err) {
    return corsResponse({ success: false, error: err.message })
  }
})
