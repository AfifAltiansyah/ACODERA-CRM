import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Banknote, Smartphone, QrCode, Trash2,
  Check, Edit2
} from 'lucide-react'
import apiFetch from '../../api/client'

const PAYMENT_TYPES = [
  { value: 'bank', label: 'Bank Transfer', icon: Banknote, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { value: 'e_wallet', label: 'E-Wallet', icon: Smartphone, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { value: 'qr_code', label: 'QR Code', icon: QrCode, color: 'text-amber-400', bg: 'bg-amber-500/10' },
]

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
    return <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Options</h1>
          <p className="text-sm text-white/40 mt-1">Configure how customers pay for each branch</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editing ? 'Edit Option' : 'New Payment Option'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white/60 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {PAYMENT_TYPES.map(pt => (
                <button
                  key={pt.value}
                  onClick={() => setForm(f => ({ ...f, type: pt.value }))}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    form.type === pt.value
                      ? `${pt.bg} ${pt.color} border border-white/[0.1]`
                      : 'text-white/40 border border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <pt.icon size={18} />
                  {pt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Label</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. BCA"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.2] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Value ID</label>
                <input
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="auto-generated if empty"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.2] transition-colors"
                />
              </div>
              {form.type === 'bank' && (
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Account Number</label>
                  <input
                    value={form.account_number}
                    onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
                    placeholder="e.g. 81934138145"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.2] transition-colors"
                  />
                </div>
              )}
              {form.type === 'e_wallet' && (
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. 081934138145"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.2] transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.label.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 transition-all"
              >
                <Check size={16} /> {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {PAYMENT_TYPES.map(pt => (
        <section key={pt.value}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${pt.bg}`}>
                <pt.icon size={18} className={pt.color} />
              </div>
              <h2 className="text-base font-semibold text-white">{pt.label}</h2>
              <span className="text-xs text-white/30 ml-1">({grouped[pt.value].length})</span>
            </div>
            <button
              onClick={() => openNew(pt.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {grouped[pt.value].length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.06] p-8 text-center">
              <pt.icon size={32} className="mx-auto mb-3 text-white/[0.12]" />
              <p className="text-sm text-white/25">No {pt.label.toLowerCase()} options configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {grouped[pt.value].map(opt => (
                <motion.div
                  key={opt.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-1.5 rounded-lg ${pt.bg}`}>
                      <pt.icon size={14} className={pt.color} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(opt)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(opt.id)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white mb-0.5">{opt.label}</p>
                  <p className="text-xs text-white/30 font-mono">
                    {opt.account_number || opt.phone || opt.value}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
