import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Trash2, X, QrCode, Wallet, Landmark, Eye, FileImage, FileText, CreditCard, Copy, Check, Timer as TimerIcon } from 'lucide-react'
import html2canvas from 'html2canvas'
import { getInvoices, deleteInvoice, getContacts, getAvailableTickets, getExpiredInvoices } from '../services/dataService'
import { addToTrash } from '../utils/trashService'
import { DEFAULT_TEMPLATE, loadTemplate } from './InvoiceTemplate'
import { generateInvoiceHtml } from '../lib/invoiceHtml'
import { useCurrencyFormatter, getCurrencySymbol } from '../utils/currencyFormatter'
import { useCurrency } from '../hooks/useCurrency.jsx'
import { useRealtimeRefresh } from '../hooks/useSupabaseRealtime'

function CountdownTimer({ expiresAt }) {
  const [display, setDisplay] = useState(() => {
    if (!expiresAt) return ''
    try {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) return 'Expired'
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      return `${h}h ${m}m`
    } catch { return 'err' }
  })
  useEffect(() => {
    if (!expiresAt) { setDisplay(''); return }
    const tick = () => {
      try {
        const diff = new Date(expiresAt).getTime() - Date.now()
        if (diff <= 0) { setDisplay('Expired'); return }
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        setDisplay(`${h}h ${m}m`)
      } catch { setDisplay('err') }
    }
    tick()
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [expiresAt])
  if (!display) return <span className="text-[11px] text-red-400 mt-0.5">—</span>
  return <span className={`flex items-center gap-1 text-[11px] mt-0.5 ${display === 'Expired' ? 'text-red-500' : 'text-amber-500'}`}><TimerIcon size={11} />{display}</span>
}

const BANK_OPTIONS = [
  { value: 'bca', label: 'BCA', accountNumber: '81934138145', accountName: 'Acodera CRM' },
  { value: 'bri', label: 'BRI', accountNumber: '0819341381450', accountName: 'Acodera CRM' },
  { value: 'bni', label: 'BNI', accountNumber: '0819341381451', accountName: 'Acodera CRM' },
]

const EWALLET_OPTIONS = [
  { value: 'dana', label: 'Dana', color: '#108ee9' },
  { value: 'shopeepay', label: 'ShopeePay', color: '#ee4d2d' },
  { value: 'linkaja', label: 'LinkAja', color: '#e82529' },
  { value: 'ovo', label: 'OVO', color: '#4c3494' },
]

const E_WALLET_PHONE = '081934138145'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
]

function formatTransaction(row) {
  const dt = row.purchased_at ? new Date(row.purchased_at) : row.created_at ? new Date(row.created_at) : new Date()
  return {
    id: String(row.id),
    transactionId: row.transaction_id || '',
    dateTime: dt.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }),
    itemCode: row.unique_code,
    quantity: row.quantity,
    pricePerUnit: Number(row.price_per_unit),
    totalAmount: Number(row.total_amount),
    customerName: row.buyer_name || '',
    customerEmail: row.buyer_email || '',
    customerPhone: row.buyer_phone || '',
    paymentMethod: row.payment_method || '',
    paymentDetail: row.payment_detail || '',
    status: row.status,
    isTicketInvoice: !!row.ticket_id,
    uniqueCodes: [row.unique_code],
    ticketId: row.ticket_id ? String(row.ticket_id) : '',
    uniqueCode: row.unique_code,
    barcode: row.barcode || '',
    buyerName: row.buyer_name || '',
    buyerEmail: row.buyer_email || '',
    buyerPhone: row.buyer_phone || '',
    purchasedAt: row.purchased_at || '',
  }
}

