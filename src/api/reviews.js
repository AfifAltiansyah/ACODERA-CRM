import apiFetch from './client'

export async function getReviews() {
  return apiFetch('/reviews')
}

export async function addReview(review) {
  return apiFetch('/reviews', {
    method: 'POST',
    body: JSON.stringify(review),
  })
}

export async function replyToReview(id, replyText) {
  return apiFetch(`/reviews/${id}/reply`, {
    method: 'PUT',
    body: JSON.stringify({ reply: replyText }),
  })
}

export async function deleteReview(id) {
  return apiFetch(`/reviews/${id}`, { method: 'DELETE' })
}
