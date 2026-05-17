import apiFetch from './client'

export async function getContacts() {
  return apiFetch('/contacts')
}

export async function addContact(contact) {
  return apiFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify(contact),
  })
}

export async function updateContact(id, updates) {
  return apiFetch(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function deleteContact(id) {
  return apiFetch(`/contacts/${id}`, { method: 'DELETE' })
}
