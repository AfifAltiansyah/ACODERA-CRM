import crypto from 'crypto'

export const name = 'midtrans'

export function verify(req, config) {
  const serverKey = config?.server_key
  if (!serverKey) return false

  const body = req.body || {}
  const orderId = body.order_id || ''
  const statusCode = String(body.status_code || '')
  const grossAmount = String(body.gross_amount || '')
  const signature = body.signature_key || ''

  const hash = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex')

  return hash === signature
}

export function parse(req) {
  const body = req.body || {}
  return {
    transactionId: body.order_id || '',
    status: body.transaction_status || '',
    grossAmount: parseFloat(body.gross_amount || 0),
    buyerEmail: body.email || '',
  }
}
