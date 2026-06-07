import { supabase } from '../lib/supabase'
import { getUser } from '../utils/auth'

function currentBranchId() {
  const user = getUser()
  if (!user) return null
  return user.branch_id
}

function addBranch(data) {
  const id = currentBranchId()
  if (!id) return data
  return { ...data, branch: id }
}

function filterBranch(q) {
  const id = currentBranchId()
  if (!id) return q
  return q.eq('branch', id)
}

function formatContact(c) {
  return {
    id: String(c.id),
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    message: c.message,
    profesi: c.profesi,
    createdAt: c.created_at ? c.created_at.split('T')[0] : '',
  }
}

function formatAutomation(a, sentCount) {
  return {
    id: String(a.id),
    name: a.name,
    type: a.type,
    trigger: a.trigger_event,
    scheduleType: a.schedule_type || 'once',
    scheduleFrequency: a.schedule_frequency || 'monthly',
    scheduledAt: a.scheduled_at || '',
    nextRunAt: a.next_run_at || '',
    lastRunAt: a.last_run_at || '',
    status: a.status,
    contacts: sentCount ?? a.contacts_count,
    subject: a.subject || '',
    body: a.body || '',
    fromName: a.from_name || 'Acodera CRM',
  }
}

function formatFlow(f) {
  return {
    id: String(f.id),
    name: f.name,
    email: f.email,
    value: Number(f.value),
    stage: f.stage,
    date: f.created_at ? f.created_at.split('T')[0] : '',
  }
}

function formatReview(r) {
  return {
    id: String(r.id),
    name: r.name,
    rating: r.rating,
    text: r.text,
    reply: r.reply,
    date: r.created_at ? r.created_at.split('T')[0] : '',
  }
}

// ─── Contacts ──────────────────────────────────────────────

export async function getContacts() {
  const { data, error } = await filterBranch(
    supabase.from('contacts').select('*').order('created_at', { ascending: false })
  )

  if (error) {
    console.error('getContacts error:', error)
    return []
  }

  return data.map(formatContact)
}

export async function addContact(contact) {
  const { data, error } = await supabase
    .from('contacts')
    .insert([addBranch({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      address: contact.address || '',
      profesi: contact.profesi || '',
      message: contact.message || '',
    })])
    .select()
    .single()

  if (error) throw error
  triggerAutomationEvent('contact.created', {
    contact_email: contact.email,
    contact_name: contact.name,
    data: { email: contact.email, name: contact.name, phone: contact.phone },
  })
  insertNotification({
    type: 'contact', title: 'New contact created',
    message: `${contact.name} — ${contact.email}`,
    link: '/dashboard/contacts',
  })
  return formatContact(data)
}

export async function updateContact(id, updates) {
  const { data, error } = await filterBranch(
    supabase.from('contacts').update({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      address: updates.address,
      profesi: updates.profesi,
      message: updates.message,
    }).eq('id', Number(id))
  ).select().single()

  if (error) throw error
  return formatContact(data)
}

export async function deleteContact(id) {
  const { data, error } = await filterBranch(
    supabase.from('contacts').delete().eq('id', Number(id))
  ).select()

  if (error) {
    console.error('deleteContact error:', error)
    throw error
  }
  return data
}

// ─── Automations ───────────────────────────────────────────

export async function getAutomations() {
  const { data, error } = await filterBranch(
    supabase.from('automations').select('*').order('created_at', { ascending: false })
  )

  if (error) {
    console.error('getAutomations error:', error)
    return []
  }

  const ids = data.map(a => a.id)
  let logCounts = {}
  if (ids.length > 0) {
    const { data: logs } = await supabase
      .from('automation_logs')
      .select('automation_id, contact_email')
      .in('automation_id', ids)
    if (logs) {
      for (const log of logs) {
        if (!logCounts[log.automation_id]) logCounts[log.automation_id] = new Set()
        if (log.contact_email) logCounts[log.automation_id].add(log.contact_email)
      }
    }
  }

  return data.map(a => formatAutomation(a, logCounts[a.id]?.size || 0))
}

export async function toggleAutomation(id) {
  const { data: current, error: fetchError } = await filterBranch(
    supabase.from('automations').select('status').eq('id', Number(id))
  ).single()

  if (fetchError) throw fetchError

  const newStatus = current.status === 'active' ? 'paused' : 'active'

  const { data, error } = await filterBranch(
    supabase.from('automations').update({ status: newStatus }).eq('id', Number(id))
  ).select().single()

  if (error) throw error
  return formatAutomation(data)
}

