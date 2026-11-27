import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  fetchOrders, 
  createOrder as apiCreateOrder, 
  updateOrderStatus as apiUpdateStatus 
} from '@/lib/api'
import { ensureValidRestaurantUUID } from '@/services/restaurant.service'

// Order status constants
export const ORDER_STATUS = {
  PENDING: 'PENDING',
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
  [ORDER_STATUS.PENDING]: {
    color: 'bg-slate-100 text-slate-800',
    icon: '⏳',
    label: 'Pending',
    description: 'We have received your order'
  },
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


// Sample Mock Orders for Demo Merchant Mode
const MOCK_DEMO_ORDERS = [
  {
    id: 'demo-ord-101',
    tableNumber: '4',
    customerName: 'Aarav Sharma',
    items: [
      { name: 'Butter Chicken Grand', price: 420, quantity: 1 },
      { name: 'Garlic Butter Naan', price: 65, quantity: 2 },
      { name: 'Virgin Blue Mojito', price: 160, quantity: 2 }
    ],
    total: 770,
    status: 'PREPARING',
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
      { status: 'PREPARING', timestamp: new Date(Date.now() - 8 * 60000).toISOString() }
    ]
  },
  {
    id: 'demo-ord-102',
    tableNumber: '2',
    customerName: 'Priya Patel',
    items: [
      { name: 'Paneer Tikka Charcoal', price: 340, quantity: 1 },
      { name: 'Dal Makhani Special', price: 290, quantity: 1 },
      { name: 'Jeera Rice Bowl', price: 180, quantity: 1 }
    ],
    total: 810,
    status: 'READY',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 18 * 60000).toISOString() },
      { status: 'PREPARING', timestamp: new Date(Date.now() - 15 * 60000).toISOString() },
      { status: 'READY', timestamp: new Date(Date.now() - 2 * 60000).toISOString() }
    ]
  },
  {
    id: 'demo-ord-103',
    tableNumber: '7',
    customerName: 'Vikram Singh',
    items: [
      { name: 'Dum Handi Biryani', price: 450, quantity: 2 },
      { name: 'Gulab Jamun with Rabri', price: 150, quantity: 2 }
    ],
    total: 1200,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 2 * 60000).toISOString() }
    ]
  }
]

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

