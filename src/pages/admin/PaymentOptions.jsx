import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Banknote, Smartphone, QrCode, Trash2, Check, Edit2, ChevronDown } from 'lucide-react'
import apiFetch from '../../api/client'

const PAYMENT_TYPES = [
  { value: 'bank', label: 'Bank Transfer', icon: Banknote, accent: '#0066cc', bg: '#e8f1fc' },
  { value: 'e_wallet', label: 'E-Wallet', icon: Smartphone, accent: '#34c759', bg: '#e8f8ed' },
  { value: 'qr_code', label: 'QR Code', icon: QrCode, accent: '#af52de', bg: '#f5edfa' },
]

const BANK_COLORS = {
  bca: { bg: '#003da5', label: '#ffffff' },
  bri: { bg: '#005a32', label: '#ffffff' },
  bni: { bg: '#f4811f', label: '#ffffff' },
  mandiri: { bg: '#003e7e', label: '#ffffff' },
  permata: { bg: '#6f2c91', label: '#ffffff' },
  danamon: { bg: '#004a8f', label: '#ffffff' },
  cimb: { bg: '#7d1025', label: '#ffffff' },
  maybank: { bg: '#fecb00', label: '#1d1d1f' },
}

function BankCardVisual({ label }) {
  const colors = BANK_COLORS[label.toLowerCase()] || { bg: '#0066cc', label: '#ffffff' }
  return (
    <div
      className="flex h-20 items-center justify-center rounded-[11px] mb-4"
      style={{ background: `linear-gradient(135deg, ${colors.bg}, ${colors.bg}dd)` }}
    >
      <span className="text-lg font-semibold tracking-[-0.01em]" style={{ color: colors.label }}>
        {label.toUpperCase()}
      </span>
    </div>
  )
}

function EwalletCardVisual({ label }) {
  const gradientMap = {
    dana: 'from-[#0086e0] to-[#00a3ff]',
    shopeepay: 'from-[#ee4d2d] to-[#ff6f3d]',
    linkaja: 'from-[#ff6b00] to-[#ff9a00]',
    ovo: 'from-[#6a1b9a] to-[#8e24aa]',
    gopay: 'from-[#00aed6] to-[#00d4aa]',
  }
  const gradient = gradientMap[label.toLowerCase()] || 'from-[#0066cc] to-[#2997ff]'
  return (
    <div className={`flex h-20 items-center justify-center rounded-[11px] mb-4 bg-gradient-to-br ${gradient}`}>
      <span className="text-lg font-semibold tracking-[-0.01em] text-white">{label}</span>
    </div>
  )
}

function QrCodeCardVisual() {
  return (
    <div className="flex h-32 items-center justify-center rounded-[11px] mb-4 bg-[#f5f5f7] border border-[#e0e0e0]">
      <div className="grid grid-cols-5 gap-0.5 p-3" style={{ boxShadow: 'rgba(0,0,0,0.22) 3px 5px 30px', borderRadius: 8 }}>
        {Array.from({ length: 25 }).map((_, i) => {
          const isBlack = [0, 1, 3, 4, 5, 9, 10, 12, 14, 15, 19, 20, 21, 23, 24, 6, 7, 8, 16, 17, 18, 2, 11, 13, 22].includes(i)
          return <div key={i} className={`w-2.5 h-2.5 ${isBlack ? 'bg-[#1d1d1f]' : 'bg-white'} rounded-[1px]`} />
        })}
      </div>
    </div>
  )
}

function PaymentTypeIcon({ type, size = 18 }) {
  const pt = PAYMENT_TYPES.find(t => t.value === type)
  if (!pt) return null
  const Icon = pt.icon
  return <Icon size={size} style={{ color: pt.accent }} />
}

