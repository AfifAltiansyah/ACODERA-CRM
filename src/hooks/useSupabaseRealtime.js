import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabaseRealtime(table, { event = '*', filter, schema = 'public' } = {}, onChange) {
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event, schema, table, filter }, (payload) => {
        callbackRef.current?.(payload)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [table, event, filter])
}

export function useRealtimeRefresh(table, refreshFn, options = {}) {
  const refreshRef = useRef(refreshFn)
  refreshRef.current = refreshFn

  useSupabaseRealtime(table, options, useCallback(() => {
    refreshRef.current?.()
  }, []))
}
