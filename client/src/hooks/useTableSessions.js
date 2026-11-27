import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getTableSessions } from '@/lib/api'
import { useOrderManagement } from './useOrderManagement'

export const useTableSessions = (restaurantId) => {
  const [resolvedId, setResolvedId] = useState(null)
  const [rawTables, setRawTables] = useState([])
  const [loading, setLoading] = useState(true)
  const { orders: activeOrders = [] } = useOrderManagement(restaurantId)

  // Resolve ID (Email -> UUID)
  useEffect(() => {
    let active = true
    async function resolve() {
      if (!restaurantId) return
      if (restaurantId.includes('@')) {
        const { data } = await supabase
          .from('restaurants')
          .select('id')
          .eq('email', restaurantId.toLowerCase())
          .maybeSingle()
        if (active && data?.id) setResolvedId(data.id)
      } else {
        if (active) setResolvedId(restaurantId)
      }
    }
    resolve()
    return () => { active = false }
  }, [restaurantId])

  const refreshTables = useCallback(async () => {
    const idToUse = resolvedId || restaurantId
    if (!idToUse) return
    try {
      const data = await getTableSessions(idToUse)
      setRawTables(data || [])
    } catch (err) {
      console.error('Error fetching tables:', err)
    } finally {
      setLoading(false)
    }
  }, [resolvedId, restaurantId])

  useEffect(() => {
    const idToUse = resolvedId || restaurantId
    if (!idToUse) return

    refreshTables()

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idToUse)
    let channel = null
    if (isUuid) {
      // Real-time subscription to table_sessions & orders
      channel = supabase
        .channel(`public:table_sessions:rid=${idToUse}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'table_sessions',
            filter: `restaurant_id=eq.${idToUse}`
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
            filter: `restaurant_id=eq.${idToUse}`
          },
          () => {
            refreshTables()
          }
        )
        .subscribe()
    }

    const handleSync = () => refreshTables()
    const handleStorage = (e) => {
      if (
        !e.key ||
        e.key === 'servora_latest_order' ||
        e.key === 'servora_demo_orders_v1' ||
        e.key === 'servora_demo_table_sessions_v1'
      ) {
        refreshTables()
      }
    }

    let bc = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('servora_orders_channel')
        bc.onmessage = () => refreshTables()
      }
    } catch {
      // ignore BroadcastChannel failures
    }

    const safetyInterval = setInterval(refreshTables, 8000)

    window.addEventListener('servora_new_order', handleSync)
    window.addEventListener('newOrderCreated', handleSync)
    window.addEventListener('orderStatusUpdated', handleSync)
    window.addEventListener('tableSessionsUpdated', handleSync)
    window.addEventListener('storage', handleStorage)

    return () => {
      clearInterval(safetyInterval)
      if (channel) supabase.removeChannel(channel)
      if (bc) bc.close()
      window.removeEventListener('servora_new_order', handleSync)
      window.removeEventListener('newOrderCreated', handleSync)
      window.removeEventListener('orderStatusUpdated', handleSync)
      window.removeEventListener('tableSessionsUpdated', handleSync)
      window.removeEventListener('storage', handleStorage)
    }
  }, [resolvedId, restaurantId, refreshTables])

  // Dynamically reconcile raw table_sessions with real-time active orders so any table
  // with an open order (e.g. Table 7) is ALWAYS reflected accurately as occupied/billing
  const tables = useMemo(() => {
    const activeByTable = new Map()
    ;(activeOrders || []).forEach((o) => {
      const st = String(o.status || 'PENDING').toUpperCase()
      if (st === 'FINISHED' || st === 'FINISHED_CLOSED' || st === 'CANCELLED') return
      const rawNum = String(o.table_number || o.tableNumber || '').replace(/\D/g, '')
      const tNum = parseInt(rawNum, 10)
      if (!Number.isInteger(tNum) || tNum < 1) return
      const existing = activeByTable.get(tNum) || []
      existing.push(o)
      activeByTable.set(tNum, existing)
    })

    const tableMap = new Map()
    ;(rawTables || []).forEach((t) => {
      const tNum = Number(t.table_number || t.tableNumber)
      if (Number.isInteger(tNum) && tNum >= 1) {
        tableMap.set(tNum, { ...t, table_number: tNum, tableNumber: tNum })
      }
    })

    // Ensure any table number present in active orders exists in Live Floor even if table_sessions row is missing
    activeByTable.forEach((_, tNum) => {
      if (!tableMap.has(tNum)) {
        tableMap.set(tNum, {
          id: `live-t-${tNum}`,
          restaurant_id: resolvedId || restaurantId,
          table_number: tNum,
          tableNumber: tNum,
          status: 'occupied',
          customers: 1,
          session_start: null,
          last_activity: new Date().toISOString(),
        })
      }
    })

    return Array.from(tableMap.values())
      .map((t) => {
        const tNum = Number(t.table_number || t.tableNumber)
        const tableOrders = activeByTable.get(tNum) || []
        if (tableOrders.length === 0) {
          return t
        }

        const primaryOrder = tableOrders[0]
        const hasBillReq = tableOrders.some((o) => String(o.status || '').toUpperCase() === 'BILL_REQUESTED')
        const earliestOrderTime = tableOrders.reduce((minIso, o) => {
          const ts = o.created_at || o.createdAt
          if (!ts) return minIso
          if (!minIso) return ts
          return new Date(ts).getTime() < new Date(minIso).getTime() ? ts : minIso
        }, null)
        const liveAmount = tableOrders.reduce(
          (sum, o) => sum + Number(o.total_amount || o.total || o.final_amount || 0),
          0
        )

        return {
          ...t,
          status: hasBillReq ? 'billing' : 'occupied',
          customers: Math.max(Number(t.customers || 0), Number(primaryOrder.guests || 1)),
          current_order_id: primaryOrder.id,
          session_start: t.session_start || earliestOrderTime || new Date().toISOString(),
          last_activity: primaryOrder.created_at || primaryOrder.createdAt || t.last_activity,
          activeOrder: primaryOrder,
          activeOrdersCount: tableOrders.length,
          liveAmount,
          customerName: primaryOrder.customerName || primaryOrder.customer_name || 'Guest',
        }
      })
      .sort((a, b) => Number(a.table_number) - Number(b.table_number))
  }, [rawTables, activeOrders, resolvedId, restaurantId])

  const stats = {
    occupied: tables.filter(t => t.status === 'occupied').length,
    available: tables.filter(t => t.status === 'available').length,
    billing: tables.filter(t => t.status === 'billing').length,
    'needs-cleaning': tables.filter(t => t.status === 'needs-cleaning').length,
    total: tables.length
  }

  return { tables, stats, loading, refreshTables }
}
