import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getTableSessions } from '@/lib/api'

export const useTableSessions = (restaurantId) => {
  const [resolvedId, setResolvedId] = useState(null)
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)

  // Resolve ID (Email -> UUID)
  useEffect(() => {
    async function resolve() {
      if (!restaurantId) return
      if (restaurantId.includes('@')) {
        const { data } = await supabase
          .from('restaurants')
          .select('id')
          .eq('email', restaurantId.toLowerCase())
          .single()
        if (data?.id) setResolvedId(data.id)
      } else {
        setResolvedId(restaurantId)
      }
    }
    resolve()
  }, [restaurantId])

  const refreshTables = useCallback(async () => {
    const idToUse = resolvedId
    if (!idToUse) return
    try {
      const data = await getTableSessions(idToUse)
      setTables(data || [])
    } catch (err) {
      console.error('Error fetching tables:', err)
    } finally {
      setLoading(false)
    }
  }, [resolvedId])

  useEffect(() => {
    if (!resolvedId) return

    refreshTables()

    // Real-time subscription to table_sessions & orders
    const channel = supabase
      .channel(`public:table_sessions:rid=${resolvedId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_sessions',
          filter: `restaurant_id=eq.${resolvedId}`
        },
        () => {
          refreshTables()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${resolvedId}`
        },
        () => {
          refreshTables()
        }
      )
      .subscribe()

    const handleNewOrder = () => refreshTables()
    const handleStorage = (e) => {
      if (e.key === 'servora_latest_order') refreshTables()
    }

    window.addEventListener('servora_new_order', handleNewOrder)
    window.addEventListener('storage', handleStorage)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('servora_new_order', handleNewOrder)
      window.removeEventListener('storage', handleStorage)
    }
  }, [resolvedId, refreshTables])

  const stats = {
    occupied: tables.filter(t => t.status === 'occupied').length,
    available: tables.filter(t => t.status === 'available').length,
    billing: tables.filter(t => t.status === 'billing').length,
    'needs-cleaning': tables.filter(t => t.status === 'needs-cleaning').length,
    total: tables.length
  }

  return { tables, stats, loading, refreshTables }
}
