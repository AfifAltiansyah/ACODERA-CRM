import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Zap, GitBranch, BarChart3, Star,
  LogOut, ChevronLeft, ChevronRight, X, Receipt, Ticket, Palette, Trash2,
  Shield, Key, Activity
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import logo from '../../assets/Acodera-logo.png'

const mainNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Contacts', icon: Users, path: '/dashboard/contacts' },
  { label: 'Automation', icon: Zap, path: '/dashboard/automation' },
  { label: 'Flow Management', icon: GitBranch, path: '/dashboard/flow' },
  { label: 'Invoicing', icon: Receipt, path: '/dashboard/invoicing' },
  { label: 'Invoice Template', icon: Palette, path: '/dashboard/invoicing/template' },
  { label: 'Tickets', icon: Ticket, path: '/dashboard/tickets' },
  { label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
  { label: 'Reviews', icon: Star, path: '/dashboard/reviews' },
  { label: 'Trash', icon: Trash2, path: '/dashboard/trash' },
  { label: 'API Keys', icon: Key, path: '/dashboard/api-keys' },
  { label: 'Payment Gateway', icon: Receipt, path: '/dashboard/admin/gateway' },
]

const adminNavItems = [
  { label: 'Users', icon: Users, path: '/dashboard/admin/users' },
  { label: 'API Keys', icon: Key, path: '/dashboard/admin/api-keys' },
  { label: 'Audit Logs', icon: Activity, path: '/dashboard/admin/audit-logs' },
]

export function Sidebar({ mobileOpen, onMobileClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = user?.role === 'owner' ? [...mainNavItems, ...adminNavItems] : mainNavItems

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#1d1d1f]">
      <div className={`flex h-16 items-center border-b border-white/[0.08] ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <img src={logo} alt="Acodera" className={`h-7 w-auto brightness-0 invert ${collapsed ? '' : 'mr-3'}`} />
        {/*
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-semibold tracking-[-0.01em] text-white"
          >
            Acodera CRM
          </motion.span>
        )}
        */}
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && !item.path.endsWith('/template') && location.pathname.startsWith(item.path) && !location.pathname.includes('/template'))
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={mobileOpen ? onMobileClose : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-all duration-150
                ${isActive
                  ? 'bg-[#0066cc]/20 text-[#2997ff]'
                  : 'text-[#86868b] hover:bg-white/[0.06] hover:text-[#f5f5f7]'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
        {user?.role === 'owner' && !collapsed && (
          <div className="pt-4 pb-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6e6e73]">
              <Shield size={12} className="inline mr-1.5" />Admin
            </p>
          </div>
        )}
        {user?.role === 'owner' && adminNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={mobileOpen ? onMobileClose : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-all duration-150
                ${isActive
                  ? 'bg-white/[0.1] text-white'
                  : 'text-[#6e6e73] hover:bg-white/[0.06] hover:text-[#f5f5f7]'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="hidden lg:flex px-3 pb-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-[12px] text-[#6e6e73] hover:bg-white/[0.06] hover:text-[#f5f5f7] transition-colors"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      <div className={`border-t border-white/[0.08] p-3 ${collapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-medium text-white">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${user?.role === 'owner' ? 'bg-[#2997ff]/20 text-[#2997ff]' : 'bg-white/[0.1] text-[#a1a1a6]'
                  }`}>
                  <Shield size={9} className="mr-0.5" />{user?.role}
                </span>
                <span className="truncate text-[11px] text-[#6e6e73]">{user?.email}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center rounded-[10px] p-2 text-[#6e6e73] hover:bg-white/[0.08] hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl lg:hidden"
          >
            <button
              onClick={onMobileClose}
              className="absolute right-3 top-4 p-1 text-[#6e6e73] hover:text-[#f5f5f7]"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      <aside
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0
          transition-all duration-300
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
