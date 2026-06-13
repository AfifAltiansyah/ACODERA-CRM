import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trash2, RefreshCw, X, AlertTriangle } from 'lucide-react'
import { getTrashedItems, removeFromTrash, clearAllTrash, restoreContact, restoreAutomation, restoreFlow, restoreInvoice, restoreTicket } from '../utils/trashService'
import { addContact, addAutomation, addFlow, addInvoice, addTicket } from '../services/dataService'

const ENTITY_LABELS = {
  contact: 'Contact',
  automation: 'Automation',
  flow: 'Flow',
  invoice: 'Invoice',
  ticket: 'Ticket',
}

const RESTORE_FN_MAP = {
  contact: (record) => restoreContact(record, { addContactFn: addContact }),
  automation: (record) => restoreAutomation(record, { addAutomationFn: addAutomation }),
  flow: (record) => restoreFlow(record, { addFlowFn: addFlow }),
  invoice: (record) => restoreInvoice(record, { addInvoiceFn: addInvoice }),
  ticket: (record) => restoreTicket(record, { addTicketFn: addTicket }),
}

export function TrashPage() {
  const [trash, setTrash] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState(null)

  useEffect(() => {
    setTrash(getTrashedItems())
    setLoading(false)
  }, [])

  const filtered = filter === 'all' ? trash : trash.filter((t) => t.entity === filter)

  const loadFresh = () => setTrash(getTrashedItems())

  const handlePermanentlyDelete = (entity, id) => {
    if (!window.confirm('Permanently delete this item? This cannot be undone.')) return
    removeFromTrash(entity, id)
    loadFresh()
  }

const handleRestore = async (entity, record) => {
    if (!window.confirm(`Restore this ${ENTITY_LABELS[entity] || entity} back to the system?`)) return
    setRestoringId(`${entity}-${record.id}`)
    try {
      const fn = RESTORE_FN_MAP[entity]
      if (!fn) throw new Error(`No restore function for entity: ${entity}`)
      await fn(record)
      loadFresh()
    } catch (err) {
      console.error('Restore failed:', err)
      alert('Failed to restore: ' + (err.message || 'Unknown error'))
    } finally {
      setRestoringId(null)
    }
  }

  const entityCounts = {
    all: trash.length,
    contact: trash.filter((t) => t.entity === 'contact').length,
    automation: trash.filter((t) => t.entity === 'automation').length,
    flow: trash.filter((t) => t.entity === 'flow').length,
    invoice: trash.filter((t) => t.entity === 'invoice').length,
    ticket: trash.filter((t) => t.entity === 'ticket').length,
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Trash</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{trash.length} deleted items · Review and restore</p>
        </div>
        {trash.length > 0 && (
          <button
            onClick={() => {
              if (!window.confirm('Permanently delete ALL items in trash? This cannot be undone.')) return
              clearAllTrash()
              setTrash([])
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-200 dark:border-red-500/20 shrink-0"
          >
            <Trash2 size={14} /> Delete All
          </button>
        )}
      </div>

      {trash.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {['all', 'contact', 'automation', 'flow', 'invoice', 'ticket'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {f === 'all' ? 'All' : f}
              {f !== 'all' && (
                <span className="ml-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full px-1.5 py-0.5 text-xs">
                  {entityCounts[f] || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {trash.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
          <AlertTriangle size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-lg font-medium mb-1">Trash is empty</p>
          <p className="text-sm">Deleted items will appear here and can be restored.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const label = ENTITY_LABELS[item.entity] || item.entity
            const record = item.record
            const trashKey = `${item.entity}-${item.record.id}`
            const isRestoring = restoringId === trashKey
            return (
              <motion.div
                key={trashKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Deleted {new Date(item.deletedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {record.name || record.title || record.transactionId || record.subject || 'Unknown'}
                    </p>
                    {record.email && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{record.email}</p>}
                    {record.transactionId && <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{record.transactionId}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(record).map(([key, val]) => {
                        if (!val || typeof val === 'object' || ['id'].includes(key)) return null
                        return (
                          <span key={key} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded px-1.5 py-0.5">
                            <span className="font-medium">{key}:</span> {String(val).slice(0, 60)}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => handleRestore(item.entity, item.record)}
                      disabled={isRestoring}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors border border-green-200 dark:border-green-500/20 disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={isRestoring ? 'animate-spin' : ''} />
                      {isRestoring ? 'Restoring...' : 'Restore'}
                    </button>
                    <button
                      onClick={() => handlePermanentlyDelete(item.entity, item.record.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border border-red-200 dark:border-red-500/20"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}