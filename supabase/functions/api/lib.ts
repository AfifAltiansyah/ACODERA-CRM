import { createClient } from 'npm:@supabase/supabase-js@2'
import jwt from 'npm:jsonwebtoken@9'
import bcrypt from 'npm:bcryptjs@2.4.3'
import postgres from 'npm:postgres'

let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (supabaseInstance) return supabaseInstance
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  supabaseInstance = createClient(url, key, { auth: { persistSession: false } })
  return supabaseInstance
}

export function getJwtSecret(): string {
  const secret = Deno.env.get('JWT_SECRET')
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  return secret
}

export function generateToken(user: { id: number; email: string; role: string; branch?: string | null; branch_id?: string | null }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, branch: user.branch || null, branch_id: user.branch_id || null },
    getJwtSecret(),
    { expiresIn: '24h' }
  )
}

export function verifyToken(token: string): { id: number; email: string; role: string; branch: string | null; branch_id: string | null } {
  return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as any
}

export function getAllowedOrigins(): string[] {
  const env = Deno.env.get('CORS_ORIGIN') || 'https://acodera-crm.netlify.app'
  return env.split(',').map(s => s.trim()).filter(Boolean)
}

export function corsHeaders(req?: Request): Record<string, string> {
  const allowed = getAllowedOrigins()
  const origin = req?.headers.get('origin') || ''
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-api-key, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}

export function getSenderEmail(): string {
  return Deno.env.get('SENDER_EMAIL') || 'noreply@acodera.com'
}

export function jsonResponse(data: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export async function parseBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

export function getQueryParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {}
  url.searchParams.forEach((v, k) => { params[k] = v })
  return params
}

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function randomBranchId(): string {
  const digits = new Uint8Array(16)
  crypto.getRandomValues(digits)
  return Array.from(digits).map(b => String(b % 10)).join('')
}

export function hexEncode(data: Uint8Array): string {
  return Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function generateApiKey(): Promise<{ prefix: string; full: string; hash: string }> {
  const prefix = 'acd_' + randomHex(3).toUpperCase()
  const secret = randomHex(24)
  const full = prefix + '_' + secret
  const hash = await hashApiKey(full)
  return { prefix, full, hash }
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.resetAt > 3600000) rateLimitStore.delete(key)
  }
}, 300000)

export function checkRateLimit(prefix: string, maxRequests: number): boolean {
  const now = Date.now()
  const key = `api:${prefix}`
  const entry = rateLimitStore.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 3600000 })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

export async function logAudit(details: {
  userId?: number | null
  apiKeyId?: number | null
  action: string
  entityType?: string | null
  entityId?: string | null
  extra?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<void> {
  try {
    const supabase = getSupabase()
    await supabase.from('audit_logs').insert({
      user_id: details.userId || null,
      api_key_id: details.apiKeyId || null,
      action: details.action,
      entity_type: details.entityType || null,
      entity_id: details.entityId ? String(details.entityId) : null,
      details: details.extra ? JSON.stringify(details.extra) : null,
      ip_address: details.ipAddress || null,
      user_agent: details.userAgent || null,
    })
  } catch (err) {
    console.error('Audit log error:', err)
  }
}

export function getClientInfo(req: Request): { ip: string; userAgent: string } {
  const cfIp = (req as any).headers?.get?.('x-forwarded-for') || ''
  return {
    ip: cfIp.split(',')[0]?.trim() || 'unknown',
    userAgent: req.headers.get('user-agent') || '',
  }
}

export async function authenticateApiKey(
  req: Request
): Promise<{ user: Record<string, unknown> | null; error: Response | null }> {
  const respond = (data: unknown, status = 200) => jsonResponse(data, status, req)

  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) return { user: null, error: respond({ error: 'API key required. Use x-api-key header.' }, 401) }

  try {
    const hash = await hashApiKey(apiKey)
    const supabase = getSupabase()
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', hash)
      .eq('status', 'active')

    if (error || !keys || keys.length === 0) {
      return { user: null, error: respond({ error: 'Invalid or revoked API key' }, 401) }
    }

    const keyData = keys[0] as any
    if (!checkRateLimit(keyData.key_prefix, keyData.rate_limit || 100)) {
      return { user: null, error: respond({ error: 'Rate limit exceeded. Try again later.' }, 429) }
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, email, name, role, branch, branch_id')
      .eq('id', keyData.user_id)
      .single()

    if (!userData) {
      return { user: null, error: respond({ error: 'API key owner not found' }, 401) }
    }

    await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id)

    return {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        branch: userData.branch || null,
        branch_id: userData.branch_id || null,
        apiKeyId: keyData.id,
        authType: 'api_key',
      },
      error: null,
    }
  } catch (err) {
    console.error('API key auth error:', err)
    return { user: null, error: respond({ error: 'Authentication failed' }, 500) }
  }
}

