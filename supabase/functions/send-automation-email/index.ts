// Supabase Edge Function: send-automation-email
// Deploy with: supabase functions deploy send-automation-email

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/brevo.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || 'https://acodera-crm.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AUTOMATION_SECRET = Deno.env.get('AUTOMATION_SECRET')

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!AUTOMATION_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'AUTOMATION_SECRET not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKeyHeader = req.headers.get('apikey')
    const authHeader = req.headers.get('authorization')

    if (apiKeyHeader === AUTOMATION_SECRET) {
      // Service-to-service call authorized
    } else if (authHeader?.startsWith('Bearer ')) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      if (!supabaseUrl || !supabaseKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'Supabase credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const supabaseAuth = createClient(supabaseUrl, supabaseKey)
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(authHeader.slice(7))
      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { to, from_name, subject, body, automation_id, attachments } = await req.json()

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, subject' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const contactEmail = Array.isArray(to) ? to.join(', ') : to

    const result = await sendEmail({
      to,
      subject,
      htmlContent: body || `<p>${subject}</p>`,
      fromName: from_name || 'Acodera CRM',
      attachments: attachments && Array.isArray(attachments) && attachments.length > 0 ? attachments : undefined,
    })

    if (!result.success) {
      try {
        if (automation_id) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey)
            await supabase.from('automation_logs').insert([{
              automation_id,
              contact_email: contactEmail,
              subject,
              status: 'failed',
              error: result.error,
            }])
          }
        }
      } catch { /* ignore */ }

      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      if (automation_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey)
          await supabase.from('automation_logs').insert([{
            automation_id,
            contact_email: contactEmail,
            subject,
            status: 'sent',
          }])
        }
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ success: true, email_id: result.messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})