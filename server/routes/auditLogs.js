import { Router } from 'express'
import { query } from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/audit-logs — list audit logs (Owner: all, Partner: own)
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0, action, entityType } = req.query

    let conditions = []
    let params = []

    if (req.user.role !== 'owner') {
      conditions.push('al.user_id = ?')
      params.push(req.user.id)
    }

    if (action) {
      conditions.push('al.action = ?')
      params.push(action)
    }

    if (entityType) {
      conditions.push('al.entity_type = ?')
      params.push(entityType)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const logs = await query(
      `SELECT al.*, u.email as user_email, u.name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    )

    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
      params
    )

    res.json({ logs, total: countResult[0].total })
  } catch (err) {
    console.error('List audit logs error:', err)
    res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})

// GET /api/audit-logs/stats — summary stats (Owner only)
router.get('/stats', authenticate, requireRole('owner'), async (req, res) => {
  try {
    const recent = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM audit_logs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`
    )

    const byAction = await query(
      `SELECT action, COUNT(*) as count
       FROM audit_logs
       GROUP BY action
       ORDER BY count DESC
       LIMIT 20`
    )

    const total = await query('SELECT COUNT(*) as total FROM audit_logs')
    const today = await query(
      `SELECT COUNT(*) as count FROM audit_logs WHERE DATE(created_at) = CURDATE()`
    )

    res.json({
      stats: {
        totalLogs: total[0].total,
        todayLogs: today[0].count,
        recent,
        byAction,
      }
    })
  } catch (err) {
    console.error('Audit stats error:', err)
    res.status(500).json({ error: 'Failed to fetch audit stats' })
  }
})

export default router