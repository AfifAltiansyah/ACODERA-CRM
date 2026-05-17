import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.js'
import contactRoutes from './routes/contacts.js'
import automationRoutes from './routes/automations.js'
import flowRoutes from './routes/flows.js'
import reviewRoutes from './routes/reviews.js'
import userRoutes from './routes/users.js'
import apiKeyRoutes from './routes/apiKeys.js'
import auditLogRoutes from './routes/auditLogs.js'
import invoiceTemplateRoutes from './routes/invoiceTemplate.js'
import externalRoutes from './routes/external.js'
import webhookRoutes from './routes/webhook.js'
import gatewayConfigRoutes from './routes/gatewayConfig.js'
import { authenticate, requireRole } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000']

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}))

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : allowedOrigins,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// Global rate limiter (per IP)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Try again later.' },
})
app.use('/api', globalLimiter)

// Stricter rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Try again later.' },
})
app.use('/api/auth', authLimiter)

// Strict rate limiter for webhooks (prevent flooding)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: 'Too many webhook requests. Try again later.' },
})
app.use('/api/webhook', webhookLimiter)

// Auth routes (no auth required)
app.use('/api/auth', authRoutes)

// Protected routes
app.use('/api/users', authenticate, requireRole('owner'), userRoutes)
app.use('/api/api-keys', authenticate, apiKeyRoutes)
app.use('/api/audit-logs', authenticate, auditLogRoutes)

// Data routes (with tenant access validation)
app.use('/api/contacts', authenticate, contactRoutes)
app.use('/api/automations', authenticate, automationRoutes)
app.use('/api/flows', authenticate, flowRoutes)
app.use('/api/reviews', authenticate, reviewRoutes)
app.use('/api/invoice-template', authenticate, invoiceTemplateRoutes)

// Webhook — no auth (signature verification built into adapter)
app.use('/api/webhook', webhookRoutes)

// Gateway config — authenticated
app.use('/api/gateway-config', authenticate, gatewayConfigRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// External API — authenticated via API key
app.use('/api/external', externalRoutes)

// 404 handler
app.use(notFoundHandler)

// Global error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`API available at http://localhost:${PORT}/api`)
})