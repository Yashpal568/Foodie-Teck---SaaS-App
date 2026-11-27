import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  fetchNotifications, 
  insertNotification, 
  markNotificationRead, 
  markAllNotificationsRead, 
  clearNotifications 
} from '@/lib/api'
import { ensureValidRestaurantUUID } from '@/services/restaurant.service'

const isUUID = (val) =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export const useNotifications = (restaurantId) => {
  const [resolvedId, setResolvedId] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const audioRef = useRef(null)

  // Initialize audio for notifications
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
  }, [])

  // Resolve restaurant ID (Email to UUID)
  useEffect(() => {
    let isMounted = true
    async function resolve() {
      if (!restaurantId) {
        if (isMounted) setResolvedId(null)
        return
      }
      
      try {
        const uuid = await ensureValidRestaurantUUID(restaurantId)
        if (isMounted && uuid) {
          setResolvedId(uuid)
        }
      } catch (e) {
        console.error('Notification identity resolve error:', e)
      }
    }
    resolve()
    return () => { isMounted = false }
  }, [restaurantId])

  // Load notifications from cloud (with Orders table fallback)
  useEffect(() => {
    async function load() {
      if (!resolvedId) return
      let dbNotifications = await fetchNotifications(resolvedId)
      
      const recentSeen = new Set()

      // Fallback / enrichment: fetch recent orders & waiter_calls if notifications table has none yet
      if (!dbNotifications || dbNotifications.length === 0) {
        try {
          const [ordersRes, waiterRes] = await Promise.all([
            supabase
              .from('orders')
              .select('*')
              .eq('restaurant_id', resolvedId)
              .order('created_at', { ascending: false })
              .limit(15),
            supabase
              .from('waiter_calls')
              .select('*')
              .eq('restaurant_id', resolvedId)
              .order('created_at', { ascending: false })
              .limit(10),
          ])

          const combined = []
          ;(ordersRes.data || []).forEach(o => {
            combined.push({
              id: `order-notif-${o.id}`,
              type: 'new_order',
              title: '🔔 New Order Received',
              message: `Order #${o.id.slice(-6)} Table ${o.table_number || o.tableNumber || '?'} (${o.customer_name || 'Guest'})`,
              order_id: o.id,
              table_number: String(o.table_number || '?'),
              created_at: o.created_at,
              is_read: o.status === 'FINISHED' || o.status === 'SERVED'
            })
          })
          ;(waiterRes.data || []).forEach(w => {
            combined.push({
              id: `waiter-notif-${w.id}`,
              type: 'waiter_call',
              title: '🛎️ Waiter Requested',
              message: `Table ${w.table_number || '?'} (${w.customer_name || 'Guest'}) requested assistance.`,
              table_number: String(w.table_number || '?'),
              created_at: w.created_at,
              is_read: Boolean(w.is_handled)
            })
          })
          dbNotifications = combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20)
        } catch (e) {
          console.warn('Notifications fallback error:', e)
        }
      }

      // Normalize to UI expectation
      const mapped = (dbNotifications || [])
        .filter(n => {
          if (recentSeen.has(n.id)) return false
          recentSeen.add(n.id)
          return true
        })
        .map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          orderId: n.order_id,
          tableNumber: n.table_number,
          timestamp: n.created_at,
          read: n.is_read
        }))
      setNotifications(mapped)
      setUnreadCount(mapped.filter(n => !n.read).length)
    }
    load()
  }, [resolvedId])

  // Local helper to sync a new notification to cloud & state
  const pushNotification = useCallback(async (payload, category = 'orders') => {
    if (!resolvedId) return

    // Optimistic UI Update with temp ID
    const tempId = `temp-${Date.now()}`
    const tempNotif = {
      ...payload,
      id: tempId,
      timestamp: new Date().toISOString(),
      read: false
    }
    
    setNotifications(prev => [tempNotif, ...prev])
    setUnreadCount(prev => prev + 1)
    audioRef.current?.play().catch(() => {})

    // Sync to DB
    const created = await insertNotification(resolvedId, payload)
    
    if (created) {
      setNotifications(prev => prev.map(n => 
        n.id === tempId ? { ...n, id: created.id } : n
      ))
    }
  }, [resolvedId])

  // ── Listen for real-time Events (Supabase + Window) ──
  useEffect(() => {
    if (!resolvedId) return

    const handleIncomingOrder = (order) => {
      pushNotification({
        type: 'new_order',
        title: '🔔 New Order Received',
        message: `Order #${order.id.slice(-6)} Table ${order.table_number || order.tableNumber || '?'} (${order.customer_name || order.customerName || 'Guest'})`,
        orderId: order.id,
        tableNumber: order.table_number || order.tableNumber,
      }, 'orders')
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
        return [{
          id: callId,
          type: 'waiter_call',
          title: '🛎️ Waiter Requested',
          message: `Table ${tableNum} (${custName}) is requesting service.`,
          tableNumber: tableNum,
          read: false,
          timestamp: ts
        }, ...prev]
      })
    }

    let broadcastChannel = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('servora_orders_channel')
        broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data || {}
          if (type === 'WAITER_CALL' && payload) {
            handleIncomingWaiterCall(payload)
          }
        }
      }
    } catch {}

    const windowListener = (e) => {
      if (e.detail) handleIncomingOrder(e.detail)
    }

    const windowWaiterListener = (e) => {
      if (e.detail) handleIncomingWaiterCall(e.detail)
    }

    const storageListener = (e) => {
      if (e.key === 'servora_latest_order' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed && (!parsed.restaurant_id || String(parsed.restaurant_id) === String(resolvedId))) {
            handleIncomingOrder(parsed)
          }
        } catch (err) {}
      }

      if (e.key === 'servora_latest_waiter_call' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed && (!parsed.restaurant_id || String(parsed.restaurant_id) === String(resolvedId))) {
            handleIncomingWaiterCall(parsed)
          }
        } catch (err) {}
      }
    }

    window.addEventListener('servora_new_order', windowListener)
    window.addEventListener('servora_waiter_call', windowWaiterListener)
    window.addEventListener('storage', storageListener)

    const channel = supabase
      .channel(`notifications:rid=${resolvedId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for ALL: insert, update
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${resolvedId}`
        },
        (payload) => {
          console.log('🔔 Notification Triggered:', payload)
          
          if (payload.eventType === 'INSERT') {
             handleIncomingOrder(payload.new)
          } else if (payload.eventType === 'UPDATE') {
             const order = payload.new
             const oldStatus = payload.old?.status
             
             if (order.status !== oldStatus) {
                const statusConfig = {
                  'PREPARING': { title: 'Order Started Preparing', icon: '👨‍🍳' },
                  'READY': { title: 'Order Ready for Pickup', icon: '✅' },
                  'SERVED': { title: 'Order Served', icon: '🎉' },
                  'BILL_REQUESTED': { title: 'Bill Requested', icon: '💳' },
                  'FINISHED': { title: 'Order Completed', icon: '🔚' },
                  'CANCELLED': { title: 'Order Cancelled', icon: '❌' }
                }

                const config = statusConfig[order.status]
                if (config) {
                  pushNotification({
                    type: 'order_status',
                    title: `${config.icon} ${config.title}`,
                    message: `Order #${order.id.slice(-6)} Table ${order.table_number || order.tableNumber} is now ${order.status}`,
                    orderId: order.id,
                    tableNumber: order.table_number || order.tableNumber,
                  }, 'orders')
                }
             }
          }
        }
      )
      .subscribe()
      
    const waiterChannel = supabase
        .channel(`waiter-toasts:rid=${resolvedId}`)
        .on('broadcast', { event: 'waiter_call' }, (payload) => {
           console.log('🔔 Notification Triggered (Waiter Broadcast):', payload)
           handleIncomingWaiterCall(payload.payload)
        })
        .subscribe()

    const dbWaiterChannel = isUUID(resolvedId)
      ? supabase
          .channel(`notif-waiter-pg:rid=${resolvedId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'waiter_calls',
              filter: `restaurant_id=eq.${resolvedId}`
            },
            (payload) => handleIncomingWaiterCall(payload.new)
          )
          .subscribe()
      : null

    const inventoryChannel = supabase
      .channel(`inventory:rid=${resolvedId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${resolvedId}` },
        (payload) => {
           if (payload.old.is_in_stock === true && payload.new.is_in_stock === false) {
             console.log('🔔 Notification Triggered (Inventory):', payload)
             pushNotification({
               type: 'inventory_alert',
               title: '⚠️ Item Out of Stock',
               message: `${payload.new.name} has been marked out of stock.`,
             }, 'inventory')
           }
        }
      )
      .subscribe()

    const dbNotifChannel = isUUID(resolvedId)
      ? supabase
          .channel(`notif-table-pg:rid=${resolvedId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `restaurant_id=eq.${resolvedId}`
            },
            (payload) => {
              const row = payload.new
              if (!row) return
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
                  type: row.type,
                  title: row.title,
                  message: row.message,
                  orderId: row.order_id,
                  tableNumber: row.table_number,
                  timestamp: row.created_at,
                  read: row.is_read
                }
                if (existingIdx !== -1) {
                  const next = [...prev]
                  next[existingIdx] = normalized
                  return next
                }
                return [normalized, ...prev]
              })
            }
          )
          .subscribe()
      : null

    return () => {
      if (broadcastChannel) broadcastChannel.close()
      window.removeEventListener('servora_new_order', windowListener)
      window.removeEventListener('servora_waiter_call', windowWaiterListener)
      window.removeEventListener('storage', storageListener)
      supabase.removeChannel(channel)
      supabase.removeChannel(waiterChannel)
      if (dbWaiterChannel) supabase.removeChannel(dbWaiterChannel)
      if (dbNotifChannel) supabase.removeChannel(dbNotifChannel)
      supabase.removeChannel(inventoryChannel)
    }
  }, [resolvedId, pushNotification])

  // Keep unreadCount synced declaratively from notifications
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  const markAsRead = useCallback(async (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    if (isUUID(id)) {
      await markNotificationRead(id).catch(() => {})
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    if (resolvedId) await markAllNotificationsRead(resolvedId)
  }, [resolvedId])

  const clearNotification = useCallback(async (id) => {
    // Note: No single delete API added, ideally we just mark as read
    // But we'll remove from UI
    setNotifications(prev => prev.filter(n => n.id !== id))
    // We update unread count just in case
    setUnreadCount(prev => {
       const remaining = notifications.filter(n => n.id !== id && !n.read).length
       return remaining
    })
  }, [notifications])

  const clearAllNotifications = useCallback(async () => {
    setNotifications([])
    setUnreadCount(0)
    if (resolvedId) await clearNotifications(resolvedId)
  }, [resolvedId])

  const toggleNotifications = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    notifications,
    unreadCount,
    isOpen,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    toggleNotifications
  }
}
