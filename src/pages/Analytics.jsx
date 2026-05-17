import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Users, DollarSign, Percent } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { getContacts, getFlows, getInvoices, getReviews } from '../services/dataService'
import { useCurrencyFormatter, getCurrencySymbol } from '../utils/currencyFormatter'

const COLORS = ['#0066cc', '#2997ff', '#66b3ff', '#99ccff', '#cce0ff']

function getGrowth(current, previous) {
  if (!previous || previous === 0) return current > 0 ? '+100%' : null
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

function filterByRange(items, range, field) {
  if (!items || items.length === 0) return items
  const now = new Date()
  const ranges = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 }
  const days = ranges[range] || 365
  const cutoff = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10)
  const prevCutoff = new Date(now.getTime() - days * 2 * 86400000).toISOString().slice(0, 10)
  const current = items.filter(i => i[field] && i[field] >= cutoff)
  const previous = items.filter(i => i[field] && i[field] >= prevCutoff && i[field] < cutoff)
  return { current, previous }
}

export function AnalyticsPage() {
  const [range, setRange] = useState('12m')
  const [contacts, setContacts] = useState([])
  const [flows, setFlows] = useState([])
  const [invoices, setInvoices] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const { currency, formatCurrency: fc } = useCurrencyFormatter()

  useEffect(() => {
    Promise.all([getContacts(), getFlows(), getInvoices(), getReviews()])
      .then(([c, f, i, r]) => {
        setContacts(c)
        setFlows(f)
        setInvoices(i)
        setReviews(r)
      })
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const rangeDays = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 }[range] || 365
  const cutoff = new Date(now.getTime() - rangeDays * 86400000).toISOString().slice(0, 10)
  const prevCutoff = new Date(now.getTime() - rangeDays * 2 * 86400000).toISOString().slice(0, 10)

  const currentFlows = flows.filter(f => f.date && f.date >= cutoff)
  const prevFlows = flows.filter(f => f.date && f.date >= prevCutoff && f.date < cutoff)

  const currentContacts = contacts.filter(c => c.createdAt && c.createdAt >= cutoff)
  const prevContacts = contacts.filter(c => c.createdAt && c.createdAt >= prevCutoff && c.createdAt < cutoff)

  const currentInvoices = invoices.filter(i => i.status === 'paid' && i.dateTime && i.dateTime >= cutoff)
  const prevInvoices = invoices.filter(i => i.status === 'paid' && i.dateTime && i.dateTime >= prevCutoff && i.dateTime < cutoff)

  const invoiceRevenue = currentInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0)
  const prevInvoiceRevenue = prevInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0)

  const currentRevenue = currentFlows.reduce((sum, f) => sum + (Number(f.value) || 0), 0) + invoiceRevenue
  const prevRevenue = prevFlows.reduce((sum, f) => sum + (Number(f.value) || 0), 0) + prevInvoiceRevenue

  const currentClosed = currentFlows.filter(f => f.stage === 'closed').length
  const prevClosed = prevFlows.filter(f => f.stage === 'closed').length

  const currentConvRate = currentFlows.length > 0 ? (currentClosed / currentFlows.length) * 100 : 0
  const prevConvRate = prevFlows.length > 0 ? (prevClosed / prevFlows.length) * 100 : 0

  const currentAvgDeal = currentFlows.length > 0 ? currentRevenue / currentFlows.length : 0
  const prevAvgDeal = prevFlows.length > 0 ? prevRevenue / prevFlows.length : 0

  const kpis = [
    { label: 'Total Revenue', value: fc(currentRevenue), change: getGrowth(currentRevenue, prevRevenue), icon: DollarSign },
    { label: 'Total Leads', value: currentContacts.length.toLocaleString(), change: getGrowth(currentContacts.length, prevContacts.length), icon: Users },
    { label: 'Conversion Rate', value: `${currentConvRate.toFixed(1)}%`, change: getGrowth(currentConvRate, prevConvRate), icon: Percent },
    { label: 'Avg Deal Size', value: fc(currentAvgDeal), change: getGrowth(currentAvgDeal, prevAvgDeal), icon: TrendingUp },
  ]

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

  const revenueData = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month: month.slice(5), value }))

  const stageMap = {}
  flows.forEach(f => {
    const key = f.stage || 'unknown'
    stageMap[key] = (stageMap[key] || 0) + 1
  })
  const dealStages = [
    { name: 'New Lead', value: stageMap['new'] || 0 },
    { name: 'Contacted', value: stageMap['contacted'] || 0 },
    { name: 'Qualified', value: stageMap['qualified'] || 0 },
    { name: 'Proposal', value: stageMap['proposal'] || 0 },
    { name: 'Closed', value: stageMap['closed'] || 0 },
  ].filter(s => s.value > 0)

  const monthlyStats = {}
  flows.forEach(f => {
    const month = f.date ? f.date.slice(0, 7) : null
    if (!month) return
    if (!monthlyStats[month]) monthlyStats[month] = { total: 0, closed: 0 }
    monthlyStats[month].total++
    if (f.stage === 'closed') monthlyStats[month].closed++
  })
  const conversionRateData = Object.entries(monthlyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, s]) => ({
      month: month.slice(5),
      rate: s.total > 0 ? Math.round((s.closed / s.total) * 100) : 0,
    }))

  const hasRevenueData = revenueData.length > 0
  const hasConversionData = conversionRateData.length > 0

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ink)]">Analytics</h2>
          <p className="text-[13px] text-[var(--muted)] mt-1">Performance metrics based on real data</p>
        </div>
        <div className="flex gap-1.5 p-0.5 rounded-[10px] bg-[var(--parchment)]">
          {['7d', '30d', '90d', '12m'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${
                range === r
                  ? 'bg-[var(--canvas)] text-[var(--ink)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="apple-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--accent)]/10 text-[var(--accent)]">
                <k.icon size={16} />
              </div>
              {k.change ? (
                <span className={`text-[12px] font-medium ${
                  k.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  <TrendingUp size={13} className="inline mr-0.5" />
                  {k.change}
                </span>
              ) : null}
            </div>
            <p className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--ink)]">{k.value}</p>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">{k.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="apple-card"
        >
          <h3 className="text-[15px] font-semibold text-[var(--ink)] mb-4">Revenue Trend</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {hasRevenueData ? (
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" opacity={0.5} />
                  <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} />
                  <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(v) => {
                    const sym = getCurrencySymbol(currency)
                    if (currency === 'JPY' || currency === 'VND' || currency === 'IDR') return `${(v / 1000).toFixed(0)}K`
                    return `${sym}${(v / 1000).toFixed(0)}K`
                  }} />
                  <Tooltip formatter={(v) => [fc(v), 'Revenue']} contentStyle={{ borderRadius: '12px', border: '1px solid var(--hairline)', background: 'var(--canvas)' }} />
                  <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="url(#revGrad)" strokeWidth={2} />
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              ) : null}
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="apple-card"
        >
          <h3 className="text-[15px] font-semibold text-[var(--ink)] mb-4">Leads by Source</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={[{ source: 'Contacts', count: contacts.length }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" opacity={0.5} />
                <XAxis dataKey="source" stroke="var(--muted)" fontSize={12} />
                <YAxis stroke="var(--muted)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--hairline)', background: 'var(--canvas)' }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="apple-card"
        >
          <h3 className="text-[15px] font-semibold text-[var(--ink)] mb-4">Deal Stages</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {dealStages.length > 0 ? (
                <PieChart>
                  <Pie data={dealStages} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                    {dealStages.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--hairline)', background: 'var(--canvas)' }} />
                </PieChart>
              ) : null}
            </ResponsiveContainer>
          </div>
          {dealStages.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {dealStages.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] capitalize">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="apple-card"
        >
          <h3 className="text-[15px] font-semibold text-[var(--ink)] mb-4">Conversion Rate</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {hasConversionData ? (
                <LineChart data={conversionRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" opacity={0.5} />
                  <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} />
                  <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '12px', border: '1px solid var(--hairline)', background: 'var(--canvas)' }} />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                </LineChart>
              ) : null}
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
