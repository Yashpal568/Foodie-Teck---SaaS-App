import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  fetchOrders, 
  createOrder as apiCreateOrder, 
  updateOrderStatus as apiUpdateStatus 
} from '@/lib/api'
import { getDemoOrders, DEMO_ORDERS_STORAGE_KEY } from '@/services/order.service'
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
    customerName: 'Table 4 Guest',
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
    customerName: 'Table 2 Guest',
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
    customerName: 'Table 7 Guest',
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

  // ── Sync: Resolve Restaurant Identity (reset stale state cleanly on tenant change) ──
  useEffect(() => {
    let isMounted = true
    setResolvedId(null)
    setOrders([])
    setOrderHistory([])

    async function resolve() {
      if (!restaurantId) {
        if (isMounted) setLoading(false)
        return
      }
      if (isDemo) {
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
  }, [restaurantId, isDemo])

  // ── 1. Fetch Orders from Database ──
  const refreshOrders = useCallback(async (showLoading = true) => {
    const normalizeList = (list) => (list || []).map(o => {
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
        order_items: o.order_items || o.items || [],
        total: o.total || 0,
        status: o.status || 'PENDING',
        payment_status: isPrepaid ? 'PAID' : (o.payment_status || 'UNPAID'),
        is_prepaid: isPrepaid,
        type: oType.replace(/\s*•\s*PAID/gi, '').trim() || 'DINE-IN',
        notes: isPrepaid ? 'BILLING DONE / PAID IN ADVANCE ✅' : (o.notes || ''),
        createdAt: o.created_at || o.createdAt,
        statusHistory: o.status_history || o.statusHistory || [
          { status: o.status || 'PENDING', timestamp: o.created_at || o.createdAt, note: 'Order received' }
        ]
      }
    })

    const idToUse = resolvedId || (isUUID(restaurantId) ? restaurantId : null)
    if (!idToUse) {
      if (isDemo) {
        const demoList = normalizeList(getDemoOrders())
        setOrders(demoList.filter(o => !['FINISHED', 'CANCELLED'].includes(o.status)))
        setOrderHistory(demoList.filter(o => ['FINISHED', 'CANCELLED'].includes(o.status)))
      }
      if (showLoading) setLoading(false)
      return
    }
    
    if (showLoading) setLoading(true)
    try {
      const resp = await fetchOrders(idToUse)
      const allOrders = normalizeList(resp)
      
      // Separate Active vs History
      const active = allOrders.filter(o => 
        !['FINISHED', 'CANCELLED'].includes(o.status)
      )
      const history = allOrders.filter(o => 
        ['FINISHED', 'CANCELLED'].includes(o.status)
      )
      
      if (isDemo) {
        const demoList = normalizeList(getDemoOrders())
        const demoActive = demoList.filter(o => !['FINISHED', 'CANCELLED'].includes(o.status))
        const demoHistory = demoList.filter(o => ['FINISHED', 'CANCELLED'].includes(o.status))
        setOrders(active.length > 0 ? active : demoActive)
        setOrderHistory(history.length > 0 ? history : demoHistory)
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
    } else {
      refreshOrders(true)
    }

    let channel = null
    if (effectiveSubscriptionId) {
      // Listen for real-time changes to the 'orders' table
      channel = supabase
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
            refreshOrders(false)
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_items'
          },
          () => {
            refreshOrders(false)
          }
        )
        .subscribe()
    }

    const handleLocalOrder = () => {
      refreshOrders(false)
    }
    const handleStorageEvent = (e) => {
      if (
        !e.key ||
        e.key === DEMO_ORDERS_STORAGE_KEY ||
        e.key === 'servora_latest_order'
      ) {
        refreshOrders(false)
      }
    }

    let bc = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('servora_orders_channel')
        bc.onmessage = () => refreshOrders(false)
      }
    } catch {
      // ignore BroadcastChannel failures
    }

    const safetyInterval = setInterval(() => {
      refreshOrders(false)
    }, 8000)

    window.addEventListener('newOrderCreated', handleLocalOrder)
    window.addEventListener('servora_new_order', handleLocalOrder)
    window.addEventListener('orderStatusUpdated', handleLocalOrder)
    window.addEventListener('storage', handleStorageEvent)

    return () => {
      clearInterval(safetyInterval)
      if (channel) supabase.removeChannel(channel)
      if (bc) bc.close()
      window.removeEventListener('newOrderCreated', handleLocalOrder)
      window.removeEventListener('servora_new_order', handleLocalOrder)
      window.removeEventListener('orderStatusUpdated', handleLocalOrder)
      window.removeEventListener('storage', handleStorageEvent)
    }
  }, [resolvedId, restaurantId, isDemo, refreshOrders])

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
      const updated = await apiUpdateStatus(orderId, newStatus)
      await refreshOrders(false)
      return updated
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
    const totalRevenue = orderHistory
      .filter(o => String(o.status || '').toUpperCase() !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.total || 0), 0)
    return {
      totalRevenue,
      activeOrders: orders.length,
      pendingOrders: orders.filter(o => ['PENDING', 'ORDERED'].includes(String(o.status || '').toUpperCase())).length,
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

