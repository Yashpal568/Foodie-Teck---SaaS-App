import { useState, useEffect, useCallback } from 'react'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

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

  // Listen for new orders
  useEffect(() => {
    const checkForNewOrders = () => {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      const lastOrderCheck = localStorage.getItem('lastOrderCheck') || '0'
      
      const newOrders = orders.filter(order => 
        new Date(order.createdAt) > new Date(lastOrderCheck) && 
        order.status === 'ORDERED'
      )

      if (newOrders.length > 0) {
        newOrders.forEach(order => {
          addNotification({
            id: `order-${order.id}-${Date.now()}`,
            type: 'new_order',
            title: '🔔 New Order Received',
            message: `Order #${order.id.slice(-6)} from Table ${order.tableNumber}`,
            orderId: order.id,
            tableNumber: order.tableNumber,
            timestamp: new Date().toISOString(),
            read: false
          })
        })
        
        localStorage.setItem('lastOrderCheck', new Date().toISOString())
      }
    }

    // Check immediately
    checkForNewOrders()

    // Set up interval to check for new orders
    const interval = setInterval(checkForNewOrders, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [addNotification])

  // Listen for order status changes
  useEffect(() => {
    const checkOrderStatusChanges = () => {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      const lastStatusCheck = localStorage.getItem('lastStatusCheck') || '0'
      
      const recentOrders = orders.filter(order => 
        new Date(order.updatedAt) > new Date(lastStatusCheck) && 
        order.updatedAt !== order.createdAt // Only status changes, not new orders
      )

      if (recentOrders.length > 0) {
        recentOrders.forEach(order => {
          const statusConfig = {
            'PREPARING': { title: 'Order Started Preparing', icon: '👨‍🍳', color: 'orange' },
            'READY': { title: 'Order Ready for Pickup', icon: '✅', color: 'green' },
            'SERVED': { title: 'Order Served', icon: '🎉', color: 'purple' },
            'BILL_REQUESTED': { title: 'Bill Requested', icon: '💳', color: 'yellow' },
            'FINISHED': { title: 'Order Completed', icon: '🔚', color: 'gray' },
            'CANCELLED': { title: 'Order Cancelled', icon: '❌', color: 'red' }
          }

          const config = statusConfig[order.status]
          if (config) {
            addNotification({
              id: `status-${order.id}-${Date.now()}`,
              type: 'order_status',
              title: config.title,
              message: `Order #${order.id.slice(-6)} from Table ${order.tableNumber} is now ${order.status.replace('_', ' ')}`,
              orderId: order.id,
              tableNumber: order.tableNumber,
              status: order.status,
              timestamp: new Date().toISOString(),
              read: false
            })
          }
        })
        
        localStorage.setItem('lastStatusCheck', new Date().toISOString())
      }
    }

    // Set up interval to check for status changes
    const interval = setInterval(checkOrderStatusChanges, 3000) // Check every 3 seconds

    return () => clearInterval(interval)
  }, [addNotification])

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