export function PaymentOptionsPage() {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ type: 'bank', value: '', label: '', account_number: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const fetchOptions = async () => {
    try {
      const data = await apiFetch('/payment-options')
      setOptions(data.options || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchOptions() }, [])

  const grouped = {
    bank: options.filter(o => o.type === 'bank'),
    e_wallet: options.filter(o => o.type === 'e_wallet'),
    qr_code: options.filter(o => o.type === 'qr_code'),
  }

  const openNew = (type) => {
    setEditing(null)
    setForm({ type, value: '', label: '', account_number: '', phone: '' })
    setShowForm(true)
  }

  const openEdit = (opt) => {
    setEditing(opt)
    setForm({
      type: opt.type,
      value: opt.value,
      label: opt.label,
      account_number: opt.account_number || '',
      phone: opt.phone || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.label.trim()) return
    setSaving(true)
    try {
      const body = {
        type: form.type,
        value: form.value || form.label.toLowerCase().replace(/\s+/g, '_'),
        label: form.label,
        account_number: form.account_number || undefined,
        phone: form.phone || undefined,
      }

      if (editing) {
        await apiFetch(`/payment-options/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        await apiFetch('/payment-options', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }

      setShowForm(false)
      setEditing(null)
      fetchOptions()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment option?')) return
    try {
      await apiFetch(`/payment-options/${id}`, { method: 'DELETE' })
      fetchOptions()
    } catch (err) { alert(err.message) }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0066cc] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ink)]">Payment Options</h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">Configure how customers pay for each branch</p>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-[18px] border border-[#e0e0e0] bg-white p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[17px] font-semibold tracking-[-0.374px] text-[#1d1d1f]" style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}>
                {editing ? 'Edit Payment Option' : 'New Payment Option'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2.5 mb-6">
              {PAYMENT_TYPES.map(pt => (
                <button
                  key={pt.value}
                  onClick={() => setForm(f => ({ ...f, type: pt.value }))}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[14px] font-medium transition-all ${
                    form.type === pt.value
                      ? 'bg-[#0066cc] text-white'
                      : 'bg-[#fafafc] text-[#333333] border border-[#f0f0f0] hover:border-[#e0e0e0]'
                  }`}
                  style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}
                >
                  <pt.icon size={16} />
                  {pt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[12px] font-medium text-[#7a7a7a] mb-1.5 tracking-[-0.12px]" style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}>Label</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. BCA"
                  className="w-full px-4 py-2.5 rounded-full border border-[#e0e0e0] bg-white text-[#1d1d1f] text-[14px] placeholder-[#7a7a7a] focus:outline-none focus:border-[#0066cc] transition-colors"
                  style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#7a7a7a] mb-1.5 tracking-[-0.12px]" style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}>Value ID</label>
                <input
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="auto-generated if empty"
                  className="w-full px-4 py-2.5 rounded-full border border-[#e0e0e0] bg-white text-[#1d1d1f] text-[14px] placeholder-[#7a7a7a] focus:outline-none focus:border-[#0066cc] transition-colors"
                  style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}
                />
              </div>
              {form.type === 'bank' && (
                <div>
                  <label className="block text-[12px] font-medium text-[#7a7a7a] mb-1.5 tracking-[-0.12px]" style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}>Account Number</label>
                  <input
                    value={form.account_number}
                    onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
                    placeholder="e.g. 81934138145"
                    className="w-full px-4 py-2.5 rounded-full border border-[#e0e0e0] bg-white text-[#1d1d1f] text-[14px] placeholder-[#7a7a7a] focus:outline-none focus:border-[#0066cc] transition-colors"
                    style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}
                  />
                </div>
              )}
              {form.type === 'e_wallet' && (
                <div>
                  <label className="block text-[12px] font-medium text-[#7a7a7a] mb-1.5 tracking-[-0.12px]" style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}>Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. 081934138145"
                    className="w-full px-4 py-2.5 rounded-full border border-[#e0e0e0] bg-white text-[#1d1d1f] text-[14px] placeholder-[#7a7a7a] focus:outline-none focus:border-[#0066cc] transition-colors"
                    style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-full text-[14px] font-medium text-[#333333] bg-[#fafafc] border border-[#f0f0f0] hover:border-[#e0e0e0] transition-all active:scale-[0.95]"
                style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.label.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium text-white bg-[#0066cc] hover:bg-[#0071e3] disabled:opacity-40 transition-all active:scale-[0.95]"
                style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}
              >
                <Check size={16} /> {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {PAYMENT_TYPES.map(pt => {
        const items = grouped[pt.value]
        const Icon = pt.icon
        return (
          <section key={pt.value}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon size={20} style={{ color: pt.accent }} />
                  <h2 className="text-[21px] font-semibold tracking-[0.231px] text-[#1d1d1f]" style={{ fontFamily: "'SF Pro Display', 'system-ui', '-apple-system', sans-serif" }}>
                    {pt.label}
                  </h2>
                </div>
                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[12px] font-medium bg-[#f0f0f0] text-[#7a7a7a]" style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}>
                  {items.length}
                </span>
              </div>
              <button
                onClick={() => openNew(pt.value)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-medium text-white bg-[#0066cc] hover:bg-[#0071e3] transition-all active:scale-[0.95]"
                style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}
              >
                <Plus size={15} /> Add {pt.label}
              </button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#e0e0e0] bg-white p-12 text-center">
                <Icon size={36} className="mx-auto mb-4" style={{ color: '#cccccc' }} />
                <p className="text-[14px] text-[#7a7a7a] tracking-[-0.224px]" style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}>
                  No {pt.label.toLowerCase()} options configured
                </p>
                <button
                  onClick={() => openNew(pt.value)}
                  className="mt-4 px-5 py-2 rounded-full text-[14px] font-medium text-[#0066cc] bg-[#fafafc] border border-[#e0e0e0] hover:border-[#0066cc] transition-all active:scale-[0.95]"
                  style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}
                >
                  <Plus size={14} className="inline mr-1" /> Add First Option
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(opt => (
                  <motion.div
                    key={opt.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative rounded-[18px] border border-[#e0e0e0] bg-white p-5 hover:border-[#cccccc] transition-all"
                  >
                    {pt.value === 'bank' && <BankCardVisual label={opt.label} />}
                    {pt.value === 'e_wallet' && <EwalletCardVisual label={opt.label} />}
                    {pt.value === 'qr_code' && <QrCodeCardVisual />}

                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[17px] font-semibold tracking-[-0.374px] text-[#1d1d1f] truncate" style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}>
                          {opt.label}
                        </p>
                        <p className="text-[14px] text-[#7a7a7a] tracking-[-0.224px] font-mono mt-0.5" style={{ fontFamily: "'SF Pro Text', 'system-ui', '-apple-system', sans-serif" }}>
                          {opt.account_number || opt.phone || opt.value}
                        </p>
                      </div>
                    </div>

                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(opt)}
                        className="p-2 rounded-full bg-[#fafafc] border border-[#f0f0f0] text-[#7a7a7a] hover:text-[#0066cc] hover:border-[#0066cc] transition-all"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(opt.id)}
                        className="p-2 rounded-full bg-[#fafafc] border border-[#f0f0f0] text-[#7a7a7a] hover:text-[#ff3b30] hover:border-[#ff3b30] transition-all"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
