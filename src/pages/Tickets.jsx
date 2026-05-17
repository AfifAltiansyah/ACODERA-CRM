import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Plus, Trash2, X, Ticket, MapPin, Calendar, DollarSign, CheckCircle, Circle } from 'lucide-react'
import { getTickets, addTicket, deleteTicket } from '../services/dataService'
import { addToTrash } from '../utils/trashService'
import { useCurrencyFormatter } from '../utils/currencyFormatter'

function extractAbbreviation(title) {
  if (!title) return ''
  const letters = title.replace(/[^a-zA-Z]/g, '').toUpperCase()
  return letters.slice(0, 4).padEnd(4, 'X')
}

function getUniqueCodePrefix(ticket) {
  const abbrev = ticket.abbreviation || ''
  const dt = ticket.dateTime
  if (!dt) return `${abbrev}00000000`
  const parts = dt.replace(',', '').split(' ')
  const monthStr = parts[0]
  const dayStr = parts[1]
  const yearStr = parts[2] || '0000'
  const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }
  const mm = months[monthStr] || '00'
  const dd = dayStr ? dayStr.padStart(2, '0') : '00'
  return `${abbrev}${yearStr}${mm}${dd}`
}

export function TicketsPage() {
  const navigate = useNavigate()
  const { formatCurrency: fc } = useCurrencyFormatter()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const refresh = () => getTickets().then(setTickets)

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const filtered = tickets.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.location.toLowerCase().includes(search.toLowerCase()) ||
    t.abbreviation.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    navigate('/dashboard/tickets/new')
  }

  const openTicket = (ticket) => {
    sessionStorage.setItem('selectedTicket', JSON.stringify(ticket))
    navigate(`/dashboard/tickets/${ticket.id}`)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ticket? This will move it to Trash.')) return
    try {
      const target = tickets.find(t => t.id === id)
      if (target) addToTrash('ticket', target)
      await deleteTicket(id)
      refresh()
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete ticket: ' + (err.message || 'Unknown error'))
    }
  }

  const totalTickets = tickets.reduce((s, t) => s + (t.quantity || 0), 0)
  const totalSold = tickets.reduce((s, t) => s + (t.soldCount || 0), 0)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tickets</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tickets.length} events, {totalTickets} total tickets</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 text-sm font-medium transition-colors">
          <Plus size={16} /> New Ticket
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <Ticket size={16} />
            <p className="text-sm">Total Tickets</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalTickets}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <CheckCircle size={16} />
            <p className="text-sm">Sold</p>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalSold}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <Circle size={16} />
            <p className="text-sm">Available</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalTickets - totalSold}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <DollarSign size={16} />
            <p className="text-sm">Revenue</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {fc(tickets.reduce((s, t) => s + (t.soldCount || 0) * Number(t.price), 0))}
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input id="ticketsSearch" name="ticketsSearch" type="text" placeholder="Search by title, location, or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((t) => {
          const sold = t.soldCount || 0
          const total = t.quantity || 0
          const pct = total ? Math.round((sold / total) * 100) : 0
          return (
            <motion.div key={t.id} layout>
              <div className="bg-white dark:bg-slate-800 rounded-xl border overflow-hidden transition-shadow border-slate-200 dark:border-slate-700 hover:shadow-lg">
                <button onClick={() => openTicket(t)} className="w-full text-left p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/10">
                        <Ticket size={16} className="text-brand-600 dark:text-brand-400" />
                      </div>
                      <div>
                        <p className="font-mono text-xs text-brand-600 dark:text-brand-400">{getUniqueCodePrefix(t)}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{total} tickets</p>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t.title}</h3>
                  {t.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{t.description}</p>}
                  <div className="space-y-2 text-sm">
                    {t.location && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <MapPin size={14} />
                        <span className="truncate">{t.location}</span>
                      </div>
                    )}
                    {t.dateTime && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Calendar size={14} />
                        <span>{t.dateTime}</span>
                      </div>
                    )}
                  </div>
                </button>
                <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3 bg-slate-50 dark:bg-slate-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{fc(t.price)}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{sold}/{total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg font-medium">No tickets found</p>
          <p className="text-sm mt-1">Create a new ticket to get started.</p>
        </div>
      )}
    </div>
  )
}