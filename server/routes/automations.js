import { Router } from 'express'
import { query } from '../db.js'
import { validate, automationSchema } from '../middleware/validate.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const automations = await query('SELECT * FROM automations ORDER BY created_at DESC')
    res.json(automations)
  } catch (err) {
    console.error('Get automations error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', validate(automationSchema), async (req, res) => {
  try {
    const { name, type, trigger_event, schedule, status, contacts_count, subject, body, from_name } = req.body
    const result = await query(
      'INSERT INTO automations (name, type, trigger_event, schedule, status, contacts_count, subject, body, from_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, type, trigger_event || '', schedule || '', status || 'active', contacts_count || 0, subject || '', body || '', from_name || 'Acodera CRM']
    )
    const newAuto = result[0] || await query('SELECT * FROM automations WHERE id = ?', [result.insertId]).then(r => r[0])
    res.status(201).json(newAuto)
  } catch (err) {
    console.error('Create automation error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', validate(automationSchema), async (req, res) => {
  try {
    const { name, type, trigger_event, schedule, status, subject, body, from_name } = req.body
    await query(
      'UPDATE automations SET name = ?, type = ?, trigger_event = ?, schedule = ?, status = ?, subject = ?, body = ?, from_name = ? WHERE id = ?',
      [name, type, trigger_event, schedule, status, subject, body, from_name, req.params.id]
    )
    const updated = await query('SELECT * FROM automations WHERE id = ?', [req.params.id]).then(r => r[0])
    res.json(updated)
  } catch (err) {
    console.error('Update automation error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/toggle', async (req, res) => {
  try {
    const [current] = await query('SELECT status FROM automations WHERE id = ?', [req.params.id])
    if (!current) {
      return res.status(404).json({ error: 'Automation not found' })
    }
    const newStatus = current.status === 'active' ? 'paused' : 'active'
    await query('UPDATE automations SET status = ? WHERE id = ?', [newStatus, req.params.id])
    const updated = await query('SELECT * FROM automations WHERE id = ?', [req.params.id]).then(r => r[0])
    res.json(updated)
  } catch (err) {
    console.error('Toggle automation error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM automations WHERE id = ?', [req.params.id])
    res.json({ message: 'Automation deleted' })
  } catch (err) {
    console.error('Delete automation error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
