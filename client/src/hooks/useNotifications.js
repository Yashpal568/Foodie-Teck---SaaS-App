import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  fetchNotifications,
  insertNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearNotifications
} from '@/services/notification.service'
import { ensureValidRestaurantUUID } from '@/services/restaurant.service'

const isUUID = (val) =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

const DEMO_NOTIFS_STORAGE_KEY = 'servora_demo_notifications_v1'
const DISMISSED_NOTIFS_PREFIX = 'servora_dismissed_notifs_'

const STATUS_CONFIG = {
  PREPARING: { title: 'Order Started Preparing', icon: '👨‍🍳' },
  READY: { title: 'Order Ready for Pickup', icon: '✅' },
  SERVED: { title: 'Order Served', icon: '🎉' },
  BILL_REQUESTED: { title: 'Bill Requested', icon: '💳' },
  FINISHED: { title: 'Order Completed', icon: '🧾' },
  CANCELLED: { title: 'Order Cancelled', icon: '❌' },
}

const createInitialDemoNotifications = () => {
  const now = Date.now()
  return [
    {
      id: 'demo-notif-101',
      restaurantId: 'demo-merchant',
      type: 'new_order',
      title: '🔔 New Order Received',
      message: 'Table 4 (Table 4 Guest) ordered Butter Chicken Grand, 2x Garlic Butter Naan',
      orderId: 'demo-ord-101',
      tableNumber: '4',
      timestamp: new Date(now - 4 * 60000).toISOString(),
      read: false,
    },
    {
      id: 'demo-notif-102',
      restaurantId: 'demo-merchant',
      type: 'order_status',
      title: '✅ Order Ready for Pickup',
      message: 'Table 2 (#102) plated and ready at the kitchen pass.',
      orderId: 'demo-ord-102',
      tableNumber: '2',
      timestamp: new Date(now - 9 * 60000).toISOString(),
      read: false,
    },
    {
      id: 'demo-notif-103',
      restaurantId: 'demo-merchant',
      type: 'waiter_call',
      title: '🛎️ Waiter Requested',
      message: 'Table 7 is requesting table assistance.',
      tableNumber: '7',
      timestamp: new Date(now - 16 * 60000).toISOString(),
      read: true,
    },
  ]
}

const readDemoNotifications = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return []
    const raw = window.localStorage.getItem(DEMO_NOTIFS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
    const initial = createInitialDemoNotifications()
    window.localStorage.setItem(DEMO_NOTIFS_STORAGE_KEY, JSON.stringify(initial))
    return initial
  } catch {
    return createInitialDemoNotifications()
  }
}

const writeDemoNotifications = (items) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DEMO_NOTIFS_STORAGE_KEY, JSON.stringify(items.slice(0, 40)))
    }
  } catch {
    // ignore quota issues
  }
}

