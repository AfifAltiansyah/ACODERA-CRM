import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, GitBranch, DollarSign, Star, TrendingUp, Plus, Zap, Receipt, Ticket } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getContacts, getFlows, getReviews, getInvoices } from '../utils/mockData'
import { useCurrencyFormatter, getCurrencySymbol } from '../utils/currencyFormatter'

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }

export function DashboardHome() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [flows, setFlows] = useState([])
  const [reviews, setReviews] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const { currency, formatCurrency: fc } = useCurrencyFormatter()

  useEffect(() => {
    Promise.all([getContacts(), getFlows(), getReviews(), getInvoices()])
      .then(([c, f, r, i]) => {
        setContacts(c)
        setFlows(f)
        setReviews(r)
        setInvoices(i)
      })
      .finally(() => setLoading(false))
  }, [])

  const totalContacts = contacts.length
  const activeFlows = flows.filter(f => f.stage !== 'closed').length
  const totalRevenue = flows.reduce((sum, f) => sum + (Number(f.value) || 0), 0)
    + invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0)
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
      : '—'

  const revenueByMonth = flows
    .filter(f => f.date)
    .reduce((acc, f) => {
      const month = f.date.slice(0, 7)
      acc[month] = (acc[month] || 0) + (Number(f.value) || 0)
      return acc
    }, {})

  invoices.filter(i => i.status === 'paid' && i.dateTime).forEach(i => {
    const month = i.dateTime.slice(0, 7)
    revenueByMonth[month] = (revenueByMonth[month] || 0) + (Number(i.totalAmount) || 0)
  })

  const revenueChartData = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month: month.slice(5), value }))

  const hasRevenueData = revenueChartData.length > 0
  const hasContacts = totalContacts > 0

  const stats = [
    { label: 'Total Contacts', value: totalContacts.toLocaleString(), icon: Users, color: 'bg-[var(--accent)]' },
    { label: 'Active Flows', value: activeFlows.toString(), icon: GitBranch, color: 'bg-[#2997ff]' },
    { label: 'Revenue', value: hasRevenueData ? fc(totalRevenue) : '—', icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Avg Rating', value: avgRating, icon: Star, color: 'bg-amber-500' },
  ]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <motion.div key={s.label} variants={item} className="apple-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${s.color}`}>
                <s.icon size={16} className="text-white" />
              </div>
            </div>
            <p className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--ink)]">{s.value}</p>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2 apple-card">
          <h3 className="text-[15px] font-semibold text-[var(--ink)] mb-4">Revenue Overview</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {hasRevenueData ? (
                <AreaChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" opacity={0.5} />
                  <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} />
                  <YAxis
                    stroke="var(--muted)"
                    fontSize={12}
                    tickFormatter={(v) => {
                      const sym = getCurrencySymbol(currency)
                      if (currency === 'JPY' || currency === 'VND' || currency === 'IDR') return `${(v / 1000).toFixed(0)}K`
                      return `${sym}${(v / 1000).toFixed(0)}K`
                    }}
                  />
                  <Tooltip
                    formatter={(v) => [fc(v), 'Revenue']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--hairline)', background: 'var(--canvas)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="url(#grad)" strokeWidth={2} />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              ) : null}
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={item} className="apple-card">
          <h3 className="text-[15px] font-semibold text-[var(--ink)] mb-4">Quick Actions</h3>
          <div className="space-y-2.5">
            <button onClick={() => navigate('/dashboard/contacts/new')} className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-[13px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all active:scale-[0.98]">
              <Plus size={16} /> Add New Contact
            </button>
            <button onClick={() => navigate('/dashboard/automation/new')} className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-[13px] font-medium text-white bg-[#2997ff] hover:bg-[#0088ee] transition-all active:scale-[0.98]">
              <Zap size={16} /> Add New Automation
            </button>
            <button onClick={() => navigate('/dashboard/flow/new')} className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-[13px] font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-all active:scale-[0.98]">
              <GitBranch size={16} /> Create New Flow
            </button>
            <button onClick={() => navigate('/dashboard/invoicing/new')} className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-[13px] font-medium text-white bg-amber-500 hover:bg-amber-600 transition-all active:scale-[0.98]">
              <Receipt size={16} /> Create New Invoicing
            </button>
            <button onClick={() => navigate('/dashboard/tickets/new')} className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-[13px] font-medium text-white bg-rose-500 hover:bg-rose-600 transition-all active:scale-[0.98]">
              <Ticket size={16} /> Create New Ticket
            </button>
          </div>
        </motion.div>
      </div>

      <motion.div variants={item} className="apple-card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hairline)]">
          <h3 className="text-[15px] font-semibold text-[var(--ink)]">Recent Contacts</h3>
          <span className="text-[12px] text-[var(--muted)]">{totalContacts} total</span>
        </div>
        {hasContacts ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--hairline)]">
                  <th className="text-left px-5 py-3 font-medium text-[var(--muted)]">Name</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--muted)] hidden sm:table-cell">Email</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--muted)] hidden sm:table-cell">Profesi</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--muted)] hidden md:table-cell">Phone</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--muted)] hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {contacts.slice(0, 5).map((c) => (
                  <tr key={c.id} className="border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--parchment)] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[11px] font-semibold">
                          {c.name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <span className="font-medium text-[var(--ink)]">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[var(--muted)] hidden sm:table-cell">{c.email}</td>
                    <td className="px-5 py-3 text-[var(--muted)] hidden sm:table-cell">{c.profesi}</td>
                    <td className="px-5 py-3 text-[var(--muted)] hidden md:table-cell">{c.phone}</td>
                    <td className="px-5 py-3 text-[var(--muted)] hidden lg:table-cell">{c.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          null
        )}
      </motion.div>
    </motion.div>
  )
}
