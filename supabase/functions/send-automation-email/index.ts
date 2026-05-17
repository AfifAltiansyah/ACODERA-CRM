// Supabase Edge Function: send-automation-email
// Deploy with: supabase functions deploy send-automation-email

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || 'https://acodera-crm.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'noreply@acodera.com'
const AUTOMATION_SECRET = Deno.env.get('AUTOMATION_SECRET')

serve(async (req: Request) => {
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

    const { to, from_name, subject, body, automation_id, attachments } = await req.json()

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, subject' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    if (!BREVO_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'BREVO_API_KEY is not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const toList = Array.isArray(to) ? to : [to]
    const emailPayload: {
      sender: { name: string; email: string };
      to: { email: string }[];
      subject: string;
      htmlContent: string;
      attachment?: any[];
    } = {
      sender: { name: from_name || 'Acodera CRM', email: SENDER_EMAIL },
      to: toList.map((e: string) => ({ email: e })),
      subject,
      htmlContent: body || `<p>${subject}</p>`,
    }

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      emailPayload.attachment = attachments
    }

    const emailResponse = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const emailData = await emailResponse.json()

    if (!emailResponse.ok) {
      const errorMsg = emailData.message || JSON.stringify(emailData)

      try {
        if (automation_id) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey)
            await supabase.from('automation_logs').insert([{
              automation_id: automation_id,
              contact_email: Array.isArray(to) ? to.join(', ') : to,
              subject,
              status: 'failed',
              error: errorMsg,
            }])
          }
        }
      } catch (_logErr) { /* ignore */ }

      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
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
            automation_id: automation_id,
            contact_email: Array.isArray(to) ? to.join(', ') : to,
            subject,
            status: 'sent',
          }])
        }
      }
    } catch (_logErr) { /* ignore */ }

    return new Response(
      JSON.stringify({ success: true, email_id: emailData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})