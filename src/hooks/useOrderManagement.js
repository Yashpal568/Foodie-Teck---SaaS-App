import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// Order status constants
export const ORDER_STATUS = {
  ORDERED: 'ORDERED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  BILL_REQUESTED: 'BILL_REQUESTED',
  FINISHED: 'FINISHED',
  CANCELLED: 'CANCELLED'
}

// Order status colors and icons
export const ORDER_STATUS_CONFIG = {
  [ORDER_STATUS.ORDERED]: {
    color: 'bg-blue-100 text-blue-800',
    icon: '📝',
    label: 'Order Placed',
    description: 'Order received by kitchen'
  },
  [ORDER_STATUS.PREPARING]: {
    color: 'bg-orange-100 text-orange-800',
    icon: '👨‍🍳',
    label: 'Preparing',
    description: 'Your order is being prepared'
  },
  [ORDER_STATUS.READY]: {
    color: 'bg-green-100 text-green-800',
    icon: '✅',
    label: 'Ready',
    description: 'Your order is ready for pickup'
  },
  [ORDER_STATUS.SERVED]: {
    color: 'bg-purple-100 text-purple-800',
    icon: '🎉',
    label: 'Served',
    description: 'Enjoy your meal!'
  },
  [ORDER_STATUS.BILL_REQUESTED]: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: '💳',
    label: 'Bill Requested',
    description: 'Customer requested the bill'
  },
  [ORDER_STATUS.FINISHED]: {
    color: 'bg-gray-100 text-gray-800',
    icon: '🔚',
    label: 'Finished',
    description: 'Payment completed and table closed'
  },
  [ORDER_STATUS.CANCELLED]: {
    color: 'bg-red-100 text-red-800',
    icon: '❌',
    label: 'Cancelled',
    description: 'Order was cancelled'
  }
}

// Save orders to localStorage with pruning for QuotaExceededError
const saveOrders = (orders) => {
  try {
    localStorage.setItem('orders', JSON.stringify(orders))
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded. Pruning old orders...')
      // Prune: Keep only the most recent 50 orders
      // Prefer keeping active orders over FINISHED/CANCELLED
      const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const activeOrders = sortedOrders.filter(o =>
        ![ORDER_STATUS.FINISHED, ORDER_STATUS.CANCELLED].includes(o.status)
      )
      const historicalOrders = sortedOrders.filter(o =>
        [ORDER_STATUS.FINISHED, ORDER_STATUS.CANCELLED].includes(o.status)
      )

      // Keep all active, but limit historical to fill up to 50 total
      const prunedOrders = [...activeOrders, ...historicalOrders.slice(0, Math.max(0, 50 - activeOrders.length))]

      try {
        localStorage.setItem('orders', JSON.stringify(prunedOrders))
        console.log(`Pruned orders from ${orders.length} to ${prunedOrders.length}`)
      } catch (retryError) {
        console.error('Pruning failed to resolve QuotaExceededError:', retryError)
      }
    } else {
      console.error('Error saving orders:', error)
    }
  }
}

// Load orders from localStorage
const loadOrders = () => {
  try {
    const saved = localStorage.getItem('orders')
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Error loading orders:', error)
    return []
  }
}

// Generate unique order ID - Short & Unique for UI readability
const generateOrderId = () => {
  const stamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `ORD-${stamp}-${random}`
}

// Create new order
const createOrder = (orderData) => {
  const order = {
    id: generateOrderId(),
    ...orderData,
    restaurantId: (orderData.restaurantId || 'default').toString().toLowerCase().trim(),
    status: ORDER_STATUS.ORDERED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    statusHistory: [
      {
        status: ORDER_STATUS.ORDERED,
        timestamp: new Date().toISOString(),
        note: 'Order placed'
      }
    ]
  }

  const orders = loadOrders()
  orders.push(order)
  saveOrders(orders)

  return order
}

// Check if a daily reset is needed
const checkDailyReset = () => {
  try {
    const lastReset = localStorage.getItem('lastAnalyticsReset')
    const today = new Date().toLocaleDateString('en-CA')

    if (!lastReset || lastReset !== today) {
      localStorage.setItem('totalRevenue', '0')
      const savedAnalytics = localStorage.getItem('menuAnalytics')
      if (savedAnalytics) {
        const analytics = JSON.parse(savedAnalytics)
        analytics.totalOrders = 0
        analytics.totalViews = 0
        localStorage.setItem('menuAnalytics', JSON.stringify(analytics))
      }
      localStorage.setItem('lastAnalyticsReset', today)
      return true
    }
    return false
  } catch (error) {
    console.error('Error checking daily reset:', error)
    return false
  }
}

// Update analytics data when an order is finished
const updateAnalytics = (order) => {
  try {
    checkDailyReset()
    // Update totalRevenue
    const currentRevenue = parseFloat(localStorage.getItem('totalRevenue') || '0')
    localStorage.setItem('totalRevenue', (currentRevenue + order.total).toString())

    // Update orderHistory with pruning (keep last 100)
    const savedOrderHistory = localStorage.getItem('orderHistory')
    let orderHistory = savedOrderHistory ? JSON.parse(savedOrderHistory) : []
    orderHistory.unshift({
      ...order,
      completedAt: new Date().toISOString(),
      revenue: order.total
    })

    // Limit to 100 entries to save space
    if (orderHistory.length > 100) {
      orderHistory = orderHistory.slice(0, 100)
    }

    localStorage.setItem('orderHistory', JSON.stringify(orderHistory))

    // Update menuAnalytics
    const savedAnalytics = localStorage.getItem('menuAnalytics')
    const analytics = savedAnalytics ? JSON.parse(savedAnalytics) : {
      itemViews: {},
      itemOrders: {},
      totalViews: 0,
      totalOrders: 0
    }

    analytics.totalOrders = (analytics.totalOrders || 0) + 1
    order.items.forEach(item => {
      analytics.itemOrders[item._id] = (analytics.itemOrders[item._id] || 0) + 1
    })

    localStorage.setItem('menuAnalytics', JSON.stringify(analytics))

    // Dispatch storage event manually for same-tab updates
    window.dispatchEvent(new Event('storage'))
  } catch (error) {
    console.error('Error updating analytics:', error)
  }
}