function toUtcIso(localDatetime) {
  if (!localDatetime) return null
  const d = new Date(localDatetime)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export async function addAutomation(automation) {
  const isImmediate = automation.scheduleType === 'immediate'
  const scheduledAtUtc = isImmediate ? null : toUtcIso(automation.scheduledAt)
  const { data, error } = await supabase
    .from('automations')
    .insert([addBranch({
      name: automation.name,
      type: automation.type,
      trigger_event: automation.trigger || '',
      schedule_type: automation.scheduleType || 'once',
      schedule_frequency: automation.scheduleFrequency || 'monthly',
      scheduled_at: scheduledAtUtc,
      next_run_at: scheduledAtUtc,
      status: 'active',
      contacts_count: 0,
      subject: automation.subject || '',
      body: automation.body || '',
      from_name: automation.fromName || 'Acodera CRM',
    })])
    .select()
    .single()

  if (error) throw error
  return formatAutomation(data)
}

export async function deleteAutomation(id) {
  const { data, error } = await filterBranch(
    supabase.from('automations').delete().eq('id', Number(id))
  ).select()

  if (error) {
    console.error('deleteAutomation error:', error)
    throw error
  }
  return data
}

// ─── Flows ─────────────────────────────────────────────────

export async function getFlows() {
  const { data, error } = await filterBranch(
    supabase.from('flows').select('*').order('created_at', { ascending: false })
  )

  if (error) {
    console.error('getFlows error:', error)
    return []
  }

  return data.map(formatFlow)
}

export async function addFlow(flow) {
  const { data, error } = await supabase
    .from('flows')
    .insert([addBranch({
      name: flow.name,
      email: flow.email || '',
      value: flow.value || 0,
      stage: flow.stage || 'new',
    })])
    .select()
    .single()

  if (error) throw error
  triggerAutomationEvent('deal.created', {
    contact_name: flow.name,
    contact_email: flow.email,
    data: { name: flow.name, email: flow.email, value: flow.value, stage: flow.stage || 'new' },
  })
  insertNotification({
    type: 'lead', title: 'New deal created',
    message: `${flow.name} — Rp${(Number(flow.value) || 0).toLocaleString()}`,
  })
  return formatFlow(data)
}

export async function moveFlow(id, stage) {
  const { data: current } = await filterBranch(
    supabase.from('flows').select('*').eq('id', Number(id))
  ).single()

  const { data, error } = await filterBranch(
    supabase.from('flows').update({ stage }).eq('id', Number(id))
  ).select().single()

  if (error) throw error
  triggerAutomationEvent('deal.stage_change', {
    contact_name: data?.name || current?.name,
    contact_email: data?.email || current?.email,
    data: { name: data?.name, email: data?.email, old_stage: current?.stage, new_stage: stage },
  })
  insertNotification({
    type: 'lead', title: 'Deal stage changed',
    message: `${data?.name || current?.name} → ${stage}`,
  })
  if (stage === 'closed') {
    triggerAutomationEvent('deal.won', {
      contact_name: data?.name,
      contact_email: data?.email,
      data: { name: data?.name, email: data?.email },
    })
    insertNotification({
      type: 'lead', title: 'Deal won',
      message: `${data?.name} — closed`,
    })
  }
  return formatFlow(data)
}

export async function deleteFlow(id) {
  const { data, error } = await filterBranch(
    supabase.from('flows').delete().eq('id', Number(id))
  ).select()

  if (error) {
    console.error('deleteFlow error:', error)
    throw error
  }
  return data
}

// ─── Reviews ───────────────────────────────────────────────

export async function getReviews() {
  const { data, error } = await filterBranch(
    supabase.from('reviews').select('*').order('created_at', { ascending: false })
  )

  if (error) {
    console.error('getReviews error:', error)
    return []
  }

  return data.map(formatReview)
}

export async function addReview(review) {
  const { data, error } = await supabase
    .from('reviews')
    .insert([addBranch({
      name: review.name,
      rating: review.rating,
      text: review.text || '',
      reply: '',
    })])
    .select()
    .single()

  if (error) throw error
  triggerAutomationEvent('review.submitted', {
    contact_name: review.name,
    data: { name: review.name, rating: review.rating, text: review.text },
  })
  insertNotification({
    type: 'review', title: 'New review submitted',
    message: `${review.name} — ${'★'.repeat(Number(review.rating))} ${review.rating}`,
    link: '/dashboard/reviews',
  })
  return formatReview(data)
}

export async function replyToReview(id, replyText) {
  const { data, error } = await filterBranch(
    supabase.from('reviews').update({ reply: replyText }).eq('id', Number(id))
  ).select().single()

  if (error) throw error
  return formatReview(data)
}

export async function deleteReview(id) {
  const { data, error } = await filterBranch(
    supabase.from('reviews').delete().eq('id', Number(id))
  ).select()

  if (error) {
    console.error('deleteReview error:', error)
    throw error
  }
  return data
}

// ─── Analytics helpers ─────────────────────────────────────

export function getAnalyticsData() {
  return {
    revenue: [
      { month: 'Jan', value: 42000 }, { month: 'Feb', value: 48000 },
      { month: 'Mar', value: 55000 }, { month: 'Apr', value: 61000 },
      { month: 'May', value: 72000 }, { month: 'Jun', value: 68000 },
      { month: 'Jul', value: 79000 }, { month: 'Aug', value: 85000 },
      { month: 'Sep', value: 91000 }, { month: 'Oct', value: 88000 },
      { month: 'Nov', value: 95000 }, { month: 'Dec', value: 102000 },
    ],
    leadsBySource: [
      { source: 'Organic', count: 342 }, { source: 'Referral', count: 256 },
      { source: 'Paid Ads', count: 189 }, { source: 'Social', count: 145 },
      { source: 'Email', count: 98 },
    ],
    dealStages: [
      { name: 'New Lead', value: 120 }, { name: 'Contacted', value: 85 },
      { name: 'Qualified', value: 65 }, { name: 'Proposal', value: 42 },
      { name: 'Closed', value: 30 },
    ],
    conversionRate: [
      { month: 'Jan', rate: 12 }, { month: 'Feb', rate: 15 },
      { month: 'Mar', rate: 18 }, { month: 'Apr', rate: 22 },
      { month: 'May', rate: 25 }, { month: 'Jun', rate: 23 },
      { month: 'Jul', rate: 28 }, { month: 'Aug', rate: 31 },
      { month: 'Sep', rate: 34 }, { month: 'Oct', rate: 32 },
      { month: 'Nov', rate: 36 }, { month: 'Dec', rate: 39 },
    ],
  }
}

// ─── Tickets ───────────────────────────────────────────────

function formatTicket(t) {
  const dt = t.date_time ? new Date(t.date_time) : null
  return {
    id: String(t.id),
    abbreviation: t.abbreviation,
    title: t.title,
    description: t.description || '',
    price: t.price,
    quantity: t.quantity,
    soldCount: t.sold_count || 0,
    location: t.location || '',
    imageUrl: t.image_url || '',
    dateTime: dt ? dt.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'Asia/Jakarta',
    }) : '',
  }
}

