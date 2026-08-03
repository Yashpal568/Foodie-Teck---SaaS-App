import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  fetchNotifications, 
  insertNotification, 
  markNotificationRead, 
  markAllNotificationsRead, 
  clearNotifications 
} from '@/lib/api'

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
    async function resolve() {
      if (!restaurantId || !restaurantId.includes('@')) {
        setResolvedId(restaurantId)
        return
      }
      
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('email', restaurantId.toLowerCase())
        .single()
      
      if (data?.id) {
        setResolvedId(data.id)
      }
    }
    resolve()
  }, [restaurantId])

  // Load cloud notifications
  useEffect(() => {
    async function load() {
      if (!resolvedId) return
      const dbNotifications = await fetchNotifications(resolvedId)
      // Normalize to UI expectation
      const mapped = dbNotifications.map(n => ({
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
  const pushNotification = useCallback(async (payload) => {
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

  // ── Listen for real-time Supabase Table Events ──
  useEffect(() => {
    if (!resolvedId) return

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
             const order = payload.new
             pushNotification({
               type: 'new_order',
               title: '🔔 New Order Received',
               message: `Order #${order.id.slice(-6)} from Table ${order.table_number || order.tableNumber}`,
               orderId: order.id,
               tableNumber: order.table_number || order.tableNumber,
             })
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
                  })
                }
             }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [resolvedId, pushNotification])

  const markAsRead = useCallback(async (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    await markNotificationRead(id)
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
