import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required. Generate one with: openssl rand -hex 32')
  process.exit(1)
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, branch: user.branch || null },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.cookies?.token

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' })
    next()
  }
}

export function validateTenantAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' })
  if (req.user.role === 'owner') return next()

  const reqBranch = req.query.branch || req.body.branch
  if (reqBranch && reqBranch !== req.user.branch) {
    return res.status(403).json({ error: 'You can only access your own branch data' })
  }
  req.query.branch = req.user.branch
  if (req.method !== 'GET' && req.body && typeof req.body === 'object') {
    req.body.branch = req.user.branch
  }
  next()
}

export function generateApiKey() {
  const prefix = 'acd_' + crypto.randomBytes(3).toString('hex').toUpperCase()
  const secret = crypto.randomBytes(24).toString('hex')
  const full = prefix + '_' + secret
  const hash = crypto.createHash('sha256').update(full).digest('hex')
  return { prefix, full, hash }
}