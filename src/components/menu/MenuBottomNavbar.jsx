import { Utensils, Search, ShoppingBag, Timer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function MenuBottomNavbar({ 
  activeTab, 
  setActiveTab, 
  cartCount, 
  hasActiveOrder, 
  onCartClick,
  onSearchClick,
  onTrackClick,
  orderStatus = 'preparing'
}) {
  const tabs = [
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'search', label: 'Search', icon: Search, action: onSearchClick },
    { id: 'cart', label: 'Cart', icon: ShoppingBag, badge: cartCount, action: onCartClick },
    { id: 'orders', label: 'Orders', icon: Timer, action: onTrackClick, hidden: !hasActiveOrder, status: orderStatus },
  ]

  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-md pointer-events-none">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 shadow-[0_15px_40px_rgba(0,0,0,0.1)] p-2 flex items-center justify-between pointer-events-auto relative overflow-hidden"
      >
        {/* Animated Background Pill - White Glass Theme */}
        <AnimatePresence>
          {tabs.map((tab) => {
            if (tab.id === activeTab) {
              const visibleTabs = tabs.filter(t => !t.hidden)
              const tabIndex = visibleTabs.findIndex(t => t.id === activeTab)
              return (
                <motion.div
                  key="pill"
                  layoutId="nav-pill"
                  className="absolute h-[calc(100%-1rem)] rounded-[2.2rem] bg-slate-900 border border-slate-800 z-0"
                  style={{ 
                    width: `${(100 / visibleTabs.length) - 2}%`,
                    left: `${(tabIndex * (100 / visibleTabs.length)) + 1}%`
                  }}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )
            }
            return null
          })}
        </AnimatePresence>

        {tabs.map((tab) => {
          if (tab.hidden) return null
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isOrders = tab.id === 'orders'

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.action) tab.action()
                else setActiveTab(tab.id)
              }}
              className="relative flex-1 flex flex-col items-center justify-center py-3 z-10 outline-none group transition-all"
            >
              <div className="relative">
                <motion.div
                  animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                  className={cn(
                    "p-1.5 rounded-2xl transition-all duration-300",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                  )}
                >
                  <Icon className={cn(
                    "w-6 h-6 stroke-[2.2px]",
                  )} />
                </motion.div>

                {/* Status Pulse for Active Orders */}
                {isOrders && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                    <span className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      tab.status === 'ready' ? "bg-emerald-400" : "bg-blue-400"
                    )}></span>
                    <span className={cn(
                      "relative inline-flex rounded-full h-2 w-2",
                      tab.status === 'ready' ? "bg-emerald-500" : "bg-blue-500"
                    )}></span>
                  </div>
                )}

                {/* Cart Badge with Brand Color */}
                {tab.badge > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white border-2 border-white shadow-sm"
                  >
                    {tab.badge}
                  </motion.span>
                )}
              </div>

              <span className={cn(
                "text-[9px] font-black uppercase tracking-[0.1em] mt-1 transition-all duration-300",
                isActive ? "text-white" : "text-slate-400 opacity-80"
              )}>
                {isOrders && hasActiveOrder ? (tab.status === 'ready' ? 'Ready!' : 'Track') : tab.label}
              </span>
            </button>
          )
        })}
      </motion.div>
    </div>
  )
}
