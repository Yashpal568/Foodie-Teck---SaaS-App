import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { 
  ChefHat, 
  CheckCircle2, 
  Receipt, 
  ArrowLeft, 
  BellRing, 
  Utensils, 
  Timer, 
  Clock, 
  Flame, 
  Sparkles, 
  ShoppingBag, 
  Check, 
  Copy, 
  Plus, 
  ShieldCheck, 
  PartyPopper,
  ExternalLink,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Logo from '@/components/ui/Logo'
import MenuBottomNavbar from '@/components/menu/MenuBottomNavbar'
import { useOrderManagement, ORDER_STATUS, ORDER_STATUS_CONFIG } from '@/hooks/useOrderManagement'
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile'
import { cn } from '@/lib/utils'

export default function OrderTracking({ orderId, restaurantId, onClose, onOpenCart, onOpenSearch }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCallingWaiter, setIsCallingWaiter] = useState(false)
  const [waiterCalledSuccess, setWaiterCalledSuccess] = useState(false)
  const [copiedOrderId, setCopiedOrderId] = useState(false)

  const { orders, orderHistory, refreshOrders, updateStatus: apiUpdateStatus, loading: hookLoading } = useOrderManagement(restaurantId)
  const { profile } = useRestaurantProfile(restaurantId)

  // 📡 Real-time Supabase Order Polling & Subscription
  useEffect(() => {
    if (!orderId) return

    const fetchSingleOrder = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', orderId)
          .maybeSingle()

        if (data) {
          const formatted = {
            ...data,
            id: data.id,
            tableNumber: data.table_number,
            customerName: data.customer_name,
            items: data.order_items || [],
            subtotal: data.subtotal || data.total,
            tax: data.tax || 0,
            total: data.total || 0,
            status: data.status || 'PENDING',
            createdAt: data.created_at
          }
          setOrder(formatted)
          setLoading(false)
        }
      } catch (e) {
        console.error('Error fetching tracking order:', e)
      }
    }

    fetchSingleOrder()

    const orderChannel = supabase
      .channel(`live-tracking-${orderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        console.log('⚡ Live Order Status Event:', payload)
        fetchSingleOrder()
      })
      .subscribe()

    const safetyInterval = setInterval(fetchSingleOrder, 4000)

    return () => {
      clearInterval(safetyInterval)
      supabase.removeChannel(orderChannel)
    }
  }, [orderId])

  // Fallback if hook loads faster
  useEffect(() => {
    if (!hookLoading && !order) {
      const allOrders = [...orders, ...orderHistory]
      const foundOrder = allOrders.find(o => String(o.id) === String(orderId))
      if (foundOrder) {
        setOrder(foundOrder)
        setLoading(false)
      }
    }
  }, [orders, orderHistory, orderId, hookLoading, order])

  const handleCallConcierge = async () => {
    if (isCallingWaiter) return
    setIsCallingWaiter(true)

    try {
      const targetRid = profile?.id || restaurantId
      const targetTable = order?.tableNumber || order?.table_number || '1'
      
      const { error } = await supabase
        .from('waiter_calls')
        .insert([{
          restaurant_id: targetRid,
          table_number: String(targetTable),
          customer_name: order?.customerName || order?.customer_name || 'Guest Customer'
        }])

      if (!error) {
        setWaiterCalledSuccess(true)
        setTimeout(() => setWaiterCalledSuccess(false), 4000)
      }
    } catch (err) {
      console.warn('Waiter call notification notice:', err)
    } finally {
      setIsCallingWaiter(false)
    }
  }

  const handleCopyOrderId = () => {
    if (!order?.id) return
    navigator.clipboard.writeText(order.id)
    setCopiedOrderId(true)
    setTimeout(() => setCopiedOrderId(false), 2000)
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0)
  }

  const formatTime = (isoString) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    } catch {
      return ''
    }
  }

  // 🧭 Order Progress Stages Definition
  const STAGES = [
    {
      key: ORDER_STATUS.PENDING || 'PENDING',
      title: 'Order Confirmed',
      desc: 'Order received & verified by kitchen staff',
      icon: Clock,
      progress: 25
    },
    {
      key: ORDER_STATUS.PREPARING || 'PREPARING',
      title: 'Chef Preparing',
      desc: 'Master chefs are crafting your dishes fresh',
      icon: Flame,
      progress: 60
    },
    {
      key: ORDER_STATUS.READY || 'READY',
      title: 'Plated & Ready',
      desc: 'Quality checked, garnished & on the hot pass',
      icon: ChefHat,
      progress: 85
    },
    {
      key: ORDER_STATUS.SERVED || 'SERVED',
      title: 'Served at Table',
      desc: 'Hot gourmet meal delivered directly to your table',
      icon: CheckCircle2,
      progress: 100
    }
  ]

  const normalizedStatus = (order?.status || 'PENDING').toUpperCase()
  
  const currentStageIndex = useMemo(() => {
    if (normalizedStatus === 'PENDING' || normalizedStatus === 'ORDERED') return 0
    if (normalizedStatus === 'PREPARING' || normalizedStatus === 'COOKING') return 1
    if (normalizedStatus === 'READY') return 2
    if (normalizedStatus === 'SERVED' || normalizedStatus === 'FINISHED' || normalizedStatus === 'DELIVERED') return 3
    return 0
  }, [normalizedStatus])

  const currentStage = STAGES[currentStageIndex] || STAGES[0]
  const currentProgressPercent = currentStage.progress

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-3 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-white mt-6 tracking-tight">Syncing Live Kitchen Journey</h2>
        <p className="text-xs text-zinc-400 mt-1 font-medium">Connecting to your table's digital pass...</p>
      </div>
    )
  }

  // Not Found State
  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center text-zinc-400 mb-5 border border-zinc-200/80">
          <Receipt className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">No Active Session Found</h2>
        <p className="text-xs text-zinc-500 max-w-sm mt-2 mb-6">
          We couldn't retrieve an active order for this session. Explore the live menu to place fresh dishes.
        </p>
        <Button 
          onClick={onClose}
          className="h-12 px-8 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider shadow-lg"
        >
          Explore Menu
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 font-sans pb-36 overflow-x-hidden selection:bg-zinc-900 selection:text-white">
      
      {/* 🧭 1. TOP HEADER & NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/80 transition-all">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo showText={true} iconSize={26} className="scale-95" />
            <div className="h-4 w-px bg-zinc-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE SYNC</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 rounded-full border border-zinc-200 text-zinc-800 font-black text-xs">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">TABLE</span>
              <span>{order.tableNumber || order.table_number || '1'}</span>
            </div>

            <button
              onClick={onClose}
              className="h-9 px-3.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>MENU</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-6">

        {/* 🌟 2. ULTRA-LUXURY LIVE STATUS HERO CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-[2.2rem] overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-950 text-white p-6 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.18)] border border-zinc-800"
        >
          {/* Ambient Colored Glow Spheres */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/15 blur-[90px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 blur-[90px] rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-6">
            
            {/* Top Pill & Order Reference */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>KITCHEN EXPERIENCE</span>
                </span>
              </div>

              <button 
                onClick={handleCopyOrderId}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-full text-[10px] font-bold text-zinc-300 border border-white/10 transition-all cursor-pointer"
                title="Copy Order ID"
              >
                <span>#{String(order.id).slice(-6).toUpperCase()}</span>
                {copiedOrderId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
              </button>
            </div>

            {/* Main Dynamic Status Title */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span>{currentStage.title}</span>
                {normalizedStatus === 'SERVED' ? (
                  <PartyPopper className="w-7 h-7 text-amber-400 shrink-0" />
                ) : (
                  <Flame className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />
                )}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed max-w-lg">
                {currentStage.desc}
              </p>
            </div>

            {/* Smooth Journey Progress Bar */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <span>STAGE {currentStageIndex + 1} OF 4</span>
                <span className="text-emerald-400">{currentProgressPercent}% COMPLETE</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${currentProgressPercent}%` }}
                  transition={{ type: "spring", stiffness: 45, damping: 15 }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                />
              </div>
            </div>

            {/* Stat Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-3">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">PREP ESTIMATE</span>
                <span className="text-sm font-black text-white block mt-0.5">15–20 Mins</span>
              </div>

              <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-3">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">ORDER TIME</span>
                <span className="text-sm font-black text-white block mt-0.5">{formatTime(order.createdAt) || 'Just now'}</span>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-3 flex sm:flex-col items-center sm:items-start justify-between">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">TOTAL ITEMS</span>
                <span className="text-sm font-black text-emerald-400 block mt-0.5">
                  {(order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0)} Dishes
                </span>
              </div>
            </div>

          </div>
        </motion.div>

        {/* 📋 3. STEP-BY-STEP CULINARY JOURNEY (SHADCN TIMELINE) */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-200/80 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-sm">
                <Timer className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 tracking-tight">Active Dining Sequence</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Kitchen milestones</p>
              </div>
            </div>

            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase tracking-wider">
              {normalizedStatus}
            </Badge>
          </div>

          <Separator className="bg-zinc-100" />

          {/* Timeline Milestones */}
          <div className="space-y-4 pt-1">
            {STAGES.map((stg, idx) => {
              const isPast = idx < currentStageIndex
              const isCurrent = idx === currentStageIndex
              const isFuture = idx > currentStageIndex
              const StageIcon = stg.icon

              return (
                <div key={stg.key} className="flex items-start gap-4 relative">
                  
                  {/* Left Connector Line */}
                  {idx < STAGES.length - 1 && (
                    <div 
                      className={`absolute left-4 top-8 bottom-0 w-0.5 -ml-px ${
                        isPast ? 'bg-emerald-500' : 'bg-zinc-200'
                      }`} 
                    />
                  )}

                  {/* Stage Icon Node */}
                  <div className={`relative z-10 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isPast 
                      ? 'bg-emerald-500 text-white shadow-xs' 
                      : isCurrent 
                      ? 'bg-zinc-950 text-amber-400 ring-4 ring-emerald-500/20 shadow-md scale-105' 
                      : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                  }`}>
                    {isPast ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <StageIcon className="w-4 h-4" />
                    )}
                  </div>

                  {/* Stage Details */}
                  <div className="flex-1 pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-black tracking-tight ${
                        isCurrent ? 'text-zinc-950 font-black' : isPast ? 'text-zinc-700' : 'text-zinc-400'
                      }`}>
                        {stg.title}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${
                      isCurrent ? 'text-zinc-600 font-medium' : isPast ? 'text-zinc-500' : 'text-zinc-400'
                    }`}>
                      {stg.desc}
                    </p>
                  </div>

                </div>
              )
            })}
          </div>
        </div>

        {/* 🧾 4. ITEMIZED DIGITAL BILL RECEIPT */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-200/80 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-sm">
                <Receipt className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 tracking-tight">Order Receipt</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Verified Table Order</p>
              </div>
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
              TABLE {order.tableNumber || '1'}
            </span>
          </div>

          <Separator className="bg-zinc-100" />

          {/* Items List */}
          <div className="space-y-3">
            {(order.items || []).map((item, i) => (
              <div key={item.id || i} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-zinc-950 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                    {item.quantity || 1}x
                  </span>
                  <span className="font-bold text-zinc-900 truncate">
                    {item.item_name || item.name || item.itemName || 'Signature Dish'}
                  </span>
                </div>
                <span className="font-black text-zinc-900 shrink-0">
                  {formatCurrency((item.price || item.unit_price || 0) * (item.quantity || 1))}
                </span>
              </div>
            ))}
          </div>

          <Separator className="bg-zinc-100" />

          {/* Pricing Breakdown */}
          <div className="space-y-1.5 text-xs text-zinc-500 font-medium">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-zinc-800">{formatCurrency(order.subtotal || order.total)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span>GST / Taxes</span>
                <span className="font-bold text-zinc-800">{formatCurrency(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-zinc-950 pt-2 border-t border-zinc-100">
              <span>Total Amount</span>
              <span className="text-base text-emerald-600 font-black">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Actions: Contact Waiter & Add More Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              onClick={handleCallConcierge}
              disabled={isCallingWaiter || waiterCalledSuccess}
              variant="outline"
              className="h-12 rounded-xl bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <BellRing className={`w-4 h-4 text-amber-500 ${isCallingWaiter ? 'animate-spin' : ''}`} />
              <span>{waiterCalledSuccess ? 'Waiter Notified!' : 'Call Waiter'}</span>
            </Button>

            <Button
              onClick={onClose}
              className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Order More Dishes</span>
            </Button>
          </div>

        </div>

        {/* 👨‍🍳 5. GOURMET KITCHEN PROMISE CARD */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 text-white rounded-[2rem] p-5 text-center space-y-2 border border-zinc-800 shadow-md">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CULINARY EXCELLENCE</span>
          </div>
          <p className="text-xs text-zinc-300 font-medium max-w-md mx-auto leading-relaxed">
            "Every meal is prepared fresh with hand-picked spices and artisanal care. Savor the anticipation."
          </p>
        </div>

        {/* Footer Brand Credit */}
        <div className="text-center pt-2 pb-6 text-zinc-400 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">POWERED BY SERVORA HOSPITALITY SUITE</p>
        </div>

      </main>

      {/* 📱 6. FLOATING BOTTOM NAVIGATION DOCK */}
      <MenuBottomNavbar 
        activeTab="orders" 
        setActiveTab={(tab) => {
          if (tab === 'cart') {
            if (onOpenCart) onOpenCart()
            else onClose()
          } else if (tab === 'search') {
            if (onOpenSearch) onOpenSearch()
            else onClose()
          } else if (tab !== 'orders') {
            onClose()
          }
        }}
        onCartClick={() => {
          if (onOpenCart) onOpenCart()
          else onClose()
        }}
        onSearchClick={() => {
          if (onOpenSearch) onOpenSearch()
          else onClose()
        }}
        onTrackClick={() => {}}
        hasActiveOrder={true}
        orderStatus={order?.status?.toLowerCase() || 'preparing'}
        cartCount={0}
      />

    </div>
  )
}
