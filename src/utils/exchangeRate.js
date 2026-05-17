// ─── Exchange Rate Service ────────────────────────────────────────
// Fetches live rates from a free CDN-hosted currency API
// (cdn.jsdelivr.net — CORS-friendly, no API key required).
// Caches aggressively to avoid hitting rate limits.

const CACHE_KEY = 'crm_exchange_rates'
const CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

function loadCached(base) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (obj.base !== base || Date.now() - obj.fetchedAt > CACHE_TTL_MS) return null
    return obj.rates
  } catch {
    return null
  }
}

function saveCached(base, rates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ base, rates, fetchedAt: Date.now() }))
  } catch {
    // ignore storage errors
  }
}

// Fetch rates from a base currency (e.g. USD) to all supported currencies
export async function fetchExchangeRates(base = 'USD') {
  const cached = loadCached(base)
  if (cached) return cached

  const baseLower = base.toLowerCase()
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseLower}.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/${baseLower}.json`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      const rawRates = data[baseLower]
      if (!rawRates) continue
      // Convert lowercase keys to uppercase
      const rates = { [base]: 1 }
      for (const [key, val] of Object.entries(rawRates)) {
        rates[key.toUpperCase()] = val
      }
      saveCached(base, rates)
      return rates
    } catch {
      continue // try next URL
    }
  }

  console.error('Failed to fetch exchange rates from all sources')
  return { [base]: 1 }
}

// Convert an amount from the base currency to the target currency
export function convertAmount(amount, rates, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount
  if (!rates) return amount

  const rateFrom = rates[fromCurrency]
  const rateTo = rates[toCurrency]
  if (!rateFrom || !rateTo) return amount

  return (amount / rateFrom) * rateTo
}