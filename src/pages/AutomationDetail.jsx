import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Zap, ArrowLeft, Mail, Send, History, Copy, Check, ChevronDown, ChevronUp, FileText, Clock, Edit } from 'lucide-react'
import { getAutomations, toggleAutomation, deleteAutomation, getAutomationLogs, sendAutomationEmail, scheduleAutomationEmail, getScheduledEmails, getContacts, getPendingInvoices } from '../services/dataService'
import { addToTrash } from '../utils/trashService'
import { generateInvoiceReminderHtml } from '../lib/invoiceHtml'
import { generateInvoicePdfBase64 } from '../lib/generateInvoicePdf'
import { loadTemplate } from './InvoiceTemplate'

const typeIcons = { 'Email Drip': Mail, 'SMS Follow-up': Mail, 'Lead Scoring': Zap, 'Marketing Campaign': Mail, 'Invoice Reminder': FileText }
const typeColors = {
  'Email Drip': 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'SMS Follow-up': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  'Lead Scoring': 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  'Marketing Campaign': 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  'Invoice Reminder': 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
}

const isEmailType = (type) => type === 'Email Drip' || type === 'Marketing Campaign' || type === 'Invoice Reminder'

export function AutomationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [automation, setAutomation] = useState(null)
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [scheduledEmails, setScheduledEmails] = useState([])
  const [scheduledLoading, setScheduledLoading] = useState(false)
  const [scheduledOpen, setScheduledOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getAutomations().then(all => {
      const found = all.find(a => a.id === id)
      setAutomation(found || null)
      setLoading(false)
    })
    getContacts().then(setContacts)
  }, [id])

  const handleToggle = async () => {
    if (!automation) return
    try {
      await toggleAutomation(automation.id)
      const all = await getAutomations()
      setAutomation(all.find(a => a.id === id))
    } catch (err) {
      alert('Failed to toggle: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDelete = async () => {
    if (!automation) return
    if (!window.confirm('Delete this automation? It will move to Trash.')) return
    try {
      addToTrash('automation', automation)
      await deleteAutomation(automation.id)
      navigate('/dashboard/automation')
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'Unknown error'))
    }
  }

  const handleViewLogs = async () => {
    if (logsOpen) { setLogsOpen(false); return }
    setLogsOpen(true)
    setLogsLoading(true)
    try {
      const data = await getAutomationLogs(automation.id)
      setLogs(data)
    } catch { setLogs([]) }
    setLogsLoading(false)
  }

  const handleViewScheduled = async () => {
    if (scheduledOpen) { setScheduledOpen(false); return }
    setScheduledOpen(true)
    setScheduledLoading(true)
    try {
      const data = await getScheduledEmails(automation.id)
      setScheduledEmails(data)
    } catch { setScheduledEmails([]) }
    setScheduledLoading(false)
  }

  const handleTestSend = async () => {
    if (!automation.subject) { alert('No email subject configured.'); return }
    const testEmail = prompt('Enter test email address:')
    if (!testEmail) return
    setSending(true)
    setSendResult(null)
    try {
      await sendAutomationEmail({
        to: testEmail,
        fromName: automation.fromName || 'Acodera CRM',
        subject: `[TEST] ${automation.subject}`,
        body: automation.body || '',
        automationId: automation.id,
      })
      setSendResult({ success: true, message: `Test email sent to ${testEmail}` })
    } catch (err) {
      setSendResult({ success: false, message: err.message || 'Failed to send' })
    }
    setSending(false)
  }

  const handleSendToAll = async () => {
    if (!automation.subject) { alert('No email subject configured.'); return }
    if (contacts.length === 0) { alert('No contacts found.'); return }
    if (!window.confirm(`Send "${automation.subject}" to ${contacts.length} contact(s)?`)) return
    const isImmediate = !automation.delayValue || (automation.delayValue === 0 && automation.delayUnit === 'minutes')
    setSending(true)
    setSendResult(null)
    let sent = 0, failed = 0
    for (const contact of contacts) {
      if (!contact.email) continue
      try {
        if (isImmediate) {
          await sendAutomationEmail({
            to: contact.email, fromName: automation.fromName || 'Acodera CRM',
            subject: automation.subject, body: automation.body || '', automationId: automation.id,
          })
        } else {
          await scheduleAutomationEmail({
            to: contact.email, fromName: automation.fromName || 'Acodera CRM',
            subject: automation.subject, body: automation.body || '', automationId: automation.id,
            delayValue: automation.delayValue, delayUnit: automation.delayUnit,
          })
        }
        sent++
      } catch { failed++ }
    }
    setSendResult({ success: true, message: `${isImmediate ? 'Sent' : 'Scheduled'}: ${sent}, Failed: ${failed}` })
    setSending(false)
  }

  const handleSendUnpaid = async () => {
    setSending(true)
    setSendResult(null)
    try {
      const invoices = await getPendingInvoices()
      if (invoices.length === 0) { setSendResult({ success: false, message: 'No unpaid invoices.' }); setSending(false); return }
      const template = await loadTemplate()
      let sent = 0, failed = 0
      for (const inv of invoices) {
        if (!inv.customerEmail) continue
        try {
          const pdfBase64 = await generateInvoicePdfBase64(inv, template)
          await sendAutomationEmail({
            to: inv.customerEmail, fromName: automation.fromName || template.companyName || 'Acodera CRM',
            subject: automation.subject || `Payment Reminder - ${inv.transactionId}`,
            body: automation.body || generateInvoiceReminderHtml(inv, template),
            automationId: automation.id,
            attachments: [{ name: `Invoice-${inv.transactionId}.pdf`, content: pdfBase64 }],
          })
          sent++
        } catch { failed++ }
      }
      setSendResult({ success: true, message: `Sent: ${sent}, Failed: ${failed}` })
    } catch (err) {
      setSendResult({ success: false, message: err.message || 'Failed' })
    }
    setSending(false)
  }

  const copyWebhook = () => {
    navigator.clipboard.writeText(`https://rthxlprgtfuhntpcdhsh.supabase.co/functions/v1/trigger-automation?event=${automation.trigger}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-7 w-7 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" /></div>
  if (!automation) return <div className="py-12 text-center text-slate-500 dark:text-slate-400"><p className="text-lg font-medium">Automation not found</p></div>

  const Icon = typeIcons[automation.type] || Zap
  const emailReady = isEmailType(automation.type) && automation.subject

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard/automation')} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${typeColors[automation.type] || 'bg-slate-100 text-slate-700'}`}><Icon size={22} /></div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{automation.name}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{automation.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${automation.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>{automation.status === 'active' ? 'Active' : 'Paused'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Trigger</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white font-mono">{automation.trigger || '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Schedule</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {automation.scheduleType === 'recurring' ? `Every ${automation.scheduleFrequency}` : automation.scheduleType === 'immediate' ? 'Immediate' : 'One time'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Contacts</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{automation.contacts || 0}</p>
            </div>
          </div>

          {emailReady && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={14} className="text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{automation.subject}</p>
              </div>
              {automation.fromName && <p className="text-xs text-blue-500 dark:text-blue-400">From: {automation.fromName}</p>}
            </div>
          )}

          {automation.type === 'Invoice Reminder' && (
            <div className="mb-6 p-4 rounded-lg bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20">
              <p className="text-sm font-medium text-rose-700 dark:text-rose-400"><FileText size={14} className="inline mr-1" />Sends invoice email to customers with unpaid invoices</p>
            </div>
          )}

          <div className="mb-6 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center gap-2">
            <code className="flex-1 text-xs text-slate-500 dark:text-slate-400 font-mono truncate">POST .../trigger-automation?event={automation.trigger}</code>
            <button onClick={copyWebhook} className="shrink-0 p-1.5 rounded text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => navigate(`/dashboard/automation/${automation.id}/edit`)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"><Edit size={14} /> Edit</button>
            <button onClick={handleToggle} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${automation.status === 'active' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>{automation.status === 'active' ? 'Pause' : 'Activate'}</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">Delete</button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleTestSend} disabled={sending} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                <Send size={14} /> {sending ? 'Sending...' : 'Test Send'}
              </button>
              <button onClick={handleSendToAll} disabled={sending} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors disabled:opacity-50">
                <Mail size={14} /> Send to All ({contacts.length})
              </button>
              {automation.type === 'Invoice Reminder' && (
                <button onClick={handleSendUnpaid} disabled={sending} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                  <Send size={14} /> {sending ? 'Sending...' : 'Send Unpaid Invoices'}
                </button>
              )}
              <button onClick={handleViewLogs} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                <History size={14} /> Logs {logsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button onClick={handleViewScheduled} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                <Clock size={14} /> Scheduled {scheduledOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {sendResult && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${sendResult.success ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                {sendResult.message}
              </div>
            )}
          </div>
        </div>

        {logsOpen && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900/50">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Email Logs</h4>
            {logsLoading ? (
              <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No emails sent yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{log.contactEmail}</p>
                      {log.subject && <p className="text-slate-400 dark:text-slate-500 truncate text-xs">{log.subject}</p>}
                      {log.error && <p className="text-red-400 text-xs truncate mt-0.5">{log.error}</p>}
                    </div>
                    <div className="flex items-center gap-3 ml-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'sent' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                        log.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                      }`}>{log.status}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{log.sentAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {scheduledOpen && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900/50">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Scheduled Emails</h4>
            {scheduledLoading ? (
              <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>
            ) : scheduledEmails.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No scheduled emails.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scheduledEmails.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{e.toEmail}</p>
                      <p className="text-slate-400 dark:text-slate-500 truncate text-xs">{e.subject}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.status === 'sent' ? 'bg-green-100 text-green-700' :
                        e.status === 'failed' ? 'bg-red-100 text-red-700' :
                        e.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{e.status}</span>
                      <span className="text-xs text-slate-500">{new Date(e.sendAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
