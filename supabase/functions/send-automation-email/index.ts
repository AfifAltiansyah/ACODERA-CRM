import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/brevo.ts'
import { logEmailResult, replaceTemplateVars, fetchInvoiceTemplate } from '../_shared/invoice.ts'

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-automation-secret',
    'Access-Control-Max-Age': '86400',
  }
}

const AUTOMATION_SECRET = Deno.env.get('AUTOMATION_SECRET')

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req)
  const corsResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!AUTOMATION_SECRET) {
      return corsResponse({ success: false, error: 'AUTOMATION_SECRET not configured' }, 500)
    }

    // 'apikey' is a reserved header the Supabase gateway strips, so the secret is
    // carried in 'x-automation-secret' (apikey kept only as a legacy fallback).
    const apiKeyHeader = req.headers.get('x-automation-secret') || req.headers.get('apikey')
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

    const { to, from_name, subject, body, automation_id, attachments, invoice_data, invoice_template } = await req.json()

    if (!to || !subject) {
      return corsResponse({ success: false, error: 'Missing required fields: to, subject' })
    }

    const contactEmail = Array.isArray(to) ? to.join(', ') : to

    let finalSubject = subject
    let htmlBody = body || `<p>${subject}</p>`

    if (body && body.trim() !== '') {
      let tpl = invoice_template || {}
      if (!invoice_template && automation_id) {
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          if (supabaseUrl && supabaseKey) {
            const supabaseForTpl = createClient(supabaseUrl, supabaseKey)
            if (invoice_data?.branch) {
              tpl = await fetchInvoiceTemplate(supabaseForTpl, invoice_data.branch) || {}
            }
          }
        } catch { /* ignore template fetch errors */ }
      }

      const replaced = replaceTemplateVars(htmlBody, finalSubject, invoice_data || {}, tpl, {
        contactName: invoice_data?.buyer_name || '',
        contactEmail: contactEmail,
        event: '',
        senderEmail: Deno.env.get('SENDER_EMAIL') || 'noreply@acodera.com',
      })
      htmlBody = replaced.htmlBody
      finalSubject = replaced.subject
    }

    const result = await sendEmail({
      to,
      subject: finalSubject,
      htmlContent: htmlBody,
      fromName: from_name || 'Acodera CRM',
      attachments: attachments && Array.isArray(attachments) && attachments.length > 0 ? attachments : undefined,
    })

    if (!result.success) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      if (automation_id && supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        await logEmailResult(supabase, automation_id, contactEmail, finalSubject, 'failed', result.error).catch(() => {})
      }
      return corsResponse({ success: false, error: result.error })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (automation_id && supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      await logEmailResult(supabase, automation_id, contactEmail, finalSubject, 'sent').catch(() => {})
    }

    return corsResponse({ success: true, email_id: result.messageId })
  } catch (err: any) {
    return corsResponse({ success: false, error: err.message })
  }
})
