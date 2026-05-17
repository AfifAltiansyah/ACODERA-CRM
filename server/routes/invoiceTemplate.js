import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/invoice-template — get template for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await query(
      'SELECT invoice_template FROM users WHERE id = ?',
      [req.user.id]
    )
    const tpl = users[0]?.invoice_template || {}
    res.json({ template: typeof tpl === 'string' ? JSON.parse(tpl) : tpl })
  } catch (err) {
    console.error('Get template error:', err)
    res.status(500).json({ error: 'Failed to fetch template' })
  }
})

// PUT /api/invoice-template — save template for current user
router.put('/', authenticate, async (req, res) => {
  try {
    const { template } = req.body
    if (!template || typeof template !== 'object') {
      return res.status(400).json({ error: 'Invalid template data' })
    }
    await query(
      'UPDATE users SET invoice_template = ? WHERE id = ?',
      [template, req.user.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('Save template error:', err)
    res.status(500).json({ error: 'Failed to save template' })
  }
})

export default router
