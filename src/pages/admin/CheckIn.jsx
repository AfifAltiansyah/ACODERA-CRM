import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CheckCircle, XCircle, Clock, User, Ticket, Mail, Phone, QrCode } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getUser } from '../../utils/auth'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/20' },
  checked_in: { label: 'Checked In', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20' },
  paid: { label: 'Paid', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
}

export function CheckInPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkedInList, setCheckedInList] = useState([])
  const [pendingList, setPendingList] = useState([])
  const inputRef = useRef(null)

  const fetchLists = async () => {
    try {
      const user = getUser()
      const branchId = user?.branch_id || ''
      if (!branchId) return

      const select = 'id, unique_code, buyer_name, buyer_email, buyer_phone, quantity, status, checked_in_at, checked_in_by, ticket_id, tickets(title, abbreviation)'

      const { data: pending } = await supabase.from('transactions').select(select)
        .eq('branch', branchId).in('status', ['pending', 'paid'])
        .order('purchased_at', { ascending: false }).limit(20)

      const { data: checked } = await supabase.from('transactions').select(select)
        .eq('branch', branchId).eq('status', 'checked_in')
        .order('checked_in_at', { ascending: false }).limit(20)

      setPendingList(pending || [])
      setCheckedInList(checked || [])
    } catch { /* quiet */ }
  }

  useEffect(() => { fetchLists() }, [])

  const lookup = async (overrideCode) => {
    const trimmed = (overrideCode || code).trim()
    if (!trimmed) { setResult({ error: 'Please enter a unique code' }); return }
    setLoading(true)
    setResult(null)
    try {
      const user = getUser()
      const branchId = user?.branch_id || ''

      const { data: rows, error } = await supabase
        .from('transactions')
        .select(`
          id, transaction_id, unique_code, buyer_name, buyer_email, buyer_phone,
          status, checked_in_at, checked_in_by, quantity, ticket_id,
          tickets!inner(title, abbreviation)
        `)
        .eq('unique_code', trimmed)
        .eq('branch', branchId)
        .neq('status', 'available')
        .limit(1)

      if (error) throw error
      if (!rows || rows.length === 0) {
        setResult({ error: 'Invalid unique code' })
        return
      }

      const t = rows[0]
      setResult({
        id: t.id,
        transactionId: t.transaction_id,
        uniqueCode: t.unique_code,
        buyerName: t.buyer_name,
        buyerEmail: t.buyer_email,
        buyerPhone: t.buyer_phone,
        status: t.status,
        checkedInAt: t.checked_in_at,
        checkedInBy: t.checked_in_by,
        quantity: t.quantity,
        ticketTitle: t.tickets?.title || '',
        ticketAbbr: t.tickets?.abbreviation || '',
      })
    } catch (err) {
      setResult({ error: 'Lookup failed: ' + (err.message || 'Unknown error') })
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  const checkIn = async () => {
    if (!result || result.status !== 'paid') return
    setCheckingIn(true)
    try {
      const user = getUser()
      const branchId = user?.branch_id || ''

      const { data: updated, error } = await supabase
        .from('transactions')
        .update({
          status: 'checked_in',
          checked_in_at: new Date().toISOString(),
          checked_in_by: user?.name || user?.id?.toString() || 'Admin',
        })
        .eq('id', result.id)
        .eq('branch', branchId)
        .select()
        .single()

      if (error) throw error

      setResult(prev => ({
        ...prev,
        status: 'checked_in',
        checkedInAt: updated.checked_in_at,
        checkedInBy: updated.checked_in_by,
      }))
      fetchLists()
    } catch (err) {
      alert('Check-in failed: ' + (err.message || 'Unknown error'))
    }
    setCheckingIn(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (result?.status === 'paid') checkIn()
      else lookup()
    }
  }

  const statusConfig = result?.status ? STATUS_CONFIG[result.status] || STATUS_CONFIG.pending : null

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ink)]">Check-in</h1>
        <p className="text-[13px] text-[var(--muted)] mt-1">Scan or enter a unique code to check in a buyer</p>
      </div>

      <div className="apple-card space-y-4">
        <div>
          <label htmlFor="checkinCode" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">Unique Code</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                id="checkinCode"
                name="checkinCode"
                ref={inputRef}
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. APIP2026060700001"
                className="w-full pl-9 pr-4 py-3 rounded-[10px] border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[var(--ink)] dark:text-white text-[15px] font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] transition-colors shadow-sm"
                autoFocus
              />
            </div>
            <button
              onClick={lookup}
              disabled={loading || !code.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-[10px] text-[13px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all disabled:opacity-40 active:scale-[0.97]"
            >
              <Search size={15} />
              {loading ? 'Searching...' : 'Lookup'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`rounded-[14px] border p-5 ${
                result.error
                  ? 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10'
                  : result.status === 'checked_in'
                    ? 'border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10'
                    : result.status === 'cancelled'
                      ? 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10'
                      : 'border-[var(--hairline)] bg-[var(--parchment)]'
              }`}
            >
              {result.error ? (
                <div className="flex items-center gap-3">
                  <XCircle size={20} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-[14px] font-semibold text-red-700 dark:text-red-400">Not Found</p>
                    <p className="text-[13px] text-red-600 dark:text-red-300 mt-0.5">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    {result.status === 'checked_in' ? (
                      <CheckCircle size={18} className="text-green-500" />
                    ) : result.status === 'cancelled' ? (
                      <XCircle size={18} className="text-red-500" />
                    ) : (
                      <Clock size={18} className="text-yellow-500" />
                    )}
                    <span className={`text-[13px] font-semibold ${statusConfig?.color}`}>
                      {result.status === 'checked_in' ? 'Already Checked In' :
                       result.status === 'cancelled' ? 'Registration Cancelled' :
                       result.status === 'paid' ? 'Paid — Ready for Check-in' :
                       'Awaiting Payment'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[13px]">
                    <div className="flex items-center gap-2 text-[var(--ink)]">
                      <User size={14} className="text-[var(--muted)] shrink-0" />
                      <span className="font-medium truncate">{result.buyerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--ink)]">
                      <Ticket size={14} className="text-[var(--muted)] shrink-0" />
                      <span className="font-medium">{result.ticketAbbr || result.ticketTitle}</span>
                    </div>
                    {result.buyerEmail && (
                      <div className="flex items-center gap-2 text-[var(--muted)]">
                        <Mail size={13} className="shrink-0" />
                        <span className="truncate">{result.buyerEmail}</span>
                      </div>
                    )}
                    {result.buyerPhone && (
                      <div className="flex items-center gap-2 text-[var(--muted)]">
                        <Phone size={13} className="shrink-0" />
                        <span>{result.buyerPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[var(--muted)]">
                      <span className="text-[11px] uppercase">Qty:</span>
                      <span>{result.quantity}</span>
                    </div>
                    {result.checkedInAt && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle size={13} />
                        <span className="text-[12px]">{new Date(result.checkedInAt).toLocaleString('en-US', {
                          year: 'numeric', month: 'short', day: '2-digit',
                          hour: '2-digit', minute: '2-digit', hour12: false,
                        })}</span>
                      </div>
                    )}
                  </div>

                  {result.status === 'paid' && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={checkIn}
                      disabled={checkingIn}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-[10px] text-[14px] font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
                    >
                      <CheckCircle size={17} />
                      {checkingIn ? 'Checking in...' : 'Confirm Check-in'}
                    </motion.button>
                  )}

                  {result.status === 'pending' && (
                    <p className="mt-3 text-[13px] text-yellow-600 dark:text-yellow-400 text-center font-medium">
                      Buyer has not paid yet — mark as paid on Transactions page first
                    </p>
                  )}

                  {result.status === 'checked_in' && (
                    <p className="mt-3 text-[12px] text-green-600 dark:text-green-400 text-center">
                      Checked in by {result.checkedInBy || 'staff'}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {pendingList.length > 0 && (
        <div className="apple-card">
          <h2 className="text-[15px] font-semibold text-[var(--ink)] mb-4">Pending Check-in ({pendingList.length})</h2>
          <div className="space-y-2">
            {pendingList.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2.5 px-3 rounded-[10px] bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-500/20 transition-colors"
                onClick={() => { setCode(t.unique_code); lookup(t.unique_code) }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-yellow-500 shrink-0" />
                    <span className="text-[14px] font-semibold text-[var(--ink)] truncate">{t.buyer_name}</span>
                    <span className="text-[11px] text-[var(--muted)] font-mono shrink-0">{t.tickets?.abbreviation || ''}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${t.status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status === 'paid' ? 'Paid' : 'Pending'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 ml-6 text-[12px] text-[var(--muted)]">
                    {t.buyer_email && <span className="truncate">{t.buyer_email}</span>}
                    <span>Qty: {t.quantity}</span>
                    <span className="font-mono text-[11px]">{t.unique_code}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {checkedInList.length > 0 && (
        <div className="apple-card">
          <h2 className="text-[15px] font-semibold text-[var(--ink)] mb-4">Recently Checked In ({checkedInList.length})</h2>
          <div className="space-y-2">
            {checkedInList.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2.5 px-3 rounded-[10px] bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                    <span className="text-[14px] font-semibold text-[var(--ink)] truncate">{t.buyer_name}</span>
                    <span className="text-[11px] text-[var(--muted)] font-mono shrink-0">{t.tickets?.abbreviation || ''}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 ml-6 text-[12px] text-[var(--muted)]">
                    {t.buyer_email && <span className="truncate">{t.buyer_email}</span>}
                    <span>Qty: {t.quantity}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[11px] text-green-600 dark:text-green-400">
                    {t.checked_in_at ? new Date(t.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                  {t.checked_in_by && <p className="text-[10px] text-[var(--muted)]">by {t.checked_in_by}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