const readDismissedIds = (tenantKey) => {
  try {
    if (typeof window === 'undefined' || !tenantKey) return new Set()
    const raw = window.localStorage.getItem(`${DISMISSED_NOTIFS_PREFIX}${tenantKey}`)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

const persistDismissedId = (tenantKey, id) => {
  try {
    if (typeof window === 'undefined' || !tenantKey || !id) return
    const set = readDismissedIds(tenantKey)
    set.add(id)
    window.localStorage.setItem(`${DISMISSED_NOTIFS_PREFIX}${tenantKey}`, JSON.stringify([...set].slice(-100)))
  } catch {
    // ignore storage failure
  }
}

export const useNotifications = (restaurantId) => {
  const isDemo = restaurantId === 'demo-merchant' || restaurantId === 'demo' || restaurantId === 'guest'
  const [resolvedId, setResolvedId] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const activeTenantRef = useRef(null)

  // Resolve restaurant scope cleanly and wipe prior dashboard notifications immediately on switch
  useEffect(() => {
    let isMounted = true
    activeTenantRef.current = null
    setResolvedId(null)
    setNotifications([])
    setUnreadCount(0)
    setIsLiveConnected(false)

    if (!restaurantId) {
      return () => { isMounted = false }
    }

    if (isDemo) {
      activeTenantRef.current = 'demo-merchant'
      setResolvedId('demo-merchant')
      const demoItems = readDemoNotifications()
      setNotifications(demoItems)
      setIsLiveConnected(true)
      return () => { isMounted = false }
    }

    async function resolve() {
      try {
        const uuid = await ensureValidRestaurantUUID(restaurantId)
        if (isMounted && uuid) {
          activeTenantRef.current = uuid
          setResolvedId(uuid)
        }
      } catch (e) {
        console.error('Notification identity resolve error:', e)
      }
    }
    resolve()
    return () => { isMounted = false }
  }, [restaurantId, isDemo])

  // Load persisted cloud notifications ONLY for the active resolved restaurant UUID
  useEffect(() => {
    if (!resolvedId || resolvedId === 'demo-merchant') return
    let cancelled = false

    async function load() {
      const targetTenant = resolvedId
      let dbNotifications = []
      try {
        dbNotifications = await fetchNotifications(targetTenant)
      } catch (e) {
        console.warn('Notifications fetch notice:', e?.message || e)
      }

      if (cancelled || activeTenantRef.current !== targetTenant) return

      const dismissed = readDismissedIds(targetTenant)

      // Fallback enrichment ONLY when notifications table has no rows yet for this tenant
      if (!dbNotifications || dbNotifications.length === 0) {
        try {
          const [ordersRes, waiterRes] = await Promise.all([
            supabase
              .from('orders')
              .select('id, table_number, customer_name, status, total, created_at')
              .eq('restaurant_id', targetTenant)
              .order('created_at', { ascending: false })
              .limit(15),
            supabase
              .from('waiter_calls')
              .select('id, table_number, customer_name, is_handled, created_at')
              .eq('restaurant_id', targetTenant)
              .order('created_at', { ascending: false })
              .limit(10),
          ])

          if (cancelled || activeTenantRef.current !== targetTenant) return

          const combined = []
          ;(ordersRes.data || []).forEach(o => {
            const derivedId = `order-notif-${o.id}`
            if (dismissed.has(derivedId)) return
            combined.push({
              id: derivedId,
              type: 'new_order',
              title: '🔔 New Order Received',
              message: `Order #${o.id.slice(-6)} · Table ${o.table_number || '?'} (${o.customer_name || 'Guest'})`,
              order_id: o.id,
              table_number: String(o.table_number || '?'),
              created_at: o.created_at,
              is_read: o.status === 'FINISHED' || o.status === 'SERVED' || o.status === 'CANCELLED'
            })
          })
          ;(waiterRes.data || []).forEach(w => {
            const derivedId = `waiter-notif-${w.id}`
            if (dismissed.has(derivedId)) return
            combined.push({
              id: derivedId,
              type: 'waiter_call',
              title: '🛎️ Waiter Requested',
              message: `Table ${w.table_number || '?'} (${w.customer_name || 'Guest'}) requested assistance.`,
              table_number: String(w.table_number || '?'),
              created_at: w.created_at,
              is_read: Boolean(w.is_handled)
            })
          })
          dbNotifications = combined
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 20)
        } catch (e) {
          console.warn('Notifications fallback error:', e)
        }
      }

      if (cancelled || activeTenantRef.current !== targetTenant) return

      const recentSeen = new Set()
      const mapped = (dbNotifications || [])
        .filter(n => {
          if (n.type === 'payment_verification' || n.type === 'subscription') return false
          if (dismissed.has(n.id) || recentSeen.has(n.id)) return false
          recentSeen.add(n.id)
          return true
        })
        .map(n => ({
          id: n.id,
          restaurantId: targetTenant,
          type: n.type,
          title: n.title,
          message: n.message,
          orderId: n.order_id,
          tableNumber: n.table_number,
          timestamp: n.created_at,
          read: Boolean(n.is_read)
        }))

      setNotifications(mapped)
    }

    load()
    return () => { cancelled = true }
  }, [resolvedId])

  // Sync a new notification strictly to the active tenant
  const pushNotification = useCallback(async (payload) => {
    const targetTenant = resolvedId
    if (!targetTenant || activeTenantRef.current !== targetTenant) return

    const orderId = payload.order_id || payload.orderId || null
    const tableNum = (payload.table_number ?? payload.tableNumber) != null
      ? String(payload.table_number ?? payload.tableNumber)
      : null

    if (targetTenant === 'demo-merchant') {
      const demoItem = {
        id: `demo-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        restaurantId: 'demo-merchant',
        type: payload.type || 'new_order',
        title: payload.title || '🔔 Update',
        message: payload.message || '',
        orderId,
        tableNumber: tableNum,
        timestamp: new Date().toISOString(),
        read: false,
      }
      setNotifications(prev => {
        const now = Date.now()
        const duplicate = prev.some(
          n =>
            n.type === demoItem.type &&
            ((orderId && n.orderId === orderId) ||
              (tableNum && String(n.tableNumber || '') === tableNum && Math.abs(now - new Date(n.timestamp || 0).getTime()) < 8000))
        )
        if (duplicate) return prev
        const next = [demoItem, ...prev].slice(0, 40)
        writeDemoNotifications(next)
        return next
      })
      return
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const tempNotif = {
      id: tempId,
      restaurantId: targetTenant,
      type: payload.type || 'alert',
      title: payload.title || 'Notification',
      message: payload.message || '',
      orderId,
      tableNumber: tableNum,
      timestamp: new Date().toISOString(),
      read: false
    }

    setNotifications(prev => {
      // Avoid duplicate entry for the same order + type within 8s
      const now = Date.now()
      const duplicate = prev.some(
        n =>
          n.type === tempNotif.type &&
          ((orderId && n.orderId === orderId) ||
            (tableNum && String(n.tableNumber || '') === tableNum && Math.abs(now - new Date(n.timestamp || 0).getTime()) < 8000))
      )
      if (duplicate) return prev
      return [tempNotif, ...prev].slice(0, 40)
    })

    try {
      const created = await insertNotification(targetTenant, {
        ...payload,
        order_id: orderId,
        table_number: tableNum,
      })
      if (created && activeTenantRef.current === targetTenant) {
        setNotifications(prev =>
          prev.map(n => (n.id === tempId ? { ...n, id: created.id, timestamp: created.created_at || n.timestamp } : n))
        )
      }
    } catch (e) {
      console.warn('Notification persist notice:', e?.message || e)
    }
  }, [resolvedId])

  // Realtime & Local Event Subscriptions scoped STRICTLY to active tenant
  useEffect(() => {
    if (!resolvedId) return
    const targetTenant = resolvedId

    const matchesCurrentTenant = (payload) => {
      const rid = payload?.restaurant_id ?? payload?.restaurantId
      if (targetTenant === 'demo-merchant') {
        return rid === 'demo-merchant' || rid === 'demo'
      }
      return Boolean(rid && String(rid) === String(targetTenant))
    }

    const handleIncomingOrder = (order) => {
      if (!order || !matchesCurrentTenant({ restaurant_id: order.restaurant_id ?? targetTenant })) return
      const tableNum = order.table_number || order.tableNumber || '?'
      const custName = order.customer_name || order.customerName || 'Guest'
      pushNotification({
        type: 'new_order',
        title: '🔔 New Order Received',
        message: `Order #${String(order.id || '').slice(-6).toUpperCase()} · Table ${tableNum} (${custName})`,
        order_id: order.id || null,
        table_number: String(tableNum),
      })
    }

    const handleIncomingOrderStatus = (order, prevStatus = null) => {
      if (!order || !order.status || order.status === prevStatus) return
      const config = STATUS_CONFIG[String(order.status).toUpperCase()]
      if (!config) return
      const tableNum = order.table_number || order.tableNumber || '?'
      pushNotification({
        type: 'order_status',
        title: `${config.icon} ${config.title}`,
        message: `Order #${String(order.id || '').slice(-6).toUpperCase()} · Table ${tableNum} is now ${order.status}`,
        order_id: order.id || null,
        table_number: String(tableNum),
      })
    }

    const handleIncomingWaiterCall = (call) => {
      if (!call) return
      const tableNum = String(call.table_number || call.tableNumber || '?')
      const custName = call.customer_name || call.customerName || 'Guest'
      const callId = call.id || `waiter-live-${Date.now()}`
      const ts = call.created_at || new Date().toISOString()

      setNotifications(prev => {
        const now = Date.now()
        const duplicate = prev.some(
          n =>
            n.id === callId ||
            (n.type === 'waiter_call' &&
              String(n.tableNumber) === tableNum &&
              Math.abs(now - new Date(n.timestamp || 0).getTime()) < 5000)
        )
        if (duplicate) return prev
        const item = {
          id: callId,
          restaurantId: targetTenant,
          type: 'waiter_call',
          title: '🛎️ Waiter Requested',
          message: `Table ${tableNum} (${custName}) is requesting service.`,
          tableNumber: tableNum,
          read: false,
          timestamp: ts
        }
        const next = [item, ...prev].slice(0, 40)
        if (targetTenant === 'demo-merchant') writeDemoNotifications(next)
        return next
      })
    }

    let broadcastChannel = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('servora_orders_channel')
        broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data || {}
          if (type === 'WAITER_CALL' && matchesCurrentTenant(payload)) {
            handleIncomingWaiterCall(payload)
          } else if (type === 'NEW_ORDER' && matchesCurrentTenant(payload)) {
            handleIncomingOrder(payload)
          } else if (type === 'ORDER_STATUS_UPDATE' && matchesCurrentTenant(payload)) {
            handleIncomingOrderStatus(payload)
          }
        }
      }
    } catch {
      // ignore BroadcastChannel failures
    }

    const windowOrderListener = (e) => {
      if (matchesCurrentTenant(e.detail)) handleIncomingOrder(e.detail)
    }

    const windowStatusListener = (e) => {
      if (matchesCurrentTenant(e.detail)) handleIncomingOrderStatus(e.detail)
    }

    const windowWaiterListener = (e) => {
      if (matchesCurrentTenant(e.detail)) handleIncomingWaiterCall(e.detail)
    }

    const storageListener = (e) => {
      if (targetTenant === 'demo-merchant' && e.key === DEMO_NOTIFS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (Array.isArray(parsed)) setNotifications(parsed)
        } catch {
          // ignore parse error
        }
      }
      if (e.key === 'servora_latest_order' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (matchesCurrentTenant(parsed)) handleIncomingOrder(parsed)
        } catch {
          // ignore
        }
      }
      if (e.key === 'servora_latest_waiter_call' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (matchesCurrentTenant(parsed)) handleIncomingWaiterCall(parsed)
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener('newOrderCreated', windowOrderListener)
    window.addEventListener('servora_new_order', windowOrderListener)
    window.addEventListener('orderStatusUpdated', windowStatusListener)
    window.addEventListener('servora_waiter_call', windowWaiterListener)
    window.addEventListener('storage', storageListener)

    // Only subscribe to Supabase Realtime WebSockets for real UUID dashboards (never for Demo Sandbox)
    if (targetTenant === 'demo-merchant' || !isUUID(targetTenant)) {
      return () => {
        if (broadcastChannel) broadcastChannel.close()
        window.removeEventListener('newOrderCreated', windowOrderListener)
        window.removeEventListener('servora_new_order', windowOrderListener)
        window.removeEventListener('orderStatusUpdated', windowStatusListener)
        window.removeEventListener('servora_waiter_call', windowWaiterListener)
        window.removeEventListener('storage', storageListener)
      }
    }

    const ordersChannel = supabase
      .channel(`notifications:rid=${targetTenant}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${targetTenant}` },
        (payload) => {
          if (activeTenantRef.current !== targetTenant) return
          if (payload.eventType === 'INSERT') {
            handleIncomingOrder(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            handleIncomingOrderStatus(payload.new, payload.old?.status)
          }
        }
      )
      .subscribe((status) => {
        if (activeTenantRef.current === targetTenant) {
          setIsLiveConnected(status === 'SUBSCRIBED')
        }
      })

    const waiterChannel = supabase
      .channel(`waiter-toasts:rid=${targetTenant}`)
      .on('broadcast', { event: 'waiter_call' }, (payload) => {
        if (activeTenantRef.current === targetTenant) handleIncomingWaiterCall(payload.payload)
      })
      .subscribe()

    const dbWaiterChannel = supabase
      .channel(`notif-waiter-pg:rid=${targetTenant}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'waiter_calls', filter: `restaurant_id=eq.${targetTenant}` },
        (payload) => {
          if (activeTenantRef.current === targetTenant) handleIncomingWaiterCall(payload.new)
        }
      )
      .subscribe()

    const inventoryChannel = supabase
      .channel(`inventory:rid=${targetTenant}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${targetTenant}` },
        (payload) => {
          if (activeTenantRef.current !== targetTenant) return
          if (payload.old?.is_in_stock === true && payload.new?.is_in_stock === false) {
            pushNotification({
              type: 'inventory_alert',
              title: '⚠️ Item Out of Stock',
              message: `${payload.new.name} is now marked out of stock.`,
            })
          }
        }
      )
      .subscribe()

    const dbNotifChannel = supabase
      .channel(`notif-table-pg:rid=${targetTenant}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `restaurant_id=eq.${targetTenant}` },
        (payload) => {
          const row = payload.new
          if (!row || activeTenantRef.current !== targetTenant) return
          if (row.type === 'payment_verification' || row.type === 'subscription') return
          setNotifications(prev => {
            const now = Date.now()
            const existingIdx = prev.findIndex(
              n =>
                n.id === row.id ||
                (n.type === row.type &&
                  String(n.tableNumber || '') === String(row.table_number || '') &&
                  Math.abs(now - new Date(n.timestamp || 0).getTime()) < 8000)
            )
            const normalized = {
              id: row.id,
              restaurantId: targetTenant,
              type: row.type,
              title: row.title,
              message: row.message,
              orderId: row.order_id,
              tableNumber: row.table_number,
              timestamp: row.created_at,
              read: Boolean(row.is_read)
            }
            if (existingIdx !== -1) {
              const next = [...prev]
              next[existingIdx] = normalized
              return next
            }
            return [normalized, ...prev].slice(0, 40)
          })
        }
      )
      .subscribe()

    return () => {
      if (broadcastChannel) broadcastChannel.close()
      window.removeEventListener('newOrderCreated', windowOrderListener)
      window.removeEventListener('servora_new_order', windowOrderListener)
      window.removeEventListener('orderStatusUpdated', windowStatusListener)
      window.removeEventListener('servora_waiter_call', windowWaiterListener)
      window.removeEventListener('storage', storageListener)
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(waiterChannel)
      supabase.removeChannel(dbWaiterChannel)
      supabase.removeChannel(dbNotifChannel)
      supabase.removeChannel(inventoryChannel)
    }
  }, [resolvedId, pushNotification])

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  const markAsRead = useCallback(async (id) => {
    const targetTenant = resolvedId
    setNotifications(prev => {
      const next = prev.map(n => (n.id === id ? { ...n, read: true } : n))
      if (targetTenant === 'demo-merchant') writeDemoNotifications(next)
      return next
    })
    if (targetTenant && targetTenant !== 'demo-merchant' && isUUID(id)) {
      await markNotificationRead(id, targetTenant).catch(() => {})
    }
  }, [resolvedId])

  const markAllAsRead = useCallback(async () => {
    const targetTenant = resolvedId
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      if (targetTenant === 'demo-merchant') writeDemoNotifications(next)
      return next
    })
    if (targetTenant && targetTenant !== 'demo-merchant') {
      await markAllNotificationsRead(targetTenant).catch(() => {})
    }
  }, [resolvedId])

  const clearNotification = useCallback(async (id) => {
    const targetTenant = resolvedId
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== id)
      if (targetTenant === 'demo-merchant') writeDemoNotifications(next)
      return next
    })
    if (targetTenant && targetTenant !== 'demo-merchant') {
      persistDismissedId(targetTenant, id)
      if (isUUID(id)) {
        await deleteNotification(id, targetTenant).catch(() => {})
      }
    }
  }, [resolvedId])

  const clearAllNotifications = useCallback(async () => {
    const targetTenant = resolvedId
    setNotifications(prev => {
      if (targetTenant && targetTenant !== 'demo-merchant') {
        prev.forEach(n => persistDismissedId(targetTenant, n.id))
      }
      return []
    })
    if (targetTenant === 'demo-merchant') {
      writeDemoNotifications([])
    } else if (targetTenant) {
      await clearNotifications(targetTenant).catch(() => {})
    }
  }, [resolvedId])

  const toggleNotifications = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const closeNotifications = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    resolvedId,
    isDemo,
    isLiveConnected,
    notifications,
    unreadCount,
    isOpen,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    toggleNotifications,
    closeNotifications,
  }
}
