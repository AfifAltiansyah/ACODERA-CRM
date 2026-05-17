import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, ArrowLeft } from 'lucide-react'
import { addTicket } from '../services/dataService'
import { useCurrencyFormatter, getCurrencySymbol } from '../utils/currencyFormatter'
import { useCurrency } from '../hooks/useCurrency.jsx'

function extractAbbreviation(title) {
  if (!title) return ''
  const letters = title.replace(/[^a-zA-Z]/g, '').toUpperCase()
  return letters.slice(0, 4).padEnd(4, 'X')
}

export function AddTicketPage() {
  const navigate = useNavigate()
  const { currency, rates } = useCurrency()
  const { formatCurrency: fc } = useCurrencyFormatter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: 0,
    quantity: 1,
    location: '',
    dateTime: '',
  })

  const abbreviation = extractAbbreviation(form.title)

  const handleSave = async () => {
    if (!form.title) { alert('Title is required'); return }
    if (!form.price || Number(form.price) <= 0) { alert('Please enter a valid price greater than 0'); return }
    if (!form.dateTime) { alert('Please set a date and time'); return }
    setLoading(true)
    try {
      await addTicket({ ...form, abbreviation })
      navigate('/dashboard/tickets')
    } catch (err) {
      alert('Failed to create ticket: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[13px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ink)]">Create New Ticket</h1>
        </div>
        <button onClick={() => navigate('/dashboard/tickets')} className="p-2 rounded-[10px] text-[var(--muted)] hover:bg-[var(--parchment)] transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="apple-card space-y-5">
        <div>
          <label htmlFor="ticketTitle" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Title *</label>
          <input id="ticketTitle" name="ticketTitle" type="text" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Tech Conference 2024" className="apple-input" />
        </div>

        {form.title && (
          <div className="rounded-[12px] bg-[var(--accent)]/5 border border-[var(--accent)]/20 p-3.5">
            <p className="text-[11px] font-medium text-[var(--accent)] mb-1">Abbreviation</p>
            <p className="font-mono text-[20px] font-bold text-[var(--accent)] tracking-[0.1em]">{abbreviation}</p>
          </div>
        )}

        <div>
          <label htmlFor="ticketDescription" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Description</label>
          <textarea id="ticketDescription" name="ticketDescription" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3} placeholder="Event description..." className="apple-input !rounded-[12px] resize-none" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="ticketPrice" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Price ({getCurrencySymbol(currency)}) *</label>
            <input id="ticketPrice" name="ticketPrice" type="number" min={0} value={form.price} onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
              className="apple-input" />

          </div>
          <div>
            <label htmlFor="ticketQuantity" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Quantity *</label>
            <input id="ticketQuantity" name="ticketQuantity" type="number" min={1} value={form.quantity} onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
              className="apple-input" />
          </div>
          <div>
            <label htmlFor="ticketDateTime" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Date & Time *</label>
            <input id="ticketDateTime" name="ticketDateTime" type="datetime-local" value={form.dateTime} onChange={(e) => setForm(p => ({ ...p, dateTime: e.target.value }))}
              className="apple-input" />
          </div>
        </div>

        <div>
          <label htmlFor="ticketLocation" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Location</label>
          <input id="ticketLocation" name="ticketLocation" type="text" value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
            placeholder="e.g. Jakarta Convention Center" className="apple-input" />
        </div>

        {form.quantity > 0 && form.title && form.dateTime && (
          <div className="rounded-[12px] bg-[var(--parchment)] p-3.5">
            <p className="text-[11px] text-[var(--muted)] mb-1">Unique codes will be generated</p>
            <p className="font-mono text-[11px] text-[var(--ink)] opacity-60">
              {abbreviation}{form.dateTime.slice(0, 10).replace(/-/g, '')}00001 → {abbreviation}{form.dateTime.slice(0, 10).replace(/-/g, '')}{String(form.quantity).padStart(5, '0')}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate('/dashboard/tickets')} className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-[var(--muted)] hover:bg-[var(--parchment)] transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={loading} className="px-5 py-2.5 rounded-[10px] text-[13px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40">
          {loading ? 'Saving...' : 'Create Ticket'}
        </button>
      </div>
    </motion.div>
  )
}