export async function getTickets() {
  const { data, error } = await filterBranch(
    supabase.from('tickets').select(`*, instances:transactions(status)`).order('date_time', { ascending: true })
  )

  if (error) {
    console.error('getTickets error:', error)
    return []
  }

  return data.map(t => {
    const soldCount = (t.instances || []).filter(i => i.status !== 'available').length
    return {
      ...formatTicket(t),
      soldCount,
    }
  })
}

export async function addTicket(ticket) {
  const { data, error } = await supabase
    .from('tickets')
    .insert([addBranch({
      abbreviation: ticket.abbreviation,
      title: ticket.title,
      description: ticket.description || '',
      price: Number(ticket.price),
      quantity: Number(ticket.quantity) || 1,
      location: ticket.location || '',
      date_time: ticket.dateTime || null,
      image_url: ticket.imageUrl || null,
    })])
    .select()
    .single()

  if (error) throw error

  const ticketId = data.id
  const branchId = currentBranchId()
  const branchTag = branchId ? `${branchId.slice(-6)}` : '000000'
  const rows = []
  for (let i = 1; i <= data.quantity; i++) {
    const serial = String(i).padStart(5, '0')
    const uniqueCode = `${data.abbreviation}${data.date_time ? data.date_time.slice(0, 10).replace(/-/g, '') : '00000000'}${branchTag}${serial}`
    const barcode = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('')
    rows.push({
      ticket_id: ticketId,
      transaction_id: `TKT-AVAIL-${uniqueCode}`,
      unique_code: uniqueCode,
      barcode,
      quantity: 1,
      price_per_unit: Number(data.price),
      total_amount: Number(data.price),
      status: 'available',
      branch: branchId || undefined,
    })
  }

  if (rows.length > 0) {
    const { error: instError } = await supabase.from('transactions').insert(rows)
    if (instError) throw instError
  }

  return formatTicket(data)
}

export async function deleteTicket(id) {
  const { data, error } = await filterBranch(
    supabase.from('tickets').delete().eq('id', Number(id))
  ).select()

  if (error) {
    console.error('deleteTicket error:', error)
    throw error
  }
  return data
}

// ─── Transactions (combined invoices + ticket instances) ────

