import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Users, Shield, Edit2, Trash2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const getAuthHeaders = () => {
  const token = localStorage.getItem('crm-auth-token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'partner', branch: '' })

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders(), credentials: 'include' })
      const data = await res.json()
      if (data.users) setUsers(data.users)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleSave = async () => {
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `${API_BASE}/users/${editing.id}` : `${API_BASE}/users`
      const body = editing ? { ...form } : form

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setShowForm(false); setEditing(null); setForm({ email: '', password: '', name: '', role: 'partner', branch: '' })
      fetchUsers()
    } catch (err) { alert(err.message) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      fetchUsers()
    } catch (err) { alert(err.message) }
  }

  const openEdit = (user) => {
    setEditing(user)
    setForm({ email: user.email, password: '', name: user.name, role: user.role, branch: user.branch || '' })
    setShowForm(true)
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{users.length} accounts</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ email: '', password: '', name: '', role: 'partner', branch: '' }); setShowForm(true) }}
          className="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 text-sm font-medium transition-colors">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Branch</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-semibold">
                        {u.name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                    }`}>
                      <Shield size={12} className="mr-1" /> {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">{u.branch || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input id="userName" name="userName" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <div>
                <label htmlFor="userEmail" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input id="userEmail" name="userEmail" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <div>
                <label htmlFor="userPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input id="userPassword" name="userPassword" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="userRole" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                  <select id="userRole" name="userRole" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                    <option value="partner">Partner</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="userBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Branch</label>
                  <input id="userBranch" name="userBranch" value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} placeholder="e.g. Sicapung"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">{editing ? 'Save Changes' : 'Create User'}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}