import { useState, useEffect, useRef } from 'react'
import { ShoppingBag, X, ChevronRight, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { ensureValidRestaurantUUID } from '@/services/restaurant.service'

export default function OrderNotification({ restaurantId, onOrderClick }) {
  const [toast, setToast] = useState(null)
  const [resolvedId, setResolvedId] = useState(null)
  const processedOrders = useRef(new Set())

  // Resolve Identity (Email or Alias to UUID)
  useEffect(() => {
    async function resolve() {
      if (!restaurantId) return
      try {
        const uuid = await ensureValidRestaurantUUID(restaurantId)
        if (uuid) {
          setResolvedId(uuid)
        } else {
          setResolvedId(restaurantId)
        }
      } catch (err) {
        setResolvedId(restaurantId)
      }
    }
    resolve()
  }, [restaurantId])

  useEffect(() => {
    const targetId = resolvedId || restaurantId || 'demo-merchant'

    const playChime = () => {
      // Dashboard audio alerts disabled cleanly (visual toast notifications remain active)
    }

    const handleNewOrder = (order) => {
      if (!order) return
      
      const orderId = order.id || `ord-${Date.now()}`
      
      // Deduplicate orders coming from multiple channels (postgres, broadcast, local storage)
      if (processedOrders.current.has(orderId)) return
      processedOrders.current.add(orderId)
      
      // Keep Set size manageable
      if (processedOrders.current.size > 100) {
        const iter = processedOrders.current.values()
        processedOrders.current.delete(iter.next().value)
      }

      console.log('🍞 Fresh Order Toast Received:', order)
      const itemsCount = order.items_count || order.itemsCount || 
                        (Array.isArray(order.items) ? order.items.length : 0) || 
                        (Array.isArray(order.order_items) ? order.order_items.length : 0) || 1

      playChime()
      setToast({
        id: orderId,
        type: 'order',
        tableNumber: order.table_number || order.tableNumber || '1',
        customerName: order.customer_name || order.customerName || 'Guest Customer',
        itemsCount: itemsCount,
        total: Number(order.total || 0),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })

      setTimeout(() => setToast(current => current?.id === order.id ? null : current), 9000)
    }

    const isDemo = restaurantId === 'demo-merchant' || restaurantId === 'demo' || targetId === 'demo-merchant'
    const matchesTargetTenant = (payload) => {
      if (!payload) return false
      const payloadRid = payload.restaurant_id
      if (isDemo) {
        return payloadRid === 'demo-merchant' || payloadRid === 'demo'
      }
      if (!payloadRid) return false
      return (
        payloadRid === targetId ||
        payloadRid === resolvedId ||
        payloadRid === restaurantId
      )
    }

    // ── 0. BroadcastChannel Cross-Tab Communication ──
    let broadcastChannel = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('servora_orders_channel')
        broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data || {}
          if (type === 'NEW_ORDER' && matchesTargetTenant(payload)) {
            handleNewOrder(payload)
          }
        }
      }
    } catch (bcErr) {
      console.warn('BroadcastChannel init notice:', bcErr)
    }

    // ── 1. Local Window Custom Event & Cross-Tab Storage Event ──
    const customEventListener = (e) => {
      if (e.detail && matchesTargetTenant(e.detail)) {
        handleNewOrder(e.detail)
      }
    }

    const storageListener = (e) => {
      if (e.key === 'servora_latest_order' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (matchesTargetTenant(parsed)) {
            handleNewOrder(parsed)
          }
        } catch (err) {
          console.warn('Storage order listener parse error:', err)
        }
      }
    }

    window.addEventListener('servora_new_order', customEventListener)
    window.addEventListener('storage', storageListener)

    // ── 2. Supabase Real-time Subscriptions (Strictly scoped to THIS tenant only) ──
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    const activeChannels = []

    const subId = !isDemo ? (isUUID(resolvedId) ? resolvedId : (isUUID(restaurantId) ? restaurantId : null)) : null

    // Listen to actual DB inserts ONLY if valid UUID
    if (subId) {
      const pgChannel = supabase
        .channel(`order-pg-changes:rid=${subId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${subId}`
          },
          (payload) => handleNewOrder(payload.new)
        )
        .subscribe()
      activeChannels.push(pgChannel)
    }

    const targetIds = new Set(
      (isDemo ? ['demo-merchant', 'demo'] : [subId, resolvedId, restaurantId, targetId]).filter(Boolean)
    )
    targetIds.forEach(id => {
      const orderCh = supabase
        .channel(`order-toasts:rid=${id}`)
        .on(
          'broadcast',
          { event: 'new_order' },
          (payload) => {
            if (matchesTargetTenant(payload?.payload)) {
              handleNewOrder(payload.payload)
            }
          }
        )
        .subscribe()
      activeChannels.push(orderCh)
    })

    return () => {
      if (broadcastChannel) broadcastChannel.close()
      window.removeEventListener('servora_new_order', customEventListener)
      window.removeEventListener('storage', storageListener)
      activeChannels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [resolvedId, restaurantId])

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -40, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.88, y: -30, transition: { duration: 0.22, ease: 'easeInOut' } }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.75}
          onDragEnd={(event, info) => {
            // Swipe left or right > 75px or quick velocity dismisses the toast
            if (Math.abs(info.offset.x) > 75 || Math.abs(info.velocity.x) > 350) {
              setToast(null)
            }
          }}
          whileDrag={{ scale: 0.98, opacity: 0.88 }}
          className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:top-6 sm:max-w-sm z-9999 cursor-grab active:cursor-grabbing mx-auto select-none touch-pan-y"
          onClick={() => {
            if (typeof onOrderClick === 'function') onOrderClick(toast)
            setToast(null)
          }}
        >
          <div className="relative group overflow-hidden bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-[2.2rem] border border-white/40 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] ring-1 ring-black/5 p-1.5 transition-shadow">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 via-transparent to-indigo-500/10 transition-opacity group-hover:opacity-100" />
            
            {/* Mobile Drag Indicator Pill */}
            <div className="flex justify-center pb-1 sm:hidden">
              <div className="w-9 h-1 rounded-full bg-slate-200/90" />
            </div>

            {/* Content Container */}
            <div className="relative flex items-center gap-3 sm:gap-4 bg-white rounded-xl sm:rounded-[1.9rem] p-3 sm:p-4 border border-slate-100/80">
              {/* Executive Icon Stack */}
              <div className="relative shrink-0">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 bg-slate-900 shadow-slate-900/20 text-white">
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                {/* Pulsing Badge */}
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center animate-pulse bg-blue-600">
                   <div className="w-1 h-1 bg-white rounded-full" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                    New Incoming Order
                  </p>
                  
                  {/* Swipe / Cross Close Button */}
                  <button 
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={(e) => {
                      e.stopPropagation()
                      setToast(null)
                    }}
                    className="p-1.5 -mr-1 -mt-1 hover:bg-slate-100 active:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <h4 className="text-sm sm:text-base font-black text-slate-900 truncate leading-tight">
                  Table {toast.tableNumber} <span className="text-slate-400 font-bold mx-1">•</span> {toast.customerName}
                </h4>
                
                <div className="flex items-center gap-2.5 sm:gap-4 mt-1 sm:mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] sm:text-[11px] font-bold">{toast.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <ShoppingBag className="w-3 h-3" />
                    <span className="text-[10px] sm:text-[11px] font-bold">{toast.itemsCount} Item{toast.itemsCount > 1 ? 's' : ''}</span>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] sm:text-[10px] px-1.5 py-0 font-black">
                     ₹{toast.total.toLocaleString()}
                  </Badge>
                </div>
              </div>

              <div className="pl-1 shrink-0 hidden xs:block">
                <div className="w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:border-blue-100 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="absolute bottom-0 left-4 right-4 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-full origin-right bg-blue-600 animate-[shrink_7s_linear_forwards]" />
            </div>
          </div>

          <style>{`
            @keyframes shrink {
              from { transform: scaleX(1); }
              to { transform: scaleX(0); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
