export function errorHandler(err, req, res) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message)

  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack)
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: err.message })
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({ error: err.message })
  }

  res.status(500).json({ error: 'Internal server error' })
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' })
}
