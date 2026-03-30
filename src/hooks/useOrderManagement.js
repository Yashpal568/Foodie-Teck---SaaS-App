import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  fetchOrders, 
  createOrder as apiCreateOrder, 
  updateOrderStatus as apiUpdateStatus 
} from '@/lib/api'

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


// Custom hook for order management (SUPABASE POWERED)
export const useOrderManagement = (restaurantId) => {
  const [resolvedId, setResolvedId] = useState(null)
  const [orders, setOrders] = useState([])
  const [orderHistory, setOrderHistory] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Sync: Resolve Restaurant Identity ──
  useEffect(() => {
    let isMounted = true
    async function resolve() {
      if (!restaurantId) {
        if (isMounted) setLoading(false)
        return
      }
      
      try {
        // If it looks like an email, we need to resolve the UUID from DB
        if (restaurantId.includes('@')) {
          const { data, error } = await supabase
            .from('restaurants')
            .select('id')
            .eq('email', restaurantId.toLowerCase())
            .single()
          
          if (isMounted) {
            if (data?.id) {
              setResolvedId(data.id)
            } else {
              setLoading(false) // No restaurant found, stop loading
            }
          }
        } else {
          // Already a UUID or some other ID format
          if (isMounted) {
            setResolvedId(restaurantId)
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
    const idToUse = resolvedId || (!restaurantId?.includes('@') ? restaurantId : null)
    if (!idToUse) return
    
    if (showLoading) setLoading(true)
    try {
      const resp = await fetchOrders(idToUse)
      const allOrders = (resp || []).map(o => ({
        ...o,
        id: o.id,
        tableNumber: o.table_number || o.tableNumber,
        customerName: o.customer_name || o.customerName || 'Guest',
        items: o.order_items || o.items || [],
        total: o.total || 0,
        status: o.status || 'PENDING',
        createdAt: o.created_at,
        statusHistory: o.status_history || o.statusHistory || [
          { status: o.status || 'PENDING', timestamp: o.created_at, note: 'Order received' }
        ]
      }))
      
      // Separate Active vs History
      const active = allOrders.filter(o => 
        !['FINISHED', 'CANCELLED'].includes(o.status)
      )
      const history = allOrders.filter(o => 
        ['FINISHED', 'CANCELLED'].includes(o.status)
      )
      
      setOrders(active)
      setOrderHistory(history)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [restaurantId, resolvedId])

  // ── 2. Real-time Subscription ──
  useEffect(() => {
    const effectiveSubscriptionId = resolvedId || (!restaurantId?.includes('@') ? restaurantId : null)
    
    if (!effectiveSubscriptionId) return

    console.log(`📡 Initializing Real-time Sub for: ${effectiveSubscriptionId}`)
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

    return () => {
      supabase.removeChannel(channel)
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
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    ))

    try {
      const updated = await apiUpdateStatus(orderId, newStatus)
      // 2. Trigger a full refresh SILENTLY to ensure we are in sync
      await refreshOrders(false)
      return updated
    } catch (e) {
      console.error('Status update failed, rolling back:', e)
      // 3. Rollback on failure SILENTLY
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

