interface BankOption {
  value: string
  label: string
  accountNumber: string
}

interface EwalletOption {
  value: string
  label: string
  phone: string
}

interface PaymentOptionRow {
  branch_id: string
  type: 'bank' | 'e_wallet' | 'qr_code'
  value: string
  label: string
  account_number: string | null
  phone: string | null
}

const E_WALLET_PHONE = '081934138145'

const DEFAULT_BANKS: BankOption[] = [
  { value: 'bca', label: 'BCA', accountNumber: '81934138145' },
  { value: 'bri', label: 'BRI', accountNumber: '0819341381450' },
  { value: 'bni', label: 'BNI', accountNumber: '0819341381451' },
]

const DEFAULT_EWALLETS: EwalletOption[] = [
  { value: 'dana', label: 'Dana', phone: '081934138145' },
  { value: 'shopeepay', label: 'ShopeePay', phone: '081934138145' },
  { value: 'linkaja', label: 'LinkAja', phone: '081934138145' },
  { value: 'ovo', label: 'OVO', phone: '081934138145' },
]

type BranchCache = {
  banks: BankOption[]
  ewallets: EwalletOption[]
  fetchedAt: number
}

const cache = new Map<string, BranchCache>()
const CACHE_TTL = 300_000

function getBanks(branchId?: string): BankOption[] {
  if (branchId && cache.has(branchId)) return cache.get(branchId)!.banks
  return DEFAULT_BANKS
}

function getEwallets(branchId?: string): EwalletOption[] {
  if (branchId && cache.has(branchId)) return cache.get(branchId)!.ewallets
  return DEFAULT_EWALLETS
}

export function getPaymentDetail(
  method: string,
  detail: string,
  companyName: string,
  branchId?: string
): { label: string; detail: string } | null {
  if (!detail) return null
  if (method === 'qr_code') return { label: 'QR Code', detail: 'Scan QR code to pay' }
  if (method === 'bank_transfer') {
    const bank = getBanks(branchId).find(b => b.value === detail)
    return bank ? { label: `Bank ${bank.label}`, detail: `${bank.accountNumber} - ${companyName}` } : null
  }
  if (method === 'e_wallet') {
    const ew = getEwallets(branchId).find(e => e.value === detail)
    return ew ? { label: ew.label, detail: `${ew.phone} - ${companyName}` } : null
  }
  return null
}

export async function refreshPaymentOptions(branchId?: string): Promise<void> {
  if (branchId) {
    const cached = cache.get(branchId)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !supabaseKey) return

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    let query = supabase
      .from('payment_options')
      .select('branch_id, type, value, label, account_number, phone')
      .eq('is_active', true)
      .order('value')

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    const { data, error } = await query

    if (!error && data) {
      const rows = data as PaymentOptionRow[]

      if (branchId) {
        cache.set(branchId, {
          banks: rows.filter(r => r.type === 'bank').map(r => ({ value: r.value, label: r.label, accountNumber: r.account_number || '' })),
          ewallets: rows.filter(r => r.type === 'e_wallet').map(r => ({ value: r.value, label: r.label, phone: r.phone || E_WALLET_PHONE })),
          fetchedAt: Date.now(),
        })
      } else {
        // Refresh all branches
        const byBranch = new Map<string, PaymentOptionRow[]>()
        for (const row of rows) {
          const list = byBranch.get(row.branch_id) || []
          list.push(row)
          byBranch.set(row.branch_id, list)
        }
        for (const [bid, opts] of byBranch) {
          cache.set(bid, {
            banks: opts.filter(r => r.type === 'bank').map(r => ({ value: r.value, label: r.label, accountNumber: r.account_number || '' })),
            ewallets: opts.filter(r => r.type === 'e_wallet').map(r => ({ value: r.value, label: r.label, phone: r.phone || E_WALLET_PHONE })),
            fetchedAt: Date.now(),
          })
        }
      }
    }
  } catch {
    // Keep defaults on failure
  }

  if (!branchId) {
    // Mark all as fetched so per-branch lookups don't re-query
    for (const [bid, entry] of cache) {
      entry.fetchedAt = Date.now()
    }
  }
}

export { getBanks, getEwallets, E_WALLET_PHONE }
