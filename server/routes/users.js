import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { validate, userSchema } from '../middleware/validate.js'

const router = Router()

// GET /api/users — list all users (Owner only)
router.get('/', authenticate, requireRole('owner'), async (req, res) => {
  try {
    const users = await query(
      'SELECT id, email, name, role, branch, created_at FROM users ORDER BY created_at DESC'
    )
    res.json({ users })
  } catch (err) {
    console.error('List users error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// POST /api/users — create a new user (Owner only)
router.post('/', authenticate, requireRole('owner'), validate(userSchema), async (req, res) => {
  try {
    const { email, password, name, role, branch } = req.body

    const existing = await query('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (email, password, name, role, branch) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, name, role || 'partner', branch || null]
    )

    const newUser = result[0] || { id: result.insertId, email, name, role: role || 'partner', branch: branch || null }

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        branch: newUser.branch,
      }
    })
  } catch (err) {
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// PUT /api/users/:id — update a user (Owner only)
router.put('/:id', authenticate, requireRole('owner'), async (req, res) => {
  try {
    const { id } = req.params
    const { email, password, name, role, branch } = req.body

    const fields = []
    const values = []
    if (email) { fields.push('email = ?'); values.push(email) }
    if (name) { fields.push('name = ?'); values.push(name) }
    if (role) { fields.push('role = ?'); values.push(role) }
    if (branch !== undefined) { fields.push('branch = ?'); values.push(branch || null) }
    if (password) {
      const hashed = await bcrypt.hash(password, 10)
      fields.push('password = ?'); values.push(hashed)
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(id)
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
    res.json({ success: true })
  } catch (err) {
    console.error('Update user error:', err)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// DELETE /api/users/:id — delete a user (Owner only)
router.delete('/:id', authenticate, requireRole('owner'), async (req, res) => {
  try {
    const { id } = req.params
    // Prevent deleting self
    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }
    const [target] = await query('SELECT branch_id FROM users WHERE id = ?', [id])
    if (target?.branch_id) {
      const branchTables = ['contacts', 'flows', 'automations', 'reviews', 'tickets', 'transactions', 'automation_logs', 'scheduled_emails']
      for (const table of branchTables) {
        await query(table, q => q.delete().eq('branch', target.branch_id))
      }
    }
    await query('DELETE FROM users WHERE id = ?', [id])
    res.json({ success: true })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

export default router