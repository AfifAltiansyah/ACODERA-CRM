import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Menu, Search, Bell, User, Settings, LogOut, Moon, Sun, ChevronDown, Globe, ChevronRight, Users, Zap, GitBranch, Receipt, Ticket, Mail, Phone, MapPin, Calendar } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../hooks/useAuth'
import { useCurrency, CURRENCIES } from '../../hooks/useCurrency.jsx'
import { useNotifications } from '../../hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'
import { getContacts, getFlows, getInvoices, getTickets } from '../../services/dataService'

const categories = [
  { key: 'contacts', label: 'Contacts', icon: Users, color: 'text-[var(--accent)]', bgColor: 'bg-[var(--accent)]/10', path: '/dashboard/contacts', subtitle: email => email, getSubtitle: (item) => item?.email },
  { key: 'automation', label: 'Automation', icon: Zap, color: 'text-[#2997ff]', bgColor: 'bg-[#2997ff]/10', path: '/dashboard/automation', subtitle: 'Automated workflows', getSubtitle: () => 'Automated workflows' },
  { key: 'flows', label: 'Flow Management', icon: GitBranch, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', path: '/dashboard/flow', subtitle: stage => `Stage: ${stage}`, getSubtitle: (item) => item?.stage },
  { key: 'invoices', label: 'Invoicing', icon: Receipt, color: 'text-amber-500', bgColor: 'bg-amber-500/10', path: '/dashboard/invoicing', subtitle: total => `$${total}`, getSubtitle: (item) => item?.totalAmount && `$${item.totalAmount}` },
  { key: 'tickets', label: 'Tickets', icon: Ticket, color: 'text-rose-500', bgColor: 'bg-rose-500/10', path: '/dashboard/tickets', subtitle: loc => loc, getSubtitle: (item) => item?.location },
]

export function TopBar({ onMenuClick, title }) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const { currency, updateCurrency } = useCurrency()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState(0)
  const [allData, setAllData] = useState({ contacts: [], flows: [], invoices: [], tickets: [] })
  const [dataLoaded, setDataLoaded] = useState(false)
  const dropdownRef = useRef(null)
  const currencyRef = useRef(null)
  const searchRef = useRef(null)
  const notifRef = useRef(null)
  const { unreadCount, panelOpen, setPanelOpen } = useNotifications()

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
      if (currencyRef.current && !currencyRef.current.contains(e.target)) setCurrencyOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setPanelOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (searchOpen && !dataLoaded) {
      Promise.all([getContacts(), getFlows(), getInvoices(), getTickets()])
        .then(([contacts, flows, invoices, tickets]) => {
          setAllData({ contacts, flows, invoices, tickets })
          setDataLoaded(true)
        })
    }
  }, [searchOpen, dataLoaded])

  const currentCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'

  const activeCat = categories[selectedCat]
  const activeItems = allData[activeCat?.key] || []

  const q = searchQuery.toLowerCase()
  const filteredItems = q ? activeItems.filter(item => {
    const searchable = [item?.name, item?.title, item?.email, item?.location, item?.buyer_name, item?.transactionId, item?.stage, item?.phone].filter(Boolean).join(' ').toLowerCase()
    return searchable.includes(q)
  }) : activeItems

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--hairline)] bg-[var(--canvas)]/80 backdrop-blur-xl px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-[10px] text-[var(--muted)] hover:bg-[var(--parchment)] transition-colors"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--ink)]">{title}</h1>
      </div>

      <div className="hidden md:flex flex-1 max-w-md mx-8 relative" ref={searchRef}>
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          id="topbarSearch"
          name="topbarSearch"
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onFocus={() => { setSearchOpen(true); setSelectedCat(0) }}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') } }}
          className="w-full rounded-full border-0 bg-[var(--parchment)] pl-9 pr-4 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
        />

        {searchOpen && (
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
        )}

        {searchOpen && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[90vw] max-w-[1200px] min-h-[450px] rounded-[18px] border border-[var(--hairline)] bg-[var(--canvas)] shadow-2xl z-50 flex overflow-hidden">
            {/* Category sidebar */}
            <div className="w-[20%] shrink-0 border-r border-[var(--hairline)] bg-[var(--parchment)] p-2">
              <div className="flex items-center gap-2 px-3 py-2.5 mb-1">
                <Search size={14} className="text-[var(--muted)]" />
                <span className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[0.05em]">Browse</span>
              </div>
              {categories.map((cat, i) => {
                const rawCount = (allData[cat.key] || []).length
                const count = q ? allData[cat.key]?.filter(item => {
                  const s = [item?.name, item?.title, item?.email, item?.location, item?.buyer_name, item?.transactionId, item?.stage].filter(Boolean).join(' ').toLowerCase()
                  return s.includes(q)
                }).length || 0 : rawCount
                return (
                  <button
                    key={cat.key}
                    onClick={() => { setSelectedCat(i); setSearchQuery('') }}
                    className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-all text-left ${
                      selectedCat === i
                        ? 'bg-[var(--canvas)] text-[var(--ink)] shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--canvas)]/50'
                    }`}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${selectedCat === i ? cat.bgColor : 'bg-[var(--canvas)]'}`}>
                      <cat.icon size={13} className={selectedCat === i ? cat.color : 'text-[var(--muted)]'} />
                    </div>
                    <span className="flex-1">{cat.label}</span>
                    <span className="text-[11px] text-[var(--muted)]">{count}</span>
                    <ChevronRight size={12} className={`transition-all ${selectedCat === i ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                )
              })}
            </div>

            {/* Items panel */}
            <div className="flex-1 p-5 overflow-y-auto min-h-[450px] max-h-[70vh]">
              {/* Search inside mega menu */}
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  id="topbarSearchMega"
                  name="topbarSearchMega"
                  type="text"
                  placeholder={`Search ${activeCat.label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-[10px] border border-[var(--hairline)] bg-[var(--parchment)] pl-9 pr-4 py-2.5 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] text-[11px]">Clear</button>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${activeCat.bgColor}`}>
                    <activeCat.icon size={16} className={activeCat.color} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[var(--ink)]">{activeCat.label}</h3>
                    <p className="text-[11px] text-[var(--muted)]">{filteredItems.length} of {activeItems.length}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); navigate(activeCat.path) }}
                  className="text-[12px] text-[var(--accent)] hover:underline"
                >
                  View all →
                </button>
              </div>

              {filteredItems.length > 0 ? (
                <div className="space-y-1">
                  {filteredItems.map((item, i) => (
                    <button
                      key={item?.id || i}
                      onClick={() => { setSearchOpen(false); navigate(activeCat.path) }}
                      className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 hover:bg-[var(--parchment)] transition-colors text-left group"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${activeCat.bgColor}`}>
                        <activeCat.icon size={14} className={activeCat.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[var(--ink)] truncate">
                          {item?.name || item?.title || item?.buyer_name || item?.transactionId || 'Untitled'}
                        </p>
                        <p className="text-[11px] text-[var(--muted)] truncate">
                          {activeCat.getSubtitle ? activeCat.getSubtitle(item) : item?.email || item?.location || ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] shrink-0">
                        {item?.price && <span>{item.price}</span>}
                        {item?.stage && <span className="apple-tag bg-[var(--parchment)]">{item.stage}</span>}
                        {item?.quantity && <span>{item.quantity}x</span>}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <activeCat.icon size={36} className="text-[var(--muted)] opacity-20 mb-3" />
                  <p className="text-[14px] font-medium text-[var(--muted)]">
                    {searchQuery ? 'No results found' : `No ${activeCat.label.toLowerCase()} yet`}
                  </p>
                  <p className="text-[12px] text-[var(--muted)] opacity-60 mt-1">
                    {searchQuery ? 'Try a different search term.' : 'Create one to get started.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-[10px] text-[var(--muted)] hover:bg-[var(--parchment)] transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative" ref={currencyRef}>
          <button
            onClick={() => setCurrencyOpen(!currencyOpen)}
            className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--parchment)] border border-[var(--hairline)] transition-colors"
          >
            <Globe size={13} />
            <span className="hidden sm:inline">{currentCurrency.symbol}</span>
            <span className="font-semibold text-[var(--ink)]">{currentCurrency.code}</span>
            <ChevronDown size={11} className={`transition-transform ${currencyOpen ? 'rotate-180' : ''}`} />
          </button>

          {currencyOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-[14px] border border-[var(--hairline)] bg-[var(--canvas)] shadow-lg py-1 z-50 max-h-60 overflow-y-auto">
              {CURRENCIES.map((ccy) => (
                <button
                  key={ccy.code}
                  onClick={() => { updateCurrency(ccy.code); setCurrencyOpen(false) }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors ${
                    currency === ccy.code
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                      : 'text-[var(--ink)] hover:bg-[var(--parchment)]'
                  }`}
                >
                  <span className="text-[15px]">{ccy.flag}</span>
                  <span>{ccy.code}</span>
                  <span className="text-[var(--muted)]">{ccy.symbol}</span>
                  <span className="text-[11px] text-[var(--muted)] ml-auto">{ccy.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="relative p-2 rounded-[10px] text-[var(--muted)] hover:bg-[var(--parchment)] transition-colors"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow-lg animate-[pulse_2s_ease-in-out_infinite]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {panelOpen && (
              <NotificationPanel onClose={() => setPanelOpen(false)} />
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-[10px] p-1.5 hover:bg-[var(--parchment)] transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[11px] font-semibold">
              {initials}
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-[14px] border border-[var(--hairline)] bg-[var(--canvas)] shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b border-[var(--hairline)]">
                <p className="text-[13px] font-medium text-[var(--ink)]">{user?.name}</p>
                <p className="text-[11px] text-[var(--muted)] truncate">{user?.email}</p>
              </div>
              <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--ink)] hover:bg-[var(--parchment)] transition-colors">
                <User size={15} /> Profile
              </button>
              <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--ink)] hover:bg-[var(--parchment)] transition-colors">
                <Settings size={15} /> Settings
              </button>
              <div className="border-t border-[var(--hairline)] my-1" />
              <button
                onClick={() => { logout(); window.location.href = '/login' }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
