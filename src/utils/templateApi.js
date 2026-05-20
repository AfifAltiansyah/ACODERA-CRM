import { supabase } from '../lib/supabase'
import { getUser } from './auth'

export async function fetchTemplate() {
  const user = getUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('users')
    .select('invoice_template')
    .eq('id', user.id)
    .single()

  if (error) throw new Error('Failed to fetch template: ' + error.message)

  const tpl = data?.invoice_template || {}
  return typeof tpl === 'string' ? JSON.parse(tpl) : tpl
}

export async function saveTemplate(template) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('users')
    .update({ invoice_template: template })
    .eq('id', user.id)

  if (error) throw new Error('Failed to save template: ' + error.message)
}

export async function uploadLogo(imageBase64, mimeType) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')

  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0aHhscHJndGZ1aG50cGNkaHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDkzNTUsImV4cCI6MjA5MzkyNTM1NX0.men8PNFnr8Na3H53pjX4dzg9FGQH8dCNefVKti5M-UM'

  const res = await fetch(
    'https://rthxlprgtfuhntpcdhsh.supabase.co/functions/v1/upload-logo',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ user_id: user.id, image_base64: imageBase64, mime_type: mimeType }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Upload failed')
  }
  const data = await res.json()
  return data.url
}
