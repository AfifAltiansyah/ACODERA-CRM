import { useState, useEffect } from 'react'
import { Save, RotateCcw, Upload } from 'lucide-react'
import { useCurrencyFormatter } from '../utils/currencyFormatter'
import { fetchTemplate, saveTemplate as saveTemplateApi, uploadLogo } from '../utils/templateApi'

export const DEFAULT_TEMPLATE = {
  companyName: 'Acodera CRM',
  logoInitial: 'A',
  logoUrl: '',
  accentColor: '#1e40af',
  address: 'Jl. Sudirman No. 123, Jakarta 10220',
  email: 'contact@acodera.com',
  phone: '+62 21 555 0100',
  website: 'https://acodera.com',
  footerText: 'Thank you for your business!',
  taxRate: 0,
  currencySymbol: 'Rp',
}

export async function loadTemplate() {
  try {
    const tpl = await fetchTemplate()
    const merged = { ...DEFAULT_TEMPLATE }
    // Only override with non-empty values from DB
    for (const key of Object.keys(tpl)) {
      if (tpl[key] !== null && tpl[key] !== undefined) {
        merged[key] = tpl[key]
      }
    }
    return merged
  } catch (err) {
    console.error('[loadTemplate]', err)
    return { ...DEFAULT_TEMPLATE }
  }
}

