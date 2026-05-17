const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('crm-auth-token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('crm-auth-token')
    localStorage.removeItem('crm-auth-user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export default apiFetch
