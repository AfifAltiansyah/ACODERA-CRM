import { createContext, useContext, useState, useEffect } from 'react'
import { fetchExchangeRates } from '../utils/exchangeRate'

const CURRENCY_KEY = 'crm-currency'

const defaultCurrency = 'IDR'

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', flag: '🇭🇺' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', flag: '🇮🇱' },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', flag: '🇨🇱' },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', flag: '🇵🇪' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺' },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial', flag: '🇴🇲' },
  { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar', flag: '🇯🇴' },
  { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound', flag: '🇱🇧' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', flag: '🇺🇦' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', flag: '🇷🇴' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', flag: '🇧🇬' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', flag: '🇭🇷' },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona', flag: '🇮🇸' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿' },
]

const CurrencyContext = createContext()

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(CURRENCY_KEY)
      if (stored && CURRENCIES.find(c => c.code === stored)) return stored
    }
    return defaultCurrency
  })

  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [baseCurrency, setBaseCurrency] = useState('USD')

  useEffect(() => {
    let active = true
    async function loadRates() {
      try {
        const fetchedRates = await fetchExchangeRates(baseCurrency)
        if (active) {
          setRates(fetchedRates)
          setLoading(false)
        }
      } catch {
        if (active) {
          setRates({ [baseCurrency]: 1 })
          setLoading(false)
        }
      }
    }
    loadRates()
    return () => { active = false }
  }, [baseCurrency])

  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, currency)
  }, [currency])

  const updateCurrency = (code) => {
    if (code === baseCurrency) {
      setCurrency(code)
      return
    }
    setBaseCurrency('USD')
    setCurrency(code)
  }

  const convert = (amount, toCurrency = currency) => {
    if (!rates) return amount
    try {
      const rateFrom = rates[baseCurrency] || 1
      const rateTo = rates[toCurrency]
      if (!rateTo) return amount
      return (amount / rateFrom) * rateTo
    } catch {
      return amount
    }
  }

  return (
    <CurrencyContext.Provider value={{
      currency,
      updateCurrency,
      rates,
      loading,
      baseCurrency,
      convert,
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider')
  return context
}