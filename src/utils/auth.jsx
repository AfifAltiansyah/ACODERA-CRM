import apiFetch from '../api/client'
import { supabase } from '../lib/supabase'

export function storeSession(data) {
  localStorage.setItem('crm-auth-token', data.token)
  localStorage.setItem('crm-auth-user', JSON.stringify(data.user))
}

export async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  storeSession(data)
  return data
}

export async function register(email, password, name) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
  storeSession(data)
  return data
}

export async function oauthCallback(email, name) {
  const data = await apiFetch('/auth/oauth', {
    method: 'POST',
    body: JSON.stringify({ email, name, provider: 'oauth' }),
  })
  storeSession(data)
  return data
}

export async function refreshProfile() {
  const token = localStorage.getItem('crm-auth-token')
  if (!token) throw new Error('Not authenticated')
  const data = await apiFetch('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  localStorage.setItem('crm-auth-user', JSON.stringify(data.user))
  return data.user
}

export function logout() {
  localStorage.removeItem('crm-auth-token')
  localStorage.removeItem('crm-auth-user')
}

export function isAuthenticated() {
  const token = localStorage.getItem('crm-auth-token')
  const user = localStorage.getItem('crm-auth-user')
  return !!(token && user)
}

export function getUser() {
  const userStr = localStorage.getItem('crm-auth-user')
  if (!userStr) return null
  try { return JSON.parse(userStr) } catch { return null }
}

export function getToken() {
  return localStorage.getItem('crm-auth-token')
}

export async function sendCode(email, type) {
  return apiFetch('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ email, type }),
  })
}

export async function verifyCode(email, code, type) {
  return apiFetch('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code, type }),
  })
}

export async function resetPassword(email, code, password) {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, password }),
  })
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/login' },
  })
  if (error) throw error
}

export async function signInWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + '/login' },
  })
  if (error) throw error
}
