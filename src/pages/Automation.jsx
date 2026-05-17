import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Plus, Trash2, Mail, MessageSquare, Target, Megaphone, FileText, ChevronRight } from 'lucide-react'
import { getAutomations, toggleAutomation, deleteAutomation } from '../services/dataService'
import { addToTrash } from '../utils/trashService'

const typeIcons = { 'Email Drip': Mail, 'SMS Follow-up': MessageSquare, 'Lead Scoring': Target, 'Marketing Campaign': Megaphone, 'Invoice Reminder': FileText }
const typeColors = {
  'Email Drip': 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'SMS Follow-up': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  'Lead Scoring': 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  'Marketing Campaign': 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  'Invoice Reminder': 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
}

export function AutomationPage() {
  const navigate = useNavigate()
  const [automations, setAutomations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const refresh = () => getAutomations().then(setAutomations)

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const handleToggle = async (id) => {
    try {
      await toggleAutomation(id)
      refresh()
    } catch (err) {
      console.error('Toggle failed:', err)
      alert('Failed to toggle automation: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this automation? This will move it to Trash.')) return
    try {
      const target = automations.find(a => a.id === id)
      if (target) addToTrash('automation', target)
      await deleteAutomation(id)
      refresh()
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete automation: ' + (err.message || 'Unknown error'))
    }
  }

  const filtered = automations.filter(a => filter === 'all' || a.status === filter)

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Automation</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage seller and marketing automation rules</p>
        </div>
        <button onClick={() => navigate('/dashboard/automation/new')} className="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 text-sm font-medium transition-colors"><Plus size={16} /> Create Automation</button>
      </div>

      <div className="flex gap-2">
        {['all', 'active', 'paused'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((a) => {
          const Icon = typeIcons[a.type] || Zap
          return (
            <motion.div key={a.id} layout className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeColors[a.type] || 'bg-slate-100 text-slate-700'}`}><Icon size={18} /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{a.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{a.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>{a.status === 'active' ? 'Active' : 'Paused'}</span>
                    <button onClick={() => handleDelete(a.id)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">Trigger:</span> <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">{a.trigger}</code></p>
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">Schedule:</span> {a.scheduleType === 'recurring'
                    ? `Every ${a.scheduleFrequency === 'daily' ? 'day' : a.scheduleFrequency === 'weekly' ? 'week' : a.scheduleFrequency === 'biweekly' ? '2 weeks' : a.scheduleFrequency === 'monthly' ? 'month' : 'year'}`
                    : a.scheduleType === 'immediate'
                    ? 'Immediate (on trigger)'
                    : 'One time'}
                  </p>
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">Contacts:</span> {a.contacts}</p>
                </div>

                {a.type === 'Invoice Reminder' && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20">
                    <p className="text-xs font-medium text-rose-700 dark:text-rose-400"><FileText size={12} className="inline mr-1" />Sends invoice to unpaid customers</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button onClick={() => handleToggle(a.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${a.status === 'active' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>{a.status === 'active' ? 'Pause' : 'Activate'}</button>
                  </div>
                  <button onClick={() => navigate(`/dashboard/automation/${a.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors">
                    View Details <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No automations found</p>
            <p className="text-sm mt-1">Create your first automation to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}