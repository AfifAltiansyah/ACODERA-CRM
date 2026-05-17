import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Ticket, MapPin, Calendar, CheckCircle, Clock, Copy, Check, ExternalLink, Users, Ban } from 'lucide-react'
import { getTicketInstances } from '../utils/mockData'
import { useCurrencyFormatter } from '../utils/currencyFormatter'

function formatPurchasedDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Jakarta',
  })
}

function getUniqueCodePrefix(ticket) {
  const abbrev = ticket.abbreviation || ''
  if (!ticket.dateTime) return `${abbrev}00000000`
  const datePart = ticket.dateTime.split(',')[0].trim()
  const parts = datePart.split(' ')
  const monthStr = parts[0]
  const dayStr = parts[1]
  const yearStr = ticket.dateTime.split(',')[1]?.trim().slice(0, 4) || '0000'
  const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }
  const mm = months[monthStr] || '00'
  const dd = dayStr ? dayStr.padStart(2, '0') : '00'
  return `${abbrev}${yearStr}${mm}${dd}`
}

export function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { formatCurrency: fc } = useCurrencyFormatter()
  const [ticket, setTicket] = useState(null)
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(null)

  useEffect(() => {
    const ticketData = JSON.parse(sessionStorage.getItem('selectedTicket') || 'null')
    if (!ticketData) {
      navigate('/dashboard/tickets')
      return
    }
    setTicket(ticketData)
    getTicketInstances(id).then((data) => {
      setInstances(data)
      setLoading(false)
    })
  }, [id, navigate])

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const paidTickets = instances.filter(i => i.status === 'paid')
  const pendingTickets = instances.filter(i => i.status === 'pending')
  const cancelledTickets = instances.filter(i => i.status === 'cancelled')
  const availableTickets = instances.filter(i => i.status === 'available')

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard/tickets')} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={16} />
        Back to Tickets
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/10">
              <Ticket size={24} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{ticket.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{ticket.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 shrink-0">
            <ExternalLink size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Sold via external website</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Unique Code</p>
            <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{getUniqueCodePrefix(ticket)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Price</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{fc(ticket.price)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
          {ticket.location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={14} />
              <span>{ticket.location}</span>
            </div>
          )}
          {ticket.dateTime && (
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>{ticket.dateTime}</span>
            </div>
          )}
        </div>
      </div>

      {pendingTickets.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Clock size={18} className="text-yellow-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Pending Payment ({pendingTickets.length})</h3>
          </div>
          <div className="space-y-2">
            {pendingTickets.map((inst) => (
              <motion.div key={inst.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-xl border border-yellow-200 dark:border-yellow-500/20 bg-yellow-50 dark:bg-yellow-500/5 p-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{inst.uniqueCode}</span>
                      <button onClick={() => copyCode(inst.uniqueCode)} className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        {copiedCode === inst.uniqueCode ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">BC: {inst.barcode}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{inst.buyerName}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{inst.buyerEmail}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{inst.buyerPhone}</p>
                    {inst.purchasedAt && <p className="text-xs text-slate-400 dark:text-slate-500">Purchased: {formatPurchasedDate(inst.purchasedAt)}</p>}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 shrink-0 ml-3">
                  <Clock size={12} />
                  Awaiting Payment
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {cancelledTickets.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Ban size={18} className="text-red-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cancelled ({cancelledTickets.length})</h3>
          </div>
          <div className="space-y-2">
            {cancelledTickets.map((inst) => (
              <motion.div key={inst.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{inst.uniqueCode}</span>
                      <button onClick={() => copyCode(inst.uniqueCode)} className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        {copiedCode === inst.uniqueCode ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">BC: {inst.barcode}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{inst.buyerName}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{inst.buyerEmail}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{inst.buyerPhone}</p>
                    {inst.purchasedAt && <p className="text-xs text-slate-400 dark:text-slate-500">Purchased: {formatPurchasedDate(inst.purchasedAt)}</p>}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 shrink-0 ml-3">
                  <Ban size={12} />
                  Cancelled
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-4">
          <Users size={18} className="text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Paid Tickets ({paidTickets.length})</h3>
        </div>

        {paidTickets.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 py-12 text-center">
            <CheckCircle size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No paid tickets yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Paid tickets will appear here when customers complete payment.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paidTickets.map((inst) => (
              <motion.div key={inst.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-xl border border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/5 p-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{inst.uniqueCode}</span>
                      <button onClick={() => copyCode(inst.uniqueCode)} className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        {copiedCode === inst.uniqueCode ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">BC: {inst.barcode}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{inst.buyerName}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{inst.buyerEmail}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{inst.buyerPhone}</p>
                    {inst.purchasedAt && <p className="text-xs text-slate-400 dark:text-slate-500">Purchased: {formatPurchasedDate(inst.purchasedAt)}</p>}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 shrink-0 ml-3">
                  <CheckCircle size={12} />
                  Paid
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