function groupInvoices(data) {
  const grouped = {}
  for (const row of data) {
    const key = row.transaction_id
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(row)
  }
  return Object.values(grouped).map(rows => {
    const first = rows[0]
    const dt = first.purchased_at ? new Date(first.purchased_at) : new Date(first.created_at)
    const ticketTitle = first.ticket_title || ''
    const allCodes = rows.flatMap(r => Array(Number(r.quantity) || 1).fill(r.unique_code))
    return {
      id: first.transaction_id,
      transactionId: first.transaction_id,
      dateTime: dt.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }),
      itemCode: allCodes.join(', '),
      itemName: ticketTitle,
      quantity: rows.reduce((sum, r) => sum + (Number(r.quantity) || 1), 0),
      pricePerUnit: Number(first.price_per_unit),
      totalAmount: rows.reduce((sum, r) => sum + Number(r.total_amount), 0),
      customerName: first.buyer_name || '',
      customerEmail: first.buyer_email || '',
      customerPhone: first.buyer_phone || '',
      paymentMethod: first.payment_method || '',
      paymentDetail: first.payment_detail || '',
      status: first.status,
      isTicketInvoice: !!first.ticket_id,
      uniqueCodes: allCodes,
      ticketId: first.ticket_id ? String(first.ticket_id) : '',
    }
  })
}

function getPaymentDetail(invoice, template) {
  const companyName = template.companyName || 'Acodera CRM'
  if (invoice.paymentMethod === 'qr_code') return { label: 'QR Code', detail: 'Scan QR code to pay' }
  if (invoice.paymentMethod === 'bank_transfer' && invoice.paymentDetail) {
    const bank = BANK_OPTIONS.map(b => ({ ...b, accountName: companyName })).find(b => b.value === invoice.paymentDetail)
    return bank ? { label: `Bank ${bank.label}`, detail: `${bank.accountNumber} - ${bank.accountName}` } : null
  }
  if (invoice.paymentMethod === 'e_wallet' && invoice.paymentDetail) {
    const ew = EWALLET_OPTIONS.find(e => e.value === invoice.paymentDetail)
    return ew ? { label: ew.label, detail: `${E_WALLET_PHONE} - ${companyName}` } : null
  }
  return null
}

function InvoicePreviewContent({ invoice, customer, template }) {
  const previewInvoice = {
    ...invoice,
    customerName: customer?.name || invoice.customerName,
    customerEmail: customer?.email || invoice.customerEmail,
    customerPhone: customer?.phone || invoice.customerPhone,
    customerAddress: customer?.address || invoice.customerAddress,
  }
  return (
    <div
      id="invoice-preview"
      dangerouslySetInnerHTML={{ __html: generateInvoiceHtml(previewInvoice, template) }}
    />
  )
}

const PAYMENT_METHODS = [
  { value: 'qr_code', label: 'QR Code', icon: QrCode },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Landmark },
  { value: 'e_wallet', label: 'E-Wallet', icon: Wallet },
]

