import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, ArrowLeft, FileText } from 'lucide-react'
import { getAutomations, updateAutomation } from '../services/dataService'
import { loadTemplate } from './InvoiceTemplate'

const TRIGGER_OPTIONS = [
  { value: 'contact.created', label: 'New Contact Added' },
  { value: 'contact.updated', label: 'Contact Updated' },
  { value: 'contact.subscribed', label: 'Contact Subscribed' },
  { value: 'deal.created', label: 'Deal Created' },
  { value: 'deal.stage_change', label: 'Deal Stage Changed' },
  { value: 'deal.won', label: 'Deal Won' },
  { value: 'deal.lost', label: 'Deal Lost' },
  { value: 'invoice.created', label: 'Invoice Created' },
  { value: 'invoice.paid', label: 'Invoice Paid' },
  { value: 'invoice.overdue', label: 'Invoice Overdue' },
  { value: 'ticket.purchased', label: 'Ticket Purchased' },
  { value: 'review.submitted', label: 'Review Submitted' },
  { value: 'user.signup', label: 'User Signup' },
]

const TYPE_OPTIONS = ['Email Drip', 'SMS Follow-up', 'Lead Scoring', 'Marketing Campaign', 'Invoice Reminder']

const INVOICE_TRIGGERS = ['invoice.created', 'invoice.paid', 'invoice.overdue']