// Custom hook for order management (SUPABASE POWERED)
export const useOrderManagement = (restaurantId) => {
  const [resolvedId, setResolvedId] = useState(null)
  const [orders, setOrders] = useState([])
  const [orderHistory, setOrderHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const isDemo = restaurantId === 'demo-merchant' || restaurantId === 'demo' || restaurantId === 'guest'

  // ── Sync: Resolve Restaurant Identity ──
  useEffect(() => {
    let isMounted = true
    async function resolve() {
      if (!restaurantId) {
        if (isMounted) setLoading(false)
        return
      }
      
      try {
        const uuid = await ensureValidRestaurantUUID(restaurantId)
        if (isMounted) {
          if (uuid) {
            setResolvedId(uuid)
          } else {
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Identity resolution failed:', err)
        if (isMounted) setLoading(false)
      }
    }
    resolve()
    return () => { isMounted = false }
  }, [restaurantId])

  // ── 1. Fetch Orders from Database ──
  const refreshOrders = useCallback(async (showLoading = true) => {
    const idToUse = resolvedId || (isUUID(restaurantId) ? restaurantId : null)
    if (!idToUse) {
      if (isDemo) {
        setOrders(MOCK_DEMO_ORDERS.filter(o => !['FINISHED', 'CANCELLED'].includes(o.status)))
        setOrderHistory(MOCK_DEMO_ORDERS.filter(o => ['FINISHED', 'CANCELLED'].includes(o.status)))
      }
      if (showLoading) setLoading(false)
      return
    }
    
    if (showLoading) setLoading(true)
    try {
      const resp = await fetchOrders(idToUse)
      const allOrders = (resp || []).map(o => {
        const cName = String(o.customer_name || o.customerName || '')
        const oType = String(o.type || o.order_type || o.orderType || '')
        const isPrepaid = o.payment_status === 'PAID' || 
                          o.is_prepaid === true || 
                          cName.includes('PAID') || 
                          oType.includes('PAID')
        return {
          ...o,
          id: o.id,
          tableNumber: o.table_number || o.tableNumber || '1',
          customerName: cName.replace(/\s*•\s*PAID/gi, '').trim() || 'Guest',
          items: o.order_items || o.items || [],
          total: o.total || 0,
          status: o.status || 'PENDING',
          payment_status: isPrepaid ? 'PAID' : (o.payment_status || 'UNPAID'),
          is_prepaid: isPrepaid,
          type: oType.replace(/\s*•\s*PAID/gi, '').trim() || 'DINE-IN',
          notes: isPrepaid ? 'BILLING DONE / PAID IN ADVANCE ✅' : (o.notes || ''),
          createdAt: o.created_at,
          statusHistory: o.status_history || o.statusHistory || [
            { status: o.status || 'PENDING', timestamp: o.created_at, note: 'Order received' }
          ]
        }
      })
      
      // Separate Active vs History
      const active = allOrders.filter(o => 
        !['FINISHED', 'CANCELLED'].includes(o.status)
      )
      const history = allOrders.filter(o => 
        ['FINISHED', 'CANCELLED'].includes(o.status)
      )
      
      if (isDemo || allOrders.length === 0) {
        const mockActive = MOCK_DEMO_ORDERS.filter(o => !['FINISHED', 'CANCELLED'].includes(o.status))
        const mockHistory = MOCK_DEMO_ORDERS.filter(o => ['FINISHED', 'CANCELLED'].includes(o.status))
        setOrders(active.length > 0 ? active : mockActive)
        setOrderHistory(history.length > 0 ? history : mockHistory)
      } else {
        setOrders(active)
        setOrderHistory(history)
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [restaurantId, resolvedId, isDemo])

  // ── 2. Real-time Subscription ──
  useEffect(() => {
    const effectiveSubscriptionId = resolvedId || (isUUID(restaurantId) ? restaurantId : null)
    if (!effectiveSubscriptionId) {
      if (isDemo) refreshOrders(true)
      return
    }

    refreshOrders(true)

    // Listen for real-time changes to the 'orders' table
    const channel = supabase
      .channel(`public:orders:rid=${effectiveSubscriptionId}`)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${effectiveSubscriptionId}`
        },
        (payload) => {
          console.log('🔔 Live Order Event:', payload)
          refreshOrders(false) // BACKGROUND REFRESH (NO LOADING SPINNER)
        }
      )
      .subscribe()

    const handleLocalOrder = () => {
      refreshOrders(false)
    }
    window.addEventListener('newOrderCreated', handleLocalOrder)
    window.addEventListener('storage', handleLocalOrder)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('newOrderCreated', handleLocalOrder)
      window.removeEventListener('storage', handleLocalOrder)
    }
  }, [resolvedId, restaurantId, refreshOrders])

  // ── 3. Create Order via DB ──
  const createNewOrder = async (orderData) => {
    try {
      const order = await apiCreateOrder({
        ...orderData,
        restaurantId: resolvedId || restaurantId
      })
      return order
    } catch (e) {
      console.error('Order creation failed:', e)
      throw e
    }
  }

  // ── 4. Update Status via DB – WITH OPTIMISTIC UPDATES ──
  const updateStatus = async (orderId, newStatus) => {
    // 1. Optimistic Update (Immediate UI feedback)
    setOrders(prev => {
      const updated = prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      if (['FINISHED', 'CANCELLED'].includes(newStatus)) {
        const moved = updated.find(o => o.id === orderId)
        if (moved) {
          setOrderHistory(h => [moved, ...h])
        }
        return updated.filter(o => o.id !== orderId)
      }
      return updated
    })

    if (isDemo || !isUUID(orderId)) {
      const target = MOCK_DEMO_ORDERS.find(o => o.id === orderId)
      if (target) target.status = newStatus
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', { detail: { orderId, status: newStatus } }))
      return { id: orderId, status: newStatus }
    }

    try {
      const updated = await apiUpdateStatus(orderId, newStatus)
      await refreshOrders(false)
      return updated
    } catch (e) {
      console.error('Status update failed, rolling back:', e)
      refreshOrders(false)
      throw e
    }
  }

  // ── 5. Analytics Helper (Stats) ──
  const stats = useMemo(() => {
    const totalRevenue = orderHistory.reduce((sum, o) => sum + (o.total || 0), 0)
    return {
      totalRevenue,
      activeOrders: orders.length,
      historyCount: orderHistory.length
    }
  }, [orders, orderHistory])

  return {
    orders,
    orderHistory,
    loading,
    refreshOrders,
    createOrder: createNewOrder,
    updateStatus,
    stats,
    // Helper to get orders for a specific table
    getOrdersByTable: (tableNumber) => orders.filter(o => o.table_number === String(tableNumber))
  }
}

