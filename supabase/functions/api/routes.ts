import bcryptMod from 'npm:bcryptjs@2.4.3'
const bcrypt = bcryptMod.default || bcryptMod
import { getSupabase, jsonResponse, parseBody, getQueryParams, verifyToken, generateToken, generateApiKey, logAudit, getIP, getClientInfo, authenticateApiKey, randomBranchId, generateCode, storeCode, verifyCode, isEmailVerified, sendEmail, verificationEmailHtml, passwordResetHtml } from './lib.ts'

type Handler = (ctx: {
  user?: Record<string, unknown>
  body: Record<string, unknown>
  params: Record<string, string>
  query: Record<string, string>
  req: Request
}) => Promise<Response>

async function handlerWrapper(
  handler: Handler,
  req: Request,
  path: string
): Promise<Response> {
  const params = extractParams(path)
  const body = await parseBody(req)
  const query = getQueryParams(new URL(req.url))
  const user = await extractUser(req)
  return handler({ user, body, params, query, req })
}

function extractParams(path: string): Record<string, string> {
  const params: Record<string, string> = {}
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 2) params.id = segments[1]
  if (segments.length === 3) {
    params.id = segments[1]
    params.action = segments[2]
  }
  return params
}

async function extractUser(req: Request): Promise<Record<string, unknown> | undefined> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return undefined
  try {
    return verifyToken(auth.slice(7)) as any
  } catch {
    return undefined
  }
}

function requireAuth(user?: Record<string, unknown>): Response | null {
  if (!user) return jsonResponse({ error: 'Authentication required' }, 401)
  return null
}

function requireRole(user: Record<string, unknown>, ...roles: string[]): Response | null {
  if (!roles.includes(user.role as string)) {
    return jsonResponse({ error: 'Insufficient permissions' }, 403)
  }
  return null
}

function tenantFilter(user: Record<string, unknown>): { column: string; value: unknown } | null {
  if (user.role === 'owner') return null
  return { column: 'branch', value: user.branch_id }
}

// ─── Auth ────────────────────────────────────────────────────────────

export async function handleAuthLogin(req: Request): Promise<Response> {
  try {
    const body = await parseBody(req)
    const email = body.email as string
    const password = body.password as string
    if (!email || !password) return jsonResponse({ error: 'Email and password are required' }, 400)

    const supabase = getSupabase()
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email as string)

    if (error) throw error
    if (!users || users.length === 0) return jsonResponse({ error: 'Invalid email or password' }, 401)

    const user = users[0] as any
    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) return jsonResponse({ error: 'Invalid email or password' }, 401)

    const token = generateToken({ id: user.id, email: user.email, role: user.role, branch: user.branch, branch_id: user.branch_id })

    return jsonResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branch: user.branch || null,
        branch_id: user.branch_id || null,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}

export async function handleAuthMe(user: Record<string, unknown>): Promise<Response> {
  try {
    const supabase = getSupabase()
    const { data: users } = await supabase
      .from('users')
      .select('id, email, name, role, branch, branch_id, created_at')
      .eq('id', user.id as number)
    if (!users || users.length === 0) return jsonResponse({ error: 'User not found' }, 404)
    return jsonResponse({ user: users[0] })
  } catch (err) {
    console.error('Profile error:', err)
    return jsonResponse({ error: 'Failed to fetch profile' }, 500)
  }
}

