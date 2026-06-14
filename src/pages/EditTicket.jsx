import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react'
import { updateTicket } from '../services/dataService'
import { uploadImage } from '../utils/templateApi'
import { useCurrencyFormatter, getCurrencySymbol } from '../utils/currencyFormatter'
import { useCurrency } from '../hooks/useCurrency.jsx'

function extractAbbreviation(title) {
  if (!title) return ''
  const letters = title.replace(/[^a-zA-Z]/g, '').toUpperCase()
  return letters.slice(0, 4).padEnd(4, 'X')
}

export function EditTicketPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const { formatCurrency: fc } = useCurrencyFormatter()

  const ticketData = JSON.parse(sessionStorage.getItem('selectedTicket') || 'null')

  const dtForInput = ticketData?.dateTime
    ? (() => {
        try {
          const d = new Date(ticketData.dateTime)
          if (isNaN(d.getTime())) return ''
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const h = String(d.getHours()).padStart(2, '0')
          const min = String(d.getMinutes()).padStart(2, '0')
          return `${y}-${m}-${day}T${h}:${min}`
        } catch { return '' }
      })()
    : ''

  const [form, setForm] = useState({
    title: ticketData?.title || '',
    description: ticketData?.description || '',
    price: ticketData?.price || 0,
    quantity: ticketData?.quantity || 1,
    location: ticketData?.location || '',
    mapsLink: ticketData?.mapsLink || '',
    dateTime: dtForInput,
  })

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState(ticketData?.imageUrl || '')
  const fileInputRef = useRef(null)

  const abbreviation = extractAbbreviation(form.title)

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return }
    setUploading(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const result = (ev.target?.result || '').toString()
          const b64 = result.split(',')[1] || ''
          if (b64) resolve(b64)
          else reject(new Error('Failed to read file'))
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })
      const url = await uploadImage(base64, file.type, 'tickets')
      setImageUrl(url)
    } catch (err) { alert('Upload failed: ' + err.message) }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!form.title) { alert('Title is required'); return }
    if (!form.price || Number(form.price) <= 0) { alert('Please enter a valid price greater than 0'); return }
    if (!form.dateTime) { alert('Please set a date and time'); return }
    setLoading(true)
    try {
      await updateTicket(id, { ...form, abbreviation, imageUrl })
      navigate('/dashboard/tickets')
    } catch (err) {
      alert('Failed to update ticket: ' + (err.message || 'Unknown error'))
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
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ink)]">Edit Ticket</h1>
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

        <div className="rounded-[14px] border-2 border-dashed border-[var(--hairline)] p-5 bg-[var(--parchment)]/50">
          <label className="block text-[13px] font-medium text-[var(--ink)] mb-3">Poster Image</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <div className="flex items-center gap-4">
            {imageUrl ? (
              <div className="relative">
                <img src={imageUrl} alt="Poster preview" className="w-24 h-16 object-cover rounded-[10px] border border-[var(--hairline)]" />
                <button onClick={() => { setImageUrl(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white border border-[var(--hairline)] text-[var(--muted)] hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-[var(--hairline)] rounded-[12px] py-8 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 cursor-pointer transition-all"
                onClick={() => fileInputRef.current?.click()}>
                <div className="text-center">
                  <Upload size={28} className="mx-auto mb-2 text-[var(--muted)]" />
                  <p className="text-[13px] font-medium text-[var(--muted)]">Click to upload poster</p>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">PNG, JPG up to 2MB</p>
                </div>
              </div>
            )}
            {uploading && (
              <div className="flex items-center gap-2 text-[13px] text-[var(--accent)]">
                <div className="h-4 w-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                Uploading...
              </div>
            )}
          </div>
        </div>

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

        <div>
          <label htmlFor="ticketMapsLink" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Google Maps Link</label>
          <input id="ticketMapsLink" name="ticketMapsLink" type="url" value={form.mapsLink} onChange={(e) => setForm(p => ({ ...p, mapsLink: e.target.value }))}
            placeholder="https://maps.google.com/..." className="apple-input" />
        </div>

        {form.quantity > 0 && form.title && form.dateTime && (
          <div className="rounded-[12px] bg-[var(--parchment)] p-3.5">
            <p className="text-[11px] text-[var(--muted)] mb-1">Unique codes will be generated for new tickets</p>
            <p className="font-mono text-[11px] text-[var(--ink)] opacity-60">
              {abbreviation}{form.dateTime.slice(0, 10).replace(/-/g, '')}... (existing instances preserved)
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate(-1)} className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-[var(--muted)] hover:bg-[var(--parchment)] transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={loading} className="px-5 py-2.5 rounded-[10px] text-[13px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40">
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </motion.div>
  )
}