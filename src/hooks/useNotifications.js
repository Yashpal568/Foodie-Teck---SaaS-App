import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

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

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications')
    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications)
      setNotifications(parsed)
      setUnreadCount(parsed.filter(n => !n.read).length)
    }
  }, [])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications))
    }
  }, [notifications])

  // Define addNotification before using it in useEffect
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev])
    setUnreadCount(prev => prev + 1)
  }, [])

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
             addNotification({
               id: `order-${order.id}-${Date.now()}`,
               type: 'new_order',
               title: '🔔 New Order Received',
               message: `Order #${order.id.slice(-6)} from Table ${order.table_number || order.tableNumber}`,
               orderId: order.id,
               tableNumber: order.table_number || order.tableNumber,
               timestamp: new Date().toISOString(),
               read: false
             })
             // Play notification sound
             audioRef.current?.play().catch(() => {})
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
                  addNotification({
                    id: `status-${order.id}-${Date.now()}`,
                    type: 'order_status',
                    title: `${config.icon} ${config.title}`,
                    message: `Order #${order.id.slice(-6)} Table ${order.table_number || order.tableNumber} is now ${order.status}`,
                    orderId: order.id,
                    timestamp: new Date().toISOString(),
                    read: false
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
  }, [resolvedId, addNotification])

  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    const notification = notifications.find(n => n.id === id)
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [notifications])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
    localStorage.removeItem('notifications')
  }, [])

  const toggleNotifications = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    notifications,
    unreadCount,
    isOpen,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    toggleNotifications
  }
}
