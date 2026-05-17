const API_BASE = import.meta.env.VITE_API_URL || '/api'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0aHhscHJndGZ1aG50cGNkaHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDkzNTUsImV4cCI6MjA5MzkyNTM1NX0.men8PNFnr8Na3H53pjX4dzg9FGQH8dCNefVKti5M-UM'

function token() {
  return localStorage.getItem('crm-auth-token')
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token()}`,
  }
}

export async function fetchTemplate() {
  const res = await fetch(`${API_BASE}/invoice-template`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch template (HTTP ' + res.status + ')')
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('Expected JSON from template API, got ' + contentType)
  }
  const data = await res.json()
  return data.template || {}
}

export async function saveTemplate(template) {
  const res = await fetch(`${API_BASE}/invoice-template`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ template }),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error('Failed to save template: server returned ' + res.status)
  }
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('Failed to save template: expected JSON, got ' + contentType)
  }
}

export async function uploadLogo(imageBase64, mimeType) {
  const userId = localStorage.getItem('crm-auth-user')
    ? JSON.parse(localStorage.getItem('crm-auth-user'))?.id
    : null
  if (!userId) throw new Error('Not authenticated')

  const res = await fetch(
    'https://rthxlprgtfuhntpcdhsh.supabase.co/functions/v1/upload-logo',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ user_id: userId, image_base64: imageBase64, mime_type: mimeType }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Upload failed')
  }
  const data = await res.json()
  return data.url
}