function formatTransaction(row) {
  const dt = row.purchased_at ? new Date(row.purchased_at) : row.created_at ? new Date(row.created_at) : new Date()
  return {
    id: String(row.id),
    transactionId: row.transaction_id || '',
    dateTime: dt.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }),
    itemCode: row.unique_code,
    quantity: row.quantity,
    pricePerUnit: Number(row.price_per_unit),
    totalAmount: Number(row.total_amount),
    customerName: row.buyer_name || '',
    customerEmail: row.buyer_email || '',
    customerPhone: row.buyer_phone || '',
    paymentMethod: row.payment_method || '',
    paymentDetail: row.payment_detail || '',
    status: row.status,
    expiresAt: row.expires_at || '',
    isTicketInvoice: !!row.ticket_id,
    uniqueCodes: [row.unique_code],
    ticketId: row.ticket_id ? String(row.ticket_id) : '',
    uniqueCode: row.unique_code,
    barcode: row.barcode || '',
    buyerName: row.buyer_name || '',
    buyerEmail: row.buyer_email || '',
    buyerPhone: row.buyer_phone || '',
    purchasedAt: row.purchased_at || '',
  }
}

function groupInvoices(data) {
  const grouped = {}
  for (const row of data) {
    const key = row.transaction_id
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(row)
  }

  return Object.values(grouped).map(rows => {
    const first = rows[0]
    const dt = first.purchased_at ? new Date(first.purchased_at) : new Date(first.created_at)
    const ticketTitle = first.ticket_title || ''
    const allCodes = rows.flatMap(r => Array(Number(r.quantity) || 1).fill(r.unique_code))
    return {
      id: first.transaction_id,
      transactionId: first.transaction_id,
      dateTime: dt.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }),
      itemCode: allCodes.join(', '),
      itemName: ticketTitle,
      quantity: rows.reduce((sum, r) => sum + (Number(r.quantity) || 1), 0),
      pricePerUnit: Number(first.price_per_unit),
      totalAmount: rows.reduce((sum, r) => sum + Number(r.total_amount), 0),
      customerName: first.buyer_name || '',
      customerEmail: first.buyer_email || '',
      customerPhone: first.buyer_phone || '',
      paymentMethod: first.payment_method || '',
      paymentDetail: first.payment_detail || '',
      status: first.status,
      expiresAt: first.expires_at || '',
      isTicketInvoice: !!first.ticket_id,
      uniqueCodes: allCodes,
      ticketId: first.ticket_id ? String(first.ticket_id) : '',
    }
  })
}

export async function getInvoices() {
  const { data, error } = await filterBranch(
    supabase.from('transactions').select('*').neq('status', 'available').order('purchased_at', { ascending: false })
  )

  if (error) {
    console.error('getInvoices error:', error)
    return []
  }

  const rows = data || []
  const ticketIds = [...new Set(rows.map(t => t.ticket_id).filter(Boolean))]
  let ticketMap = {}
  if (ticketIds.length > 0) {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, title')
      .in('id', ticketIds)
    if (tickets) tickets.forEach(t => { ticketMap[String(t.id)] = t.title })
  }

  return groupInvoices(rows.map(t => ({ ...t, ticket_title: ticketMap[String(t.ticket_id)] || '' })))
}

export async function getInvoiceByTransactionId(transactionId) {
  const { data, error } = await filterBranch(
    supabase.from('transactions').select('*').eq('transaction_id', transactionId)
  )

  if (error) {
    console.error('getInvoiceByTransactionId error:', error)
    return null
  }

  if (!data || data.length === 0) return null

  const rows = data
  const ticketIds = [...new Set(rows.map(t => t.ticket_id).filter(Boolean))]
  let ticketMap = {}
  if (ticketIds.length > 0) {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, title')
      .in('id', ticketIds)
    if (tickets) tickets.forEach(t => { ticketMap[String(t.id)] = t.title })
  }

  const grouped = groupInvoices(rows.map(t => ({ ...t, ticket_title: ticketMap[String(t.ticket_id)] || '' })))
  return grouped[0] || null
}

export async function getPendingInvoices() {
  const { data: txData, error: txError } = await filterBranch(
    supabase.from('transactions').select('*').eq('status', 'pending').order('purchased_at', { ascending: false })
  )

  if (txError) {
    console.error('getPendingInvoices error:', txError)
    return []
  }

  const ticketIds = [...new Set(txData.map(t => t.ticket_id).filter(Boolean))]
  let ticketMap = {}
  if (ticketIds.length > 0) {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, title')
      .in('id', ticketIds)
    if (tickets) {
      tickets.forEach(t => { ticketMap[t.id] = t.title })
    }
  }

  return groupInvoices(txData.map(t => ({ ...t, ticket_title: ticketMap[t.ticket_id] || '' })))
}

