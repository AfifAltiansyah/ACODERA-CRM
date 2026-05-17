import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, Save, ArrowLeft } from 'lucide-react'
import { addContact } from '../services/dataService'

export function AddContactPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    profesi: '',
    message: '',
  })

  const handleSave = async () => {
    if (!form.name || !form.email) {
      alert('Name and email are required')
      return
    }
    setLoading(true)
    try {
      await addContact(form)
      navigate('/dashboard/contacts')
    } catch (err) {
      alert('Failed to add contact: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add New Contact</h1>
        <button onClick={() => navigate('/dashboard/contacts')} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="contactName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. John Doe"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="e.g. john@example.com"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="e.g. +1234567890"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="contactAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
            <input
              id="contactAddress"
              name="contactAddress"
              type="text"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="e.g. 123 Main St, City, Country"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="contactProfesi" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Profesi</label>
            <input
              id="contactProfesi"
              name="contactProfesi"
              type="text"
              value={form.profesi}
              onChange={(e) => setForm((p) => ({ ...p, profesi: e.target.value }))}
              placeholder="e.g. Developer"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="contactMessage" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
            <textarea
              id="contactMessage"
              name="contactMessage"
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              rows={4}
              placeholder="Any additional notes or message..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => navigate('/dashboard/contacts')}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}