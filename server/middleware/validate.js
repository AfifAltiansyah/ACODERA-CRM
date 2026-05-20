import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
})

const TRUSTED_PROVIDERS = ['google', 'github', 'facebook', 'apple', 'microsoft']

export const oauthSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(100).optional(),
  provider: z.enum(TRUSTED_PROVIDERS).optional(),
})

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  message: z.string().max(2000).optional().or(z.literal('')),
})

export const automationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.string().min(1, 'Type is required').max(100),
  trigger_event: z.string().max(100).optional().or(z.literal('')),
  schedule: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['active', 'paused']).optional(),
  contacts_count: z.number().int().nonnegative().optional(),
  subject: z.string().max(500).optional().or(z.literal('')),
  body: z.string().max(10000).optional().or(z.literal('')),
  from_name: z.string().max(100).optional().or(z.literal('')),
})

export const flowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  value: z.number().nonnegative().optional().default(0),
  stage: z.string().max(50).optional().default('new'),
})

export const reviewSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional().or(z.literal('')),
  reply: z.string().max(2000).optional().or(z.literal('')),
})

export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.string().max(50).optional(),
  branch: z.string().max(100).optional().nullable(),
})

export const apiKeySchema = z.object({
  name: z.string().max(100).optional(),
  rateLimit: z.number().int().positive().optional(),
})

export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      next(err)
    }
  }
}