export async function getExpiredInvoices() {
  const { data, error } = await filterBranch(
    supabase
      .from('transactions')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
  )

  if (error) {
    console.error('getExpiredInvoices error:', error)
    return []
  }

  return (data || []).map(tx => ({
    id: tx.id,
    transactionId: tx.transaction_id || '',
    amount: Number(tx.total_amount) || 0,
    buyer: tx.buyer_name || '',
    email: tx.buyer_email || '',
    expiredAt: tx.expires_at || '',
  }))
}

export async function getTicketInvoices() {
  return getInvoices()
}

export async function getAvailableTickets() {
  const { data, error } = await filterBranch(
    supabase.from('tickets').select('*').order('date_time', { ascending: true })
  )

  if (error) {
    console.error('getAvailableTickets error:', error)
    return []
  }

  const ids = data.map(t => t.id)
  const availMap = {}
  if (ids.length > 0) {
    const { data: txns, error: txError } = await supabase
      .from('transactions')
      .select('ticket_id')
      .in('ticket_id', ids)
      .eq('status', 'available')

    if (txError) {
      console.error('getAvailableTickets txns error:', txError)
      return data.map(t => ({
        id: String(t.id),
        title: t.title,
        abbreviation: t.abbreviation,
        prefix: `${t.abbreviation}${(t.date_time ? new Date(t.date_time).toISOString().slice(0, 10).replace(/-/g, '') : '00000000')}`,
        price: Number(t.price),
        availableCount: 0,
      }))
    }

    if (txns) {
      for (const t of txns) {
        availMap[t.ticket_id] = (availMap[t.ticket_id] || 0) + 1
      }
    }
  }

  return data.map(t => {
    const availableCount = availMap[t.id] || 0
    const dt = t.date_time ? new Date(t.date_time) : null
    const dateStr = dt ? dt.toISOString().slice(0, 10).replace(/-/g, '') : '00000000'
    return {
      id: String(t.id),
      title: t.title,
      abbreviation: t.abbreviation,
      prefix: `${t.abbreviation}${dateStr}`,
      price: Number(t.price),
      availableCount,
    }
  })
}

export async function getAvailableTicketInstances() {
  return getAvailableTickets()
}

export async function getTicketInstances(ticketId) {
  const { data, error } = await filterBranch(
    supabase.from('transactions').select('*').eq('ticket_id', Number(ticketId)).order('unique_code', { ascending: true })
  )

  if (error) {
    console.error('getTicketInstances error:', error)
    return []
  }

  return data.map(formatTransaction)
}