const COLOR_PRESETS = [
  { label: 'Blue', value: '#1e40af' },
  { label: 'Indigo', value: '#4338ca' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Emerald', value: '#047857' },
  { label: 'Teal', value: '#0f766e' },
  { label: 'Red', value: '#b91c1c' },
  { label: 'Orange', value: '#c2410c' },
  { label: 'Slate', value: '#334155' },
  { label: 'Pink', value: '#be185d' },
  { label: 'Amber', value: '#b45309' },
]

export function InvoiceTemplatePage() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { formatCurrency: fc } = useCurrencyFormatter()

  useEffect(() => {
    loadTemplate().then(tpl => {
      setTemplate(tpl)
      setLoaded(true)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveTemplateApi(template)
      const fresh = await loadTemplate()
      setTemplate(fresh)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    }
    setSaving(false)
  }

  const handleReset = () => {
    const defaults = { ...DEFAULT_TEMPLATE }
    setTemplate(defaults)
    saveTemplateApi(defaults).catch(() => {})
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB')
      return
    }
    setUploading(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const b64 = ev.target?.result?.toString().split(',')[1]
          if (b64) resolve(b64)
          else reject(new Error('Failed to read file'))
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })
      const url = await uploadLogo(base64, file.type)
      setTemplate(t => ({ ...t, logoUrl: url }))
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
    setUploading(false)
  }

  const accent = template.accentColor || '#1e40af'
  const logoSrc = template.logoUrl

  if (!loaded) {
    return <div className="flex h-64 items-center justify-center"><div className="h-7 w-7 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invoice Template</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Customize how your invoices look — logo, company info, colors, and tax rate.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Brand & Logo</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="templateCompanyName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                <input id="templateCompanyName" name="templateCompanyName" type="text" value={template.companyName} onChange={(e) => setTemplate(t => ({ ...t, companyName: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
              </div>
              <div>
                <label htmlFor="templateLogoInitial" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logo Initial (if no image)</label>
                <input id="templateLogoInitial" name="templateLogoInitial" type="text" maxLength={2} value={template.logoInitial} onChange={(e) => setTemplate(t => ({ ...t, logoInitial: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
              </div>
            </div>

            <div>
              <label htmlFor="templateLogoUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logo Image
                {uploading && <span className="ml-2 text-xs text-brand-500 animate-pulse">Uploading...</span>}
              </label>
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input id="templateLogoUrl" name="templateLogoUrl" type="url" value={template.logoUrl} onChange={(e) => setTemplate(t => ({ ...t, logoUrl: e.target.value }))} placeholder="https://example.com/logo.png" className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 cursor-pointer transition-colors shrink-0">
                      <Upload size={16} />
                      {uploading ? '...' : 'Upload'}
                      <input id="templateLogoFile" name="templateLogoFile" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                  {template.logoUrl && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30">
                      <img src={template.logoUrl} alt="Logo preview" className="rounded-lg border border-slate-200 dark:border-slate-600"
                        style={{ width: 'auto', height: 'auto', maxWidth: 120, maxHeight: 60, objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none' }} />
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate flex-1">{template.logoUrl}</span>
                      <button onClick={() => setTemplate(t => ({ ...t, logoUrl: '' }))} className="text-xs text-red-500 hover:underline shrink-0">Remove</button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Upload a logo image (PNG/JPG, max 2MB) or paste a URL. Leave empty for initial letter.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Company Information</h3>

            <div>
              <label htmlFor="templateAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <input id="templateAddress" name="templateAddress" type="text" value={template.address} onChange={(e) => setTemplate(t => ({ ...t, address: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="templateEmail" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input id="templateEmail" name="templateEmail" type="email" value={template.email} onChange={(e) => setTemplate(t => ({ ...t, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                </div>
                <div>
                  <label htmlFor="templatePhone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input id="templatePhone" name="templatePhone" type="tel" value={template.phone} onChange={(e) => setTemplate(t => ({ ...t, phone: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                </div>
                <div>
                  <label htmlFor="templateWebsite" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website</label>
                  <input id="templateWebsite" name="templateWebsite" type="url" value={template.website} onChange={(e) => setTemplate(t => ({ ...t, website: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                </div>
              </div>

              <div>
                <label htmlFor="templateFooterText" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Footer Text</label>
                <input id="templateFooterText" name="templateFooterText" type="text" value={template.footerText} onChange={(e) => setTemplate(t => ({ ...t, footerText: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
              </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Invoice Settings</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="templateTaxRate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tax Rate (%)</label>
                <input id="templateTaxRate" name="templateTaxRate" type="number" min={0} max={100} step={0.1} value={template.taxRate} onChange={(e) => setTemplate(t => ({ ...t, taxRate: Number(e.target.value) || 0 }))} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
              </div>
              <div>
                <label htmlFor="templateCurrencySymbol" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency Symbol</label>
                <select id="templateCurrencySymbol" name="templateCurrencySymbol" value={template.currencySymbol} onChange={(e) => setTemplate(t => ({ ...t, currencySymbol: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all">
                  <option value="Rp">Rp (IDR)</option>
                  <option value="$">$ (USD)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="£">£ (GBP)</option>
                  <option value="¥">¥ (JPY/CNY)</option>
                  <option value="₩">₩ (KRW)</option>
                  <option value="₹">₹ (INR)</option>
                  <option value="RM">RM (MYR)</option>
                  <option value="S$">S$ (SGD)</option>
                  <option value="฿">฿ (THB)</option>
                </select>
              </div>
              <div>
                <label htmlFor="templateAccentColor" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setTemplate(t => ({ ...t, accentColor: c.value }))}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${template.accentColor === c.value ? 'border-slate-900 dark:border-white scale-110' : 'border-slate-200 dark:border-slate-600'}`}
                      style={{ background: c.value }}
                      title={c.label}
                    />
                  ))}
                  <div className="flex items-center gap-2">
                    <input id="templateAccentColor" name="templateAccentColor" type="color" value={template.accentColor} onChange={(e) => setTemplate(t => ({ ...t, accentColor: e.target.value }))} className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-600" />
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{template.accentColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors">
              <RotateCcw size={16} /> Reset to Defaults
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50">
              <Save size={16} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Template'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Live Preview</h3>
            <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
              <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: `2px solid ${accent}` }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {logoSrc ? (
                        <img src={logoSrc} alt="Logo" style={{ width: 'auto', height: 'auto', maxWidth: 120, maxHeight: 60, objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{template.logoInitial}</span>
                        </div>
                      )}
                      <span style={{ fontSize: '16px', fontWeight: '700', color: accent }}>{template.companyName}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{template.address}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{template.email} | {template.phone}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: accent }}>INVOICE</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>Date: Jan 15, 2025</p>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Item</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Qty</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>Sample Item</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>1</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{template.currencySymbol}1,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '8px', borderTop: `2px solid ${accent}`, paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: accent }}>Total Due</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: accent }}>{fc(1000 * (1 + template.taxRate / 100))}</span>
                </div>
                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>{template.footerText} | {template.companyName} | {template.website}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}