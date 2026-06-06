import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/payment-options — list payment options for the user's branch
router.get('/', async (req, res) => {
  try {
    const isOwner = req.user.role === 'owner'

    if (isOwner) {
      const options = await query('payment_options', q =>
        q.select('*')
          .order('type')
          .order('value')
      )
      return res.json({ options })
    }

    const branchId = req.user.branch_id || req.user.branch
    if (!branchId) {
      return res.json({ options: [] })
    }

    const options = await query('payment_options', q =>
      q.select('*')
        .eq('branch_id', branchId)
        .order('type')
        .order('value')
    )

    res.json({ options })
  } catch (err) {
    console.error('Payment options fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch payment options' })
  }
})

// POST /api/payment-options — create a new option
router.post('/', async (req, res) => {
  try {
    const { type, value, label, account_number, phone, branch_id } = req.body
    if (!type || !value || !label) {
      return res.status(400).json({ error: 'type, value, and label are required' })
    }

    const isOwner = req.user.role === 'owner'
    const branchId = isOwner ? branch_id : (req.user.branch_id || req.user.branch)

    if (!branchId) {
      return res.status(400).json({ error: isOwner ? 'branch_id is required for owners' : 'No branch assigned' })
    }

    if (!['bank', 'e_wallet', 'qr_code'].includes(type)) {
      return res.status(400).json({ error: 'type must be bank, e_wallet, or qr_code' })
    }

    const result = await query('payment_options', q =>
      q.insert({
        branch_id: branchId,
        type,
        value: value.toLowerCase().replace(/\s+/g, '_'),
        label,
        account_number: account_number || null,
        phone: phone || null,
      }).select()
    )

    res.status(201).json({ option: result[0] || result })
  } catch (err) {
    console.error('Payment option create error:', err)
    res.status(500).json({ error: 'Failed to create payment option' })
  }
})

// PUT /api/payment-options/:id — update an option
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { type, value, label, account_number, phone, is_active } = req.body
    const isOwner = req.user.role === 'owner'
    const branchId = req.user.branch_id || req.user.branch

    const updateData = {}
    if (type !== undefined) updateData.type = type
    if (value !== undefined) updateData.value = value.toLowerCase().replace(/\s+/g, '_')
    if (label !== undefined) updateData.label = label
    if (account_number !== undefined) updateData.account_number = account_number || null
    if (phone !== undefined) updateData.phone = phone || null
    if (is_active !== undefined) updateData.is_active = is_active

    let q = query('payment_options', q => {
      let builder = q.update(updateData).eq('id', id)
      if (!isOwner && branchId) builder = builder.eq('branch_id', branchId)
      return builder.select()
    })

    const result = await q

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Option not found' })
    }

    res.json({ option: result[0] })
  } catch (err) {
    console.error('Payment option update error:', err)
    res.status(500).json({ error: 'Failed to update payment option' })
  }
})

// DELETE /api/payment-options/:id — delete an option
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const isOwner = req.user.role === 'owner'
    const branchId = req.user.branch_id || req.user.branch

    await query('payment_options', q => {
      let builder = q.delete().eq('id', id)
      if (!isOwner && branchId) builder = builder.eq('branch_id', branchId)
      return builder
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Payment option delete error:', err)
    res.status(500).json({ error: 'Failed to delete payment option' })
  }
})

export default router