export function getIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

let sqlClient: ReturnType<typeof postgres> | null = null

export function getSql() {
  if (sqlClient) return sqlClient
  const dbUrl = Deno.env.get('SUPABASE_DB_URL')
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL')
  sqlClient = postgres(dbUrl, { prepare: false })
  return sqlClient
}

export async function runSql(sqlText: string): Promise<{ success: boolean; message?: string }> {
  try {
    const sql = getSql()
    await sql.unsafe(sqlText)
    return { success: true }
  } catch (err) {
    console.error('SQL error:', err)
    return { success: false, message: String(err) }
  }
}

// ─── Email ───────────────────────────────────────────────────────────

import { sendEmail as sharedSendEmail } from '../_shared/brevo.ts'

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const result = await sharedSendEmail({ to, subject, htmlContent: html })
  return result.success
}

export function verificationEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;text-align:center">
      <table style="max-width:480px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:40px">
        <tr><td style="text-align:center;padding-bottom:24px">
          <div style="font-size:28px;font-weight:bold;color:#f59e0b">Acodera CRM</div>
        </td></tr>
        <tr><td style="color:#e2e8f0;font-size:16px;line-height:1.6;text-align:center;padding-bottom:8px">
          Your verification code
        </td></tr>
        <tr><td style="text-align:center;padding:20px 0">
          <div style="display:inline-block;background:#0f0f23;border-radius:12px;padding:16px 40px;letter-spacing:12px;font-size:36px;font-weight:bold;color:#f59e0b;font-family:monospace">${code}</div>
        </td></tr>
        <tr><td style="color:#94a3b8;font-size:14px;line-height:1.5;text-align:center">
          This code expires in 10 minutes. If you didn't request this, please ignore this email.
        </td></tr>
      </table>
      <div style="margin-top:20px;color:#475569;font-size:12px">© 2026 Acodera CRM</div>
    </td></tr>
  </table>
</body>
</html>`
}

export function passwordResetHtml(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px;text-align:center">
      <table style="max-width:480px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:40px">
        <tr><td style="text-align:center;padding-bottom:24px">
          <div style="font-size:28px;font-weight:bold;color:#f59e0b">Acodera CRM</div>
        </td></tr>
        <tr><td style="color:#e2e8f0;font-size:16px;line-height:1.6;text-align:center;padding-bottom:8px">
          Password reset code
        </td></tr>
        <tr><td style="text-align:center;padding:20px 0">
          <div style="display:inline-block;background:#0f0f23;border-radius:12px;padding:16px 40px;letter-spacing:12px;font-size:36px;font-weight:bold;color:#f59e0b;font-family:monospace">${code}</div>
        </td></tr>
        <tr><td style="color:#94a3b8;font-size:14px;line-height:1.5;text-align:center">
          Use this code to reset your password. It expires in 10 minutes.
        </td></tr>
      </table>
      <div style="margin-top:20px;color:#475569;font-size:12px">© 2026 Acodera CRM</div>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Verification Codes (stored in database) ──────────────────────────────

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function storeCode(email: string, code: string, type: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('verification_codes').insert({
    email, code, type,
    expires_at: new Date(Date.now() + 600000).toISOString(),
    verified: false,
  })
  if (error) console.error('storeCode error:', error)
}

export async function verifyCode(email: string, code: string, type: string): Promise<boolean> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('email', email)
    .eq('type', type)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return false
  if (data[0].code !== code) return false

  await supabase.from('verification_codes').update({ verified: true }).eq('id', data[0].id)
  return true
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('verification_codes')
    .select('verified')
    .eq('email', email)
    .eq('verified', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) console.error('isEmailVerified error:', error)
  return !!(data && data.length > 0)
}
