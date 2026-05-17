import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getUser } from '../utils/auth'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)

  const currentBranchId = useCallback(() => {
    const user = getUser()
    return user?.branch_id || null
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    const branch = currentBranchId()
    let query = supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false)
    if (branch) query = query.eq('branch', branch)
    const { count } = await query
    setUnreadCount(count || 0)
  }, [currentBranchId])

  const fetchNotifications = useCallback(async () => {
    const branch = currentBranchId()
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)
    if (branch) query = query.eq('branch', branch)
    const { data } = await query
    setNotifications(data || [])
  }, [currentBranchId])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  const markAsRead = useCallback(async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    const branch = currentBranchId()
    let query = supabase.from('notifications').update({ read: true }).eq('read', false)
    if (branch) query = query.eq('branch', branch)
    await query
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [currentBranchId])

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      notifications,
      panelOpen,
      setPanelOpen,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}
