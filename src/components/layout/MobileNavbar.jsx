import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ShoppingCart, ChefHat, Receipt, Settings } from 'lucide-react'
import { supabase, getCachedSession } from '@/lib/supabase'
import { ensureValidRestaurantUUID } from '@/services/restaurant.service'

const navItems = [
  { icon: Home, label: 'Home', id: 'dashboard', route: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', id: 'orders', route: '/dashboard', badgeKey: 'orders' },
  { icon: ChefHat, label: 'Inventory', id: 'menu', route: '/dashboard' },
  { icon: Receipt, label: 'Analytics', id: 'analytics', route: '/dashboard' },
  { icon: Settings, label: 'Settings', id: 'settings', route: '/dashboard' }
]

export default function MobileNavbar({ activeItem, setActiveItem, restaurantId }) {
  const navigate = useNavigate()
  const [activeOrdersCount, setActiveOrdersCount] = useState(() => {
    return (restaurantId === 'demo-merchant' || !restaurantId) ? 3 : 0
  })

  // Live Order Count Syncer
  useEffect(() => {
    let isMounted = true
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    async function fetchLiveOrdersCount() {
      try {
        const validId = await ensureValidRestaurantUUID(restaurantId)
        
        if (validId && isUUID(validId)) {
          const { data: rawOrders } = await supabase
            .from('orders')
            .select('id, status')
            .eq('restaurant_id', validId)

          if (rawOrders && isMounted) {
            const activeOrders = rawOrders.filter(o => {
              const st = String(o.status || '').toUpperCase()
              return !['FINISHED', 'FINISHED_CLOSED', 'CANCELLED'].includes(st)
            })
            // If DB has active orders, display that; otherwise fallback for demo
            if (activeOrders.length > 0) {
              setActiveOrdersCount(activeOrders.length)
              return
            }
          }
        }

        // Fallback for demo mode
        if (isMounted) {
          const isDemo = restaurantId === 'demo-merchant' || !restaurantId || String(restaurantId).includes('demo')
          setActiveOrdersCount(prev => isDemo ? Math.max(prev, 3) : prev)
        }
      } catch (err) {
        console.warn('MobileNavbar active order count error:', err)
      }
    }

    fetchLiveOrdersCount()

    // 🏆 Live Cross-Tab & Window Event Listeners
    const handleOrderEvent = (e) => {
      // If a specific new order arrived, increment badge optimistically
      if (e?.type === 'servora_new_order' || (e?.key === 'servora_latest_order' && e?.newValue)) {
        setActiveOrdersCount(prev => prev + 1)
      }
      fetchLiveOrdersCount()
    }

    window.addEventListener('servora_new_order', handleOrderEvent)
    window.addEventListener('orderStatusUpdated', handleOrderEvent)
    window.addEventListener('storage', handleOrderEvent)

    // Supabase Channel (Subscribes to actual resolved UUID)
    let orderChannel = null
    ensureValidRestaurantUUID(restaurantId).then(uuid => {
      if (uuid && isUUID(uuid)) {
        orderChannel = supabase
          .channel(`mobilenav-orders-${uuid}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${uuid}`
          }, () => fetchLiveOrdersCount())
          .subscribe()
      }
    })

    return () => {
      isMounted = false
      window.removeEventListener('servora_new_order', handleOrderEvent)
      window.removeEventListener('orderStatusUpdated', handleOrderEvent)
      window.removeEventListener('storage', handleOrderEvent)
      if (orderChannel) supabase.removeChannel(orderChannel)
    }
  }, [restaurantId])
  
  const handleNavigation = async (item) => {
    setActiveItem(item.id)
    
    // If we're already inside the console, just switch tabs without navigating
    if (window.location.pathname.startsWith('/console')) {
      return
    }

    const { data: { session } } = await getCachedSession()
    const user = session?.user
    if (user?.email) {
      navigate(`/console/${user.email}`)
      return
    }
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 py-1 safe-area-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeItem === item.id
          const showBadge = item.badgeKey === 'orders' && activeOrdersCount > 0
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-15.5 rounded-xl transition-all duration-200 relative cursor-pointer ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-slate-400 hover:text-slate-600 active:scale-95'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-1 bg-linear-to-r from-blue-600 to-indigo-600 rounded-full shadow-xs" />
              )}
              
              <div className={`p-1.5 rounded-xl transition-all duration-200 relative ${isActive ? 'bg-blue-50/80 text-blue-600' : ''}`}>
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                
                {/* 🔴 Live Order Badge */}
                {showBadge && (
                  <span className="absolute -top-1 -right-2 min-w-4.5 h-4.5 px-1 bg-linear-to-r from-red-500 to-rose-600 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-md shadow-red-500/40 ring-2 ring-white animate-in zoom-in duration-300">
                    {activeOrdersCount > 99 ? '99+' : activeOrdersCount}
                  </span>
                )}
              </div>

              <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
