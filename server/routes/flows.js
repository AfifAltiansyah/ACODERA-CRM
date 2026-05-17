import { Router } from 'express'
import { query } from '../db.js'
import { validate, flowSchema } from '../middleware/validate.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const flows = await query('SELECT * FROM flows ORDER BY created_at DESC')
    res.json(flows)
  } catch (err) {
    console.error('Get flows error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', validate(flowSchema), async (req, res) => {
  try {
    const { name, email, value, stage } = req.body
    const result = await query(
      'INSERT INTO flows (name, email, value, stage) VALUES (?, ?, ?, ?)',
      [name, email || '', value || 0, stage || 'new']
    )
    const newFlow = result[0] || await query('SELECT * FROM flows WHERE id = ?', [result.insertId]).then(r => r[0])
    res.status(201).json(newFlow)
  } catch (err) {
    console.error('Create flow error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', validate(flowSchema), async (req, res) => {
  try {
    const { name, email, value, stage } = req.body
    await query(
      'UPDATE flows SET name = ?, email = ?, value = ?, stage = ? WHERE id = ?',
      [name, email, value, stage, req.params.id]
    )
    const updated = await query('SELECT * FROM flows WHERE id = ?', [req.params.id]).then(r => r[0])
    res.json(updated)
  } catch (err) {
    console.error('Update flow error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM flows WHERE id = ?', [req.params.id])
    res.json({ message: 'Flow deleted' })
  } catch (err) {
    console.error('Delete flow error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
