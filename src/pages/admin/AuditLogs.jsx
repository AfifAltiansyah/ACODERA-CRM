import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Search, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const token = () => localStorage.getItem('crm-auth-token')

export function AuditLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [actionFilter, setActionFilter] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [page, setPage] = useState(0)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', offset: String(page * 50) })
      if (actionFilter) params.set('action', actionFilter)

      const res = await fetch(`${API_BASE}/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      const data = await res.json()
      if (data.logs) setLogs(data.logs)
      if (data.total) setTotal(data.total)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [page, actionFilter])

  const formatAction = (action) => action.replace(/\./g, ' · ').replace(/_/g, ' ')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{total} total events</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select id="auditLogsFilter" name="auditLogsFilter" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0) }}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none">
            <option value="">All Actions</option>
            <option value="api_key.created">API Key Created</option>
            <option value="api_key.revoked">API Key Revoked</option>
            <option value="user.created">User Created</option>
            <option value="user.deleted">User Deleted</option>
            <option value="user.updated">User Updated</option>
          </select>
        </div>
        <span className="text-xs text-slate-400">{total} results</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <Activity size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-lg font-medium mb-1">No audit logs</p>
            <p className="text-sm">Activity will appear here as actions are performed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {logs.map((log) => (
              <div key={log.id}>
                <button onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {formatAction(log.action)}
                      </span>
                      {log.entity_type && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                          {log.entity_type}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {log.user_name || log.user_email || 'System'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                    {expanded === log.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>
                {expanded === log.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                      <p><span className="font-medium">IP:</span> {log.ip_address || '—'}</p>
                      <p><span className="font-medium">Entity:</span> {log.entity_type || '—'} / {log.entity_id || '—'}</p>
                      {log.details && <p><span className="font-medium">Details:</span> <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">{JSON.stringify(typeof log.details === 'string' ? JSON.parse(log.details) : log.details)}</code></p>}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {total > 50 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
          <span className="text-sm text-slate-500">Page {page + 1} of {Math.ceil(total / 50)}</span>
          <button disabled={(page + 1) * 50 >= total} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
        </div>
      )}
    </div>
  )
}