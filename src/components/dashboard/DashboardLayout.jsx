import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { refreshProfile } from '../../utils/auth'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/dashboard/contacts': 'Contacts',
  '/dashboard/automation': 'Automation',
  '/dashboard/flow': 'Flow Management',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/reviews': 'Reviews',
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'

  useEffect(() => {
    refreshProfile().catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[var(--parchment)]">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <TopBar onMenuClick={() => setMobileOpen(true)} title={title} />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="p-4 lg:p-6"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  )
}
