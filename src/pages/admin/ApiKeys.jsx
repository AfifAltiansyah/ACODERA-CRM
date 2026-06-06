import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Key, Copy, Check, Trash2, Clock, Upload } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('crm-auth-token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function ApiKeysPage() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [newKeyData, setNewKeyData] = useState(null)
  const [form, setForm] = useState({ name: '', rateLimit: 100 })
  const [importForm, setImportForm] = useState({ name: '', customKey: '', rateLimit: 100 })
  const [copied, setCopied] = useState(false)

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${API_BASE}/api-keys`, { headers: getAuthHeaders(), credentials: 'include' })
      const data = await res.json()
      if (data.keys) setKeys(data.keys)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { fetchKeys() }, [])

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_BASE}/api-keys`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      setNewKeyData(data)
      setShowCreate(false)
      fetchKeys()
    } catch (err) { alert(err.message) }
  }

  const handleImport = async () => {
    if (!importForm.customKey.trim()) { alert('Please enter an API key'); return }
    try {
      const res = await fetch(`${API_BASE}/api-keys`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ name: importForm.name, customKey: importForm.customKey.trim(), rateLimit: importForm.rateLimit }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      setNewKeyData(data)
      setShowImport(false)
      setImportForm({ name: '', customKey: '', rateLimit: 100 })
      fetchKeys()
    } catch (err) { alert(err.message) }
  }

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this API key? This action cannot be undone.')) return
    try {
      const res = await fetch(`${API_BASE}/api-keys/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      fetchKeys()
    } catch (err) { alert(err.message) }
  }

  const copyKey = (key) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-7 w-7 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ink)]">API Keys</h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">Manage API keys for external access to your branch data</p>
        </div>
        {!newKeyData && (
          <div className="flex gap-2">
            <button onClick={() => { setShowImport(true); setNewKeyData(null) }}
              className="flex items-center gap-2 rounded-full border border-[var(--hairline)] text-[var(--ink)] px-4 py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--parchment)] active:scale-[0.97]">
              <Upload size={15} /> Import Key
            </button>
            <button onClick={() => { setShowCreate(true); setNewKeyData(null) }}
              className="flex items-center gap-2 rounded-full bg-[var(--accent)] text-white px-4 py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]">
              <Plus size={15} /> New Key
            </button>
          </div>
        )}
      </div>

      {newKeyData && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="apple-card border-[var(--accent)]/20 bg-[var(--accent)]/5">
          <div className="flex items-center gap-2 mb-2">
            <Key size={16} className="text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--accent)] text-[14px]">API Key {newKeyData.fullKey ? 'Created' : 'Imported'}</h3>
          </div>
          {newKeyData.fullKey ? (
            <>
              <p className="text-[13px] text-[var(--muted)] mb-3">Copy this key now. You will not be able to see it again!</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 rounded-[10px] bg-[var(--parchment)] border border-[var(--hairline)] font-mono text-[12px] break-all text-[var(--ink)]">{newKeyData.fullKey}</code>
                <button onClick={() => copyKey(newKeyData.fullKey)}
                  className="p-2.5 rounded-[10px] bg-[var(--parchment)] border border-[var(--hairline)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-[var(--muted)]">External key has been imported and is ready for use.</p>
          )}
          <button onClick={() => setNewKeyData(null)} className="mt-3 text-[13px] text-[var(--accent)] hover:underline">Dismiss</button>
        </motion.div>
      )}

      <div className="apple-card p-0 overflow-hidden">
        {keys.length === 0 ? (
          <div className="py-16 text-center text-[var(--muted)]">
            <Key size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-[15px] font-medium text-[var(--ink)] mb-1">No API keys</p>
            <p className="text-[13px]">Create or import a key to enable external API access.</p>
          </div>
        ) : (
          <div>
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-5 py-4 border-b border-[var(--hairline)] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-medium text-[var(--ink)]">{k.name || k.key_prefix}</span>
                    <span className={`apple-tag ${
                      k.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                    }`}>{k.status}</span>
                    <span className={`apple-tag ${
                      k.key_prefix?.startsWith('acd_') ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}>
                      {k.key_prefix?.startsWith('acd_') ? 'Generated' : 'Imported'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-[var(--muted)]">
                    <code className="font-mono bg-[var(--parchment)] px-1.5 py-0.5 rounded">{k.key_prefix}...</code>
                    {k.user_name && <span>{k.user_name}</span>}
                    {k.last_used_at && <span className="flex items-center gap-1"><Clock size={11} />{new Date(k.last_used_at).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className="text-[12px] text-[var(--muted)]">{k.rate_limit}/hr</span>
                  <button onClick={() => handleRevoke(k.id)} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-colors" title="Revoke">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[var(--canvas)] rounded-[18px] shadow-2xl border border-[var(--hairline)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--hairline)]">
              <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--ink)]">Create API Key</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--parchment)]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="apiKeyName" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Key Name</label>
                <input id="apiKeyName" name="apiKeyName" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Production API"
                  className="apple-input" />
              </div>
              <div>
                <label htmlFor="apiKeyRateLimit" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Rate Limit (requests/hour)</label>
                <input id="apiKeyRateLimit" name="apiKeyRateLimit" type="number" value={form.rateLimit} onChange={e => setForm(p => ({ ...p, rateLimit: Number(e.target.value) }))} min={1} max={10000}
                  className="apple-input" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--hairline)]">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-[var(--muted)] hover:bg-[var(--parchment)] transition-colors">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2.5 rounded-[10px] text-[13px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors">Create Key</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showImport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowImport(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[var(--canvas)] rounded-[18px] shadow-2xl border border-[var(--hairline)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--hairline)]">
              <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--ink)]">Import API Key</h3>
              <button onClick={() => setShowImport(false)} className="p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--parchment)]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="apiKeyNameImport" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Key Name</label>
                <input id="apiKeyNameImport" name="apiKeyNameImport" value={importForm.name} onChange={e => setImportForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. External API Key"
                  className="apple-input" />
              </div>
              <div>
                <label htmlFor="apiKeyValue" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">API Key</label>
                <textarea id="apiKeyValue" name="apiKeyValue" value={importForm.customKey} onChange={e => setImportForm(p => ({ ...p, customKey: e.target.value }))}
                  placeholder="Paste your external API key here..."
                  rows={3}
                  className="apple-input !rounded-[10px] resize-none" />
              </div>
              <div>
                <label htmlFor="apiKeyRateLimitImport" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Rate Limit (requests/hour)</label>
                <input id="apiKeyRateLimitImport" name="apiKeyRateLimitImport" type="number" value={importForm.rateLimit} onChange={e => setImportForm(p => ({ ...p, rateLimit: Number(e.target.value) }))} min={1} max={10000}
                  className="apple-input" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--hairline)]">
              <button onClick={() => setShowImport(false)} className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-[var(--muted)] hover:bg-[var(--parchment)] transition-colors">Cancel</button>
              <button onClick={handleImport} className="px-5 py-2.5 rounded-[10px] text-[13px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors">Import Key</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
