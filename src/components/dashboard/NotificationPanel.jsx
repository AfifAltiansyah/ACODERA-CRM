import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications } from '../../hooks/useNotifications'

const STYLES = {
  ticket:    { dot: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🎟️', label: 'Ticket' },
  contact:   { dot: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: '👤', label: 'Contact' },
  invoice:   { dot: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '📄', label: 'Invoice' },
  automation:{ dot: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: '⚡', label: 'Automation' },
  review:    { dot: '#f43f5e', bg: 'rgba(244,63,94,0.1)', icon: '⭐', label: 'Review' },
  lead:      { dot: '#14b8a6', bg: 'rgba(20,184,166,0.1)', icon: '📈', label: 'Lead' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function NotificationPanel({ onClose }) {
  const navigate = useNavigate()
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } = useNotifications()

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleClick = (n) => {
    if (!n.read) markAsRead(n.id)
    if (n.link) navigate(n.link)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="absolute right-0 mt-2 w-[420px] rounded-[18px] border border-[var(--hairline)] shadow-2xl z-50 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
      }}
    >
      <div className="dark:hidden" style={{ background: 'rgba(255,255,255,0.85)' }}>
        <Header onClose={onClose} onMarkAll={markAllAsRead} />
        <List notifications={notifications} onItemClick={handleClick} />
      </div>
      <div className="hidden dark:flex flex-col" style={{ background: 'rgba(29,29,31,0.85)' }}>
        <Header onClose={onClose} onMarkAll={markAllAsRead} />
        <List notifications={notifications} onItemClick={handleClick} />
      </div>
    </motion.div>
  )
}

function Header({ onClose, onMarkAll }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hairline)]">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)]">Notifications</h2>
      <button
        onClick={onMarkAll}
        className="text-[12px] font-medium text-[var(--accent)] hover:underline transition-all"
      >
        Mark all read
      </button>
    </div>
  )
}

function List({ notifications, onItemClick }) {
  const unread = notifications.filter(n => !n.read)

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-5">
        <div className="w-12 h-12 rounded-full bg-[var(--parchment)] flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <p className="text-[14px] font-medium text-[var(--ink)]">No notifications</p>
        <p className="text-[12px] text-[var(--muted)] mt-1">New activity will appear here.</p>
      </div>
    )
  }

  return (
    <div className="max-h-[460px] overflow-y-auto">
      {unread.length > 0 && (
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-[0.05em]">
            {unread.length} new
          </span>
        </div>
      )}
      <div className="px-2 pb-2">
        {notifications.map((n, i) => {
          const style = STYLES[n.type] || STYLES.invoice
          return (
            <motion.button
              key={n.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              onClick={() => onItemClick(n)}
              className="flex items-start gap-3 w-full text-left rounded-[12px] px-3 py-3 hover:bg-[var(--parchment)] transition-all active:scale-[0.98]"
            >
              <div className="relative mt-0.5">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[15px] shrink-0"
                  style={{ background: style.bg }}
                >
                  {style.icon}
                </div>
                {!n.read && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#1d1d1f]"
                    style={{ background: style.dot }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-[13px] font-medium truncate ${n.read ? 'text-[var(--muted)]' : 'text-[var(--ink)]'}`}>
                    {n.title}
                  </p>
                  <span className="text-[11px] text-[var(--muted)] shrink-0 font-mono">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                {n.message && (
                  <p className="text-[12px] text-[var(--muted)] mt-0.5 truncate">{n.message}</p>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
      <div className="border-t border-[var(--hairline)] px-5 py-3">
        <button
          onClick={() => { window.location.href = '/dashboard?tab=notifications' }}
          className="w-full text-center text-[12px] font-medium text-[var(--accent)] hover:underline transition-all"
        >
          View all notifications →
        </button>
      </div>
    </div>
  )
}
