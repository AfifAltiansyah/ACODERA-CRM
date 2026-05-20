import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()

// GET /api/gateway-config — get current user's gateway settings
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await query(
      'SELECT payment_gateway, gateway_config, gateway_webhook_token FROM users WHERE id = ?',
      [req.user.id]
    )
    if (users.length === 0) return res.status(404).json({ error: 'User not found' })

    const user = users[0]
    const config = typeof user.gateway_config === 'string'
      ? JSON.parse(user.gateway_config)
      : (user.gateway_config || {})

    res.json({
      paymentGateway: user.payment_gateway || null,
      gatewayConfig: config,
      webhookToken: user.gateway_webhook_token || null,
    })
  } catch (err) {
    console.error('Gateway config error:', err)
    res.status(500).json({ error: 'Failed to fetch gateway config' })
  }
})

// PUT /api/gateway-config — save gateway settings
router.put('/', authenticate, async (req, res) => {
  try {
    const { paymentGateway, gatewayConfig } = req.body
    if (!paymentGateway) {
      return res.status(400).json({ error: 'Payment gateway is required' })
    }

    // Generate a webhook token if not already set
    const users = await query('SELECT gateway_webhook_token FROM users WHERE id = ?', [req.user.id])
    let webhookToken = users[0]?.gateway_webhook_token
    if (!webhookToken) {
      webhookToken = crypto.randomUUID()
    }

    await query(
      'UPDATE users SET payment_gateway = ?, gateway_config = ?, gateway_webhook_token = ? WHERE id = ?',
      [paymentGateway, JSON.stringify(gatewayConfig || {}), webhookToken, req.user.id]
    )

    res.json({
      success: true,
      paymentGateway,
      webhookToken,
      webhookUrl: `https://your-server.com/api/webhook/${paymentGateway}/${webhookToken}`,
      webhookHeader: `x-webhook-token: ${webhookToken}`,
    })
  } catch (err) {
    console.error('Save gateway error:', err)
    res.status(500).json({ error: 'Failed to save gateway config' })
  }
})

// DELETE /api/gateway-config — disable payment gateway
router.delete('/', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE users SET payment_gateway = NULL, gateway_config = \'{}\'::jsonb, gateway_webhook_token = NULL WHERE id = ?',
      [req.user.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('Delete gateway error:', err)
    res.status(500).json({ error: 'Failed to disable gateway' })
  }
})

export default router
