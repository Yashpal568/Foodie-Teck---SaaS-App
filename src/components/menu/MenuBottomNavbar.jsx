import { useState } from 'react'
import { UtensilsCrossed, Search, ShoppingBag, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function MenuBottomNavbar({ 
  activeTab, 
  setActiveTab, 
  cartCount = 0, 
  hasActiveOrder = false, 
  onCartClick = () => {}, 
  onSearchClick = () => {}, 
  onTrackClick = () => {}, 
  onCallWaiter = () => {},
  orderStatus = 'preparing', 
  theme = 'light',
  className = '' 
}) {
  const [hoveredTab, setHoveredTab] = useState(null)
  const isDark = theme === 'dark'

  const tabs = [
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'search', label: 'Search', icon: Search, action: onSearchClick },
    { id: 'cart', label: 'Cart', icon: ShoppingBag, badge: cartCount, action: onCartClick },
    { id: 'orders', label: hasActiveOrder ? (orderStatus === 'ready' ? 'Ready!' : 'Track') : 'Orders', icon: Clock, action: onTrackClick, hasOrder: hasActiveOrder, status: orderStatus },
  ]

  return (
    <div className={cn("lg:hidden w-[94vw] max-w-md pointer-events-none", className || "fixed bottom-5 left-1/2 -translate-x-1/2 z-40")}>
      <motion.nav 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onMouseLeave={() => setHoveredTab(null)}
        className={cn(
          "backdrop-blur-3xl rounded-[2.2rem] p-1.5 flex items-center justify-between pointer-events-auto relative overflow-hidden transition-all duration-500",
          isDark 
            ? "bg-zinc-950/90 border border-zinc-800/90 shadow-[0_25px_60px_rgba(0,0,0,0.75)] ring-1 ring-white/8" 
            : "bg-white/92 border border-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.10)] ring-1 ring-black/4"
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isHovered = hoveredTab === tab.id
          const isOrders = tab.id === 'orders'

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.92 }}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onClick={() => {
                if (tab.action) {
                  tab.action()
                } else if (typeof setActiveTab === 'function') {
                  setActiveTab(tab.id)
                }
              }}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-[1.6rem] transition-all duration-300 outline-none select-none cursor-pointer group",
                isActive 
                  ? (isDark ? "text-slate-950 font-black" : "text-white font-black") 
                  : isHovered 
                    ? (isDark ? "text-white font-bold" : "text-zinc-900 font-bold") 
                    : (isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-800")
              )}
            >
              {/* 🌟 LUXURY ACTIVE PILL (GOLD IN NIGHT MODE / SLATE IN DAY MODE) */}
              {isActive && (
                <motion.div
                  layoutId="shadcn-active-pill"
                  className={cn(
                    "absolute inset-0 rounded-[1.6rem] -z-10 transition-all",
                    isDark 
                      ? "bg-linear-to-r from-amber-400 to-amber-500 shadow-[0_8px_25px_rgba(245,158,11,0.4)] border border-amber-300/60" 
                      : "bg-zinc-950 shadow-[0_8px_20px_rgba(15,23,42,0.25)] border border-zinc-800"
                  )}
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}

              {/* ✨ DYNAMIC FLOATING HOVER PILL */}
              {!isActive && isHovered && (
                <motion.div
                  layoutId="shadcn-hover-pill"
                  className={cn(
                    "absolute inset-0 rounded-[1.6rem] -z-10 shadow-xs transition-all",
                    isDark 
                      ? "bg-zinc-850/80 border border-zinc-700/70" 
                      : "bg-zinc-100/90 border border-zinc-200/70"
                  )}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              {/* 🎨 ICON WITH SMOOTH MICRO-ELEVATION */}
              <motion.div 
                animate={isHovered ? { y: -2, scale: 1.08 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative flex items-center justify-center"
              >
                <Icon className={cn(
                  "w-5 h-5 transition-all duration-300",
                  isActive 
                    ? (isDark ? "stroke-[2.8px] text-slate-950 drop-shadow-xs" : "stroke-[2.5px] text-white drop-shadow-xs") 
                    : isHovered 
                      ? (isDark ? "stroke-[2.2px] text-white" : "stroke-[2.2px] text-zinc-900") 
                      : (isDark ? "stroke-[1.8px] text-zinc-400 group-hover:text-zinc-200" : "stroke-[1.8px] text-zinc-500 group-hover:text-zinc-800")
                )} />

                {/* Cart Badge with Count */}
                {tab.badge > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "absolute -top-1.5 -right-2.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[9px] font-black shadow-xs transition-colors",
                      isActive 
                        ? (isDark ? "bg-slate-950 text-amber-400 ring-2 ring-amber-400" : "bg-emerald-500 text-white ring-2 ring-slate-900") 
                        : (isDark ? "bg-amber-400 text-slate-950 ring-2 ring-zinc-950" : "bg-emerald-600 text-white ring-2 ring-white")
                    )}
                  >
                    {tab.badge}
                  </motion.span>
                )}

                {/* Active Order Live Pulse */}
                {isOrders && hasActiveOrder && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      tab.status === 'ready' ? "bg-emerald-400" : "bg-amber-400"
                    )}></span>
                    <span className={cn(
                      "relative inline-flex rounded-full h-2.5 w-2.5",
                      tab.status === 'ready' ? "bg-emerald-500" : "bg-amber-500"
                    )}></span>
                  </span>
                )}
              </motion.div>

              {/* ✍️ TYPOGRAPHY WITH SMOOTH COLOR TRANSITIONS */}
              <span className={cn(
                "text-[10px] tracking-tight mt-1 transition-all duration-300 leading-none",
                isActive 
                  ? (isDark ? "text-slate-950 font-black" : "text-white font-black") 
                  : isHovered 
                    ? (isDark ? "text-white font-bold" : "text-zinc-900 font-bold") 
                    : (isDark ? "text-zinc-400 font-medium group-hover:text-zinc-200" : "text-zinc-500 font-medium group-hover:text-zinc-800")
              )}>
                {tab.label}
              </span>
            </motion.button>
          )
        })}
      </motion.nav>
    </div>
  )
}
