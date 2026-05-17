import apiFetch from './client'

export async function apiLogin(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function apiLogout() {
  localStorage.removeItem('crm-auth-token')
  localStorage.removeItem('crm-auth-user')
}
