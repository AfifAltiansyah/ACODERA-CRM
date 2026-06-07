import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, X, Download, Eye, CheckCircle, Ban, ChevronDown, ChevronUp, Clock, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getUser } from '../../utils/auth'
import { useCurrencyFormatter } from '../../utils/currencyFormatter'

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
]

function getProofUrl(tx) {
  if (tx.metadata?.proof_url) return tx.metadata.proof_url
  if (tx.metadata?.metadata?.proof_url) return tx.metadata.metadata.proof_url
  return null
}

export function TransactionsPage() {
  const { formatCurrency: fc } = useCurrencyFormatter()
  const [transactions, setTransactions] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ticketFilter, setTicketFilter] = useState('')
  const [detailOpen, setDetailOpen] = useState(null)
  const [updating, setUpdating] = useState(null)

  const fetchData = async () => {
    try {
      const user = getUser()
      const branchId = user?.branch_id || ''
      if (!branchId) { setLoading(false); return }

      const { data: ticketsData } = await supabase.from('tickets').select('id, title')
        .eq('branch', branchId).order('title')
      setTickets(ticketsData || [])

      let q = supabase.from('transactions').select('*')
        .eq('branch', branchId)
        .neq('status', 'available')
        .order('purchased_at', { ascending: false })

      if (ticketFilter) q = q.eq('ticket_id', ticketFilter)
      if (statusFilter) q = q.eq('status', statusFilter)

      const { data } = await q
      setTransactions(data || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [statusFilter, ticketFilter])

  const updateStatus = async (id, newStatus) => {
    if (newStatus === 'cancelled' && !window.confirm('Cancel this transaction? This cannot be undone.')) return
    setUpdating(id)
    try {
      await supabase.from('transactions').update({ status: newStatus }).eq('id', id)
      fetchData()
      setDetailOpen(prev => prev?.id === id ? { ...prev, status: newStatus } : prev)
    } catch (err) { alert('Failed: ' + err.message) }
    setUpdating(null)
  }

  const exportCSV = () => {
    const metaKeys = new Set()
    transactions.forEach(t => {
      if (t.metadata) Object.keys(t.metadata).forEach(k => metaKeys.add(k))
    })
    const headers = ['ID', 'Transaction ID', 'Buyer', 'Email', 'Phone', 'Ticket ID', 'Qty', 'Price/Unit', 'Total', 'Method', 'Status', 'Date', ...Array.from(metaKeys)]
    const rows = transactions.map(t => {
      const meta = t.metadata || {}
      return [
        t.id, t.transaction_id, t.buyer_name, t.buyer_email, t.buyer_phone,
        t.ticket_id, t.quantity, t.price_per_unit, t.total_amount,
        t.payment_method, t.status, t.purchased_at,
        ...Array.from(metaKeys).map(k => meta[k] || ''),
      ].map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',')
    })
    const csv = headers.join(',') + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'transactions.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = transactions.filter(t =>
    !search ||
    (t.buyer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.buyer_email || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.transaction_id || '').toLowerCase().includes(search.toLowerCase())
  )

  const allMetaKeys = new Set()
  filtered.forEach(t => {
    if (t.metadata) Object.keys(t.metadata).forEach(k => {
      if (k !== 'proof_url' && k !== 'proof_name') allMetaKeys.add(k)
    })
  })

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ink)]">Transactions</h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">Manage incoming transactions from external forms</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 rounded-full border border-[var(--hairline)] text-[var(--ink)] px-4 py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--parchment)] active:scale-[0.97]">
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search buyer, email, ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20">
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={ticketFilter} onChange={e => setTicketFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20">
          <option value="">All Tickets</option>
          {tickets.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-xs">Transaction ID</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-xs">Buyer</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell">Email</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">Qty</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">Total</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-xs">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-xs hidden xl:table-cell">Date</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-xs hidden xl:table-cell">Proof</th>
              {Array.from(allMetaKeys).slice(0, 1).map(k => (
                <th key={k} className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-xs hidden xl:table-cell capitalize">{k.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => setDetailOpen(t)}>
                <td className="px-4 py-3 font-mono text-xs text-brand-600 dark:text-brand-400">{t.transaction_id}</td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{t.buyer_name}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">{t.buyer_email}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell text-center">{t.quantity}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell text-right font-medium">{fc(t.total_amount)}</td>
                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <select value={t.status} onChange={ev => updateStatus(t.id, ev.target.value)} disabled={updating === t.id}
                    className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${
                      t.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                      t.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                    }`}>
                    {STATUS_OPTIONS.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden xl:table-cell text-xs whitespace-nowrap">
                  {t.purchased_at ? new Date(t.purchased_at).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 hidden xl:table-cell text-center">
                  {getProofUrl(t) ? (
                    <img src={getProofUrl(t)} alt="Proof" className="w-10 h-10 rounded object-cover border border-slate-200 mx-auto cursor-pointer hover:scale-150 transition-transform" onClick={e => { e.stopPropagation(); setDetailOpen(t) }} title="Click for full image" />
                  ) : '—'}
                </td>
                {Array.from(allMetaKeys).slice(0, 1).map(k => (
                  <td key={k} className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden xl:table-cell text-xs">
                    {(() => { const v = t.metadata?.[k]; return v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v) })()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No transactions found</p>
            <p className="text-sm mt-1">Transactions from external forms will appear here.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {detailOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailOpen(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Transaction Detail</h3>
                <button onClick={() => setDetailOpen(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Transaction ID</p>
                    <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{detailOpen.transaction_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Unique Code</p>
                    <p className="font-mono text-sm text-slate-900 dark:text-white">{detailOpen.unique_code || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Buyer Name</p>
                    <p className="font-medium text-slate-900 dark:text-white">{detailOpen.buyer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                    <p className="text-sm text-slate-900 dark:text-white">{detailOpen.buyer_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                    <p className="text-sm text-slate-900 dark:text-white">{detailOpen.buyer_phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Payment Method</p>
                    <p className="text-sm text-slate-900 dark:text-white capitalize">{detailOpen.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Quantity</p>
                    <p className="font-medium text-slate-900 dark:text-white">{detailOpen.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{fc(detailOpen.total_amount)}</p>
                  </div>
                </div>

                {(() => {
                  const meta = detailOpen.metadata || {}
                  const nested = meta.metadata || {}
                  const allEntries = { ...meta, ...nested }
                  delete allEntries.metadata
                  const keys = Object.keys(allEntries)
                  if (keys.length === 0) return null
                  return (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Metadata</p>
                      <div className="space-y-2">
                        {keys.map(key => {
                          const value = allEntries[key]
                          if (key === 'proof_url' && typeof value === 'string' && value.startsWith('http')) return (
                            <div key={key}>
                              <p className="text-xs text-slate-400 uppercase mb-1">Proof of Transfer</p>
                              <img src={value} alt="Proof" className="w-full rounded-lg border border-slate-200 cursor-pointer" style={{ maxHeight: 300, objectFit: 'contain' }}
                                onClick={() => window.open(value, '_blank')} />
                            </div>
                          )
                          if (key === 'proof_name') return null
                          return (
                            <div key={key} className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                              <span className="text-xs text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="text-xs font-medium text-slate-900 dark:text-white">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 flex gap-2">
                  {detailOpen.status !== 'paid' && (
                    <button onClick={() => updateStatus(detailOpen.id, 'paid')} disabled={updating === detailOpen.id}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
                      <CheckCircle size={16} /> Mark as Paid
                    </button>
                  )}
                  {detailOpen.status !== 'cancelled' && (
                    <button onClick={() => updateStatus(detailOpen.id, 'cancelled')} disabled={updating === detailOpen.id}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                      <Ban size={16} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