export async function addInvoice(invoice) {
  if (invoice.ticketId) {
    const qty = Number(invoice.quantity) || 1
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const transactionId = `TKT-${dateStr}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`

    const { data: available, error: fetchError } = await filterBranch(
      supabase
        .from('transactions').select('id, unique_code').eq('ticket_id', Number(invoice.ticketId)).eq('status', 'available').order('unique_code', { ascending: true }).limit(qty)
    )

    if (fetchError) throw fetchError
    if (!available || available.length < qty) throw new Error('Not enough available tickets')

    const branchId = currentBranchId()
    for (const inst of available) {
      const updateData = {
        transaction_id: transactionId,
        status: invoice.status || 'pending',
        payment_method: invoice.paymentMethod || '',
        payment_detail: invoice.paymentDetail || '',
        buyer_name: invoice.customerName || '',
        buyer_email: invoice.customerEmail || '',
        buyer_phone: invoice.customerPhone || '',
        price_per_unit: Number(invoice.pricePerUnit),
        total_amount: Number(invoice.pricePerUnit),
        purchased_at: now.toISOString(),
        expires_at: (invoice.status || 'pending') === 'pending'
          ? new Date(Date.now() + (Number(invoice.expiresIn) || 24) * (invoice.expiresUnit === 'minutes' ? 60000 : 3600000)).toISOString()
          : null,
      }
      if (branchId) updateData.branch = branchId
      const { error: updateError } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', inst.id)
      if (updateError) throw updateError
    }

    const invoiceForPdf = {
      transactionId,
      totalAmount: Number(invoice.pricePerUnit) * qty,
      customerName: invoice.customerName || '',
      customerEmail: invoice.customerEmail || '',
      customerPhone: invoice.customerPhone || '',
      pricePerUnit: Number(invoice.pricePerUnit),
      quantity: qty,
      itemCode: `TKT-${transactionId}`,
      itemName: invoice.itemName || '',
      dateTime: now.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
      status: invoice.status || 'pending',
      paymentMethod: invoice.paymentMethod || '',
      paymentDetail: invoice.paymentDetail || '',
    }

    triggerAutomationEvent('ticket.purchased', {
      contact_email: invoice.customerEmail,
      contact_name: invoice.customerName,
      data: { ticket_id: invoice.ticketId, quantity: qty, buyer_email: invoice.customerEmail, buyer_name: invoice.customerName },
    })
    insertNotification({
      type: 'ticket', title: 'Ticket purchased',
      message: `${invoice.customerName || 'Buyer'} — ${qty} ticket(s)`,
      entityId: transactionId,
      link: `/dashboard/invoicing/${transactionId}`,
    })
    if ((invoice.status || 'pending') === 'paid') {
      triggerAutomationEvent('invoice.paid', {
        contact_email: invoice.customerEmail,
        contact_name: invoice.customerName,
        data: {
          invoice_id: transactionId,
          amount: Number(invoice.pricePerUnit) * qty,
          buyer_email: invoice.customerEmail,
          buyer_name: invoice.customerName,
          buyer_phone: invoice.customerPhone || '',
          itemName: invoice.itemName || '',
          quantity: String(qty),
          pricePerUnit: String(Number(invoice.pricePerUnit)),
          totalAmount: String(Number(invoice.pricePerUnit) * qty),
          paymentMethod: invoice.paymentMethod || '',
          paymentDetail: invoice.paymentDetail || '',
          transaction_id: transactionId,
          status: 'paid',
          purchased_at: now.toISOString(),
          branch: currentBranchId(),
        },
      })
      insertNotification({
        type: 'invoice', title: 'Invoice paid',
        message: `${transactionId} — Rp${(Number(invoice.pricePerUnit) * qty).toLocaleString()}`,
        entityId: transactionId,
        link: `/dashboard/invoicing/${transactionId}`,
      })
    }

    return { id: transactionId, transactionId, quantity: qty, isTicketInvoice: true }
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert([addBranch({
      transaction_id: invoice.transactionId,
      unique_code: invoice.itemCode,
      barcode: Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join(''),
      quantity: Number(invoice.quantity) || 1,
      price_per_unit: Number(invoice.pricePerUnit),
      total_amount: Number(invoice.totalAmount),
      buyer_name: invoice.customerName || '',
      buyer_email: invoice.customerEmail || '',
      buyer_phone: invoice.customerPhone || '',
      payment_method: invoice.paymentMethod || '',
      payment_detail: invoice.paymentDetail || '',
      status: invoice.status || 'pending',
      purchased_at: new Date().toISOString(),
      expires_at: (invoice.status || 'pending') === 'pending'
        ? new Date(Date.now() + (Number(invoice.expiresIn) || 24) * (invoice.expiresUnit === 'minutes' ? 60000 : 3600000)).toISOString()
        : null,
    })])
    .select()
    .single()

  if (error) throw error

  const now = new Date()
  triggerAutomationEvent('invoice.created', {
    contact_email: invoice.customerEmail,
    contact_name: invoice.customerName,
    data: {
      invoice_id: invoice.transactionId,
      amount: invoice.totalAmount,
      buyer_email: invoice.customerEmail,
      buyer_name: invoice.customerName,
      buyer_phone: invoice.customerPhone || '',
      itemName: invoice.itemName || invoice.itemCode || '',
      itemCode: invoice.itemCode || '',
      quantity: String(Number(invoice.quantity) || 1),
      pricePerUnit: String(Number(invoice.pricePerUnit)),
      totalAmount: String(Number(invoice.totalAmount)),
      paymentMethod: invoice.paymentMethod || '',
      paymentDetail: invoice.paymentDetail || '',
      transaction_id: invoice.transactionId,
      status: invoice.status || 'pending',
      purchased_at: now.toISOString(),
      created_at: now.toISOString(),
      branch: currentBranchId(),
    },
  })
  insertNotification({
    type: 'invoice', title: 'Invoice created',
    message: `${invoice.transactionId} — Rp${(Number(invoice.totalAmount) || 0).toLocaleString()}`,
    entityId: invoice.transactionId,
    link: `/dashboard/invoicing/${invoice.transactionId}`,
  })
  if ((invoice.status || 'pending') === 'paid') {
    triggerAutomationEvent('invoice.paid', {
      contact_email: invoice.customerEmail,
      contact_name: invoice.customerName,
      data: {
        invoice_id: invoice.transactionId,
        amount: invoice.totalAmount,
        buyer_email: invoice.customerEmail,
        buyer_name: invoice.customerName,
        buyer_phone: invoice.customerPhone || '',
        itemName: invoice.itemName || invoice.itemCode || '',
        itemCode: invoice.itemCode || '',
        quantity: String(Number(invoice.quantity) || 1),
        pricePerUnit: String(Number(invoice.pricePerUnit)),
        totalAmount: String(Number(invoice.totalAmount)),
        paymentMethod: invoice.paymentMethod || '',
        paymentDetail: invoice.paymentDetail || '',
        transaction_id: invoice.transactionId,
        status: 'paid',
        purchased_at: now.toISOString(),
        created_at: now.toISOString(),
        branch: currentBranchId(),
      },
    })
  }
  return formatTransaction(data)
}

export async function deleteInvoice(transactionId) {
  // Fetch rows first to get unique_codes
  const { data: rows, error: fetchError } = await filterBranch(
    supabase.from('transactions').select('id, unique_code').eq('transaction_id', transactionId)
  )

  if (fetchError) {
    console.error('deleteInvoice fetch error:', fetchError)
    throw fetchError
  }

  if (!rows || rows.length === 0) return []

  // Reset each row to available
  for (const row of rows) {
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'available',
        transaction_id: `TKT-AVAIL-${row.unique_code}`,
        buyer_name: '',
        buyer_email: '',
        buyer_phone: '',
        payment_method: '',
        payment_detail: '',
        purchased_at: null,
        expires_at: null,
      })
      .eq('id', row.id)
    if (error) console.error('deleteInvoice reset error:', error)
  }

  return rows
}

