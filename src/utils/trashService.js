// ─── Trash Service ──────────────────────────────────────────────
// Manages soft-deleted items in localStorage so admins can review
// and restore anything that was deleted.

const TRASH_KEY = 'crm_trash_items'

function loadTrash() {
  try {
    const raw = localStorage.getItem(TRASH_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTrash(items) {
  localStorage.setItem(TRASH_KEY, JSON.stringify(items))
}

// Add an item to the trash with entity type info
export function addToTrash(entity, record) {
  const trash = loadTrash()
  trash.push({
    entity,
    record,
    deletedAt: new Date().toISOString(),
  })
  saveTrash(trash)
}

// Get all trashed items (optionally filtered by entity type)
export function getTrashedItems(entity) {
  const trash = loadTrash()
  if (entity) return trash.filter((t) => t.entity === entity)
  return trash
}

// Remove an item from the trash WITHOUT restoring to DB (used after permanent delete or successful restore)
export function removeFromTrash(entity, id) {
  const trash = loadTrash().filter((t) => !(t.entity === entity && t.record.id === id))
  saveTrash(trash)
}

// Clear all trash
export function clearAllTrash() {
  localStorage.removeItem(TRASH_KEY)
}

// Restore helpers — each calls the appropriate add* function to re-insert into DB
// These accept the API functions as parameters to avoid circular imports

export async function restoreContact(record, { addContactFn }) {
  const { id, createdAt, ...contact } = record
  const result = await addContactFn(contact)
  removeFromTrash('contact', id)
  return result
}

export async function restoreAutomation(record, { addAutomationFn }) {
  const { id, ...automation } = record
  const result = await addAutomationFn(automation)
  removeFromTrash('automation', id)
  return result
}

export async function restoreFlow(record, { addFlowFn }) {
  const { id, ...flow } = record
  const result = await addFlowFn(flow)
  removeFromTrash('flow', id)
  return result
}

export async function restoreInvoice(record, { addInvoiceFn }) {
  const { id, ...invoice } = record
  const result = await addInvoiceFn(invoice)
  removeFromTrash('invoice', id)
  return result
}

export async function restoreTicket(record, { addTicketFn }) {
  const { id, ...ticket } = record
  const result = await addTicketFn(ticket)
  removeFromTrash('ticket', id)
  return result
}