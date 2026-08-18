import { useState, useEffect } from 'react'
import { ShoppingBag, X, ChevronRight, Clock, MapPin, BellRing } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { ensureValidRestaurantUUID } from '@/services/restaurant.service'

export default function OrderNotification({ restaurantId, onOrderClick }) {
  const [toast, setToast] = useState(null)
  const [resolvedId, setResolvedId] = useState(null)

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
      try {
        // High-fidelity Web Audio API synth chime (zero external network dependency)
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.45)
      } catch (e) {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
          audio.play().catch(() => {})
        } catch (err) {}
      }

      // Haptic feedback for mobile devices
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([100, 50, 150])
        } catch (e) {}
      }
    }

    const handleNewOrder = (order) => {
      if (!order) return
      console.log('🍞 Fresh Order Toast Received:', order)
      const itemsCount = order.items_count || order.itemsCount || 
                        (Array.isArray(order.items) ? order.items.length : 0) || 
                        (Array.isArray(order.order_items) ? order.order_items.length : 0) || 1

      playChime()
      setToast({
        id: order.id || `ord-${Date.now()}`,
        type: 'order',
        tableNumber: order.table_number || order.tableNumber || '1',
        customerName: order.customer_name || order.customerName || 'Guest Customer',
        itemsCount: itemsCount,
        total: Number(order.total || 0),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })

      setTimeout(() => setToast(current => current?.id === order.id ? null : current), 9000)
    }

    const handleWaiterCall = (call) => {
      if (!call) return
      console.log('🔔 Live Waiter Call Received:', call)
      playChime()
      const toastId = call?.id || `waiter-${Date.now()}`
      setToast({
        id: toastId,
        type: 'waiter',
        tableNumber: call?.table_number || call?.tableNumber || '1',
        customerName: call?.customer_name || call?.customerName || 'Guest Table',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })

      setTimeout(() => setToast(current => current?.id === toastId ? null : current), 9000)
    }

    // ── 0. BroadcastChannel Cross-Tab Communication ──
    let broadcastChannel = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('servora_orders_channel')
        broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data || {}
          if (!payload) return

          const isDemo = restaurantId === 'demo-merchant' || targetId === 'demo-merchant'
          const idMatches = !payload.restaurant_id || 
                            payload.restaurant_id === targetId || 
                            payload.restaurant_id === resolvedId || 
                            payload.restaurant_id === restaurantId

          if (isDemo || idMatches) {
            if (type === 'NEW_ORDER') handleNewOrder(payload)
            if (type === 'WAITER_CALL') handleWaiterCall(payload)
          }
        }
      }
    } catch (bcErr) {
      console.warn('BroadcastChannel init notice:', bcErr)
    }

    // ── 1. Local Window Custom Event & Cross-Tab Storage Event ──
    const customEventListener = (e) => {
      if (e.detail) handleNewOrder(e.detail)
    }

    const customWaiterListener = (e) => {
      if (e.detail) handleWaiterCall(e.detail)
    }

    const storageListener = (e) => {
      if (e.key === 'servora_latest_order' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (!parsed) return

          // Match by ID or allow in demo mode
          const isDemo = restaurantId === 'demo-merchant' || targetId === 'demo-merchant'
          const idMatches = !parsed.restaurant_id || 
                            parsed.restaurant_id === targetId || 
                            parsed.restaurant_id === resolvedId || 
                            parsed.restaurant_id === restaurantId

          if (isDemo || idMatches) {
            handleNewOrder(parsed)
          }
        } catch (err) {
          console.warn('Storage order listener parse error:', err)
        }
      }

      if (e.key === 'servora_latest_waiter_call' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (!parsed) return

          const isDemo = restaurantId === 'demo-merchant' || targetId === 'demo-merchant'
          const idMatches = !parsed.restaurant_id || 
                            parsed.restaurant_id === targetId || 
                            parsed.restaurant_id === resolvedId || 
                            parsed.restaurant_id === restaurantId

          if (isDemo || idMatches) {
            handleWaiterCall(parsed)
          }
        } catch (err) {
          console.warn('Storage waiter listener parse error:', err)
        }
      }
    }

    window.addEventListener('servora_new_order', customEventListener)
    window.addEventListener('servora_waiter_call', customWaiterListener)
    window.addEventListener('storage', storageListener)

    // ── 2. Supabase Real-time Subscriptions (Both for resolved UUID & targetId) ──
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    let orderChannel = null
    const waiterChannels = []

    const subId = isUUID(resolvedId) ? resolvedId : (isUUID(restaurantId) ? restaurantId : null)

    if (subId) {
      orderChannel = supabase
        .channel(`order-toasts:rid=${subId}`)
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
    }

    const waiterTargetIds = new Set([subId, resolvedId, restaurantId, targetId, 'all'].filter(Boolean))
    waiterTargetIds.forEach(id => {
      const channel = supabase
        .channel(`waiter-toasts:rid=${id}`)
        .on(
          'broadcast',
          { event: 'waiter_call' },
          (payload) => {
            console.log('🔔 Live Waiter Call (Broadcast):', payload)
            handleWaiterCall(payload.payload)
          }
        )
        .subscribe()
      waiterChannels.push(channel)
    })

    return () => {
      if (broadcastChannel) broadcastChannel.close()
      window.removeEventListener('servora_new_order', customEventListener)
      window.removeEventListener('servora_waiter_call', customWaiterListener)
      window.removeEventListener('storage', storageListener)
      if (orderChannel) supabase.removeChannel(orderChannel)
      waiterChannels.forEach(ch => supabase.removeChannel(ch))
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
                <div className={cn(
                  "w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105",
                  toast.type === 'waiter' ? "bg-amber-500 shadow-amber-500/20 text-white" : "bg-slate-900 shadow-slate-900/20 text-white"
                )}>
                  {toast.type === 'waiter' ? (
                    <BellRing className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-bounce" />
                  ) : (
                    <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  )}
                </div>
                {/* Pulsing Badge */}
                <div className={cn(
                  "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center animate-pulse",
                  toast.type === 'waiter' ? "bg-amber-600" : "bg-blue-600"
                )}>
                   <div className="w-1 h-1 bg-white rounded-full" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className={cn(
                    "text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]",
                    toast.type === 'waiter' ? "text-amber-600" : "text-blue-600"
                  )}>
                    {toast.type === 'waiter' ? "Waiter Requested" : "New Incoming Order"}
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
                  {toast.type === 'order' ? (
                    <>
                      <div className="flex items-center gap-1 text-slate-500">
                        <ShoppingBag className="w-3 h-3" />
                        <span className="text-[10px] sm:text-[11px] font-bold">{toast.itemsCount} Item{toast.itemsCount > 1 ? 's' : ''}</span>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] sm:text-[10px] px-1.5 py-0 font-black">
                         ₹{toast.total.toLocaleString()}
                      </Badge>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600">
                      <MapPin className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Calling Now</span>
                    </div>
                  )}
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
              <div className={cn(
                "h-full w-full origin-right",
                toast.type === 'waiter' ? "bg-amber-600 animate-[shrink_9s_linear_forwards]" : "bg-blue-600 animate-[shrink_7s_linear_forwards]"
              )} />
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
