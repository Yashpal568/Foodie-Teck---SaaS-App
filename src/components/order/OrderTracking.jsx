import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { 
  ChefHat, 
  CheckCircle, 
  Receipt, 
  ArrowLeft, 
  Phone, 
  Utensils,
  Timer,
  Clock,
  Calendar,
  CreditCard,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Logo from '@/components/ui/Logo'
import MenuBottomNavbar from '@/components/menu/MenuBottomNavbar'
import { useOrderManagement, ORDER_STATUS, ORDER_STATUS_CONFIG } from '@/hooks/useOrderManagement'
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile'
import { cn } from '@/lib/utils'

const OrderTracking = ({ orderId, restaurantId, onClose }) => {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [isCallingWaiter, setIsCallingWaiter] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  
  const { orders, orderHistory, refreshOrders, updateStatus: apiUpdateStatus, loading: hookLoading } = useOrderManagement(restaurantId)
  
  const { profile } = useRestaurantProfile(restaurantId)

  const [journey, setJourney] = useState([]);

  // Load order details with table session auto-refresh logic
  useEffect(() => {
    // If hook finished loading, we definitely want to stop our local spinner
    if (!hookLoading) {
      const allOrders = [...orders, ...orderHistory]
      const foundOrder = allOrders.find(o => String(o.id) === String(orderId))
      
      if (foundOrder) {
        setOrder(foundOrder)
        
        // ── Client-Side Journey Fallback ──
        // Since the DB lacks a status_history column, we simulate it in the session
        const storedJourney = JSON.parse(sessionStorage.getItem(`order_journey_${orderId}`) || '[]');
        
        // If we have nothing yet, initialize from current status
        if (storedJourney.length === 0) {
           const initialStep = { 
              status: foundOrder.status || 'PENDING', 
              timestamp: foundOrder.createdAt || new Date().toISOString(),
              note: 'Tracking initialized'
           };
           setJourney([initialStep]);
           sessionStorage.setItem(`order_journey_${orderId}`, JSON.stringify([initialStep]));
        } else {
           // If the current status is NEWER than our last journey step, append it
           const lastStep = storedJourney[storedJourney.length - 1];
           if (lastStep.status !== foundOrder.status) {
              const updated = [...storedJourney, {
                 status: foundOrder.status,
                 timestamp: new Date().toISOString(),
                 note: `Order marked as ${foundOrder.status.toLowerCase()}`
              }];
              setJourney(updated);
              sessionStorage.setItem(`order_journey_${orderId}`, JSON.stringify(updated));
           } else {
              setJourney(storedJourney);
           }
        }
      }
      setLoading(false)
    }
  }, [orders, orderHistory, orderId, hookLoading])

  useEffect(() => {
    // ── Primary: Real-time via hook ──
    // ── Secondary: Safety Poll ──
    const safetyPoll = setInterval(() => {
      console.log('🔄 Performing safety status refresh...')
      refreshOrders()
    }, 30000)

    // Listen for cart changes for the navbar
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]')
    setCart(savedCart)

    const handleStorageChange = (e) => {
      if (e.key === 'cart') {
        setCart(JSON.parse(e.newValue || '[]'))
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      clearInterval(safetyPoll)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleCallConcierge = async () => {
    if (isCallingWaiter || !profile?.id) return;
    
    setIsCallingWaiter(true);
    
    try {
      const { error } = await supabase
        .from('waiter_calls')
        .insert([{
          restaurant_id: profile.id,
          table_number: order?.tableNumber || order?.table_number || '?',
          customer_name: order?.customerName || order?.customer_name || 'Guest'
        }]);

      if (error) throw error;
      
      // Also keep local event for immediate local UI feedback if any
      window.dispatchEvent(new Event('waiterCalled'));
      
    } catch (err) {
      console.error('Waiter call failed:', err);
      setIsCallingWaiter(false);
    }
    
    // Cooldown
    setTimeout(() => {
      setIsCallingWaiter(false);
    }, 30000); // 30 second cooldown
  };

  // Update order status via Cloud
  const updateOrderStatus = async (newStatus) => {
    try {
      if (!order?.id) return
      await apiUpdateStatus(order.id, newStatus)
      // The hook's real-time subscription will update the 'order' state automatically
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent animate-spin rounded-full mx-auto mb-6 shadow-2xl shadow-slate-200"></div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Authenticating Session...</h2>
          <p className="text-sm text-slate-400 mt-2 font-medium">Retrieving your culinary journey details</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-slate-100">
               <Receipt className="w-10 h-10 text-slate-300" />
            </div>
            <div className="space-y-2">
               <h2 className="text-3xl font-bold text-slate-900 tracking-tighter">Session Unavailable</h2>
               <p className="text-slate-500 font-medium">We were unable to locate your active order session in our system.</p>
            </div>
            <Button
              onClick={onClose}
              className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-2xl shadow-slate-900/10 transition-all uppercase tracking-widest text-xs"
            >
              Return to Catalog
            </Button>
        </div>
      </div>
    )
  }

  // Finalized Session Logic (Triggers after 60s of SERVED or when FINISHED, but only once)
  const hasBeenThanked = localStorage.getItem(`thanked_${order?.id}`)
  if ((order?.status === ORDER_STATUS.FINISHED || showThankYou) && !hasBeenThanked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 selection:bg-slate-900 selection:text-white">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-10"
        >
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full animate-pulse" />
             <div className="relative w-32 h-32 bg-emerald-50 rounded-[3rem] border border-emerald-100 flex items-center justify-center mx-auto shadow-inner group">
                <CheckCircle className="w-16 h-16 text-emerald-500 group-hover:scale-110 transition-transform duration-700" />
             </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tighter text-balance">Thank You for Dining with Us!</h2>
            <div className="space-y-2">
               <p className="text-slate-500 font-medium">It was our pleasure hosting you at <span className="text-slate-900 font-bold">Servora</span> today.</p>
               <p className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-[10px]">Your session has been successfully concluded.</p>
            </div>
          </div>

          <div className="pt-6">
            <Button
              onClick={() => {
                localStorage.setItem(`thanked_${order.id}`, 'true')
                onClose()
              }}
              className="w-full h-16 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-2xl shadow-slate-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-[11px]"
            >
              Finish Session
            </Button>
            <p className="mt-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Servora Experience Engine v1.0</p>
          </div>
        </motion.div>
      </div>
    )
  }

  const currentStatusConfig = ORDER_STATUS_CONFIG[order?.status] || {
    icon: '⏳',
    label: order?.status || 'Processing',
    description: 'We are updating your order status'
  }
  const isServed = order?.status === ORDER_STATUS.SERVED

  // Calculate progress percentage
  const statusProgress = {
    [ORDER_STATUS.ORDERED]: 20,
    [ORDER_STATUS.PREPARING]: 40,
    [ORDER_STATUS.READY]: 60,
    [ORDER_STATUS.SERVED]: 80,
    [ORDER_STATUS.BILL_REQUESTED]: 90,
    [ORDER_STATUS.FINISHED]: 100
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(price)
  }

  const currentProgress = statusProgress[order?.status] || 0

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-slate-900 pb-20 overflow-x-hidden relative transition-colors duration-700">
      
      {/* Premium Navbar - Logo Left */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/50 z-50 px-6"
      >

        <div className="max-w-screen-xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo showText={true} iconSize={26} className="scale-100" />
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Experience</span>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Table</span>
                <span className="text-[10px] font-bold text-slate-900">{order.tableNumber}</span>
             </div>
             <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-9 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all hover:bg-slate-50"
             >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
             </Button>
          </div>

        </div>
      </motion.nav>

      <main className="max-w-6xl mx-auto pt-28 px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Visual Journey Column */}
          <div className="lg:col-span-12 xl:col-span-8 space-y-8">
            
            {/* Live Tracking Hero Card */}
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.2 }}
               className="relative rounded-[2.5rem] p-1 shadow-2xl shadow-slate-200 group overflow-hidden"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-100 z-0" />
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
               <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 blur-[80px] -ml-24 -mb-24 rounded-full" />
               
               <div className="relative z-10 bg-slate-950/20 backdrop-blur-3xl rounded-[2.4rem] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="space-y-6 text-center md:text-left flex-1">
                     <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Live Experience Hub</span>
                     </div>
                     
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                             {currentStatusConfig.label}
                           </h2>
                           <p className="text-slate-400 text-sm md:text-base font-medium max-w-sm">
                             {currentStatusConfig.description}
                           </p>



                        </div>
                        
                        {/* Dynamic Progress Indicator */}
                        <div className="pt-2 max-w-xs transition-all">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Journey Progress</span>
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{currentProgress}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/10">
                              <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${currentProgress}%` }}
                                 transition={{ type: "spring", stiffness: 50, damping: 20 }}
                                 className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]" 
                              />
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-wrap gap-4 pt-4 justify-center md:justify-start">
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm">
                           <div className="text-left">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prep Time</p>
                              <p className="text-base font-bold text-white leading-none mt-1">15-20 Mins</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm">
                           <div className="text-left">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Order Reference</p>
                              <p className="text-base font-bold text-white leading-none mt-1">#{order.id.slice(-6).toUpperCase()}</p>
                           </div>
                        </div>
                     </div>



                  </div>

                  <div className="relative flex flex-col items-center">
                     <div className="w-40 h-40 md:w-56 md:h-56 rounded-full border border-white/10 flex items-center justify-center relative">
                        {/* Animated Pulses */}
                        <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-ping opacity-50" />
                        <div className="absolute inset-8 rounded-full border border-emerald-400/40 animate-[ping_4s_infinite] opacity-30" />
                        
                        <div className="w-32 h-32 md:w-44 md:h-44 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center text-5xl md:text-7xl shadow-2xl border border-white/10">
                           {currentStatusConfig.icon}
                        </div>
                     </div>
                     <span className="mt-8 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Pulse Status Active</span>


                  </div>
               </div>
            </motion.div>

            {/* Tracking Sequence & Relatable Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
               {/* Detail Roadmap - Premium Redesign */}
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ duration: 0.2, delay: 0.1 }}
                 className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-100/40 overflow-hidden"
               >

                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                     <div className="h-10 w-10 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                        <Timer className="w-4.5 h-4.5" />
                     </div>
                     <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Active Sequence</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Journey</p>
                     </div>

                     <div className="ml-auto flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
                     </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative space-y-1 px-1">
                     {(journey || []).slice().reverse().map((history, index) => {
                       const statusConfig = ORDER_STATUS_CONFIG[history.status] || {
                         icon: '🕒',
                         label: history.status,
                         description: 'Status update recorded'
                       }
                       const isCurrent = history.status === order?.status
                       const isPast = !isCurrent
                       const historyArray = journey || []
                       const isLast = index === historyArray.length - 1

                       return (
                         <motion.div
                           key={index}
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           transition={{ duration: 0.15, delay: index * 0.04 }}
                           className="flex gap-4 relative"
                         >
                           {/* Connector Line */}
                           {!isLast && (
                             <div className="absolute left-[18px] top-12 bottom-0 w-[2px]">
                               <div className={cn(
                                 "h-full w-full rounded-full",
                                 isCurrent ? "bg-gradient-to-b from-emerald-400 to-slate-100" : "bg-slate-100"
                               )} />
                             </div>
                           )}

                           {/* Step Icon */}
                           <div className="relative flex-shrink-0 flex flex-col items-center">
                             <motion.div
                               animate={isCurrent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                               transition={isCurrent ? { repeat: Infinity, duration: 2.5, ease: "easeInOut" } : {}}
                               className={cn(
                                 "h-9 w-9 rounded-2xl flex items-center justify-center text-lg border-2 z-10 shadow-sm",
                                 isCurrent
                                   ? "bg-emerald-50 border-emerald-300 shadow-emerald-200/80 shadow-lg"
                                   : "bg-slate-50 border-slate-100"
                               )}
                             >
                               {statusConfig.icon}
                             </motion.div>
                             {isCurrent && (
                               <div className="absolute -inset-1.5 rounded-[18px] bg-emerald-400/20 blur-sm animate-pulse" />
                             )}
                           </div>

                           {/* Content */}
                           <div className="flex-1 pb-7 transition-all duration-300">
                             <div className={cn(
                               "rounded-2xl p-4 border transition-all",
                               isCurrent
                                 ? "bg-gradient-to-br from-emerald-50/80 to-slate-50 border-emerald-100 shadow-sm"
                                 : "bg-slate-50/70 border-slate-100"
                             )}>
                               <div className="flex items-center justify-between mb-1">
                                 <h4 className={cn(
                                    "text-sm font-bold tracking-tight",
                                    isCurrent ? "text-slate-900" : "text-slate-600"
                                 )}>
                                   {statusConfig.label}
                                 </h4>

                                 <span className={cn(
                                   "text-[10px] font-bold font-mono",
                                   isCurrent ? "text-emerald-600" : "text-slate-400"
                                 )}>
                                   {new Date(history.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                               </div>
                               <p className={cn(
                                 "text-[11px] leading-relaxed",
                                 isCurrent ? "text-slate-500 font-medium" : "text-slate-400"
                               )}>
                                 {history.note || 'Order state updated'}
                               </p>
                               {isCurrent && (
                                 <div className="mt-3 flex items-center gap-1.5">
                                   <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                                   <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Current Status</span>
                                 </div>
                               )}
                             </div>
                           </div>
                         </motion.div>
                       )
                     })}
                  </div>
               </motion.div>

               {/* Relatable Context Card - Dynamic per status */}
               {(() => {
                 const contextByStatus = {
                   [ORDER_STATUS.ORDERED]: {
                     accent: 'bg-blue-500',
                     glow: 'bg-blue-500/10',
                     title: 'Order Received!',
                     description: 'Your order is in the queue. Our kitchen team has been notified and will begin preparation shortly. Thank you for your patience.',
                     metricLabel: 'Queue Status',
                     metricValue: 'Confirmed',
                     metricColor: 'text-blue-400',
                     barColor: 'bg-blue-500',
                     barGlow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]',
                     barWidth: '20%',
                     quote: '"Your culinary journey is about to begin."'
                   },
                   [ORDER_STATUS.PREPARING]: {
                     accent: 'bg-orange-500',
                     glow: 'bg-orange-500/10',
                     title: 'Crafting Perfection',
                     description: 'Our master chefs are handling your order with extreme precision. Each dish is made with the freshest ingredients and expert technique.',
                     metricLabel: 'Kitchen Activity',
                     metricValue: 'In Progress',
                     metricColor: 'text-orange-400',
                     barColor: 'bg-orange-500',
                     barGlow: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]',
                     barWidth: '55%',
                     quote: '"Savor the anticipation, the journey has just begun."'
                   },
                   [ORDER_STATUS.READY]: {
                     accent: 'bg-emerald-500',
                     glow: 'bg-emerald-500/10',
                     title: 'Almost There!',
                     description: 'Your dishes are fresh off the kitchen and ready to be served. A member of our team is on their way to your table right now.',
                     metricLabel: 'Delivery Status',
                     metricValue: 'Dispatched',
                     metricColor: 'text-emerald-400',
                     barColor: 'bg-emerald-500',
                     barGlow: 'shadow-[0_0_10px_rgba(52,211,153,0.5)]',
                     barWidth: '80%',
                     quote: '"Your feast is moments away — enjoy every bite."'
                   },
                   [ORDER_STATUS.SERVED]: {
                     accent: 'bg-purple-500',
                     glow: 'bg-purple-500/10',
                     title: 'Enjoy Your Meal!',
                     description: 'Your meal has been served. Sit back, relax and enjoy. Our team is nearby if you need anything — just raise your hand!',
                     metricLabel: 'Dining Status',
                     metricValue: 'Enjoy Meal',
                     metricColor: 'text-purple-400',
                     barColor: 'bg-purple-500',
                     barGlow: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]',
                     barWidth: '100%',
                     quote: '"A meal shared is a memory made. Enjoy!"'
                   },
                   [ORDER_STATUS.BILL_REQUESTED]: {
                     accent: 'bg-yellow-500',
                     glow: 'bg-yellow-500/10',
                     title: 'Bill On Its Way',
                     description: 'Your bill has been requested. Our team is preparing your receipt. We hope you had a wonderful dining experience with us today.',
                     metricLabel: 'Payment Status',
                     metricValue: 'Pending',
                     metricColor: 'text-yellow-400',
                     barColor: 'bg-yellow-500',
                     barGlow: 'shadow-[0_0_10px_rgba(234,179,8,0.5)]',
                     barWidth: '95%',
                     quote: '"Thank you for choosing Servora today."'
                   },
                   [ORDER_STATUS.FINISHED]: {
                     accent: 'bg-slate-50',
                     glow: 'bg-slate-500/10',
                     title: 'Session Complete',
                     description: 'Your dining session has been successfully concluded. We hope everything was to your satisfaction. Visit us again soon!',
                     metricLabel: 'Session',
                     metricValue: 'Closed',
                     metricColor: 'text-slate-400',
                     barColor: 'bg-slate-500',
                     barGlow: '',
                     barWidth: '100%',
                     quote: '"See you next time at Servora!"'
                   }
                 }
                 const ctx = contextByStatus[order.status] || contextByStatus[ORDER_STATUS.PREPARING]
                 return (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     transition={{ duration: 0.2, delay: 0.15 }}
                     className="space-y-8"
                   >
                      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/10 h-full flex flex-col justify-center relative overflow-hidden group">
                         <div className={`absolute top-0 right-0 w-48 h-48 ${ctx.glow} blur-[80px] -mr-24 -mt-24 rounded-full transition-transform group-hover:scale-125 duration-1000`} />
                         <AnimatePresence mode="wait">
                           <motion.div
                             key={order.status}
                             initial={{ opacity: 0, y: 8 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -8 }}
                             transition={{ duration: 0.3 }}
                             className="relative z-10 space-y-6"
                           >
                              <div className={`w-16 h-1 ${ctx.accent} rounded-full`} />
                              <h3 className="text-3xl font-bold tracking-tight leading-tight">{ctx.title}</h3>
                              <p className="text-slate-400 text-sm leading-relaxed font-medium">{ctx.description}</p>
                              <div className="py-6 space-y-4 border-y border-white/5">
                                 <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{ctx.metricLabel}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${ctx.metricColor}`}>{ctx.metricValue}</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: ctx.barWidth }}
                                       transition={{ duration: 1, ease: 'easeOut' }}
                                       className={`h-full ${ctx.barColor} ${ctx.barGlow}`} 
                                    />
                                 </div>
                              </div>
                              <p className="text-slate-500 text-[11px] font-bold italic">{ctx.quote}</p>

                           </motion.div>
                         </AnimatePresence>
                      </div>

                   </motion.div>
                 )
               })()}
            </div>
          </div>

          {/* Precision Sidebar */}
          <div className="lg:col-span-12 xl:col-span-4 space-y-8">
             {/* Dynamic Action Center */}
             {isServed && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ duration: 0.2 }}
                 className="bg-white rounded-[2.5rem] p-10 border border-slate-200/60 shadow-xl shadow-slate-100/50 space-y-8"
               >
                  <div className="space-y-2">
                     <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Your Session is Live</h3>
                     <p className="text-slate-500 text-xs font-medium">Everything you ordered has been served. How can we enhance your experience further?</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     <Button 
                       onClick={() => window.location.href = `/menu?restaurant=${restaurantId}&table=${order?.tableNumber || ''}`}
                       className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                     >
                        <Utensils className="w-5 h-5" />
                        <span className="text-xs uppercase tracking-widest">Order More</span>
                     </Button>
                     <Button 
                       variant="outline"
                       onClick={() => updateOrderStatus(ORDER_STATUS.BILL_REQUESTED)}
                       className="w-full h-14 bg-white hover:bg-slate-50 border-slate-200 text-slate-900 font-bold rounded-2xl transition-all h-14 flex items-center justify-center gap-3"
                     >
                        <Receipt className="w-5 h-5" />
                        <span className="text-xs uppercase tracking-widest">Request Bill</span>
                     </Button>
                  </div>
               </motion.div>
             )}             {/* Order Receipt - Full Redesign */}
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.2 }}
               className="rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100 bg-white"
             >

               {/* Receipt Header */}
               <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6">
                 <div className="flex items-start justify-between mb-4">
                   <div>
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Order Receipt</p>
                     <p className="text-white font-mono font-bold text-lg tracking-widest">#{order.id.slice(-6).toUpperCase()}</p>
                   </div>
                   <div className="flex flex-col items-end gap-1.5">
                     <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                       ● Verified
                     </span>
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                       Table {order.tableNumber}
                     </span>
                   </div>
                 </div>
                 <div className="h-px bg-white/5" />
               </div>

               {/* Items List */}
               <div className="bg-white p-6 space-y-3">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Your Items</p>
                  {(order.items || []).map((item, index) => (
                   <motion.div
                     key={index}
                     initial={{ opacity: 0, x: -8 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.1 + index * 0.05 }}
                     className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group cursor-default"
                   >
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xs group-hover:scale-110 transition-transform duration-300">
                         {item.quantity}×
                       </div>
                       <div>
                         <p className="text-sm font-bold text-slate-900 leading-tight">{item.name}</p>
                         <p className="text-[10px] font-bold text-slate-400">{formatPrice(item.price)} each</p>
                       </div>
                     </div>
                     <span className="text-sm font-black text-slate-900">{formatPrice(item.price * item.quantity)}</span>
                   </motion.div>
                 ))}
               </div>


                {/* Total & CTA */}
                <div className="bg-slate-50 border-t border-slate-100 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="text-3xl font-black text-slate-900 tracking-tight">{formatPrice(order?.total || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Items</p>
                      <p className="text-xl font-black text-slate-900">{(order.items || []).reduce((t, i) => t + (i.quantity || 1), 0)}</p>
                    </div>
                  </div>

                  <motion.div whileHover={!isCallingWaiter ? { scale: 1.02 } : {}} whileTap={!isCallingWaiter ? { scale: 0.98 } : {}}>
                    <Button 
                      onClick={handleCallConcierge}
                      disabled={isCallingWaiter}
                      className={cn(
                        "w-full h-14 border border-white/5 rounded-[1.2rem] font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 group",
                        isCallingWaiter ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-900 hover:bg-black text-white"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border border-white/10 transition-all duration-500",
                        isCallingWaiter ? "bg-white/20" : "bg-white/10 group-hover:bg-white"
                      )}>
                        {isCallingWaiter ? (
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 text-white/70 group-hover:text-slate-900 transition-colors" />
                        )}
                      </div>
                      {isCallingWaiter ? "Concierge Notified" : "Contact Concierge"}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Branding Footer */}
              <div className="text-center pt-6 pb-16 space-y-3">
                 <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Powered by</span>
                    <div className="h-px flex-1 bg-slate-100" />
                 </div>
                 <div className="flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity duration-500">
                    <Logo showText={true} iconSize={18} className="scale-90" />
                 </div>
                 <p className="text-[9px] font-bold text-slate-200 uppercase tracking-widest">Secure Session Protocol</p>
              </div>
            </div>
          </div>
        </main>

      {/* Persistent Menu Navigation */}
      <MenuBottomNavbar 
        activeTab="orders"
        setActiveTab={() => {}}
        cartCount={cart.reduce((total, item) => total + item.quantity, 0)}
        hasActiveOrder={true}
        onCartClick={onClose}
        onSearchClick={onClose}
        onTrackClick={() => {}}
        orderStatus={order?.status}
      />
    </div>
  )
}

export default OrderTracking
