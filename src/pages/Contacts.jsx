import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Trash2 } from 'lucide-react'
import { getContacts, deleteContact } from '../services/dataService'
import { addToTrash } from '../utils/trashService'

export function ContactsPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 8

  const refresh = () => getContacts().then(setContacts)

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact? This will move it to Trash.')) return
    try {
      const target = contacts.find(c => c.id === id)
      if (target) addToTrash('contact', target)
      await deleteContact(id)
      refresh()
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete contact: ' + (err.message || 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Contacts</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{contacts.length} contacts total</p>
        </div>
        <button onClick={() => navigate('/dashboard/contacts/new')} className="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 text-sm font-medium transition-colors">
          <Plus size={16} /> Add Contact
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input id="contactsSearch" name="contactsSearch" type="text" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Address</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">Profesi</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden xl:table-cell">Message</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-semibold">
                        {c.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{c.email}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell max-w-[200px] truncate">{c.address}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell max-w-[200px] truncate">{c.profesi}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden xl:table-cell max-w-[150px] truncate">{c.message}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {paged.length === 0 && (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No contacts found</p>
            <p className="text-sm mt-1">Try adjusting your search or add a new contact.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Previous</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{p}</button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
        </div>
      )}
    </div>
  )
}