export async function sellTicketInstance(instanceId, buyerName, buyerEmail, buyerPhone = '') {
  const { data, error } = await filterBranch(
    supabase.from('transactions').update({
      transaction_id: 'TKT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 999) + 1).padStart(3, '0'),
      status: 'pending',
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      purchased_at: new Date().toISOString(),
    }).eq('id', Number(instanceId))
  ).select().single()

  if (error) throw error
  triggerAutomationEvent('ticket.purchased', {
    contact_email: buyerEmail,
    contact_name: buyerName,
    data: { buyer_email: buyerEmail, buyer_name: buyerName, instance_id: instanceId },
  })
  insertNotification({
    type: 'ticket', title: 'Ticket purchased',
    message: `${buyerName || 'Buyer'} — 1 ticket`,
  })
  return formatTransaction(data)
}

// ─── Automation Logs ────────────────────────────────────────

function formatAutomationLog(l) {
  return {
    id: String(l.id),
    automationId: String(l.automation_id),
    contactEmail: l.contact_email,
    subject: l.subject || '',
    status: l.status,
    sentAt: l.sent_at ? new Date(l.sent_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }) : '',
    error: l.error || '',
  }
}

export async function getAutomationLogs(automationId) {
  let query = supabase
    .from('automation_logs')
    .select('*')
    .order('sent_at', { ascending: false })

  if (automationId) {
    query = query.eq('automation_id', Number(automationId))
  }

  const { data, error } = await query

  if (error) {
    console.error('getAutomationLogs error:', error)
    return []
  }

  return data.map(formatAutomationLog)
}

export async function sendAutomationEmail({ to, fromName, subject, body, automationId, attachments }) {
  const payload = {
    to,
    from_name: fromName || 'Acodera CRM',
    subject,
    body,
    automation_id: automationId ? Number(automationId) : null,
  }
  if (attachments && attachments.length > 0) {
    payload.attachments = attachments
  }

  const res = await fetch(
    'https://rthxlprgtfuhntpcdhsh.supabase.co/functions/v1/send-automation-email',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: AUTOMATION_SECRET,
      },
      body: JSON.stringify(payload),
    }
  )

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || `HTTP ${res.status}`)
  }

  const data = await res.json()

  if (data && typeof data === 'object' && data.success === false) {
    throw new Error(data.error || 'Failed to send email')
  }

  return data
}

