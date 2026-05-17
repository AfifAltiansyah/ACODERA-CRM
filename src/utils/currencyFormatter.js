import { useCurrency } from '../hooks/useCurrency.jsx'

export function getCurrencySymbol(currencyCode) {
  const entry = [
    { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
    { code: 'JPY', symbol: '¥' }, { code: 'CNY', symbol: '¥' }, { code: 'AUD', symbol: 'A$' },
    { code: 'CAD', symbol: 'C$' }, { code: 'CHF', symbol: 'Fr' }, { code: 'INR', symbol: '₹' },
    { code: 'SGD', symbol: 'S$' }, { code: 'HKD', symbol: 'HK$' }, { code: 'KRW', symbol: '₩' },
    { code: 'MXN', symbol: 'Mex$' }, { code: 'BRL', symbol: 'R$' }, { code: 'IDR', symbol: 'Rp' },
    { code: 'MYR', symbol: 'RM' }, { code: 'PHP', symbol: '₱' }, { code: 'THB', symbol: '฿' },
    { code: 'VND', symbol: '₫' }, { code: 'DKK', symbol: 'kr' }, { code: 'NOK', symbol: 'kr' },
    { code: 'SEK', symbol: 'kr' }, { code: 'PLN', symbol: 'zł' }, { code: 'CZK', symbol: 'Kč' },
    { code: 'HUF', symbol: 'Ft' }, { code: 'ILS', symbol: '₪' }, { code: 'CLP', symbol: 'CLP$' },
    { code: 'COP', symbol: 'COL$' }, { code: 'PEN', symbol: 'S/' }, { code: 'ZAR', symbol: 'R' },
    { code: 'NGN', symbol: '₦' }, { code: 'EGP', symbol: 'E£' }, { code: 'SAR', symbol: 'ر.س' },
    { code: 'AED', symbol: 'د.إ' }, { code: 'QAR', symbol: 'ر.ق' }, { code: 'KWD', symbol: 'د.ك' },
    { code: 'TRY', symbol: '₺' }, { code: 'RUB', symbol: '₽' }, { code: 'BHD', symbol: '.د.ب' },
    { code: 'OMR', symbol: 'ر.ع.' }, { code: 'JOD', symbol: 'د.ا' }, { code: 'LBP', symbol: 'ل.ل' },
    { code: 'PKR', symbol: '₨' }, { code: 'BDT', symbol: '৳' }, { code: 'UAH', symbol: '₴' },
    { code: 'RON', symbol: 'lei' }, { code: 'BGN', symbol: 'лв' }, { code: 'HRK', symbol: 'kn' },
    { code: 'ISK', symbol: 'kr' }, { code: 'NZD', symbol: 'NZ$' },
  ].find(c => c.code === currencyCode)
  return entry ? entry.symbol : '$'
}

const LOCALE_MAP = {
  USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP', CNY: 'zh-CN',
  AUD: 'en-AU', CAD: 'en-CA', CHF: 'fr-CH', INR: 'en-IN', SGD: 'en-SG',
  HKD: 'en-HK', KRW: 'ko-KR', MXN: 'es-MX', BRL: 'pt-BR', IDR: 'id-ID',
  MYR: 'ms-MY', PHP: 'fil-PH', THB: 'th-TH', VND: 'vi-VN', DKK: 'da-DK',
  NOK: 'no-NO', SEK: 'sv-SE', PLN: 'pl-PL', CZK: 'cs-CZ', HUF: 'hu-HU',
  ILS: 'he-IL', CLP: 'es-CL', COP: 'es-CO', PEN: 'es-PE', ZAR: 'en-ZA',
  NGN: 'en-NG', EGP: 'ar-EG', SAR: 'ar-SA', AED: 'ar-AE', QAR: 'ar-QA',
  KWD: 'ar-KW', TRY: 'tr-TR', RUB: 'ru-RU', BHD: 'ar-BH', OMR: 'ar-OM',
  JOD: 'ar-JO', LBP: 'ar-LB', PKR: 'ur-PK', BDT: 'bn-BD', UAH: 'uk-UA',
  RON: 'ro-RO', BGN: 'bg-BG', HRK: 'hr-HK', ISK: 'is-IS', NZD: 'en-NZ',
}

export function formatCurrency(value, currencyCode) {
  if (currencyCode === undefined || currencyCode === null) return String(value)
  const sym = getCurrencySymbol(currencyCode)
  const locale = LOCALE_MAP[currencyCode] || 'en-US'
  try {
    return `${sym} ${Number(value).toLocaleString(locale)}`
  } catch {
    return `${sym} ${Number(value).toLocaleString()}`
  }
}

export function useCurrencyFormatter() {
  const { currency, convert, rates } = useCurrency()
  return {
    currency,
    rates,
    convert,
    formatCurrency: (value, toCurrency) =>
      formatCurrency(value, toCurrency || currency),
  }
}
