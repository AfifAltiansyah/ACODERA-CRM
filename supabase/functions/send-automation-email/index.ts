import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/brevo.ts'
import { logEmailResult, replaceTemplateVars, fetchInvoiceTemplate } from '../_shared/invoice.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || 'https://acodera-crm.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AUTOMATION_SECRET = Deno.env.get('AUTOMATION_SECRET')

function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
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