export async function scheduleAutomationEmail({ to, fromName, subject, body, automationId, delayValue, delayUnit, attachments }) {
  const sendAt = new Date()
  if (delayValue > 0) {
    const multipliers = { minutes: 60000, hours: 3600000, days: 86400000, months: 30 * 86400000 }
    sendAt.setTime(sendAt.getTime() + (delayValue * (multipliers[delayUnit] || 60000)))
  }

  const emailTo = Array.isArray(to) ? to[0] : to

  const insert = addBranch({
    automation_id: automationId ? Number(automationId) : null,
    to_email: emailTo,
    from_name: fromName || 'Acodera CRM',
    subject,
    body: body || '',
    send_at: sendAt.toISOString(),
    status: 'pending',
  })

  if (attachments && attachments.length > 0) {
    insert.attachments = attachments
  }

  const { data, error } = await supabase
    .from('scheduled_emails')
    .insert([insert])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getScheduledEmails(automationId) {
  let query = supabase
    .from('scheduled_emails')
    .select('*')
    .order('send_at', { ascending: false })

  if (automationId) {
    query = query.eq('automation_id', Number(automationId))
  }

  query = filterBranch(query)
  const { data, error } = await query

  if (error) {
    console.error('getScheduledEmails error:', error)
    return []
  }

  return data.map(e => ({
    id: String(e.id),
    automationId: String(e.automation_id || ''),
    toEmail: e.to_email,
    fromName: e.from_name,
    subject: e.subject,
    status: e.status,
    sendAt: e.send_at,
    createdAt: e.created_at,
  }))
}

export async function refundTicketInstance(instanceId) {
  const { data: row } = await filterBranch(
    supabase.from('transactions').select('unique_code').eq('id', Number(instanceId))
  ).single()

  const { data, error } = await filterBranch(
    supabase.from('transactions').update({
      transaction_id: `TKT-AVAIL-${row.unique_code}`,
      status: 'available',
      buyer_name: '',
      buyer_email: '',
      buyer_phone: '',
      payment_method: '',
      payment_detail: '',
      purchased_at: null,
    }).eq('id', Number(instanceId))
  ).select().single()

  if (error) throw error
  return formatTransaction(data)
}

const AUTOMATION_SECRET = 'b05d0ae8c2e63e145a706c026dd6149f20353d6986a83cd40d4637a7fd1f99f2'

export async function triggerAutomationEvent(event, data = {}) {
  try {
    const res = await fetch(
      'https://rthxlprgtfuhntpcdhsh.supabase.co/functions/v1/trigger-automation' +
        '?event=' + encodeURIComponent(event),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: AUTOMATION_SECRET,
        },
        body: JSON.stringify(data),
      }
    )
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error('triggerAutomationEvent error:', res.status, errData)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('triggerAutomationEvent error:', err)
    return null
  }
}

async function insertNotification({ type, title, message, entityId, link }) {
  try {
    const user = getUser()
    await supabase.from('notifications').insert([{
      branch: user?.branch_id || null,
      type,
      title,
      message: message || '',
      entity_id: entityId || '',
      link: link || '',
    }])
  } catch {
    // Silently ignore — notifications are non-critical
  }
}

export async function updateTransactionStatus(transactionId, newStatus) {
  const { data: rows, error: fetchError } = await filterBranch(
    supabase.from('transactions').select('*').eq('transaction_id', transactionId)
  )

  if (fetchError) throw fetchError
  if (!rows || rows.length === 0) throw new Error('Invoice not found')

  const current = rows[0]
  const oldStatus = current.status

  const { error } = await filterBranch(
    supabase.from('transactions').update({ status: newStatus }).eq('transaction_id', transactionId)
  )

  if (error) throw error

  if (newStatus === 'paid' && oldStatus !== 'paid') {
    triggerAutomationEvent('invoice.paid', {
      contact_email: current.buyer_email,
      contact_name: current.buyer_name,
      data: {
        invoice_id: current.transaction_id,
        amount: current.total_amount,
        buyer_email: current.buyer_email,
        buyer_name: current.buyer_name,
        buyer_phone: current.buyer_phone || '',
        itemName: current.item_name || current.unique_code || '',
        itemCode: current.unique_code || '',
        quantity: String(current.quantity || 1),
        pricePerUnit: String(Number(current.price_per_unit)),
        totalAmount: String(Number(current.total_amount)),
        paymentMethod: current.payment_method || '',
        paymentDetail: current.payment_detail || '',
        ticket: current.unique_code,
        transaction_id: current.transaction_id,
        status: 'paid',
        purchased_at: current.purchased_at,
        created_at: current.created_at,
        branch: current.branch,
      },
    })
    insertNotification({
      type: 'invoice', title: 'Invoice paid',
      message: `${current.transaction_id} — Rp${(Number(current.total_amount) || 0).toLocaleString()}`,
      entityId: current.transaction_id,
      link: `/dashboard/invoicing/${current.transaction_id}`,
    })
  }

  if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
    triggerAutomationEvent('invoice.cancelled', {
      contact_email: current.buyer_email,
      contact_name: current.buyer_name,
      data: {
        invoice_id: current.transaction_id,
        amount: current.total_amount,
        buyer_email: current.buyer_email,
        buyer_name: current.buyer_name,
        buyer_phone: current.buyer_phone || '',
        itemName: current.item_name || current.unique_code || '',
        quantity: String(current.quantity || 1),
        pricePerUnit: String(Number(current.price_per_unit)),
        totalAmount: String(Number(current.total_amount)),
        transaction_id: current.transaction_id,
        status: 'cancelled',
        purchased_at: current.purchased_at,
        branch: current.branch,
      },
    })
    insertNotification({
      type: 'invoice', title: 'Invoice cancelled',
      message: `${current.transaction_id} — Rp${(Number(current.total_amount) || 0).toLocaleString()}`,
      entityId: current.transaction_id,
      link: `/dashboard/invoicing/${current.transaction_id}`,
    })
  }

  return formatTransaction(current)
}
