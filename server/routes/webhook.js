import { Router } from 'express'
import { query } from '../db.js'
import { getAdapter } from '../lib/gateways/registry.js'
import { processPayment } from '../lib/gateways/processor.js'

const router = Router()

// POST /api/webhook/:gateway/:token
router.post('/:gateway/:token', async (req, res) => {
  try {
    const { gateway } = req.params

    // Accept token from URL (backward compat), x-webhook-token header, or request body
    const token = req.params.token
      || req.headers['x-webhook-token']
      || req.body?.webhook_token
      || req.body?.token

    if (!token) {
      return res.status(400).json({ error: 'Missing webhook token. Send via URL, x-webhook-token header, or webhook_token in body.' })
    }

    // Look up the branch by webhook token
    const users = await query(
      'SELECT id, branch_id, payment_gateway, gateway_config FROM users WHERE gateway_webhook_token = ? AND payment_gateway = ?',
      [token, gateway]
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'No matching gateway configuration found' })
    }

    const user = users[0]
    const config = typeof user.gateway_config === 'string'
      ? JSON.parse(user.gateway_config)
      : (user.gateway_config || {})

    const adapter = getAdapter(gateway)
    if (!adapter) {
      return res.status(400).json({ error: `Unsupported gateway: ${gateway}` })
    }

    // Verify signature
    if (!adapter.verify(req, config)) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Parse the webhook payload
    const parsed = adapter.parse(req)
    if (!parsed.transactionId) {
      return res.status(400).json({ error: 'Missing transaction_id' })
    }

    // Process the payment status update
    const result = await processPayment({
      transactionId: parsed.transactionId,
      status: parsed.status,
      grossAmount: parsed.grossAmount,
      buyerEmail: parsed.buyerEmail,
      gateway,
    })

    // Always return 200 to Midtrans (they retry on non-200)
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[webhook] Error:', err)
    return res.status(200).json({ success: false, error: 'Internal error' })
  }
})

export default router
