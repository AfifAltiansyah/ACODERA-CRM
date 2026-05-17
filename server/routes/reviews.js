import { Router } from 'express'
import { query } from '../db.js'
import { validate, reviewSchema } from '../middleware/validate.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const reviews = await query('SELECT * FROM reviews ORDER BY created_at DESC')
    res.json(reviews)
  } catch (err) {
    console.error('Get reviews error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', validate(reviewSchema), async (req, res) => {
  try {
    const { name, rating, text, reply } = req.body
    const result = await query(
      'INSERT INTO reviews (name, rating, text, reply) VALUES (?, ?, ?, ?)',
      [name, rating, text || '', reply || '']
    )
    const newReview = result[0] || await query('SELECT * FROM reviews WHERE id = ?', [result.insertId]).then(r => r[0])
    res.status(201).json(newReview)
  } catch (err) {
    console.error('Create review error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', validate(reviewSchema), async (req, res) => {
  try {
    const { name, rating, text, reply } = req.body
    await query(
      'UPDATE reviews SET name = ?, rating = ?, text = ?, reply = ? WHERE id = ?',
      [name, rating, text, reply, req.params.id]
    )
    const updated = await query('SELECT * FROM reviews WHERE id = ?', [req.params.id]).then(r => r[0])
    res.json(updated)
  } catch (err) {
    console.error('Update review error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/reply', async (req, res) => {
  try {
    const { reply } = req.body
    if (typeof reply !== 'string' || reply.length > 2000) {
      return res.status(400).json({ error: 'Reply must be a string under 2000 characters' })
    }
    await query('UPDATE reviews SET reply = ? WHERE id = ?', [reply, req.params.id])
    const updated = await query('SELECT * FROM reviews WHERE id = ?', [req.params.id]).then(r => r[0])
    res.json(updated)
  } catch (err) {
    console.error('Reply to review error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM reviews WHERE id = ?', [req.params.id])
    res.json({ message: 'Review deleted' })
  } catch (err) {
    console.error('Delete review error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
