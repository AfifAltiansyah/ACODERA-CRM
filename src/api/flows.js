import apiFetch from './client'

export async function getFlows() {
  return apiFetch('/flows')
}

export async function addFlow(flow) {
  return apiFetch('/flows', {
    method: 'POST',
    body: JSON.stringify(flow),
  })
}

export async function moveFlow(id, stage) {
  return apiFetch(`/flows/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ stage }),
  })
}

export async function deleteFlow(id) {
  return apiFetch(`/flows/${id}`, { method: 'DELETE' })
}
