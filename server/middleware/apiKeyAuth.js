import crypto from 'crypto'
import { query } from '../db.js'

// In-memory rate limiter for API keys
const rateLimitStore = new Map()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.resetAt > 3600000) rateLimitStore.delete(key)
  }
}, 300000)

function checkRateLimit(prefix, maxRequests) {
  const now = Date.now()
  const key = `api:${prefix}`

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 3600000 })
    return true
  }

  const entry = rateLimitStore.get(key)
  if (now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 3600000 })
    return true
  }

  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

// Middleware: authenticate via API key (for external API access)
export function authenticateApiKey(handler) {
  return async (req, res) => {
    const apiKey = req.headers['x-api-key']
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required. Use x-api-key header.' })
    }

    try {
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex')
      const keys = await query(
        'SELECT ak.*, u.email, u.name, u.role, u.branch, u.branch_id FROM api_keys ak JOIN users u ON ak.user_id = u.id WHERE ak.key_hash = ? AND ak.status = ?',
        [hash, 'active']
      )

      if (keys.length === 0) {
        return res.status(401).json({ error: 'Invalid or revoked API key' })
      }

      const keyData = keys[0]

      // Rate limit check
      if (!checkRateLimit(keyData.key_prefix, keyData.rate_limit || 100)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' })
      }

      // Update last_used_at
      await query('UPDATE api_keys SET last_used_at = NOW() WHERE id = ?', [keyData.id])

      // Attach user info to request
      req.user = {
        id: keyData.user_id,
        email: keyData.email,
        name: keyData.name,
        role: keyData.role,
        branch: keyData.branch,
        branch_id: keyData.branch_id,
        apiKeyId: keyData.id,
        authType: 'api_key',
      }

      return handler(req, res)
    } catch (err) {
      console.error('API key auth error:', err)
      return res.status(500).json({ error: 'Authentication failed' })
    }
  }
}