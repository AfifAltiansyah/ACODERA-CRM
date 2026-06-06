import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Copy, Check, Trash2, Globe } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('crm-auth-token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const GATEWAYS = [
  { value: 'midtrans', label: 'Midtrans', fields: [
    { key: 'server_key', label: 'Server Key', type: 'password' },
    { key: 'merchant_id', label: 'Merchant ID', type: 'text' },
  ]},
  { value: 'xendit', label: 'Xendit', fields: [
    { key: 'api_key', label: 'API Key', type: 'password' },
    { key: 'callback_token', label: 'Callback Token', type: 'password' },
  ]},
  { value: 'stripe', label: 'Stripe', fields: [
    { key: 'webhook_secret', label: 'Webhook Secret', type: 'password' },
    { key: 'publishable_key', label: 'Publishable Key', type: 'text' },
  ]},
]

export function GatewaySettingsPage() {
  const [selectedGateway, setSelectedGateway] = useState('')
  const [config, setConfig] = useState({})
  const [webhookToken, setWebhookToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/gateway-config`, { headers: getAuthHeaders(), credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setSelectedGateway(data.paymentGateway || '')
        setConfig(data.gatewayConfig || {})
        setWebhookToken(data.webhookToken || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!selectedGateway) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/gateway-config`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ paymentGateway: selectedGateway, gatewayConfig: config }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWebhookToken(data.webhookToken)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    }
    setSaving(false)
  }

  const handleDisable = async () => {
    if (!window.confirm('Disable payment gateway? This will remove your configuration.')) return
    try {
      await fetch(`${API_BASE}/gateway-config`, { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' })
      setSelectedGateway('')
      setConfig({})
      setWebhookToken(null)
    } catch (err) {
      alert('Failed to disable: ' + err.message)
    }
  }

  const gatewayInfo = GATEWAYS.find(g => g.value === selectedGateway)
  const webhookUrl = webhookToken && selectedGateway
    ? `${window.location.origin}/api/webhook/${selectedGateway}/${webhookToken}`
    : null

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-7 w-7 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Gateway</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure your payment gateway to automatically update invoice statuses.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Gateway Provider</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {GATEWAYS.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => { setSelectedGateway(g.value); setConfig({}) }}
                className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-medium transition-all ${
                  selectedGateway === g.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Globe size={20} />
                <span>{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        {gatewayInfo && (
          <div className="space-y-4">
            {gatewayInfo.fields.map(field => (
              <div key={field.key}>
                <label htmlFor={`gateway-${field.key}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{field.label}</label>
                <input
                  id={`gateway-${field.key}`}
                  name={`gateway-${field.key}`}
                  type={field.type}
                  value={config[field.key] || ''}
                  onChange={e => setConfig(c => ({ ...c, [field.key]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            ))}
          </div>
        )}

        {webhookUrl && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20">
            <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Webhook URL</label>
            <p className="text-xs text-blue-500 dark:text-blue-400 mb-2">Paste this URL into your payment gateway dashboard to receive payment notifications.</p>
            <div className="flex gap-2">
              <code className="flex-1 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/20 text-xs font-mono text-slate-600 dark:text-slate-300 break-all">{webhookUrl}</code>
              <button onClick={() => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="shrink-0 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {selectedGateway && (
            <button onClick={handleDisable} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 transition-colors">
              <Trash2 size={16} /> Disable Gateway
            </button>
          )}
          <div className="flex-1" />
          <button onClick={handleSave} disabled={saving || !selectedGateway} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}
