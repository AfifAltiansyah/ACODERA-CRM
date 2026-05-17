import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './hooks/useAuth'
import { CurrencyProvider } from './hooks/useCurrency.jsx'
import { NotificationProvider } from './hooks/useNotifications'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <CurrencyProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </CurrencyProvider>
    </AuthProvider>
  </StrictMode>,
)
