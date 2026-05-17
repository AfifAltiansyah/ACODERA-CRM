import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CurrencyProvider } from './hooks/useCurrency.jsx'
import { NotificationProvider } from './hooks/useNotifications'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CurrencyProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </CurrencyProvider>
  </StrictMode>,
)
