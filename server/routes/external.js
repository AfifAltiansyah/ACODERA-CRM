import { Router } from 'express'
import { query } from '../db.js'
import { authenticateApiKey } from '../middleware/apiKeyAuth.js'
import { logAudit } from '../middleware/auditLog.js'

const router = Router()

// Wrap API key auth around handlers
function withApiKey(handler) {
  return authenticateApiKey(async (req, res) => {
    const start = Date.now()
    await handler(req, res)
    // Audit log after response
    logAudit({
      userId: req.user.id,
      action: `external.${req.method.toLowerCase()}.${req.baseUrl.split('/').pop()}`,
      entityType: req.baseUrl.split('/').pop(),
      entityId: req.params?.id,
      details: { method: req.method, path: req.originalUrl, duration: Date.now() - start },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => {})
  })
}

// Build a where clause for tenant filtering (Partner sees only their branch)
function tenantWhere(user) {
  if (user.role === 'owner' || !user.branch_id) return { clause: '', params: [] }
  return { clause: 'WHERE branch = ?', params: [user.branch_id] }
}

// ─── Contacts ──────────────────────────────────────────────────────

router.get('/contacts', withApiKey(async (req, res) => {
  const t = tenantWhere(req.user)
  const rows = await query(`SELECT * FROM contacts ${t.clause} ORDER BY created_at DESC`, t.params)
  res.json({ data: rows })
}))

router.get('/contacts/:id', withApiKey(async (req, res) => {
  const t = tenantWhere(req.user)
  const clause = t.clause ? `${t.clause} AND id = ?` : 'WHERE id = ?'
  const rows = await query(`SELECT * FROM contacts ${clause}`, [...t.params, req.params.id])
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
  res.json({ data: rows[0] })
}))

router.post('/contacts', withApiKey(async (req, res) => {
  const { name, email, phone, address, message } = req.body
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' })
  const result = await query(
    'INSERT INTO contacts (name, email, phone, address, message, branch) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, phone || '', address || '', message || '', req.user.branch || null]
  )
  const newContact = result[0] || { id: result.insertId }
  res.status(201).json({ data: { id: newContact.id, name, email } })
}))

router.put('/contacts/:id', withApiKey(async (req, res) => {
  const t = tenantWhere(req.user)
  const clause = t.clause ? `${t.clause} AND id = ?` : 'WHERE id = ?'
  const { name, email, phone, address, message } = req.body
  const fields = []; const vals = []
  if (name !== undefined) { fields.push('name = ?'); vals.push(name) }
  if (email !== undefined) { fields.push('email = ?'); vals.push(email) }
  if (phone !== undefined) { fields.push('phone = ?'); vals.push(phone) }
  if (address !== undefined) { fields.push('address = ?'); vals.push(address) }
  if (message !== undefined) { fields.push('message = ?'); vals.push(message) }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields' })
  vals.push(req.params.id)
  await query(`UPDATE contacts SET ${fields.join(', ')} ${clause}`, [...t.params, ...vals])
  res.json({ success: true })
}))

router.delete('/contacts/:id', withApiKey(async (req, res) => {
  const t = tenantWhere(req.user)
  const clause = t.clause ? `${t.clause} AND id = ?` : 'WHERE id = ?'
  await query(`DELETE FROM contacts ${clause}`, [...t.params, req.params.id])
  res.json({ success: true })
}))

// ─── Automations ────────────────────────────────────────────────────

router.get('/automations', withApiKey(async (req, res) => {
  const t = tenantWhere(req.user)
  const rows = await query(`SELECT * FROM automations ${t.clause} ORDER BY created_at DESC`, t.params)
  res.json({ data: rows })
}))

router.get('/automations/:id', withApiKey(async (req, res) => {
  const t = tenantWhere(req.user)
  const clause = t.clause ? `${t.clause} AND id = ?` : 'WHERE id = ?'
  const rows = await query(`SELECT * FROM automations ${clause}`, [...t.params, req.params.id])
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
  res.json({ data: rows[0] })
}))

router.post('/automations', withApiKey(async (req, res) => {
  const { name, type, trigger_event, status, schedule } = req.body
  if (!name || !type) return res.status(400).json({ error: 'Name and type required' })
  const result = await query(
    'INSERT INTO automations (name, type, trigger_event, status, schedule, branch) VALUES (?, ?, ?, ?, ?, ?)',
    [name, type, trigger_event || '', status || 'active', schedule || '', req.user.branch || null]
  )
  const newAuto = result[0] || { id: result.insertId }
  res.status(201).json({ data: { id: newAuto.id, name, type } })
}))

router.delete('/automations/:id', withApiKey(async (req, res) => {
  const t = tenantWhere(req.user)
  const clause = t.clause ? `${t.clause} AND id = ?` : 'WHERE id = ?'
  await query(`DELETE FROM automations ${clause}`, [...t.params, req.params.id])
  res.json({ success: true })
}))

// ─── Flows ──────────────────────────────────────────────────────────

router.get('/flows', withApiKey(async (req, res) => {
  const t = tenantWhere(req.user)
  const rows = await query(`SELECT * FROM flows ${t.clause} ORDER BY created_at DESC`, t.params)
  res.json({ data: rows })
}))

router.post('/flows', withApiKey(async (req, res) => {
  const { name, email, value, stage } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const result = await query(
    'INSERT INTO flows (name, email, value, stage, branch) VALUES (?, ?, ?, ?, ?)',
    [name, email || '', value || 0, stage || 'new', req.user.branch || null]
  )
  const newFlow = result[0] || { id: result.insertId }
  res.status(201).json({ data: { id: newFlow.id, name } })
}))

router.delete('/flows/:id', withApiKey(async (req, res) => {
  const t = tenantWhere(req.user)
  const clause = t.clause ? `${t.clause} AND id = ?` : 'WHERE id = ?'
  await query(`DELETE FROM flows ${clause}`, [...t.params, req.params.id])
  res.json({ success: true })
}))

// ─── Reviews ────────────────────────────────────────────────────────

router.get('/reviews', withApiKey(async (req, res) => {
  const rows = await query('SELECT * FROM reviews ORDER BY created_at DESC')
  res.json({ data: rows })
}))

router.post('/reviews', withApiKey(async (req, res) => {
  const { name, rating, text } = req.body
  if (!name || !rating) return res.status(400).json({ error: 'Name and rating required' })
  const result = await query(
    'INSERT INTO reviews (name, rating, text, reply) VALUES (?, ?, ?, ?)',
    [name, rating, text || '', '']
  )
  const newReview = result[0] || { id: result.insertId }
  res.status(201).json({ data: { id: newReview.id, name, rating } })
}))

router.delete('/reviews/:id', withApiKey(async (req, res) => {
  await query('DELETE FROM reviews WHERE id = ?', [req.params.id])
  res.json({ success: true })
}))

export default router