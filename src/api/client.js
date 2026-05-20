const API_BASE = import.meta.env.VITE_API_URL || '/api'

let onUnauthorized = () => {
  window.location.href = '/login'
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' })

  if (res.status === 401) {
    localStorage.removeItem('crm-auth-user')
    onUnauthorized()
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export default apiFetch
