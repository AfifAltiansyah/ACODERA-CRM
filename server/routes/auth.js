import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { generateToken, authenticate } from '../middleware/auth.js'
import { validate, loginSchema, registerSchema, oauthSchema } from '../middleware/validate.js'

const router = Router()

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const users = await query('SELECT * FROM users WHERE email = ?', [email])

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = users[0]
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = generateToken(user)

    res.json({
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
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const existing = await query('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, 'user']
    )

    const newUser = result[0] || { id: result.insertId, email, name, role: 'user' }
    const token = generateToken(newUser)

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        branch: null,
        branch_id: null,
      },
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/oauth', validate(oauthSchema), async (req, res) => {
  try {
    const { email, name } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    let users = await query('SELECT * FROM users WHERE email = ?', [email])

    let user
    if (users.length === 0) {
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)
      const displayName = name || email.split('@')[0]
      const result = await query(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, displayName, 'user']
      )
      user = result[0] || { id: result.insertId, email, name: displayName, role: 'user' }
    } else {
      user = users[0]
    }

    const token = generateToken(user)

    res.json({
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
    console.error('OAuth error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/auth/me — returns current user profile from JWT
router.get('/me', authenticate, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, email, name, role, branch, branch_id, created_at FROM users WHERE id = ?',
      [req.user.id]
    )
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ user: users[0] })
  } catch (err) {
    console.error('Profile error:', err)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

export default router