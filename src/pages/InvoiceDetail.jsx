import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Ticket, MapPin, Calendar, DollarSign, CheckCircle, Clock, Copy, Check, ExternalLink, Users, Ban, CreditCard, Wallet, Landmark, QrCode, Phone, Mail, Timer } from 'lucide-react'
import { getInvoices, getContacts, updateTransactionStatus } from '../services/dataService'
import { useCurrencyFormatter } from '../utils/currencyFormatter'
import { DEFAULT_TEMPLATE, loadTemplate } from './InvoiceTemplate'

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
const E_WALLET_NAME = 'Acodera CRM'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { formatCurrency: fc } = useCurrencyFormatter()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)

  useEffect(() => {
    const load = async () => {
      const invoices = await getInvoices()
      const found = invoices.find(i => i.id === id)
      setInvoice(found || null)
      setLoading(false)
    }
    load()
    loadTemplate().then(setTemplate).catch(() => {})
  }, [id])

  useEffect(() => {
    if (!invoice || invoice.status !== 'pending' || !invoice.expiresAt) return
    const tick = () => {
      const diff = new Date(invoice.expiresAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h}h ${m}m ${s}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [invoice?.status, invoice?.expiresAt])

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="py-12 text-center text-slate-500 dark:text-slate-400">
        <p className="text-lg font-medium">Invoice not found</p>
        <button onClick={() => navigate('/dashboard/invoicing')} className="mt-4 text-sm text-brand-600 dark:text-brand-400 hover:underline">Back to Invoicing</button>
      </div>
    )
  }

  const statusColor = invoice.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : invoice.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
  const statusLabel = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)

  const handleMarkPaid = async () => {
    if (!window.confirm(`Mark this invoice as paid? This will trigger any "Invoice Paid" automations.`)) return
    try {
      await updateTransactionStatus(parseInt(invoice.id), 'paid')
      setInvoice(prev => ({ ...prev, status: 'paid' }))
    } catch (err) {
      alert('Failed to update status: ' + (err.message || 'Unknown error'))
    }
  }

  const getPaymentInfo = () => {
    const company = template.companyName || 'Acodera CRM'
    if (invoice.isTicketInvoice) {
      if (invoice.paymentMethod === 'qr_code') return { label: 'QR Code', icon: QrCode, color: 'text-brand-600 dark:text-brand-400', detail: 'Scan QR code to pay' }
      if (invoice.paymentMethod === 'bank_transfer') {
        const bank = BANK_OPTIONS.find(b => b.value === invoice.paymentDetail)
        return bank ? { label: `Bank ${bank.label}`, icon: Landmark, color: 'text-blue-600 dark:text-blue-400', detail: `${bank.accountNumber} - ${company}`, accountNumber: bank.accountNumber, accountName: company } : null
      }
      if (invoice.paymentMethod === 'e_wallet') {
        const ew = EWALLET_OPTIONS.find(e => e.value === invoice.paymentDetail)
        return ew ? { label: ew.label, icon: Wallet, color: '', detail: `${E_WALLET_PHONE} - ${company}`, ewColor: ew.color } : null
      }
      return null
    }
    return null
  }

  const paymentInfo = getPaymentInfo()

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard/invoicing')} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={16} />
        Back to Invoicing
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-5" style={{ background: template.accentColor || '#1e40af' }}>
          <div className="flex items-center gap-3">
            {template.logoUrl ? (
              <img src={template.logoUrl} alt="Logo" className="h-10 w-auto rounded" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-lg">
                {template.logoInitial || 'A'}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">{template.companyName || 'Acodera CRM'}</h2>
              <p className="text-sm text-white/70">{template.address}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: (template.accentColor || '#1e40af') + '20' }}>
              <CreditCard size={24} style={{ color: template.accentColor || '#1e40af' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono">{invoice.transactionId}</h2>
                {invoice.isTicketInvoice && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">Ticket Purchase</span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{invoice.dateTime}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}>{statusLabel}</span>
            {invoice.status === 'pending' && timeLeft && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                <Timer size={14} />
                <span>{timeLeft}</span>
              </div>
            )}
            {invoice.status === 'pending' && (
              <button onClick={handleMarkPaid} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">
                <CheckCircle size={14} />
                Mark as Paid
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Item Code</p>
            <p className="font-mono text-sm font-bold text-slate-900 dark:text-white truncate" title={invoice.itemCode}>{invoice.itemCode}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quantity</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{invoice.quantity}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Price/Unit</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{fc(invoice.pricePerUnit)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{fc(invoice.totalAmount)}</p>
          </div>
        </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users size={18} className="text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Buyer Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Name</p>
            <p className="font-semibold text-slate-900 dark:text-white">{invoice.customerName || '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email</p>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-slate-400 shrink-0" />
              <p className="text-sm text-slate-900 dark:text-white truncate">{invoice.customerEmail || '—'}</p>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Phone</p>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-slate-400 shrink-0" />
              <p className="text-sm text-slate-900 dark:text-white">{invoice.customerPhone || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {invoice.isTicketInvoice && paymentInfo && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard size={18} className="text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Payment Information</h3>
          </div>

          {invoice.paymentMethod === 'qr_code' && (
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

          {invoice.paymentMethod === 'bank_transfer' && paymentInfo.accountNumber && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Account Number</p>
                  <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{paymentInfo.accountNumber}</p>
                </div>
                <button onClick={() => copyToClipboard(paymentInfo.accountNumber, 'bank-num')} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  {copiedField === 'bank-num' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Account Name</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{paymentInfo.accountName}</p>
                </div>
                <button onClick={() => copyToClipboard(paymentInfo.accountName, 'bank-name')} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  {copiedField === 'bank-name' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}

          {invoice.paymentMethod === 'e_wallet' && paymentInfo.ewColor && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: paymentInfo.ewColor + '40', backgroundColor: paymentInfo.ewColor + '10' }}>
                <Wallet size={24} style={{ color: paymentInfo.ewColor }} />
                <div>
                  <p className="font-semibold" style={{ color: paymentInfo.ewColor }}>{paymentInfo.label}</p>
                  <p className="text-sm" style={{ color: paymentInfo.ewColor + 'aa' }}>E-Wallet Transfer</p>
                </div>
              </div>
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
                  <p className="font-semibold text-slate-900 dark:text-white">{E_WALLET_NAME}</p>
                </div>
                <button onClick={() => copyToClipboard(E_WALLET_NAME, 'ew-name')} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  {copiedField === 'ew-name' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {invoice.isTicketInvoice && invoice.uniqueCodes && invoice.uniqueCodes.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Ticket size={18} className="text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ticket Details ({invoice.uniqueCodes.length})</h3>
          </div>
          <div className="space-y-2">
            {invoice.uniqueCodes.map((code, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{code}</span>
                    <button onClick={() => copyToClipboard(code, `code-${idx}`)} className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      {copiedField === `code-${idx}` ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ml-2 ${invoice.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : invoice.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'}`}>
                  {invoice.status === 'paid' ? 'Paid' : invoice.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
