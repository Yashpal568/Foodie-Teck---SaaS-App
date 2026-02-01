import { useState, useEffect } from 'react'

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

// Save orders to localStorage
const saveOrders = (orders) => {
  try {
    localStorage.setItem('orders', JSON.stringify(orders))
  } catch (error) {
    console.error('Error saving orders:', error)
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

// Generate unique order ID
const generateOrderId = () => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create new order
const createOrder = (orderData) => {
  const order = {
    id: generateOrderId(),
    ...orderData,
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

// Update order status
const updateOrderStatus = (orderId, newStatus, note = '') => {
  const orders = loadOrders()
  const orderIndex = orders.findIndex(order => order.id === orderId)
  
  if (orderIndex !== -1) {
    orders[orderIndex].status = newStatus
    orders[orderIndex].updatedAt = new Date().toISOString()
    orders[orderIndex].statusHistory.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: note || `Status changed to ${newStatus}`
    })
    
    saveOrders(orders)
    return orders[orderIndex]
  }
  
  return null
}

// Get orders by restaurant
const getOrdersByRestaurant = (restaurantId) => {
  const orders = loadOrders()
  return orders.filter(order => order.restaurantId === restaurantId)
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
  const [loading, setLoading] = useState(false)

  // Load orders
  const refreshOrders = () => {
    setLoading(true)
    try {
      const restaurantOrders = getOrdersByRestaurant(restaurantId)
      setOrders(restaurantOrders)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    refreshOrders()
  }, [restaurantId])

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'orders') {
        refreshOrders()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [restaurantId])

  // Create order
  const createNewOrder = (orderData) => {
    const order = createOrder({
      ...orderData,
      restaurantId
    })
    refreshOrders()
    return order
  }

  // Update status
  const updateStatus = (orderId, newStatus, note) => {
    const updatedOrder = updateOrderStatus(orderId, newStatus, note)
    refreshOrders()
    return updatedOrder
  }

  return {
    orders,
    loading,
    refreshOrders,
    createOrder: createNewOrder,
    updateStatus,
    getOrdersByTable: (tableNumber) => getOrdersByTable(restaurantId, tableNumber),
    getOrderById
  }
}