export function InvoicingPage() {
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)
  const { formatCurrency: fc } = useCurrencyFormatter()
  const [invoices, setInvoices] = useState([])
  const [contacts, setContacts] = useState([])
  const [availableTickets, setAvailableTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [paymentPopup, setPaymentPopup] = useState(null)
  const [copiedField, setCopiedField] = useState(null)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [expiredList, setExpiredList] = useState([])
  const [expiredOpen, setExpiredOpen] = useState(false)

  const previewRef = useRef(null)

  useEffect(() => {
    loadTemplate().then(setTemplate).catch(() => {})
  }, [])

  const refresh = async () => {
    try {
      const [inv, cnt, availTkts, exp] = await Promise.all([getInvoices(), getContacts(), getAvailableTickets(), getExpiredInvoices()])
      const merged = (inv || []).sort((a, b) => {
        const da = a.dateTime ? new Date(a.dateTime) : new Date(0)
        const db = b.dateTime ? new Date(b.dateTime) : new Date(0)
        return db - da
      })
      setInvoices(merged)
      setContacts(cnt || [])
      setAvailableTickets(availTkts || [])
      setExpiredList(exp || [])
    } catch (err) {
      console.error('Refresh error:', err)
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  useRealtimeRefresh('transactions', refresh)

  const filtered = invoices.filter(inv =>
    inv.transactionId.toLowerCase().includes(search.toLowerCase()) ||
    inv.itemCode.toLowerCase().includes(search.toLowerCase()) ||
    inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customerPhone?.includes(search)
  )

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This will move it to Trash.')) return
    try {
      const target = invoices.find(inv => inv.id === id)
      if (target) addToTrash('invoice', target)
      await deleteInvoice(id)
      refresh()
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete invoice: ' + (err.message || 'Unknown error'))
    }
  }

  const openPreview = (inv) => {
    setPreviewInvoice(inv)
    setPreviewOpen(true)
  }

  const downloadAsPNG = useCallback(async () => {
    if (!previewRef.current) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `invoice-${previewInvoice.transactionId}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('PNG download failed:', err)
    }
    setDownloading(false)
  }, [previewInvoice])

  const downloadAsPDF = useCallback(() => {
    if (!previewRef.current) return
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${previewInvoice.transactionId}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          </style>
        </head>
        <body>${previewRef.current.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }, [previewInvoice])

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getStatusBadge = (status) => {
    const s = STATUS_OPTIONS.find(o => o.value === status)
    return s ? <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span> : status
  }

  const previewCustomer = previewInvoice ? (
    previewInvoice.isTicketInvoice
      ? { name: previewInvoice.customerName || '-', email: previewInvoice.customerEmail, phone: previewInvoice.customerPhone }
      : { name: previewInvoice.customerName || 'Walk-in Customer', email: previewInvoice.customerEmail, phone: previewInvoice.customerPhone }
  ) : null

  const displayBanks = BANK_OPTIONS.map(b => ({ ...b, accountName: template.companyName }))

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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invoicing</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{invoices.length} transactions total</p>
        </div>
        <button onClick={() => navigate('/dashboard/invoicing/new')} className="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 text-sm font-medium transition-colors">
          <Plus size={16} /> New Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATUS_OPTIONS.map(s => {
          const count = invoices.filter(i => i.status === s.value).length
          return (
            <div key={s.value} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{count}</p>
            </div>
          )
        })}
        <div
          onClick={() => setExpiredOpen(!expiredOpen)}
          className={`bg-white dark:bg-slate-800 rounded-xl border p-4 cursor-pointer transition-all ${expiredOpen ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Expired</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{expiredList.length}</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input id="invoicingSearch" name="invoicingSearch" type="text" placeholder="Search by transaction ID, item code, or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Transaction ID</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Item Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Price/Unit</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Total</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden xl:table-cell">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Payment</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} onClick={() => navigate(`/dashboard/invoicing/${inv.id}`)} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-medium text-brand-600 dark:text-brand-400">{inv.transactionId}</span>
                      {inv.isTicketInvoice && (
                        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">Ticket</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell whitespace-nowrap">{inv.dateTime}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300 hidden md:table-cell max-w-[120px] truncate" title={inv.itemCode}>{inv.itemCode}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell">{inv.quantity}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell">{fc(inv.pricePerUnit)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{fc(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden xl:table-cell max-w-[150px]">
                    <div className="truncate" title={inv.customerName || inv.customerEmail}>
                      {inv.customerName || inv.customerEmail || '—'}
                    </div>
                    {inv.customerPhone && <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{inv.customerPhone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {inv.isTicketInvoice ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{inv.paymentMethod || '—'}</span>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setPaymentPopup(inv) }} className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 text-xs font-medium transition-colors">
                        <CreditCard size={14} />
                        <span>{getPaymentDetail(inv, template)?.label || '—'}</span>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(inv.status)}
                    {inv.status === 'pending' && <CountdownTimer expiresAt={inv.expiresAt} />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={(e) => { e.stopPropagation(); openPreview(inv) }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors" title="Preview Invoice">
                        <Eye size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(inv.id) }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No invoices found</p>
            <p className="text-sm mt-1">Create a new invoice to get started.</p>
          </div>
        )}
      </div>

      {expiredOpen && expiredList.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Expired Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Transaction ID</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Buyer</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Email</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Amount</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Expired At</th>
                </tr>
              </thead>
              <tbody>
                {expiredList.map(exp => (
                  <tr key={exp.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-brand-600 dark:text-brand-400">{exp.transactionId}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{exp.buyer}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{exp.email}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{fc(exp.amount)}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400 dark:text-slate-500">{new Date(exp.expiredAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {previewOpen && previewInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Invoice Preview</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{previewInvoice.transactionId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={downloadAsPNG} disabled={downloading} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors disabled:opacity-50">
                    <FileImage size={16} />
                    <span className="hidden sm:inline">PNG</span>
                  </button>
                  <button onClick={downloadAsPDF} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors">
                    <FileText size={16} />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                  <button onClick={() => setPreviewOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X size={18} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-900">
                <div ref={previewRef} className="mx-auto max-w-2xl rounded-lg shadow-lg">
                  <InvoicePreviewContent invoice={previewInvoice} customer={previewCustomer} template={template} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPaymentPopup(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Payment Information</h3>
                <button onClick={() => setPaymentPopup(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Transaction ID</p>
                  <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{paymentPopup.transactionId}</p>
                </div>

                {paymentPopup.paymentMethod === 'qr_code' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
                      <QrCode size={24} className="text-brand-600 dark:text-brand-400" />
                      <div>
                        <p className="font-semibold text-brand-700 dark:text-brand-300">QR Code Payment</p>
                        <p className="text-sm text-brand-600/70 dark:text-brand-400/70">Scan the QR code to pay</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-center">
                        <QrCode size={120} className="text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-xs text-slate-400 mt-2">QR Code placeholder</p>
                      </div>
                    </div>
                  </div>
                )}

                {paymentPopup.paymentMethod === 'bank_transfer' && paymentPopup.paymentDetail && (
                  (() => {
                    const bank = displayBanks.find(b => b.value === paymentPopup.paymentDetail)
                    if (!bank) return null
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                          <Landmark size={24} className="text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="font-semibold text-blue-700 dark:text-blue-300">Bank {bank.label}</p>
                            <p className="text-sm text-blue-600/70 dark:text-blue-400/70">Bank Transfer</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Account Number</p>
                              <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{bank.accountNumber}</p>
                            </div>
                            <button onClick={() => copyToClipboard(bank.accountNumber, 'bank-num')} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                              {copiedField === 'bank-num' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Account Name</p>
                              <p className="font-semibold text-slate-900 dark:text-white">{bank.accountName}</p>
                            </div>
                            <button onClick={() => copyToClipboard(bank.accountName, 'bank-name')} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                              {copiedField === 'bank-name' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                )}

                {paymentPopup.paymentMethod === 'e_wallet' && paymentPopup.paymentDetail && (
                  (() => {
                    const ew = EWALLET_OPTIONS.find(e => e.value === paymentPopup.paymentDetail)
                    if (!ew) return null
                    const walletName = template.companyName || 'Acodera CRM'
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: ew.color + '40', backgroundColor: ew.color + '10' }}>
                          <Wallet size={24} style={{ color: ew.color }} />
                          <div>
                            <p className="font-semibold" style={{ color: ew.color }}>{ew.label}</p>
                            <p className="text-sm" style={{ color: ew.color + 'aa' }}>E-Wallet Transfer</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Phone Number</p>
                              <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{E_WALLET_PHONE}</p>
                            </div>
                            <button onClick={() => copyToClipboard(E_WALLET_PHONE, 'ew-phone')} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                              {copiedField === 'ew-phone' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Account Name</p>
                              <p className="font-semibold text-slate-900 dark:text-white">{walletName}</p>
                            </div>
                            <button onClick={() => copyToClipboard(walletName, 'ew-name')} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                              {copiedField === 'ew-name' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                )}

                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Amount</p>
                   <p className="text-2xl font-bold text-slate-900 dark:text-white">{fc(paymentPopup.totalAmount)}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
