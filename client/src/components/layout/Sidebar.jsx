import { useState, useEffect, useMemo } from 'react'
// Force HMR update to clear Vite 500 error
import { useNavigate } from 'react-router-dom'
import { 
  Home, 
  ShoppingCart, 
  QrCode, 
  Users, 
  Settings, 
  HelpCircle,
  LayoutGrid,
  Monitor,
  BookOpen,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { getPlanDetails } from '@/utils/planLimits'
import Logo from '@/components/ui/Logo'
import { supabase, getCachedSession } from '@/lib/supabase'
import { ensureValidRestaurantUUID } from '@/services/restaurant.service'

export const menuItems = [
  { icon: Home, label: 'Dashboard', id: 'dashboard', route: '/dashboard' },
  { icon: Monitor, label: 'POS & Smart Billing', id: 'pos', route: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders & KDS', id: 'orders', route: '/dashboard' },
  { icon: BookOpen, label: 'Inventory & Menu', id: 'menu', route: '/dashboard' },
  { icon: QrCode, label: 'QR Codes', id: 'qr-codes', route: '/dashboard' },
  { icon: LayoutGrid, label: 'Table Sessions', id: 'tables', route: '/dashboard' },
  { icon: Users, label: 'Customer Management', id: 'customers', route: '/dashboard' },
  { icon: BarChart3, label: 'Analytics & Sales', id: 'analytics', route: '/dashboard' }
]

export const supportItems = [
  { icon: HelpCircle, label: 'Help & Support', id: 'help', route: '/dashboard' },
  { icon: Settings, label: 'Settings', id: 'settings', route: '/dashboard' },
]

export default function Sidebar({ activeItem, setActiveItem, isCollapsed, setIsCollapsed, isMobile = false, onClose = () => {}, restaurantId }) {
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ orders: 0, tables: 0 })
  const [resolvedId, setResolvedId] = useState(restaurantId || null)
  
  // Resolve Identity (Email to UUID)
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
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    const validId = isUUID(resolvedId) ? resolvedId : (isUUID(restaurantId) ? restaurantId : null)

    const fetchActiveCounts = async () => {
      try {
        if (!validId) {
          const isDemoMode = restaurantId === 'demo-merchant' || !restaurantId || String(restaurantId).includes('demo')
          if (isDemoMode) {
            setCounts({ orders: 3, tables: 1 })
          } else {
            setCounts({ orders: 0, tables: 0 })
          }
          return
        }

        let orderQuery = supabase
          .from('orders')
          .select('id, status, restaurant_id')
          .eq('restaurant_id', validId)

        const { data: rawOrders } = await orderQuery

        const activeOrderCount = (rawOrders || []).filter(o => {
          const st = String(o.status || '').toUpperCase()
          return !['FINISHED', 'FINISHED_CLOSED', 'CANCELLED'].includes(st)
        }).length

        // 2. Fetch Active Tables count
        let tableQuery = supabase
          .from('table_sessions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['occupied', 'billing'])
          .eq('restaurant_id', validId)

        const { count: tableCount } = await tableQuery

        setCounts({
          orders: activeOrderCount || 0,
          tables: tableCount || 0
        })
      } catch (err) {
        console.warn('Sidebar count fetch error:', err)
      }
    }

    fetchActiveCounts()

    // Low-frequency safety poll
    const pollInterval = setInterval(fetchActiveCounts, 30000)

    // 🏆 Subscribe to Real-time Changes & Window Events
    const handleNewOrderEvent = () => fetchActiveCounts()
    window.addEventListener('servora_new_order', handleNewOrderEvent)
    window.addEventListener('orderStatusUpdated', handleNewOrderEvent)
    window.addEventListener('qrCodesUpdated', handleNewOrderEvent)
    window.addEventListener('storage', handleNewOrderEvent)

    let orderChannel = null
    let tableChannel = null
    let waiterChannel = null

    if (validId) {
      orderChannel = supabase
        .channel(`sidebar-orders-v3-${validId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `restaurant_id=eq.${validId}`
        }, () => fetchActiveCounts())
        .subscribe()

      tableChannel = supabase
        .channel(`sidebar-tables-v3-${validId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'table_sessions',
          filter: `restaurant_id=eq.${validId}`
        }, () => fetchActiveCounts())
        .subscribe()

      waiterChannel = supabase
        .channel(`sidebar-waiter-v3-${validId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'waiter_calls',
          filter: `restaurant_id=eq.${validId}`
        }, () => fetchActiveCounts())
        .subscribe()
    }

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('servora_new_order', handleNewOrderEvent)
      window.removeEventListener('orderStatusUpdated', handleNewOrderEvent)
      window.removeEventListener('qrCodesUpdated', handleNewOrderEvent)
      window.removeEventListener('storage', handleNewOrderEvent)
      if (orderChannel) supabase.removeChannel(orderChannel)
      if (tableChannel) supabase.removeChannel(tableChannel)
      if (waiterChannel) supabase.removeChannel(waiterChannel)
    }
  }, [resolvedId, restaurantId])

  const handleNavigation = (item) => {
    setActiveItem(item.id)
    
    // Identity-Safe Navigation: Redirect to isolated console if departing from legacy routes
    if (item.route === '/dashboard') {
      if (restaurantId && !window.location.pathname.startsWith('/console')) {
        navigate(`/console/${restaurantId}`)
        return
      }
    }
    
    // If we're already in the console, we don't need to navigate, just set the state (handled above)
    if (!window.location.pathname.startsWith('/console')) {
      navigate(item.route)
    }
  }

  const handleSignOut = async () => {
    sessionStorage.clear()
    localStorage.removeItem('servora_restaurant_id')
    localStorage.removeItem('servora_user_email')
    try { await supabase.auth.signOut() } catch (e) {}
    navigate('/login', { replace: true })
  }
  const [subData, setSubData] = useState({ daysLeft: 30, planName: 'Professional' })

  useEffect(() => {
    const checkSub = async () => {
      const isDemo = restaurantId === 'demo-merchant' || restaurantId === 'demo' || restaurantId === 'guest'
      if (isDemo) {
        setSubData({ daysLeft: 30, planName: 'Enterprise' })
        return
      }

      try {
        const { data: { session } } = await getCachedSession()
        const userEmail = session?.user?.email
        const target = restaurantId || userEmail
        const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

        if (target) {
          let restId = target
          if (target.includes('@')) {
            const { data: rest } = await supabase.from('restaurants').select('id').eq('email', target.toLowerCase()).maybeSingle()
            if (rest?.id) restId = rest.id
          }

          if (restId && isUUID(restId)) {
            const { data: sub } = await supabase.from('subscriptions').select('*').eq('restaurant_id', restId).maybeSingle()
            if (sub) {
              const startDate = new Date(sub.start_date || sub.created_at)
              const expiryDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000))
              const now = new Date()
              const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              setSubData({ daysLeft: Math.max(0, daysLeft), planName: sub.plan_name || 'Professional' })
              return
            }
          }
        }
      } catch (err) {
        // Silent default fallback
      }
    }
    checkSub()
  }, [restaurantId])

  return (
    <div className={`bg-white ${isMobile ? '' : 'border-r border-slate-200/80'} transition-all duration-300 ${isCollapsed ? 'w-20' : (isMobile ? 'w-full' : 'w-60')} h-full min-h-0 flex flex-col shrink-0 ${isMobile ? 'flex' : 'hidden md:flex'}`}>
      {/* Compact Brand Header */}
      <div className={`h-14 flex items-center shrink-0 ${isCollapsed ? 'justify-center px-2' : 'justify-start px-5'}`}>
        {isCollapsed ? (
          <Logo showText={false} iconSize={30} />
        ) : (
          <Logo
            subtitle="Restaurant Dashboard"
            iconSize={28}
            textClassName="text-[17px] leading-tight"
            subtitleClassName="text-[8.5px]"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-3.5 py-2 overflow-y-auto no-scrollbar">
        <div className="space-y-1 mb-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            const badgeCount = item.id === 'orders' ? counts.orders : item.id === 'tables' ? counts.tables : null
            const planDetails = getPlanDetails(subData.planName)
            const isLocked = 
              (item.id === 'customers' && !planDetails.crmUnlocked) ||
              (item.id === 'analytics' && !planDetails.advancedAnalytics)
            const isActive = activeItem === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                title={isCollapsed ? item.label : ''}
                className={`w-full flex items-center rounded-xl transition-all duration-200 relative group cursor-pointer ${
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-indigo-50/85 text-indigo-600 border border-indigo-100/90 shadow-[0_1px_4px_-1px_rgba(79,70,229,0.12)] font-semibold'
                    : isLocked
                    ? 'text-slate-400 hover:bg-slate-50 hover:text-slate-500 border border-transparent'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent font-medium'
                }`}
              >
                {/* Icon */}
                <div className="relative shrink-0">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.1 : 1.75} />
                  {isCollapsed && badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center ring-1 ring-white shadow-sm">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </div>

                {/* Label + badge — only when expanded */}
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-[13.5px] leading-snug text-left">{item.label}</span>
                    {badgeCount > 0 ? (
                      <span className="ml-auto min-w-5 h-5 px-1.5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shrink-0 shadow-2xs">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    ) : isActive ? (
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                        ACTIVE
                      </span>
                    ) : isLocked ? (
                      <span className="ml-auto text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">Pro</span>
                    ) : null}
                  </>
                )}
              </button>
            )
          })}
        </div>

        <div className="space-y-1.5 pb-4">
          {!isCollapsed && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3.5 mb-2">SUPPORT &amp; OPS</p>
          )}
          {supportItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                title={isCollapsed ? item.label : ''}
                className={`w-full flex items-center rounded-xl transition-all duration-200 cursor-pointer ${
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-indigo-50/85 text-indigo-600 border border-indigo-100/90 shadow-[0_1px_4px_-1px_rgba(79,70,229,0.12)] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent font-medium'
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.1 : 1.75} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-[13.5px] leading-snug text-left">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                        ACTIVE
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Clean Bottom Sign Out Bar */}
      <div className="px-4 py-3 border-t border-slate-100 mt-auto shrink-0">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-sm transition-colors group cursor-pointer"
        >
          <LogOut className="w-[18px] h-[18px] group-hover:-translate-x-0.5 transition-transform" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  )
}
