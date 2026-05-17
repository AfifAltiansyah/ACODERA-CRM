import apiFetch from './client'

export async function getAutomations() {
  return apiFetch('/automations')
}

export async function addAutomation(automation) {
  return apiFetch('/automations', {
    method: 'POST',
    body: JSON.stringify(automation),
  })
}

export async function toggleAutomation(id) {
  return apiFetch(`/automations/${id}/toggle`, { method: 'PUT' })
}

export async function deleteAutomation(id) {
  return apiFetch(`/automations/${id}`, { method: 'DELETE' })
}
