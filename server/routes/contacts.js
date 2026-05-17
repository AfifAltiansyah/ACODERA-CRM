import { Router } from 'express'
import { query } from '../db.js'
import { validate, contactSchema } from '../middleware/validate.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const contacts = await query('SELECT * FROM contacts ORDER BY created_at DESC')
    res.json(contacts)
  } catch (err) {
    console.error('Get contacts error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', validate(contactSchema), async (req, res) => {
  try {
    const { name, email, phone, address, message } = req.body
    const result = await query(
      'INSERT INTO contacts (name, email, phone, address, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || '', address || '', message || '']
    )
    const newContact = result[0] || await query('SELECT * FROM contacts WHERE id = ?', [result.insertId]).then(r => r[0])
    res.status(201).json(newContact)
  } catch (err) {
    console.error('Create contact error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', validate(contactSchema), async (req, res) => {
  try {
    const { name, email, phone, address, message } = req.body
    await query(
      'UPDATE contacts SET name = ?, email = ?, phone = ?, address = ?, message = ? WHERE id = ?',
      [name, email, phone, address, message, req.params.id]
    )
    const updated = await query('SELECT * FROM contacts WHERE id = ?', [req.params.id]).then(r => r[0])
    res.json(updated)
  } catch (err) {
    console.error('Update contact error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM contacts WHERE id = ?', [req.params.id])
    res.json({ message: 'Contact deleted' })
  } catch (err) {
    console.error('Delete contact error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
