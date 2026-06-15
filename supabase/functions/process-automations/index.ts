import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { sendEmail } from '../_shared/brevo.ts'
import { refreshPaymentOptions } from '../_shared/paymentOptions.ts'
import {
  generateInvoicePdf,
  replaceTemplateVars,
  getNextRunAt,
  fetchInvoiceTemplate,
  logEmailResult,
} from '../_shared/invoice.ts'

// Reflect the caller's origin against an allowlist (CORS_ORIGIN, comma-separated).
// Default '*' allows any origin — these endpoints are gated by AUTOMATION_SECRET, not CORS.
function getAllowedOrigins(): string[] {
  const env = Deno.env.get('CORS_ORIGIN') || '*'
  return env.split(',').map(s => s.trim()).filter(Boolean)
}

function buildCorsHeaders(req: Request): Record<string, string> {
  const allowed = getAllowedOrigins()
  const origin = req.headers.get('origin') || ''
  const allowOrigin = allowed.includes('*') ? (origin || '*') : (allowed.includes(origin) ? origin : allowed[0])
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  }
}

const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'noreply@acodera.com'
const AUTOMATION_SECRET = Deno.env.get('AUTOMATION_SECRET')

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)
  const corsResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !supabaseKey) {
      return corsResponse({ success: false, error: 'Supabase credentials not configured' }, 500)
    }

    const apiKey = req.headers.get('apikey')
    if (apiKey !== supabaseKey && apiKey !== AUTOMATION_SECRET) {
      return corsResponse({ success: false, error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const now = new Date().toISOString()
    let totalProcessed = 0
    let totalSent = 0
    let totalFailed = 0

    // ── 1. Scheduled/recurring automations ──────────────────────────────
    const { data: dueAutomations, error: fetchError } = await supabase
      .from('automations')
      .select('*')
      .eq('status', 'active')
      .neq('schedule_type', 'immediate')
      .not('next_run_at', 'is', null)
      .lte('next_run_at', now)

    if (fetchError) {
      return corsResponse({ success: false, error: 'Failed to fetch: ' + fetchError.message })
    }

    if (dueAutomations && dueAutomations.length > 0) {
      for (const auto of dueAutomations) {
        const isEmail = auto.type === 'Email Drip' || auto.type === 'Marketing Campaign' || auto.type === 'Invoice Reminder'
        const isRecurring = auto.schedule_type === 'recurring'
        let recipients: string[] = []

        if (auto.type === 'Invoice Reminder') {
          const { data: invoices } = await supabase
            .from('transactions')
            .select('*')
            .eq('status', 'pending')
          if (invoices) {
            const seen = new Set()
            recipients = invoices.map((i: any) => i.buyer_email)
              .filter((e: string) => e && e.trim() !== '' && !seen.has(e) && seen.add(e))
          }
        } else if (isEmail) {
          const { data: contacts } = await supabase
            .from('contacts')
            .select('email')
          if (contacts) {
            const seen = new Set()
            recipients = contacts.map((c: any) => c.email)
              .filter((e: string) => e && e.trim() !== '' && !seen.has(e) && seen.add(e))
          }
        }

        if (isEmail && recipients.length > 0) {
          let sent = 0
          let failed = 0

          for (const email of recipients) {
            let subject = auto.subject || `Notification from ${auto.from_name || 'Acodera CRM'}`
            let htmlBody = auto.body || `<p>${subject}</p>`
            let pdfBase64: string | null = null
            let inv: any = null
            const hasCustomBody = typeof auto.body === 'string' && auto.body.trim() !== ''

            if (auto.type === 'Invoice Reminder') {
              const { data: invoices } = await supabase
                .from('transactions')
                .select('*')
                .eq('status', 'pending')
                .eq('buyer_email', email)
                .limit(1)

              if (invoices && invoices.length > 0) {
                inv = invoices[0]
                if (inv.ticket_id) {
                  try {
                    const { data: tk } = await supabase
                      .from('tickets').select('title, abbreviation').eq('id', inv.ticket_id).single()
                    if (tk) {
                      inv.ticket_title = inv.ticket_title || tk.title || ''
                      inv.item_name = inv.item_name || tk.title || ''
                      inv.itemCode = inv.itemCode || tk.abbreviation || ''
                    }
                  } catch { /* ignore */ }
                  inv = await aggregateInvoice(supabase, inv)
                }
                if (inv.branch) await refreshPaymentOptions(inv.branch)
                const invoiceTemplate = await fetchInvoiceTemplate(supabase, inv.branch)

                // Use custom body or fallback
                htmlBody = (hasCustomBody ? auto.body : `<p>${subject}</p>`)
                subject = auto.subject || `Payment Reminder - ${inv.transaction_id}`

                pdfBase64 = await generateInvoicePdf(inv, invoiceTemplate, inv.branch)

                const replaced = replaceTemplateVars(htmlBody, subject, inv, invoiceTemplate || {}, {
                  contactName: inv.buyer_name,
                  contactEmail: email,
                  event: auto.trigger_event,
                  senderEmail: SENDER_EMAIL,
                })
                htmlBody = replaced.htmlBody
                subject = replaced.subject
              }
            }

            try {
              const result = await sendEmail({
                to: email,
                subject,
                htmlContent: htmlBody,
                fromName: auto.from_name || 'Acodera CRM',
                attachments: pdfBase64 ? [{ name: `Invoice-${inv?.transaction_id || 'document'}.pdf`, content: pdfBase64 }] : undefined,
              })

              if (result.success) {
                await logEmailResult(supabase, auto.id, email, subject, 'sent')
                sent++
              } else {
                await logEmailResult(supabase, auto.id, email, subject, 'failed', result.error)
                failed++
              }
            } catch (err) {
              await logEmailResult(supabase, auto.id, email, subject, 'failed', err.message)
              failed++
            }
          }

          totalSent += sent
          totalFailed += failed
        }

        if (isRecurring) {
          const nextRun = getNextRunAt(auto.schedule_frequency, new Date())
          await supabase
            .from('automations')
            .update({ last_run_at: now, next_run_at: nextRun })
            .eq('id', auto.id)
        } else {
          await supabase
            .from('automations')
            .update({ status: 'completed', last_run_at: now })
            .eq('id', auto.id)
        }

        totalProcessed++
      }
    }

    // Helper: aggregate all rows for a ticket invoice into invoice-level data
    async function aggregateInvoice(supabase: any, inv: any) {
      if (!inv.ticket_id || !inv.transaction_id) return inv
      const { data: siblings } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', inv.transaction_id)
        .order('unique_code', { ascending: true })
      if (!siblings || siblings.length <= 1) return inv
      const ticketTitle = inv.item_name || inv.ticket_title || ''
      const lineItems = siblings.map((row: any) => ({
        name: ticketTitle || row.item_name || row.ticket_title || 'Invoice Item',
        code: row.unique_code || row.itemCode || '-',
        quantity: Number(row.quantity || 1),
        price_per_unit: Number(row.price_per_unit || 0),
        total_amount: Number(row.total_amount || row.price_per_unit || 0),
        barcode: row.barcode || '',
      }))
      // Merge: quantity = row count, total = sum, codes/items = joined
      return {
        ...inv,
        quantity: lineItems.reduce((s: number, item: any) => s + Number(item.quantity || 1), 0),
        total_amount: lineItems.reduce((s: number, item: any) => s + Number(item.total_amount || 0), 0),
        itemCode: lineItems.map((item: any) => item.code).join(', '),
        price_per_unit: Number(inv.price_per_unit || 0),
        lineItems,
      }
    }

    // ── 2. Invoice overdue automations (dedup-checked) ──────────────────
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
        for (let inv of pendingInvoices) {
          if (!inv.buyer_email || seen.has(inv.buyer_email)) continue
          seen.add(inv.buyer_email)

          if (inv.ticket_id) {
            try {
              const { data: tk } = await supabase
                .from('tickets').select('title, abbreviation').eq('id', inv.ticket_id).single()
              if (tk) {
                inv.ticket_title = inv.ticket_title || tk.title || ''
                inv.item_name = inv.item_name || tk.title || ''
                inv.itemCode = inv.itemCode || tk.abbreviation || ''
              }
            } catch { /* ignore */ }
            inv = await aggregateInvoice(supabase, inv)
          }

          for (const auto of overdueAutos) {
            if (auto.branch && inv.branch && auto.branch !== inv.branch) continue

            const { data: recentlySent } = await supabase
              .from('automation_logs')
              .select('id')
              .eq('contact_email', inv.buyer_email)
              .eq('status', 'sent')
              .gte('created_at', new Date(Date.now() - 86400000).toISOString())
              .limit(1)
            if (recentlySent && recentlySent.length > 0) {
              console.log('[process-automations] Overdue dedup skip:', inv.buyer_email)
              continue
            }

            let invoiceTemplate: any = null
            if (inv.branch) {
              await refreshPaymentOptions(inv.branch)
              invoiceTemplate = await fetchInvoiceTemplate(supabase, inv.branch)
            }

            let subject = auto.subject || `Payment Reminder - ${inv.transaction_id}`
            const hasCustomBody = typeof auto.body === 'string' && auto.body.trim() !== ''
            let htmlBody = (hasCustomBody ? auto.body : `<p>${subject}</p>`)

            const pdfBase64 = await generateInvoicePdf(inv, invoiceTemplate, inv.branch)
            const replaced = replaceTemplateVars(htmlBody, subject, inv, invoiceTemplate || {}, {
              contactName: inv.buyer_name,
              contactEmail: inv.buyer_email,
              event: auto.trigger_event,
              senderEmail: SENDER_EMAIL,
            })
            htmlBody = replaced.htmlBody
            subject = replaced.subject

            try {
              const result = await sendEmail({
                to: inv.buyer_email,
                subject,
                htmlContent: htmlBody,
                fromName: auto.from_name || 'Acodera CRM',
                attachments: pdfBase64 ? [{ name: `Invoice-${inv.transaction_id}.pdf`, content: pdfBase64 }] : undefined,
              })

              if (result.success) {
                await logEmailResult(supabase, auto.id, inv.buyer_email, subject, 'sent')
                totalSent++
              } else {
                await logEmailResult(supabase, auto.id, inv.buyer_email, subject, 'failed', result.error)
                totalFailed++
              }
            } catch (err) {
              await logEmailResult(supabase, auto.id, inv.buyer_email, subject, 'failed',
                err instanceof Error ? err.message : String(err))
              totalFailed++
            }

            totalProcessed++
          }
        }
      }
    }

    // ── 3. Invoice paid/created automations (dedup-checked) ───────────────
    const { data: invoiceAutos } = await supabase
      .from('automations')
      .select('*')
      .in('trigger_event', ['invoice.paid', 'invoice.created'])
      .eq('status', 'active')
      .neq('schedule_type', 'immediate')
      .not('next_run_at', 'is', null)
      .lte('next_run_at', now)

    if (invoiceAutos && invoiceAutos.length > 0) {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
      const { data: recentInvoices } = await supabase
        .from('transactions')
        .select('*')
        .in('status', ['paid', 'pending'])
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(50)

      if (recentInvoices && recentInvoices.length > 0) {
        const seen = new Set<string>()
        for (let inv of recentInvoices) {
          if (!inv.buyer_email || seen.has(inv.buyer_email)) continue
          seen.add(inv.buyer_email)

          if (inv.ticket_id) {
            try {
              const { data: tk } = await supabase
                .from('tickets').select('title, abbreviation').eq('id', inv.ticket_id).single()
              if (tk) {
                inv.ticket_title = inv.ticket_title || tk.title || ''
                inv.item_name = inv.item_name || tk.title || ''
                inv.itemCode = inv.itemCode || tk.abbreviation || ''
              }
            } catch { /* ignore */ }
            inv = await aggregateInvoice(supabase, inv)
          }

          for (const auto of invoiceAutos) {
            if (auto.branch && inv.branch && auto.branch !== inv.branch) continue

            const { data: recentlySent } = await supabase
              .from('automation_logs')
              .select('id')
              .eq('contact_email', inv.buyer_email)
              .eq('status', 'sent')
              .gte('created_at', new Date(Date.now() - 86400000).toISOString())
              .limit(1)
            if (recentlySent && recentlySent.length > 0) {
              console.log('[process-automations] Dedup skip:', inv.buyer_email, '- already received invoice email in last 24h')
              continue
            }

            let invoiceTemplate: any = null
            if (inv.branch) {
              await refreshPaymentOptions(inv.branch)
              invoiceTemplate = await fetchInvoiceTemplate(supabase, inv.branch)
            }

            const eventLabel = auto.trigger_event === 'invoice.paid' ? 'Paid' : 'Pending'
            let subject = auto.subject || (auto.trigger_event === 'invoice.paid'
              ? `Payment Received - ${inv.transaction_id}`
              : `Invoice Created - ${inv.transaction_id}`)
            const hasCustomBody = typeof auto.body === 'string' && auto.body.trim() !== ''
            let htmlBody = (hasCustomBody ? auto.body : `<p>${subject}</p>`)

            const pdfBase64 = await generateInvoicePdf(inv, invoiceTemplate, inv.branch)
            const replaced = replaceTemplateVars(htmlBody, subject, inv, invoiceTemplate || {}, {
              contactName: inv.buyer_name,
              contactEmail: inv.buyer_email,
              event: auto.trigger_event,
              senderEmail: SENDER_EMAIL,
            })
            htmlBody = replaced.htmlBody
            subject = replaced.subject

            try {
              const result = await sendEmail({
                to: inv.buyer_email,
                subject,
                htmlContent: htmlBody,
                fromName: auto.from_name || 'Acodera CRM',
                attachments: pdfBase64 ? [{ name: `Invoice-${inv.transaction_id}.pdf`, content: pdfBase64 }] : undefined,
              })

              if (result.success) {
                await logEmailResult(supabase, auto.id, inv.buyer_email, subject, 'sent')
                totalSent++
              } else {
                await logEmailResult(supabase, auto.id, inv.buyer_email, subject, 'failed', result.error)
                totalFailed++
              }
            } catch (err) {
              await logEmailResult(supabase, auto.id, inv.buyer_email, subject, 'failed',
                err instanceof Error ? err.message : String(err))
              totalFailed++
            }

            totalProcessed++
          }
        }
      }

      // Update next_run_at for processed automations
      for (const auto of invoiceAutos) {
        if (auto.schedule_type === 'recurring') {
          const nextRun = getNextRunAt(auto.schedule_frequency, new Date())
          await supabase
            .from('automations')
            .update({ last_run_at: now, next_run_at: nextRun })
            .eq('id', auto.id)
        } else {
          await supabase
            .from('automations')
            .update({ status: 'completed', last_run_at: now })
            .eq('id', auto.id)
        }
      }
    }

    // ── 4. Expire pending invoices ──────────────────────────────────────
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

    // ── 5. Process scheduled_emails ─────────────────────────────────────
    const { data: pendingEmails, error: scheduleError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', now)
      .limit(100)

    if (scheduleError) {
      return corsResponse({ success: false, error: 'Failed to fetch scheduled emails: ' + scheduleError.message })
    }

    if (pendingEmails && pendingEmails.length > 0) {
      for (const email of pendingEmails) {
        await supabase.from('scheduled_emails').update({ status: 'sending' }).eq('id', email.id)

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
              await logEmailResult(supabase, email.automation_id, email.to_email, email.subject, 'sent').catch(() => {})
            }
            totalSent++
          } else {
            const errorMsg = result.error || 'Unknown error'
            await supabase.from('scheduled_emails').update({ status: 'failed', error: errorMsg }).eq('id', email.id)
            if (email.automation_id) {
              await logEmailResult(supabase, email.automation_id, email.to_email, email.subject, 'failed', errorMsg)
                .catch(() => {})
            }
            totalFailed++
          }
        } catch (err) {
          await supabase.from('scheduled_emails').update({ status: 'failed', error: err.message }).eq('id', email.id)
          totalFailed++
        }

        totalProcessed++
      }
    }

    return corsResponse({
      success: true,
      processed: totalProcessed,
      sent: totalSent,
      failed: totalFailed,
    })
  } catch (err) {
    return corsResponse({ success: false, error: err.message })
  }
})
