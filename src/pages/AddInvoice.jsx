import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, ArrowLeft, Eye } from 'lucide-react'
import { addInvoice, getContacts, getAvailableTickets } from '../services/dataService'
import { useCurrencyFormatter, getCurrencySymbol } from '../utils/currencyFormatter'
import { useCurrency } from '../hooks/useCurrency.jsx'
import { generateInvoiceHtml } from '../lib/invoiceHtml'
import { loadTemplate } from './InvoiceTemplate'

function generateTransactionId() {
  return 'TXN-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase()
}

function generateItemCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 9; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export function AddInvoicePage() {
  const navigate = useNavigate()
  const { formatCurrency: fc } = useCurrencyFormatter()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [contacts, setContacts] = useState([])
  const [availableTickets, setAvailableTickets] = useState([])
  const [template, setTemplate] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [form, setForm] = useState({
    ticketId: '',
    itemCode: generateItemCode(),
    quantity: 1,
    pricePerUnit: 0,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    paymentMethod: 'qr_code',
    paymentDetail: '',
    status: 'pending',
    expiresIn: '24',
    expiresUnit: 'hours',
  })

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

  const totalAmount = form.quantity * form.pricePerUnit

  useEffect(() => {
    Promise.all([getContacts(), getAvailableTickets(), loadTemplate()])
      .then(([c, t, tpl]) => {
        setContacts(c)
        setAvailableTickets(t)
        setTemplate(tpl)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!template) return
    const selectedTicket = availableTickets.find((t) => t.id === form.ticketId)
    const previewInvoice = {
      transactionId: 'PREVIEW-' + Date.now().toString(36).toUpperCase(),
      itemCode: form.itemCode,
      itemName: selectedTicket?.title || '',
      quantity: Number(form.quantity) || 1,
      pricePerUnit: Number(form.pricePerUnit) || 0,
      totalAmount: totalAmount,
      customerName: form.customerName || 'Walk-in Customer',
      customerEmail: form.customerEmail || '',
      customerPhone: form.customerPhone || '',
      paymentMethod: form.paymentMethod,
      paymentDetail: form.paymentDetail,
      status: form.status,
      dateTime: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
    }
    setPreviewHtml(generateInvoiceHtml(previewInvoice, template))
  }, [form, template, availableTickets, totalAmount])

  const selectedTicket = availableTickets.find((t) => t.id === form.ticketId)

  const handleSave = async () => {
    if (!form.ticketId && !form.itemCode) {
      alert('Please select a ticket or ensure an item code is generated.')
      return
    }
    if (!form.pricePerUnit || Number(form.pricePerUnit) <= 0) {
      alert('Please enter a valid price per unit greater than 0')
      return
    }
    setSaveLoading(true)
    try {
      await addInvoice({
        ...form,
        quantity: Number(form.quantity),
        pricePerUnit: Number(form.pricePerUnit),
        totalAmount: Number(form.pricePerUnit) * Number(form.quantity),
        expiresIn: Number(form.expiresIn) || 24,
        transactionId: form.ticketId ? undefined : generateTransactionId(),
        customerId: '',
        template,
      })
      navigate('/dashboard/invoicing')
    } catch (err) {
      alert('Failed to create invoice: ' + (err.message || 'Unknown error'))
    } finally {
      setSaveLoading(false)
    }
  }

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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[13px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ink)]">New Invoice</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-colors ${
              showPreview
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted)] hover:bg-[var(--parchment)]'
            }`}
          >
            <Eye size={16} /> {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button onClick={() => navigate('/dashboard/invoicing')} className="p-2 rounded-[10px] text-[var(--muted)] hover:bg-[var(--parchment)] transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>
        <div className={showPreview ? 'lg:col-span-3' : ''}>
          <div className="apple-card space-y-5">
            <div>
              <label htmlFor="invoiceTicketSelect" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Select Available Ticket</label>
              <select
                id="invoiceTicketSelect"
                name="invoiceTicketSelect"
                value={form.ticketId}
                onChange={(e) => {
                  const selected = availableTickets.find((t) => t.id === e.target.value)
                  setForm((prev) => ({
                    ...prev,
                    ticketId: e.target.value,
                    quantity: 1,
                    pricePerUnit: selected ? Number(selected.price) : 0,
                  }))
                }}
                className="apple-input"
              >
                <option value="">Select available ticket...</option>
                {availableTickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} — {t.prefix} — {fc(t.price)} ({t.availableCount} available)
                  </option>
                ))}
              </select>
              {availableTickets.length === 0 && (
                <p className="text-[12px] text-[var(--muted)] mt-1.5">No available tickets. Create tickets first.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="invoiceQuantity" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Quantity</label>
                <input
                  id="invoiceQuantity"
                  name="invoiceQuantity"
                  type="number" min={1} max={selectedTicket?.availableCount || 1}
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="apple-input"
                />
              </div>
              <div>
                <label htmlFor="invoicePricePerUnit" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Price per Unit ({currencySymbol})</label>
                <input
                  id="invoicePricePerUnit"
                  name="invoicePricePerUnit"
                  type="number" min={0}
                  value={form.pricePerUnit}
                  onChange={(e) => setForm((p) => ({ ...p, pricePerUnit: e.target.value }))}
                  className="apple-input"
                />
              </div>
            </div>

            <div className="rounded-[14px] bg-[var(--parchment)] p-4">
              <p className="text-[12px] text-[var(--muted)] font-medium">Total Amount ({currencySymbol})</p>
              <p className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink)] mt-1">{fc(totalAmount)}</p>
            </div>

            <div className="space-y-3">
              <p className="text-[13px] font-medium text-[var(--ink)]">Customer Information</p>
              <div>
                <label htmlFor="invoiceCustomerSelect" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Customer</label>
                <select
                  id="invoiceCustomerSelect"
                  name="invoiceCustomerSelect"
                  value=""
                  onChange={(e) => {
                    const contact = contacts.find((c) => c.id === e.target.value)
                    if (contact) {
                      setForm((p) => ({ ...p, customerName: contact.name, customerEmail: contact.email, customerPhone: contact.phone || '' }))
                    }
                  }}
                  className="apple-input mb-2"
                >
                  <option value="">Select contact (optional)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.email}
                    </option>
                  ))}
                </select>
              </div>
              <input
                id="invoiceCustomerName"
                name="invoiceCustomerName"
                type="text" value={form.customerName}
                onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                placeholder="Customer name" className="apple-input"
              />
              <input
                id="invoiceCustomerEmail"
                name="invoiceCustomerEmail"
                type="email" value={form.customerEmail}
                onChange={(e) => setForm((p) => ({ ...p, customerEmail: e.target.value }))}
                placeholder="Customer email" className="apple-input"
              />
              <input
                id="invoiceCustomerPhone"
                name="invoiceCustomerPhone"
                type="tel" value={form.customerPhone}
                onChange={(e) => setForm((p) => ({ ...p, customerPhone: e.target.value }))}
                placeholder="Customer phone" className="apple-input"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--ink)] mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'qr_code', label: 'QR Code', icon: '📱' },
                  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
                  { value: 'e_wallet', label: 'E-Wallet', icon: '💳' },
                ].map((pm) => (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, paymentMethod: pm.value, paymentDetail: '' }))}
                    className={`flex flex-col items-center gap-1.5 rounded-[12px] border p-3 text-[13px] font-medium transition-all ${
                      form.paymentMethod === pm.value
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]'
                        : 'border-[var(--hairline)] text-[var(--muted)] hover:bg-[var(--parchment)]'
                    }`}
                  >
                    <span className="text-xl">{pm.icon}</span>
                    <span className="text-[11px]">{pm.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {form.paymentMethod === 'bank_transfer' && (
              <div>
                <label className="block text-[13px] font-medium text-[var(--ink)] mb-2">Select Bank</label>
                <div className="grid grid-cols-3 gap-2">
                  {BANK_OPTIONS.map((bank) => (
                    <button
                      key={bank.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, paymentDetail: bank.value }))}
                      className={`rounded-[12px] border p-3 text-[13px] font-medium transition-all ${
                        form.paymentDetail === bank.value
                          ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]'
                          : 'border-[var(--hairline)] text-[var(--muted)] hover:bg-[var(--parchment)]'
                      }`}
                    >
                      <span className="text-[13px] font-bold">{bank.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.paymentMethod === 'e_wallet' && (
              <div>
                <label className="block text-[13px] font-medium text-[var(--ink)] mb-2">Select E-Wallet</label>
                <div className="grid grid-cols-4 gap-2">
                  {EWALLET_OPTIONS.map((ew) => (
                    <button
                      key={ew.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, paymentDetail: ew.value }))}
                      className={`rounded-[12px] border p-3 text-[13px] font-medium transition-all ${
                        form.paymentDetail === ew.value
                          ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]'
                          : 'border-[var(--hairline)] text-[var(--muted)] hover:bg-[var(--parchment)]'
                      }`}
                    >
                      <span className="text-[11px] font-bold" style={{ color: ew.color }}>{ew.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-[var(--ink)] mb-2">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'pending', label: 'Pending', color: 'text-amber-600' },
                  { value: 'paid', label: 'Paid', color: 'text-emerald-600' },
                  { value: 'cancelled', label: 'Cancelled', color: 'text-red-600' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, status: s.value }))}
                    className={`rounded-[12px] border p-2.5 text-[13px] font-medium transition-all ${
                      form.status === s.value
                        ? `${s.color} border-current bg-current/5`
                        : 'border-[var(--hairline)] text-[var(--muted)] hover:bg-[var(--parchment)]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {form.status === 'pending' && (
              <div className="rounded-[14px] bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-4">
                <label htmlFor="invoiceExpiresIn" className="block text-[13px] font-medium text-amber-800 dark:text-amber-300 mb-2">Auto-cancel after</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    id="invoiceExpiresIn"
                    name="invoiceExpiresIn"
                    type="text" inputMode="numeric"
                    value={form.expiresIn}
                    onChange={(e) => setForm((p) => ({ ...p, expiresIn: e.target.value.replace(/\D/g, '') }))}
                    className="apple-input"
                  />
                  <select
                    id="invoiceExpiresUnit"
                    name="invoiceExpiresUnit"
                    value={form.expiresUnit}
                    onChange={(e) => setForm((p) => ({ ...p, expiresUnit: e.target.value }))}
                    className="apple-input"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">Invoice will be cancelled automatically if unpaid after this time.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => navigate('/dashboard/invoicing')} className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-[var(--muted)] hover:bg-[var(--parchment)] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saveLoading} className="px-5 py-2.5 rounded-[10px] text-[13px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40">
              {saveLoading ? 'Saving...' : 'Create Invoice'}
            </button>
          </div>
        </div>

        {showPreview && (
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <h3 className="text-[13px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Invoice Preview</h3>
              <div className="bg-white rounded-[14px] shadow-lg border border-[var(--hairline)] overflow-hidden">
                <div
                  className="w-full"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