function buildInvoicePreviewHtml(tpl) {
  const accent = tpl?.accentColor || '#1e40af'
  const logoInitial = tpl?.logoInitial || 'A'
  const company = {
    name: tpl?.companyName || '{{companyName}}',
    address: tpl?.address || '{{companyAddress}}',
    email: tpl?.email || '{{companyEmail}}',
    phone: tpl?.phone || '{{companyPhone}}',
    website: tpl?.website || '{{companyWebsite}}',
    footer: tpl?.footerText || '{{companyFooter}}',
  }
  const currency = tpl?.currencySymbol || 'Rp'
  const logoSrc = tpl?.logoUrl || ''
  const taxRate = tpl?.taxRate || 0

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="${company.name}" width="120" height="48" style="display:block;border:0;max-width:120px;max-height:48px;" />`
    : `<span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:4px;background:${accent};color:#fff;font-weight:bold;font-size:14px;text-align:center;margin-right:8px;">${logoInitial}</span>`

  return `<div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,Helvetica,sans-serif;padding:24px 32px;">

<table role="presentation" style="width:100%;border-collapse:collapse;border-bottom:2px solid ${accent};margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="width:55%;vertical-align:top;padding-bottom:12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${logoSrc ? `<td style="vertical-align:middle;padding-right:8px;">${logoHtml}</td>` : ''}
          <td style="vertical-align:middle;">
            ${!logoSrc && logoInitial ? `<span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:4px;background:${accent};color:#fff;font-weight:bold;font-size:14px;text-align:center;margin-right:8px;">${logoInitial}</span>` : ''}
            <span style="font-size:16px;font-weight:700;color:${accent};">${company.name}</span>
          </td>
        </tr>
      </table>
      ${company.address ? `<p style="margin:4px 0 0;font-size:11px;color:#64748b;">${company.address}</p>` : ''}
      <p style="margin:2px 0 0;font-size:11px;color:#64748b;">${company.email}${company.phone ? ' | ' + company.phone : ''}</p>
    </td>
    <td style="width:45%;vertical-align:top;text-align:right;padding-bottom:12px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:${accent};">INVOICE</p>
      <p style="margin:4px 0 0;font-size:12px;font-weight:600;color:#334155;">{{transactionId}}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#64748b;">Date: {{invoiceDate}}</p>
      <span style="display:inline-block;margin-top:6px;padding:2px 12px;border-radius:10px;font-size:11px;font-weight:600;color:#ca8a04;background:#ca8a0415;border:1px solid #ca8a0430;">{{invoiceStatus}}</span>
    </td>
  </tr>
</table>

<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px;" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:8px 12px;background:#f0f7ff;border-radius:6px;"><p style="margin:0;font-size:11px;color:#0066cc;"><strong>Ticket:</strong> {{itemName}}</p></td></tr>
</table>

<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="width:50%;vertical-align:top;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">Bill To</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">{{name}}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">{{email}}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">{{buyer_phone}}</p>
    </td>
    <td style="width:50%;vertical-align:top;text-align:right;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">Payment Details</p>
      <p style="margin:0;font-size:13px;color:#334155;"><strong>Method:</strong> {{paymentMethod}}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#334155;"><strong>Info:</strong> {{paymentDetail}}</p>
    </td>
  </tr>
</table>

<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;table-layout:fixed;" cellpadding="0" cellspacing="0" border="0">
  <colgroup>
    <col style="width:52%;" />
    <col style="width:10%;" />
    <col style="width:19%;" />
    <col style="width:19%;" />
  </colgroup>
  <tr style="background:#f1f5f9;">
    <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Item</th>
    <th style="padding:8px 12px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Qty</th>
    <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Price/Unit</th>
    <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;">Total</th>
  </tr>
  <tr>
    <td style="padding:12px;font-size:13px;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;">
      <div style="font-weight:600;margin-bottom:1px;">{{itemName}}</div>
      <span style="font-size:11px;color:#64748b;font-family:monospace;">{{itemCode}}</span>
    </td>
    <td style="padding:12px;font-size:13px;text-align:center;border-bottom:1px solid #f1f5f9;white-space:nowrap;">{{quantity}}</td>
    <td style="padding:12px;font-size:13px;text-align:right;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${currency}{{pricePerUnit}}</td>
    <td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${currency}{{totalAmount}}</td>
  </tr>
</table>

<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="width:60%;"></td>
    <td style="width:40%;">
      <table role="presentation" style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#64748b;text-align:left;">Subtotal</td>
          <td style="padding:4px 0;font-size:12px;color:#64748b;text-align:right;">${currency}{{totalAmount}}</td>
        </tr>
        ${taxRate > 0 ? `<tr>
          <td style="padding:4px 0;font-size:12px;color:#64748b;text-align:left;">Tax (${taxRate}%)</td>
          <td style="padding:4px 0;font-size:12px;color:#64748b;text-align:right;">${currency}{{taxAmount}}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:8px 0 0;font-size:14px;font-weight:700;color:${accent};text-align:left;border-top:2px solid ${accent};">Total Due</td>
          <td style="padding:8px 0 0;font-size:14px;font-weight:700;color:${accent};text-align:right;border-top:2px solid ${accent};">${currency}{{totalWithTax}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding-top:12px;text-align:center;">
      <p style="margin:0;font-size:10px;color:#94a3b8;">${company.footer} | ${company.name}${company.website ? ' | ' + company.website : ''}</p>
    </td>
  </tr>
</table>
</div>`
}

function toDatetimeLocal(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

export function EditAutomationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState({
    name: '',
    type: 'Email Drip',
    trigger: '',
    triggerCustom: '',
    scheduleType: 'immediate',
    scheduleFrequency: 'monthly',
    scheduledAt: '',
    subject: '',
    body: '',
    fromName: 'Acodera CRM',
  })

  const isEmailType = (t) => t === 'Email Drip' || t === 'Marketing Campaign' || t === 'Invoice Reminder'
  const isInvoiceTrigger = INVOICE_TRIGGERS.includes(form.trigger)
  const [insertingTemplate, setInsertingTemplate] = useState(false)

  useEffect(() => {
    async function loadAutomation() {
      try {
        const all = await getAutomations()
        const auto = all.find(a => String(a.id) === String(id))
        if (!auto) {
          alert('Automation not found')
          navigate('/dashboard/automation')
          return
        }

        const trigger = auto.trigger || ''
        const isKnownTrigger = TRIGGER_OPTIONS.some(o => o.value === trigger)

        setForm({
          name: auto.name || '',
          type: auto.type || 'Email Drip',
          trigger: isKnownTrigger ? trigger : 'custom',
          triggerCustom: isKnownTrigger ? '' : trigger,
          scheduleType: auto.scheduleType || 'immediate',
          scheduleFrequency: auto.scheduleFrequency || 'monthly',
          scheduledAt: toDatetimeLocal(auto.scheduledAt),
          subject: auto.subject || '',
          body: auto.body || '',
          fromName: auto.fromName || 'Acodera CRM',
        })
      } catch (err) {
        alert('Failed to load automation: ' + (err.message || 'Unknown error'))
        navigate('/dashboard/automation')
      } finally {
        setFetching(false)
      }
    }
    loadAutomation()
  }, [id, navigate])

  const handleInsertTemplate = async () => {
    setInsertingTemplate(true)
    try {
      const template = await loadTemplate()
      setForm(p => ({ ...p, body: buildInvoicePreviewHtml(template) }))
    } catch (err) {
      alert('Failed to load invoice template: ' + (err.message || 'Unknown error'))
    } finally {
      setInsertingTemplate(false)
    }
  }

  const handleSave = async () => {
    if (!form.name) {
      alert('Name is required')
      return
    }
    const trigger =
      form.trigger === 'custom'
        ? form.triggerCustom
        : form.trigger
    if (!trigger) {
      alert('Please select a trigger')
      return
    }
    if (form.scheduleType !== 'immediate' && !form.scheduledAt) {
      alert('Please set a date and time, or select "Immediate"')
      return
    }
    setLoading(true)
    try {
      await updateAutomation(id, { ...form, trigger })
      navigate(`/dashboard/automation/${id}`)
    } catch (err) {
      alert('Failed to update automation: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/dashboard/automation/${id}`)}
          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Automation</h1>
        <button onClick={() => navigate(`/dashboard/automation/${id}`)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="space-y-5">
          <div>
            <label htmlFor="automationName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
            <input
              id="automationName"
              name="automationName"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Welcome Email Sequence"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="automationType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type *</label>
            <select
              id="automationType"
              name="automationType"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="automationTrigger" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Trigger *</label>
            {form.type === 'Invoice Reminder' ? (
              <input id="automationTrigger" name="automationTrigger" type="text" value="invoice.overdue" readOnly className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-600 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono" />
            ) : (
              <div className="space-y-2">
                <select
                  id="automationTrigger"
                  name="automationTrigger"
                  value={form.trigger === 'custom' || !TRIGGER_OPTIONS.find((o) => o.value === form.trigger) ? 'custom' : form.trigger}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      trigger: e.target.value === 'custom' ? 'custom' : e.target.value,
                      triggerCustom: e.target.value === 'custom' ? p.triggerCustom || '' : '',
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                >
                  <option value="">Select a trigger...</option>
                  {TRIGGER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>
                {(form.trigger === 'custom' || !TRIGGER_OPTIONS.find((o) => o.value === form.trigger)) && form.trigger !== '' && (
                  <input
                    id="automationTriggerCustom"
                    name="automationTriggerCustom"
                    type="text"
                    value={form.triggerCustom}
                    onChange={(e) => setForm((p) => ({ ...p, triggerCustom: e.target.value }))}
                    placeholder="e.g. payment.failed"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono"
                  />
                )}
              </div>
            )}
          </div>

          <div>
            <p className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Schedule *</p>
            <div className="space-y-2">
              <div className="flex gap-2">
                {[
                  { key: 'once', label: 'One Time' },
                  { key: 'recurring', label: 'Recurring' },
                  { key: 'immediate', label: 'Immediate' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, scheduleType: s.key, scheduledAt: s.key === 'immediate' ? '' : p.scheduledAt }))
                    }
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      form.scheduleType === s.key
                        ? s.key === 'immediate'
                          ? 'bg-green-600 text-white'
                          : 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {form.scheduleType === 'recurring' && (
                <div>
                  <label htmlFor="automationScheduleFrequency" className="sr-only">Schedule frequency</label>
                  <select
                    id="automationScheduleFrequency"
                    name="automationScheduleFrequency"
                    value={form.scheduleFrequency}
                    onChange={(e) => setForm((p) => ({ ...p, scheduleFrequency: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  >
                    <option value="daily">Every Day</option>
                    <option value="weekly">Every Week</option>
                    <option value="biweekly">Every 2 Weeks</option>
                    <option value="monthly">Every Month</option>
                    <option value="yearly">Every Year</option>
                  </select>
                </div>
              )}
              {form.scheduleType === 'once' && (
                <div>
                  <label htmlFor="automationScheduledAt" className="sr-only">Scheduled date & time</label>
                  <input
                    id="automationScheduledAt"
                    name="automationScheduledAt"
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {isEmailType(form.type) && (
            <div className="space-y-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Email Template</p>
              <div>
                <label htmlFor="automationFromName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">From Name</label>
                <input
                  id="automationFromName"
                  name="automationFromName"
                  type="text"
                  value={form.fromName}
                  onChange={(e) => setForm((p) => ({ ...p, fromName: e.target.value }))}
                  placeholder="Acodera CRM"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <label htmlFor="automationSubject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                <input
                  id="automationSubject"
                  name="automationSubject"
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="Welcome to Acodera CRM!"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="automationBody" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Body (HTML)</label>
                  {isInvoiceTrigger && (
                    <button
                      type="button"
                      onClick={handleInsertTemplate}
                      disabled={insertingTemplate}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 disabled:opacity-50 transition-colors"
                    >
                      <FileText size={14} />
                      {insertingTemplate ? 'Loading...' : 'Insert from template'}
                    </button>
                  )}
                </div>
                <textarea
                  id="automationBody"
                  name="automationBody"
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                  rows={4}
                  placeholder="<h2>Welcome!</h2><p>Thank you for joining...</p>"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none font-mono"
                />
              </div>

              {isInvoiceTrigger && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 px-4 py-3 flex items-center gap-3">
                  <FileText size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-blue-700 dark:text-blue-300">Invoice email body is optional</p>
                    <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5">Leave body empty to auto-generate from your saved invoice template. Or click 'Insert from template' to pre-fill with your saved styling. Invoice PDF is also attached.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => navigate(`/dashboard/automation/${id}`)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
