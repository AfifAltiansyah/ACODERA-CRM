import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react'
import { getFlows, addFlow, moveFlow, deleteFlow } from '../services/dataService'
import { addToTrash } from '../utils/trashService'
import { useCurrencyFormatter } from '../utils/currencyFormatter'

const stages = [
  { key: 'new', label: 'New Lead', color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-cyan-500' },
  { key: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
  { key: 'proposal', label: 'Proposal', color: 'bg-amber-500' },
  { key: 'closed', label: 'Closed/Won', color: 'bg-green-500' },
]

export function FlowManagementPage() {
   const navigate = useNavigate()
   const { formatCurrency: fc } = useCurrencyFormatter()
   const [flows, setFlows] = useState([])
   const [loading, setLoading] = useState(true)

  const refresh = () => getFlows().then(setFlows)

  useEffect(() => { refresh().finally(() => setLoading(false)) }, [])

  const handleMove = async (id, direction) => {
    const flow = flows.find(f => f.id === id)
    if (!flow) return
    const idx = stages.findIndex(s => s.key === flow.stage)
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= stages.length) return
    try {
      await moveFlow(id, stages[newIdx].key)
      refresh()
    } catch (err) {
      console.error('Move failed:', err)
      alert('Failed to move deal: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deal? This will move it to Trash.')) return
    try {
      const target = flows.find(f => f.id === id)
      if (target) addToTrash('flow', target)
      await deleteFlow(id)
      refresh()
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete deal: ' + (err.message || 'Unknown error'))
    }
  }

  const totalValue = flows.reduce((sum, f) => sum + f.value, 0)

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Flow Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{flows.length} deals · {fc(totalValue)} total pipeline value</p>
        </div>
        <button onClick={() => navigate('/dashboard/flow/new')} className="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 text-sm font-medium transition-colors"><Plus size={16} /> Add to Flow</button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageFlows = flows.filter(f => f.stage === stage.key)
          return (
            <div key={stage.key} className="min-w-[280px] flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{stage.label}</h3>
                <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{stageFlows.length}</span>
              </div>
              <div className="space-y-3">
                {stageFlows.map((f) => (
                  <motion.div key={f.id} layout className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div><p className="font-medium text-sm text-slate-900 dark:text-white">{f.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{f.email}</p></div>
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(f.id)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 mb-3">{fc(f.value)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{f.date}</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleMove(f.id, -1)} disabled={stage.key === stages[0].key} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ArrowLeft size={14} /></button>
                        <button onClick={() => handleMove(f.id, 1)} disabled={stage.key === stages[stages.length - 1].key} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ArrowRight size={14} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {stageFlows.length === 0 && <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center"><p className="text-xs text-slate-400">No deals in this stage</p></div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}