// Update order status
const updateOrderStatus = (orderId, newStatus, note = '') => {
  const orders = loadOrders()
  const orderIndex = orders.findIndex(order => order.id === orderId)

  if (orderIndex !== -1) {
    const oldStatus = orders[orderIndex].status
    orders[orderIndex].status = newStatus
    orders[orderIndex].updatedAt = new Date().toISOString()
    orders[orderIndex].statusHistory.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: note || `Status changed to ${newStatus}`
    })

    // Update analytics if the order is newly finished
    if (newStatus === ORDER_STATUS.FINISHED && oldStatus !== ORDER_STATUS.FINISHED) {
      updateAnalytics(orders[orderIndex])
      // Remove finished orders from active orders list
      orders.splice(orderIndex, 1)
    } else if (newStatus === ORDER_STATUS.CANCELLED) {
      // Also remove cancelled orders from active list
      orders.splice(orderIndex, 1)
    }

    saveOrders(orders)
    return orders[orderIndex] || null
  }

  return null
}

// Get orders by restaurant
const getOrdersByRestaurant = (restaurantId) => {
  const orders = loadOrders()
  const normalizedId = (restaurantId || 'default').toString().toLowerCase().trim()
  return orders.filter(order => {
    const orderRid = (order.restaurantId || 'default').toString().toLowerCase().trim()
    return orderRid === normalizedId
  })
}

// Get TOTAL order volume (Active + History) for persistent telemetry
export const getTotalOrderVolume = (restaurantId) => {
  const normalizedId = (restaurantId || 'default').toString().toLowerCase().trim()
  const orders = JSON.parse(localStorage.getItem('orders') || '[]')
  const history = JSON.parse(localStorage.getItem('orderHistory') || '[]')
  
  const activeCount = orders.filter(o => (o.restaurantId || 'default').toString().toLowerCase().trim() === normalizedId).length
  const historyCount = history.filter(o => (o.restaurantId || 'default').toString().toLowerCase().trim() === normalizedId).length
  
  return activeCount + historyCount
}

// Get orders by table
const getOrdersByTable = (restaurantId, tableNumber) => {
  const orders = loadOrders()
  return orders.filter(order =>
    order.restaurantId === restaurantId &&
    order.tableNumber === tableNumber &&
    order.status !== ORDER_STATUS.SERVED &&
    order.status !== ORDER_STATUS.CANCELLED
  )
}

// Get order by ID
const getOrderById = (orderId) => {
  const orders = loadOrders()
  return orders.find(order => order.id === orderId)
}

// Custom hook for order management
export const useOrderManagement = (restaurantId) => {
  const [orders, setOrders] = useState([])
  const [orderHistory, setOrderHistory] = useState([])
  const [loading, setLoading] = useState(false)

  // Load orders
  const refreshOrders = useCallback(() => {
    setLoading(true)
    try {
      const restaurantOrders = getOrdersByRestaurant(restaurantId)
      setOrders(restaurantOrders)

      // Load History
      const allHistory = JSON.parse(localStorage.getItem('orderHistory') || '[]')
      const normalizedId = (restaurantId || 'default').toString().toLowerCase().trim()
      const filteredHistory = allHistory.filter(order => 
        (order.restaurantId || 'default').toString().toLowerCase().trim() === normalizedId
      )
      setOrderHistory(filteredHistory)

    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  // Initial load
  useEffect(() => {
    refreshOrders()
  }, [refreshOrders])

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'orders' || e.key === 'orderHistory' || !e.key) {
        refreshOrders()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('orderUpdated', refreshOrders)
    window.addEventListener('orderHistoryUpdated', refreshOrders)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('orderUpdated', refreshOrders)
      window.removeEventListener('orderHistoryUpdated', refreshOrders)
    }
  }, [refreshOrders])

  // Create order
  const createNewOrder = (orderData) => {
    const order = createOrder({
      ...orderData,
      restaurantId
    })
    
    // Manual event dispatching to ensure ALL components catch this immediately
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('orderUpdated'))
    
    refreshOrders()
    return order
  }

  // Update status
  const updateStatus = (orderId, newStatus, note) => {
    const updatedOrder = updateOrderStatus(orderId, newStatus, note)
    refreshOrders()
    // If order was moved to history, notify others
    if (newStatus === ORDER_STATUS.FINISHED || newStatus === ORDER_STATUS.CANCELLED) {
       window.dispatchEvent(new Event('orderHistoryUpdated'))
    }
    return updatedOrder
  }

  return {
    orders,
    orderHistory,
    loading,
    refreshOrders,
    createOrder: createNewOrder,
    updateStatus,
    getOrdersByTable: (tableNumber) => getOrdersByTable(restaurantId, tableNumber),
    getOrderById
  }
}

