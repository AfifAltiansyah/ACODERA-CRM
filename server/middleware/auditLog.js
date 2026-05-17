import { query } from '../db.js'

export async function logAudit({ userId, apiKeyId, action, entityType, entityId, details, ipAddress, userAgent }) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, api_key_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, apiKeyId || null, action, entityType || null, entityId ? String(entityId) : null,
       details ? JSON.stringify(details) : null, ipAddress || null, userAgent || null]
    )
  } catch (err) {
    console.error('Audit log error:', err)
  }
}

// Express middleware to automatically log requests
export function auditLogMiddleware(action) {
  return async (req, res, next) => {
    // Store the original res.json to capture the response
    const originalJson = res.json.bind(res)
    res.json = function (body) {
      res.json = originalJson // restore
      // Log after response
      logAudit({
        userId: req.user?.id,
        action,
        entityType: req.baseUrl?.split('/').pop(),
        entityId: req.params?.id,
        details: { method: req.method, path: req.originalUrl, statusCode: res.statusCode },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch(() => {})
      return originalJson(body)
    }
    next()
  }
}