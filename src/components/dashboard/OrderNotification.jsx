import { useState, useEffect, useRef } from 'react'
import { ShoppingBag, X, ChevronRight, Clock, MapPin, BellRing } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default function OrderNotification() {
  const [toast, setToast] = useState(null)
  const lastOrderRef = useRef(null)
  const lastWaiterCallRef = useRef(null)

  // Initialize with current order count to avoid showing historical orders as new
  useEffect(() => {
    try {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      if (orders.length > 0) {
        lastOrderRef.current = orders[orders.length - 1].id
      }
      
      const waiterCalls = JSON.parse(localStorage.getItem('waiterCalls') || '[]')
      if (waiterCalls.length > 0) {
        lastWaiterCallRef.current = waiterCalls[waiterCalls.length - 1].id
      }
    } catch (e) {
      console.error('Failed to parse orders for initialization', e)
    }
  }, [])

  useEffect(() => {
    const checkNewOrders = () => {
      try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]')
        if (orders.length === 0) return

        const latestOrder = orders[orders.length - 1]
        
        // If it's a new order ID we haven't seen in this session
        if (latestOrder.id !== lastOrderRef.current) {
          lastOrderRef.current = latestOrder.id
          
          // Show the toast
          showOrderToast(latestOrder)
          
          // Play a subtle notification sound (optional, but premium)
          // const audio = new Audio('/notification.mp3')
          // audio.play().catch(e => console.log('Audio play prevented'))
        }
      } catch (e) {
        console.error('Error checking for new orders', e)
      }
    }

    const showOrderToast = (order) => {
      setToast({
        id: order.id,
        type: 'order',
        tableNumber: order.tableNumber,
        customerName: order.customerName || 'Guest',
        itemsCount: order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0,
        total: order.total,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })

      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        setToast(current => current?.id === order.id ? null : current)
      }, 6000)
    }

    const checkWaiterCalls = () => {
      try {
        const calls = JSON.parse(localStorage.getItem('waiterCalls') || '[]')
        if (calls.length === 0) return

        const latestCall = calls[calls.length - 1]
        
        if (latestCall.id !== lastWaiterCallRef.current) {
          lastWaiterCallRef.current = latestCall.id
          showWaiterToast(latestCall)
        }
      } catch (e) {
        console.error('Error checking for waiter calls', e)
      }
    }

    const showWaiterToast = (call) => {
      setToast({
        id: call.id,
        type: 'waiter',
        tableNumber: call.tableNumber,
        customerName: call.customerName || 'Guest',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })

      setTimeout(() => {
        setToast(current => current?.id === call.id ? null : current)
      }, 8000) // Stay slightly longer as it needs more immediate action
    }

    // Listen for storage changes (across tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === 'orders' || e.key === null) {
        checkNewOrders()
      }
      if (e.key === 'waiterCalls' || e.key === null) {
        checkWaiterCalls()
      }
    })

    // Listen for custom events (same tab)
    window.addEventListener('orderUpdated', checkNewOrders)
    window.addEventListener('waiterCalled', checkWaiterCalls)

    return () => {
      window.removeEventListener('storage', checkNewOrders)
      window.removeEventListener('storage', checkWaiterCalls)
      window.removeEventListener('orderUpdated', checkNewOrders)
      window.removeEventListener('waiterCalled', checkWaiterCalls)
    }
  }, [])

  if (!toast) return null

  return (
    <div className="fixed top-6 right-6 z-[9999] w-full max-w-sm animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="relative group overflow-hidden bg-white/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] p-1">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 transition-opacity group-hover:opacity-100" />
        
        {/* Content Container */}
        <div className="relative flex items-center gap-5 bg-white rounded-[2.2rem] p-5 border border-slate-100">
          {/* Executive Icon Stack */}
          <div className="relative">
            <div className={cn(
              "w-16 h-16 rounded-[1.6rem] flex items-center justify-center shadow-xl transition-transform duration-500 group-hover:scale-110",
              toast.type === 'waiter' ? "bg-amber-500 shadow-amber-500/10" : "bg-slate-900 shadow-slate-900/10"
            )}>
              {toast.type === 'waiter' ? (
                <BellRing className="w-8 h-8 text-white animate-bounce" />
              ) : (
                <ShoppingBag className="w-8 h-8 text-white" />
              )}
            </div>
            {/* Pulsing Badge */}
            <div className={cn(
              "absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center animate-pulse",
              toast.type === 'waiter' ? "bg-amber-600" : "bg-blue-600"
            )}>
               <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em]",
                toast.type === 'waiter' ? "text-amber-600" : "text-blue-600"
              )}>
                {toast.type === 'waiter' ? "Waiter Requested" : "New Incoming Order"}
              </p>
              <button 
                onClick={() => setToast(null)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <h4 className="text-[17px] font-black text-slate-900 truncate leading-tight">
              Table {toast.tableNumber} <span className="text-slate-400 font-bold mx-1">•</span> {toast.customerName}
            </h4>
            
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">{toast.timestamp}</span>
              </div>
              {toast.type === 'order' ? (
                <>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">{toast.itemsCount} Items</span>
                  </div>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 text-[10px] px-2 py-0.5 font-black uppercase tracking-wider">
                     ₹{toast.total.toLocaleString()}
                  </Badge>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Calling Now</span>
                </div>
              )}
            </div>
          </div>

          <div className="pl-2">
            <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:border-blue-100 transition-all">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="absolute bottom-0 left-6 right-6 h-1 bg-slate-50 rounded-full overflow-hidden">
          <div className={cn(
            "h-full w-full origin-right",
            toast.type === 'waiter' ? "bg-amber-600 animate-[shrink_8s_linear_forwards]" : "bg-blue-600 animate-[shrink_6s_linear_forwards]"
          )} />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}
