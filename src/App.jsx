import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/dashboard/DashboardLayout'
import { LoginPage } from './pages/LoginPage'
import { supabase } from './lib/supabase'
import { storeSession } from './utils/auth'
import { DashboardHome } from './pages/DashboardHome'
import { AddContactPage } from './pages/AddContact'
import { AddAutomationPage } from './pages/AddAutomation'
import { AddFlowPage } from './pages/AddFlow'
import { AddInvoicePage } from './pages/AddInvoice'
import { AddTicketPage } from './pages/AddTicket'
import { ContactsPage } from './pages/Contacts'
import { AutomationPage } from './pages/Automation'
import { AutomationDetailPage } from './pages/AutomationDetail'
import { FlowManagementPage } from './pages/FlowManagement'
import { AnalyticsPage } from './pages/Analytics'
import { ReviewsPage } from './pages/Reviews'
import { InvoicingPage } from './pages/Invoicing'
import { InvoiceDetailPage } from './pages/InvoiceDetail'
import { InvoiceTemplatePage } from './pages/InvoiceTemplate'
import { TicketsPage } from './pages/Tickets'
import { TrashPage } from './pages/Trash'
import { TicketDetailPage } from './pages/TicketDetail'
import { UserManagementPage } from './pages/admin/UserManagement'
import { ApiKeysPage } from './pages/admin/ApiKeys'
import { GatewaySettingsPage } from './pages/admin/GatewaySettings'
import { AuditLogsPage } from './pages/admin/AuditLogs'
import { PaymentOptionsPage } from './pages/admin/PaymentOptions'
import { TransactionsPage } from './pages/admin/Transactions'
import { CheckInPage } from './pages/admin/CheckIn'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

function OAuthHandler() {
  const location = useLocation()

  useEffect(() => {
    let cancelled = false

    const processSession = async (session) => {
      if (cancelled || !session?.user?.email) return

      const userMeta = session.user.user_metadata || {}
      const displayName = userMeta.full_name || userMeta.name || session.user.email.split('@')[0]

      try {
        const res = await fetch(`${API_BASE}/auth/oauth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.user.email, name: displayName }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'OAuth login failed')

        storeSession(data)
        await supabase.auth.signOut()

        if (!cancelled) window.location.href = '/dashboard'
      } catch (err) {
        console.error('OAuth error:', err)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) processSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
        processSession(session)
      }
    })

    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
  }, [])

  // Only process OAuth on the login page
  return location.pathname === '/login' ? null : null
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <OAuthHandler />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="contacts/new" element={<AddContactPage />} />
              <Route path="automation" element={<AutomationPage />} />
              <Route path="automation/new" element={<AddAutomationPage />} />
              <Route path="automation/:id" element={<AutomationDetailPage />} />
              <Route path="flow" element={<FlowManagementPage />} />
              <Route path="flow/new" element={<AddFlowPage />} />
              <Route path="invoicing" element={<InvoicingPage />} />
              <Route path="invoicing/new" element={<AddInvoicePage />} />
              <Route path="invoicing/template" element={<InvoiceTemplatePage />} />
              <Route path="invoicing/:id" element={<InvoiceDetailPage />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="tickets/new" element={<AddTicketPage />} />
              <Route path="tickets/:id" element={<TicketDetailPage />} />
              <Route path="trash" element={<TrashPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="admin/users" element={<UserManagementPage />} />
              <Route path="admin/api-keys" element={<ApiKeysPage />} />
              <Route path="admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="admin/gateway" element={<GatewaySettingsPage />} />
              <Route path="admin/payment-options" element={<PaymentOptionsPage />} />
              <Route path="admin/transactions" element={<TransactionsPage />} />
              <Route path="admin/checkin" element={<CheckInPage />} />
              <Route path="api-keys" element={<ApiKeysPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
