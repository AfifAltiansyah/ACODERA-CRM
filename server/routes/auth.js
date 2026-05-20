import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { query } from '../db.js'
import { generateToken, authenticate } from '../middleware/auth.js'
import { validate, loginSchema, registerSchema, oauthSchema } from '../middleware/validate.js'

const router = Router()

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000
const loginAttempts = new Map()

function checkLockout(email) {
  const entry = loginAttempts.get(email)
  if (!entry) return null
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(email)
    return null
  }
  return entry
}

function recordFailedAttempt(email) {
  const entry = loginAttempts.get(email) || { count: 0, lockedUntil: 0 }
  entry.count++
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
  }
  loginAttempts.set(email, entry)
}

function clearAttempts(email) {
  loginAttempts.delete(email)
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
}

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const locked = checkLockout(email)
    if (locked) {
      const remaining = Math.ceil((locked.lockedUntil - Date.now()) / 1000 / 60)
      return res.status(423).json({ error: `Account locked. Try again in ${remaining} minutes.` })
    }

    const users = await query('SELECT * FROM users WHERE email = ?', [email])

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = users[0]
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      recordFailedAttempt(email)
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    clearAttempts(email)
    const token = generateToken(user)

    res.cookie('token', token, COOKIE_OPTIONS)
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

    res.cookie('token', token, COOKIE_OPTIONS)
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

const OAUTH_ALLOWED_DOMAINS = (process.env.OAUTH_ALLOWED_DOMAINS || '').split(',').filter(Boolean)

router.post('/oauth', validate(oauthSchema), async (req, res) => {
  try {
    const { email, name } = req.body

    // Restrict signup to allowed domains (skip check if no domains configured)
    if (OAUTH_ALLOWED_DOMAINS.length > 0) {
      const domain = email.split('@')[1]
      if (!domain || !OAUTH_ALLOWED_DOMAINS.includes(domain)) {
        return res.status(403).json({ error: 'Email domain not allowed' })
      }
    }

    let users = await query('SELECT * FROM users WHERE email = ?', [email])

    let user
    if (users.length === 0) {
      const tempPassword = crypto.randomBytes(16).toString('hex')
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

    res.cookie('token', token, COOKIE_OPTIONS)
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

// POST /api/auth/logout — clear the auth cookie
router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' })
  res.json({ success: true })
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