export async function handleAuthRegister(req: Request): Promise<Response> {
  try {
    const body = await parseBody(req)
    const { email, password, name } = body
    if (!email || !password || !name) {
      return jsonResponse({ error: 'Email, password, and name are required' }, 400)
    }

    const emailVerified = await isEmailVerified(email as string)
    if (!emailVerified) {
      return jsonResponse({ error: 'Email not verified. Please verify your code first.' }, 400)
    }

    const supabase = getSupabase()
    const { data: existing } = await supabase.from('users').select('id').eq('email', email as string)
    if (existing && existing.length > 0) {
      return jsonResponse({ error: 'Email already registered' }, 409)
    }

    const hashed = bcrypt.hashSync(password as string, 10)
    const branchId = randomBranchId()
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email as string,
        password: hashed,
        name: name as string,
        role: 'partner',
        branch: name as string,
        branch_id: branchId,
      })
      .select('id, email, name, role, branch, branch_id')
      .single()

    if (error) throw error
    const token = generateToken(newUser)

    return jsonResponse({ token, user: newUser }, 201)
  } catch (err) {
    console.error('Register error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}

export async function handleAuthOAuth(req: Request): Promise<Response> {
  try {
    const body = await parseBody(req)
    const { email, name } = body
    if (!email) return jsonResponse({ error: 'Email is required' }, 400)

    const supabase = getSupabase()
    const { data: existing } = await supabase
      .from('users')
      .select('id, email, name, role, branch, branch_id')
      .eq('email', email as string)

    if (existing && existing.length > 0) {
      const token = generateToken(existing[0])
      return jsonResponse({ token, user: existing[0] })
    }

    const displayName = (name as string) || (email as string).split('@')[0]
    const branchId = randomBranchId()
    const fakePw = bcrypt.hashSync(randomBranchId(), 10)
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email as string,
        password: fakePw,
        name: displayName,
        role: 'partner',
        branch: displayName,
        branch_id: branchId,
      })
      .select('id, email, name, role, branch, branch_id')
      .single()

    if (error) throw error
    const token = generateToken(newUser)

    return jsonResponse({ token, user: newUser }, 201)
  } catch (err) {
    console.error('OAuth error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}

// ─── Verification & Forgot Password ──────────────────────────────────

export async function handleSendCode(req: Request): Promise<Response> {
  try {
    const body = await parseBody(req)
    const { email, type } = body
    if (!email || !type) return jsonResponse({ error: 'Email and type are required' }, 400)

    const supabase = getSupabase()
    const { data: existing } = await supabase.from('users').select('id').eq('email', email as string)

    if (type === 'register' && existing && existing.length > 0) {
      return jsonResponse({ error: 'Email already registered' }, 409)
    }
    if (type === 'reset' && (!existing || existing.length === 0)) {
      return jsonResponse({ error: 'No account found with this email' }, 404)
    }

    const code = generateCode()
    await storeCode(email as string, code, type as string)

    const sent = type === 'reset'
      ? await sendEmail(email as string, 'Password Reset - Acodera CRM', passwordResetHtml(code))
      : await sendEmail(email as string, 'Verify Your Email - Acodera CRM', verificationEmailHtml(code))

    if (!sent) {
      console.error('Email sending failed')
      return jsonResponse({
        code,
        message: 'Verification code (email sending unavailable)',
      })
    }

    return jsonResponse({
      message: 'Verification code sent to your email',
    })
  } catch (err) {
    console.error('Send code error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}

export async function handleVerifyCode(req: Request): Promise<Response> {
  try {
    const body = await parseBody(req)
    const { email, code, type } = body
    if (!email || !code || !type) return jsonResponse({ error: 'Email, code, and type are required' }, 400)

    const valid = await verifyCode(email as string, code as string, type as string)
    if (!valid) return jsonResponse({ error: 'Invalid or expired verification code' }, 400)

    return jsonResponse({ message: 'Code verified successfully', verified: true })
  } catch (err) {
    console.error('Verify code error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}

export async function handleResetPassword(req: Request): Promise<Response> {
  try {
    const body = await parseBody(req)
    const { email, code, password } = body
    if (!email || !code || !password) return jsonResponse({ error: 'Email, code, and new password are required' }, 400)

    const valid = await verifyCode(email as string, code as string, 'reset')
    if (!valid) return jsonResponse({ error: 'Invalid or expired verification code' }, 400)

    const supabase = getSupabase()
    const hashed = bcrypt.hashSync(password as string, 10)
    const { error } = await supabase.from('users').update({ password: hashed }).eq('email', email as string)
    if (error) throw error

    return jsonResponse({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('Reset password error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}

// ─── Users ───────────────────────────────────────────────────────────

export async function handleUsers(req: Request, method: string, path: string): Promise<Response> {
  const user = await extractUser(req)
  const authErr = requireAuth(user)
  if (authErr) return authErr
  const roleErr = requireRole(user!, 'owner')
  if (roleErr) return roleErr

  const params = extractParams(path)
  const body = await parseBody(req)

  try {
    const supabase = getSupabase()

    if (method === 'GET') {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, name, role, branch, branch_id, created_at')
        .order('created_at', { ascending: false })
      return jsonResponse({ users })
    }

    if (method === 'POST') {
      const { email, password, name, role, branch } = body
      if (!email || !password || !name) {
        return jsonResponse({ error: 'Email, password, and name are required' }, 400)
      }

      const { data: existing } = await supabase.from('users').select('id').eq('email', email as string)
      if (existing && existing.length > 0) return jsonResponse({ error: 'Email already exists' }, 409)

      const bcrypt = await import('npm:bcryptjs@2.4.3')
      const hashed = bcrypt.hashSync(password as string, 10)
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({ email, password: hashed, name, role: role || 'partner', branch: branch || null })
        .select('id, email, name, role, branch')
        .single()

      if (error) throw error
      return jsonResponse({ user: newUser }, 201)
    }

    if (method === 'PUT') {
      const fields: Record<string, unknown> = {}
      if (body.email) fields.email = body.email
      if (body.name) fields.name = body.name
      if (body.role) fields.role = body.role
      if (body.branch !== undefined) fields.branch = body.branch || null
      if (body.password) {
        const bcrypt = await import('npm:bcryptjs@2.4.3')
        fields.password = bcrypt.hashSync(body.password as string, 10)
      }
      if (Object.keys(fields).length === 0) {
        return jsonResponse({ error: 'No fields to update' }, 400)
      }

      const { error } = await supabase.from('users').update(fields).eq('id', params.id)
      if (error) throw error
      return jsonResponse({ success: true })
    }

    if (method === 'DELETE') {
      if (Number(params.id) === (user!.id as number)) {
        return jsonResponse({ error: 'Cannot delete your own account' }, 400)
      }

      const { data: targetUser } = await supabase.from('users').select('branch_id').eq('id', params.id).single()
      const branchId = targetUser?.branch_id as string | undefined

      if (branchId) {
        const branchTables = ['contacts', 'flows', 'automations', 'reviews', 'tickets', 'transactions', 'automation_logs', 'scheduled_emails']
        for (const table of branchTables) {
          await supabase.from(table).delete().eq('branch', branchId)
        }
      }

      const { error } = await supabase.from('users').delete().eq('id', params.id)
      if (error) throw error
      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('Users error:', err)
    return jsonResponse({ error: 'Failed to process request' }, 500)
  }
}

// ─── API Keys ────────────────────────────────────────────────────────

export async function handleApiKeys(req: Request, method: string, path: string): Promise<Response> {
  const user = await extractUser(req)
  const authErr = requireAuth(user)
  if (authErr) return authErr

  const params = extractParams(path)
  const body = await parseBody(req)
  const supabase = getSupabase()
  const clientInfo = getClientInfo(req)

  try {
    if (method === 'GET') {
      if (user!.role === 'owner') {
        const { data: keys } = await supabase
          .from('api_keys')
          .select('*, users(id, email, name)')
          .order('created_at', { ascending: false })
        const flat = (keys || []).map((k: any) => ({
          id: k.id, key_prefix: k.key_prefix, name: k.name,
          status: k.status, rate_limit: k.rate_limit,
          last_used_at: k.last_used_at, created_at: k.created_at,
          user_email: k.users?.email || '', user_name: k.users?.name || '',
        }))
        return jsonResponse({ keys: flat })
      } else {
        const { data: keys } = await supabase
          .from('api_keys')
          .select('id, key_prefix, name, status, rate_limit, last_used_at, created_at')
          .eq('user_id', user!.id as number)
          .order('created_at', { ascending: false })
        return jsonResponse({ keys: keys || [] })
      }
    }

    if (method === 'POST') {
      const customKey = body.customKey as string | undefined
      let keyHash: string
      let keyPrefix: string
      let fullKey: string | undefined

      if (customKey) {
        if (customKey.length < 10) {
          return jsonResponse({ error: 'API key must be at least 10 characters' }, 400)
        }
        const { data: dup } = await supabase.from('api_keys').select('id').eq('key_hash', await hashApiKey(customKey))
        if (dup && dup.length > 0) {
          return jsonResponse({ error: 'This API key already exists' }, 409)
        }
        keyHash = await hashApiKey(customKey)
        keyPrefix = customKey.length > 8 ? customKey.slice(0, 8).toUpperCase() : customKey
        fullKey = undefined
      } else {
        const gen = await generateApiKey()
        keyHash = gen.hash
        keyPrefix = gen.prefix
        fullKey = gen.full
      }

      const insertData = {
        user_id: user!.id as number,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: (body.name as string) || 'Untitled',
        rate_limit: (body.rateLimit as number) || 100,
      }
      const { error } = await supabase.from('api_keys').insert(insertData)
      if (error) throw error

      await logAudit({
        userId: user!.id as number,
        action: 'api_key.created',
        entityType: 'api_key',
        extra: { prefix: keyPrefix, source: customKey ? 'imported' : 'generated' },
        ipAddress: getIP(req),
        userAgent: clientInfo.userAgent,
      })

      return jsonResponse({
        key: { prefix: keyPrefix, name: (body.name as string) || 'Untitled', status: 'active', rateLimit: (body.rateLimit as number) || 100 },
        fullKey,
      }, 201)
    }

    if (method === 'DELETE') {
      const { data: keys } = await supabase.from('api_keys').select('*').eq('id', params.id)
      if (!keys || keys.length === 0) return jsonResponse({ error: 'API key not found' }, 404)
      const keyData = keys[0] as any
      if (keyData.user_id !== user!.id && user!.role !== 'owner') {
        return jsonResponse({ error: 'Not authorized to revoke this key' }, 403)
      }

      const { error } = await supabase.from('api_keys').delete().eq('id', params.id)
      if (error) throw error

      await logAudit({
        userId: user!.id as number,
        action: 'api_key.revoked',
        entityType: 'api_key',
        entityId: params.id,
        extra: { prefix: keyData.key_prefix },
        ipAddress: getIP(req),
        userAgent: clientInfo.userAgent,
      })

      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('API keys error:', err)
    return jsonResponse({ error: 'Failed to process request' }, 500)
  }
}

// ─── Audit Logs ──────────────────────────────────────────────────────

export async function handleAuditLogs(req: Request, method: string, path: string): Promise<Response> {
  const user = await extractUser(req)
  const authErr = requireAuth(user)
  if (authErr) return authErr

  const query = getQueryParams(new URL(req.url))
  const supabase = getSupabase()

  try {
    if (path.includes('/stats')) {
      const roleErr = requireRole(user!, 'owner')
      if (roleErr) return roleErr

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const { count: total, error: totalErr } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
      if (totalErr) throw totalErr

      const { count: todayCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())

      const { data: logs } = await supabase
        .from('audit_logs')
        .select('action, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const byAction: Record<string, number> = {}
      const byDate: Record<string, number> = {}
      if (logs) {
        for (const log of logs) {
          byAction[log.action] = (byAction[log.action] || 0) + 1
          const day = (log.created_at as string).slice(0, 10)
          byDate[day] = (byDate[day] || 0) + 1
        }
      }

      const dailyChart = Object.entries(byDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return jsonResponse({
        stats: {
          totalLogs: total || 0,
          todayLogs: todayCount || 0,
          recent: dailyChart,
          byAction: Object.entries(byAction).map(([action, count]) => ({ action, count })),
        },
      })
    }

    if (method === 'GET') {
      const limit = parseInt(query.limit) || 50
      const offset = parseInt(query.offset) || 0

      let q = supabase
        .from('audit_logs')
        .select('*, users!left(id, email, name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (user!.role !== 'owner') q = q.eq('user_id', user!.id as number)
      if (query.action) q = q.eq('action', query.action)
      if (query.entityType) q = q.eq('entity_type', query.entityType)

      const { data: logs, count, error } = await q
      if (error) throw error

      const flatLogs = (logs || []).map((l: any) => ({
        ...l,
        user_email: l.users?.email || null,
        user_name: l.users?.name || null,
        users: undefined,
      }))

      return jsonResponse({ logs: flatLogs, total: count || 0 })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('Audit logs error:', err)
    return jsonResponse({ error: 'Failed to fetch audit logs' }, 500)
  }
}

// ─── Payment Options ─────────────────────────────────────────────────

export async function handlePaymentOptions(req: Request, method: string, path: string): Promise<Response> {
  const user = await extractUser(req)
  const authErr = requireAuth(user)
  if (authErr) return authErr

  const params = extractParams(path)
  const body = await parseBody(req)
  const supabase = getSupabase()

  function branchWhere() {
    if (user!.role === 'owner') return null
    return { column: 'branch_id', value: user!.branch_id }
  }

  try {
    if (method === 'GET' && !params.id) {
      const filter = branchWhere()
      let q = supabase.from('payment_options').select('*').order('created_at', { ascending: true })
      if (filter) q = q.eq(filter.column, filter.value)
      const { data, error } = await q
      if (error) throw error
      return jsonResponse({ options: data || [] })
    }

    if (method === 'GET' && params.id) {
      const filter = branchWhere()
      let q = supabase.from('payment_options').select('*').eq('id', params.id)
      if (filter) q = q.eq(filter.column, filter.value)
      const { data } = await q.single()
      if (!data) return jsonResponse({ error: 'Not found' }, 404)
      return jsonResponse(data)
    }

    if (method === 'POST' && !params.id) {
      const insertData = { ...body } as Record<string, unknown>
      if (user!.role !== 'owner') {
        insertData.branch_id = user!.branch_id
      } else if (!insertData.branch_id) {
        return jsonResponse({ error: 'branch_id is required for owners' }, 400)
      }
      const { data, error } = await supabase.from('payment_options').insert(insertData).select()
      if (error) throw error
      return jsonResponse(data?.[0], 201)
    }

    if (method === 'PUT' && params.id) {
      const updateData = { ...body } as Record<string, unknown>
      delete updateData.id
      delete updateData.branch_id
      delete updateData.created_at
      const filter = branchWhere()
      let q = supabase.from('payment_options').update(updateData).eq('id', params.id)
      if (filter) q = q.eq(filter.column, filter.value)
      const { data, error } = await q.select()
      if (error) throw error
      if (!data || data.length === 0) return jsonResponse({ error: 'Not found' }, 404)
      return jsonResponse(data[0])
    }

    if (method === 'DELETE' && params.id) {
      const filter = branchWhere()
      let q = supabase.from('payment_options').delete().eq('id', params.id)
      if (filter) q = q.eq(filter.column, filter.value)
      const { error } = await q
      if (error) throw error
      return jsonResponse({ message: 'Payment option deleted' })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('Payment options error:', err)
    return jsonResponse({ error: 'Failed to process payment option' }, 500)
  }
}

// ─── Generic data CRUD ────────────────────────────────────────────────

async function listRecords(table: string, user: Record<string, unknown>) {
  const supabase = getSupabase()
  const filter = tenantFilter(user)
  let q = supabase.from(table).select('*').order('created_at', { ascending: false })
  if (filter) q = q.eq(filter.column, filter.value)
  const { data, error } = await q
  if (error) throw error
  return data
}

async function createRecord(table: string, fields: Record<string, unknown>, user: Record<string, unknown>) {
  const supabase = getSupabase()
  const filter = tenantFilter(user)
  if (filter) fields[filter.column] = filter.value
  const { data, error } = await supabase.from(table).insert(fields).select()
  if (error) throw error
  return data?.[0]
}

async function updateRecord(table: string, id: string, fields: Record<string, unknown>, user: Record<string, unknown>) {
  const supabase = getSupabase()
  const filter = tenantFilter(user)
  let q = supabase.from(table).update(fields).eq('id', id)
  if (filter) q = q.eq(filter.column, filter.value)
  const { data, error } = await q.select()
  if (error) throw error
  return data?.[0]
}

async function deleteRecord(table: string, id: string, user: Record<string, unknown>) {
  const supabase = getSupabase()
  const filter = tenantFilter(user)
  let q = supabase.from(table).delete().eq('id', id)
  if (filter) q = q.eq(filter.column, filter.value)
  const { error } = await q
  if (error) throw error
}

export async function handleDataRoute(
  table: string,
  req: Request,
  method: string,
  path: string,
): Promise<Response> {
  const user = await extractUser(req)
  const authErr = requireAuth(user)
  if (authErr) return authErr

  const params = extractParams(path)
  const body = await parseBody(req)

  try {
    if (method === 'GET' && !params.id) {
      const data = await listRecords(table, user!)
      return jsonResponse(data)
    }

    if (method === 'GET' && params.id) {
      const filter = tenantFilter(user!)
      const supabase = getSupabase()
      let q = supabase.from(table).select('*').eq('id', params.id)
      if (filter) q = q.eq(filter.column, filter.value)
      const { data } = await q.single()
      if (!data) return jsonResponse({ error: 'Not found' }, 404)
      return jsonResponse(data)
    }

    if (method === 'POST' && !params.id) {
      const data = await createRecord(table, body as Record<string, unknown>, user!)
      if (!data) throw new Error('Create failed')
      return jsonResponse(data, 201)
    }

    if (method === 'PUT' && params.id && !params.action) {
      const data = await updateRecord(table, params.id, body as Record<string, unknown>, user!)
      if (!data) return jsonResponse({ error: 'Not found' }, 404)
      return jsonResponse(data)
    }

    if (method === 'PUT' && params.id && params.action === 'toggle') {
      const supabase = getSupabase()
      const { data: current } = await supabase.from(table).select('status').eq('id', params.id).single()
      if (!current) return jsonResponse({ error: 'Not found' }, 404)
      const newStatus = current.status === 'active' ? 'paused' : 'active'
      const filter = tenantFilter(user!)
      let q = supabase.from(table).update({ status: newStatus }).eq('id', params.id)
      if (filter) q = q.eq(filter.column, filter.value)
      const { data: updated } = await q.select()
      if (!updated || updated.length === 0) return jsonResponse({ error: 'Not found' }, 404)
      return jsonResponse(updated[0])
    }

    if (method === 'PUT' && params.id && params.action === 'reply') {
      const { reply } = body
      const data = await updateRecord(table, params.id, { reply: reply || '' } as any, user!)
      if (!data) return jsonResponse({ error: 'Not found' }, 404)
      return jsonResponse(data)
    }

    if (method === 'DELETE' && params.id) {
      await deleteRecord(table, params.id, user!)
      return jsonResponse({ message: `${table.slice(0, -1)} deleted` })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error(`${table} error:`, err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}

// ─── External API ────────────────────────────────────────────────────

async function findUserById(id: number) {
  const supabase = getSupabase()
  const { data } = await supabase.from('users').select('id, email, name, role, branch').eq('id', id).single()
  return data as any
}

// ─── Proof Upload Helper ──────────────────────────────────────────────

async function storeProof(base64Data: string, filename: string, branchId: string): Promise<string | null> {
  if (!base64Data) return null
  try {
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/)
    if (!matches) return null

    const mimeType = matches[1]
    const base64 = matches[2]
    const ext = mimeType.split('/')[1] || 'png'
    const fileName = filename || 'proof.' + ext

    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    const path = `proofs/${branchId}/${Date.now()}_${fileName}`
    const supabase = getSupabase()
    const { error } = await supabase.storage
      .from('transactions')
      .upload(path, bytes, { contentType: mimeType, upsert: true })

    if (error) {
      console.error('[proof] Upload failed:', error.message)
      return null
    }

    const { data: { publicUrl } } = supabase.storage.from('transactions').getPublicUrl(path)
    return publicUrl
  } catch (err) {
    console.error('[proof] Error:', err instanceof Error ? err.message : String(err))
    return null
  }
}

// ─── External API ────────────────────────────────────────────────────

export async function handleExternal(req: Request, method: string, path: string): Promise<Response> {
  const respond = (data: unknown, status = 200) => jsonResponse(data, status, req)

  const { user, error } = await authenticateApiKey(req)
  if (error) return error
  if (!user) return respond({ error: 'Authentication failed' }, 401)

  const supabase = getSupabase()
  const shortPath = path.replace(/^\/external/, '') || '/'
  const segments = shortPath.split('/').filter(Boolean)
  const entity = segments[0]
  const id = segments[1]
  const body = await parseBody(req)
  const clientInfo = getClientInfo(req)

  function tenantWhere() {
    if (user!.role === 'owner') return null
    if (entity === 'payment_options') return { column: 'branch_id', value: user!.branch_id }
    return { column: 'branch', value: user!.branch_id }
  }

  async function audit(action: string, entityId?: string) {
    await logAudit({
      userId: user!.id as number,
      apiKeyId: user!.apiKeyId as number,
      action: `external.${action}`,
      entityType: entity,
      entityId,
      extra: { method, path: shortPath },
      ipAddress: getIP(req),
      userAgent: clientInfo.userAgent,
    })
  }

  try {
    if (method === 'GET' && !id) {
      const filter = tenantWhere()

      if (entity === 'tickets') {
        let ticketsQ = supabase.from('tickets').select('*').order('created_at', { ascending: false })
        if (filter) ticketsQ = ticketsQ.eq(filter.column, filter.value)
        const { data: tickets } = await ticketsQ
        if (!tickets || tickets.length === 0) return respond({ data: [] })

        const ticketIds = tickets.map((t: any) => t.id)
        const { data: soldRows } = await supabase
          .from('transactions')
          .select('ticket_id, quantity')
          .in('ticket_id', ticketIds)
          .neq('status', 'cancelled')
          .not('status', 'eq', 'available')

        const soldByTicket: Record<string, number> = {}
        if (soldRows) {
          for (const r of soldRows) {
            const key = String(r.ticket_id)
            soldByTicket[key] = (soldByTicket[key] || 0) + (Number(r.quantity) || 1)
          }
        }

        const enriched = tickets.map((t: any) => ({
          ...t,
          quantity: Number(t.quantity) || 0,
          remaining: (Number(t.quantity) || 0) - (soldByTicket[String(t.id)] || 0),
        }))

        await audit(`${method.toLowerCase()}.list`)
        return respond({ data: enriched })
      }

      let q = supabase.from(entity).select('*').order('created_at', { ascending: false })
      if (filter) q = q.eq(filter.column, filter.value)
      const { data } = await q
      await audit(`${method.toLowerCase()}.list`)
      return respond({ data })
    }

    if (method === 'GET' && id) {
      const filter = tenantWhere()
      let q = supabase.from(entity).select('*').eq('id', id)
      if (filter) q = q.eq(filter.column, filter.value)
      const { data } = await q.single()
      if (!data) return respond({ error: 'Not found' }, 404)
      await audit(`${method.toLowerCase()}.get`, id)
      return respond({ data })
    }

    if (method === 'POST' && !id) {
      const insertData = { ...body } as Record<string, unknown>
      if (user!.role !== 'owner') {
        if (entity === 'payment_options') {
          insertData.branch_id = user!.branch_id
        } else {
          insertData.branch = user!.branch_id
        }
      }

      if (entity === 'transactions' && insertData.ticket_id) {
        const requestedQty = Number(insertData.quantity) || 1
        const ticketId = insertData.ticket_id as string

        const { data: ticket } = await supabase
          .from('tickets')
          .select('quantity, title')
          .eq('id', ticketId)
          .single()

        if (!ticket) return respond({ error: 'Ticket not found' }, 404)

        const { data: soldRows } = await supabase
          .from('transactions')
          .select('quantity')
          .eq('ticket_id', ticketId)
          .neq('status', 'cancelled')
          .not('status', 'eq', 'available')

        const sold = (soldRows || []).reduce((sum: number, r: any) => sum + (Number(r.quantity) || 1), 0)
        const remaining = (Number(ticket.quantity) || 0) - sold

        if (requestedQty > remaining) {
          return respond({ error: `Only ${remaining} tickets available` }, 400)
        }
      }

      if (entity === 'transactions') {
        const branchId = user!.branch_id || String(user!.branch || '')
        insertData.branch = branchId

        const proofMeta: Record<string, unknown> = {}
        if (insertData.proof) {
          const proofUrl = await storeProof(
            String(insertData.proof),
            String(insertData.proof_name || ''),
            branchId
          )
          if (proofUrl) proofMeta.proof_url = proofUrl
        }
        if (insertData.proof_name) {
          proofMeta.proof_name = insertData.proof_name
        }
        delete insertData.proof
        delete insertData.proof_name

        const knownFields = [
          'ticket_id', 'transaction_id', 'unique_code', 'barcode',
          'quantity', 'price_per_unit', 'total_amount',
          'buyer_name', 'buyer_email', 'buyer_phone',
          'payment_method', 'payment_detail', 'status', 'purchased_at', 'branch'
        ]

        const fieldMeta: Record<string, unknown> = {}
        for (const key of Object.keys(insertData)) {
          if (!knownFields.includes(key) && key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'metadata') {
            fieldMeta[key] = insertData[key]
            delete insertData[key]
          }
        }

        insertData.metadata = { ...proofMeta, ...fieldMeta }
        if (Object.keys(insertData.metadata).length === 0) {
          delete insertData.metadata
        }
      }

      if (entity === 'transactions' && Number(insertData.quantity) > 1) {
        const qty = Number(insertData.quantity)
        const baseCode = String(insertData.unique_code || '')
        const rows = []
        for (let i = 0; i < qty; i++) {
          rows.push({
            ...insertData,
            quantity: 1,
            total_amount: Number(insertData.price_per_unit) || Number(insertData.total_amount) / qty,
            unique_code: baseCode ? `${baseCode}-${String(i + 1).padStart(3, '0')}` : `TKT-EXT-${Date.now()}-${String(i + 1).padStart(3, '0')}`,
            barcode: insertData.barcode || String(Math.floor(Math.random() * 9999999999999)).padStart(13, '0'),
          })
        }
        const { data: created, error: createErr } = await supabase
          .from(entity)
          .insert(rows)
          .select()
        if (createErr) throw createErr
        await audit(`${method.toLowerCase()}.create`, String(created?.[0]?.id))
        return respond({ data: created, quantity: qty }, 201)
      }

      const { data: created, error: createErr } = await supabase
        .from(entity)
        .insert(insertData)
        .select()
        .single()
      if (createErr) throw createErr
      await audit(`${method.toLowerCase()}.create`, String(created.id))
      return respond({ data: created }, 201)
    }

    if (method === 'PUT' && id) {
      const filter = tenantWhere()
      const updateData = { ...body } as Record<string, unknown>
      let q = supabase.from(entity).update(updateData).eq('id', id)
      if (filter) q = q.eq(filter.column, filter.value)
      const { error: updateErr } = await q
      if (updateErr) throw updateErr
      await audit(`${method.toLowerCase()}.update`, id)
      return respond({ success: true })
    }

    if (method === 'DELETE' && id) {
      const filter = tenantWhere()
      let q = supabase.from(entity).delete().eq('id', id)
      if (filter) q = q.eq(filter.column, filter.value)
      const { error: deleteErr } = await q
      if (deleteErr) throw deleteErr
      await audit(`${method.toLowerCase()}.delete`, id)
      return respond({ success: true })
    }

    return respond({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('External API error:', err)
    return respond({ error: 'Internal server error' }, 500)
  }
}

// ─── Invoice Template ────────────────────────────────────────────────

export async function handleInvoiceTemplate(req: Request, method: string): Promise<Response> {
  const user = await extractUser(req)
  const authErr = requireAuth(user)
  if (authErr) return authErr

  try {
    const supabase = getSupabase()
    const userId = user!.id as number

    if (method === 'GET') {
      let tpl = {}
      try {
        const { data: users } = await supabase
          .from('users')
          .select('invoice_template')
          .eq('id', userId)
        tpl = users?.[0]?.invoice_template || {}
      } catch {
        // Column might not exist yet — return empty template
      }
      const parsed = typeof tpl === 'string' ? JSON.parse(tpl) : tpl
      return jsonResponse({ template: parsed })
    }

    if (method === 'PUT') {
      const body = await parseBody(req)
      const { template } = body
      if (!template || typeof template !== 'object') {
        return jsonResponse({ error: 'Invalid template data' }, 400)
      }
      console.log('[invoice-template] PUT userId=', userId, 'template=', JSON.stringify(template))
      const { data: updated, error } = await supabase
        .from('users')
        .update({ invoice_template: template })
        .eq('id', userId)
        .select('invoice_template')
        .single()
      if (error) {
        console.error('[invoice-template] PUT error:', error)
        throw error
      }
      if (!updated) {
        return jsonResponse({ error: 'User not found — update matched 0 rows' }, 400)
      }
      return jsonResponse({ success: true, saved: updated.invoice_template })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('Invoice template error:', err)
    return jsonResponse({ error: 'Failed to process template' }, 500)
  }
}

// ─── Payment Gateway Config ─────────────────────────────────────────

export async function handleGatewayConfig(req: Request, method: string): Promise<Response> {
  const user = await extractUser(req)
  const authErr = requireAuth(user)
  if (authErr) return authErr

  try {
    const supabase = getSupabase()
    const userId = user!.id as number

    if (method === 'GET') {
      const { data: users } = await supabase
        .from('users')
        .select('payment_gateway, gateway_config, gateway_webhook_token')
        .eq('id', userId)
      if (!users || users.length === 0) return jsonResponse({ error: 'User not found' }, 404)
      const u = users[0] as any
      const config = typeof u.gateway_config === 'string' ? JSON.parse(u.gateway_config) : (u.gateway_config || {})
      return jsonResponse({
        paymentGateway: u.payment_gateway || null,
        gatewayConfig: config,
        webhookToken: u.gateway_webhook_token || null,
      })
    }

    if (method === 'PUT') {
      const body = await parseBody(req)
      const { paymentGateway, gatewayConfig } = body
      if (!paymentGateway) return jsonResponse({ error: 'Payment gateway is required' }, 400)

      const { data: existing } = await supabase.from('users').select('gateway_webhook_token').eq('id', userId)
      let webhookToken = (existing?.[0] as any)?.gateway_webhook_token
      if (!webhookToken) {
        webhookToken = crypto.randomUUID()
      }

      await supabase
        .from('users')
        .update({
          payment_gateway: paymentGateway as string,
          gateway_config: JSON.stringify(gatewayConfig || {}),
          gateway_webhook_token: webhookToken,
        })
        .eq('id', userId)

      return jsonResponse({
        success: true,
        paymentGateway,
        webhookToken,
        webhookUrl: `/api/webhook/${paymentGateway}/${webhookToken}`,
      }, 200)
    }

    if (method === 'DELETE') {
      await supabase
        .from('users')
        .update({ payment_gateway: null, gateway_config: null, gateway_webhook_token: null })
        .eq('id', userId)
      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('Gateway config error:', err)
    return jsonResponse({ error: 'Failed to process gateway config' }, 500)
  }
}
