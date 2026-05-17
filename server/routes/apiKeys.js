import { Router } from 'express'
import { query } from '../db.js'
import { authenticate, generateApiKey } from '../middleware/auth.js'
import { logAudit } from '../middleware/auditLog.js'
import { validate, apiKeySchema } from '../middleware/validate.js'

const router = Router()

// GET /api/api-keys — list API keys (Owner: all, Partner: own)
router.get('/', authenticate, async (req, res) => {
  try {
    let rows
    if (req.user.role === 'owner') {
      rows = await query(
        `SELECT ak.id, ak.key_prefix, ak.name, ak.status, ak.rate_limit, ak.last_used_at, ak.created_at,
                u.email as user_email, u.name as user_name
         FROM api_keys ak JOIN users u ON ak.user_id = u.id
         ORDER BY ak.created_at DESC`
      )
    } else {
      rows = await query(
        `SELECT id, key_prefix, name, status, rate_limit, last_used_at, created_at
         FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`,
        [req.user.id]
      )
    }
    res.json({ keys: rows })
  } catch (err) {
    console.error('List API keys error:', err)
    res.status(500).json({ error: 'Failed to fetch API keys' })
  }
})

// POST /api/api-keys — create a new API key
router.post('/', authenticate, validate(apiKeySchema), async (req, res) => {
  try {
    const { name, rateLimit } = req.body

    const { prefix, full, hash } = generateApiKey()

    await query(
      'INSERT INTO api_keys (user_id, key_hash, key_prefix, name, rate_limit) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, hash, prefix, name || 'Untitled', rateLimit || 100]
    )

    await logAudit({
      userId: req.user.id,
      action: 'api_key.created',
      entityType: 'api_key',
      details: { prefix },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    // Return the full key only on creation
    res.status(201).json({
      key: {
        prefix,
        name: name || 'Untitled',
        status: 'active',
        rateLimit: rateLimit || 100,
      },
      fullKey: full, // Only shown once!
    })
  } catch (err) {
    console.error('Create API key error:', err)
    res.status(500).json({ error: 'Failed to create API key' })
  }
})

// DELETE /api/api-keys/:id — revoke an API key
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    // Check ownership or Owner role
    const keys = await query('SELECT * FROM api_keys WHERE id = ?', [id])
    if (keys.length === 0) return res.status(404).json({ error: 'API key not found' })
    if (keys[0].user_id !== req.user.id && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Not authorized to revoke this key' })
    }

    await query('DELETE FROM api_keys WHERE id = ?', [id])

    await logAudit({
      userId: req.user.id,
      action: 'api_key.revoked',
      entityType: 'api_key',
      entityId: id,
      details: { prefix: keys[0].key_prefix },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Revoke API key error:', err)
    res.status(500).json({ error: 'Failed to revoke API key' })
  }
})

export default router