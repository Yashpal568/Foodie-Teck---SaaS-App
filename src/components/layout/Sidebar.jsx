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
  Menu,
  X,
  Receipt,
  Table,
  LogOut,
  Lock
} from 'lucide-react'
import { getPlanDetails } from '@/utils/planLimits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Logo from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'

export const menuItems = [
  { icon: Home, label: 'Dashboard', id: 'dashboard', route: '/dashboard' },
  { icon: Table, label: 'Menu Management', id: 'menu', route: '/dashboard' },
  { icon: QrCode, label: 'QR Codes', id: 'qr-codes', route: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', id: 'orders', route: '/dashboard' },
  { icon: Table, label: 'Table Sessions', id: 'tables', route: '/dashboard' },
  { icon: Receipt, label: 'Analytics', id: 'analytics', route: '/dashboard' },
  { icon: Users, label: 'Customers', id: 'customers', route: '/dashboard' },
]

export const supportItems = [
  { icon: HelpCircle, label: 'Help & Support', id: 'help', route: '/dashboard' },
  { icon: Settings, label: 'Settings', id: 'settings', route: '/dashboard' },
]

export default function Sidebar({ activeItem, setActiveItem, isCollapsed, setIsCollapsed, isMobile = false, restaurantId }) {
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ orders: 0, tables: 0 })

  const [resolvedId, setResolvedId] = useState(restaurantId || null)
  
  // Resolve Identity (Email to UUID)
  useEffect(() => {
    async function resolve() {
      if (!restaurantId) return
      if (!restaurantId.includes('@')) {
        setResolvedId(restaurantId)
        return
      }
      
      try {
        const { data } = await supabase
          .from('restaurants')
          .select('id')
          .eq('email', restaurantId.toLowerCase())
          .maybeSingle()
        
        if (data?.id) {
          setResolvedId(data.id)
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
    const targetId = resolvedId || restaurantId
    if (!targetId) return

    const fetchActiveCounts = async () => {
      try {
        // 1. Fetch Orders directly and count active non-finished orders
        const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
        const validId = isUUID(resolvedId) ? resolvedId : (isUUID(restaurantId) ? restaurantId : null)

        if (!validId) {
          setCounts({ orders: 0, tables: 0 })
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

        // 3. Fetch Active Waiter Calls count
        let waiterQuery = supabase
          .from('waiter_calls')
          .select('*', { count: 'exact', head: true })
          .eq('is_handled', false)
          .eq('restaurant_id', validId)

        const { count: waiterCount } = await waiterQuery

        setCounts({
          orders: (activeOrderCount || 0) + (waiterCount || 0),
          tables: tableCount || 0
        })
      } catch (err) {
        console.warn('Sidebar count fetch error:', err)
      }
    }

    fetchActiveCounts()

    // Safety Poll every 4 seconds for instant real-time sync
    const pollInterval = setInterval(fetchActiveCounts, 4000)

    // 🏆 Subscribe to Real-time Changes & Window Events
    const handleNewOrderEvent = () => fetchActiveCounts()
    window.addEventListener('servora_new_order', handleNewOrderEvent)
    window.addEventListener('orderStatusUpdated', handleNewOrderEvent)
    window.addEventListener('qrCodesUpdated', handleNewOrderEvent)

    const orderChannel = supabase
      .channel(`sidebar-orders-v3-${targetId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders'
      }, () => fetchActiveCounts())
      .subscribe()

    const tableChannel = supabase
      .channel(`sidebar-tables-v3-${targetId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'table_sessions'
      }, () => fetchActiveCounts())
      .subscribe()

    const waiterChannel = supabase
      .channel(`sidebar-waiter-v3-${targetId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'waiter_calls'
      }, () => fetchActiveCounts())
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('servora_new_order', handleNewOrderEvent)
      window.removeEventListener('orderStatusUpdated', handleNewOrderEvent)
      window.removeEventListener('qrCodesUpdated', handleNewOrderEvent)
      supabase.removeChannel(orderChannel)
      supabase.removeChannel(tableChannel)
      supabase.removeChannel(waiterChannel)
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
    await supabase.auth.signOut()
    navigate('/login')
  }
  const [subData, setSubData] = useState({ daysLeft: 30, planName: 'Starter' })

  useEffect(() => {
    const checkSub = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (user) {
          const { data: rest } = await supabase.from('restaurants').select('id').eq('email', user.email.toLowerCase()).maybeSingle()
          if (rest) {
            const { data: sub } = await supabase.from('subscriptions').select('*').eq('restaurant_id', rest.id).maybeSingle()
            if (sub) {
              const startDate = new Date(sub.start_date || sub.created_at)
              const expiryDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000))
              const now = new Date()
              const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              setSubData({ daysLeft: Math.max(0, daysLeft), planName: sub.plan_name || 'Starter' })
            }
          }
        }
      } catch (err) {
        // Silent default fallback
      }
    }
    checkSub()
  }, [])

  return (
    <div className={`bg-white ${isMobile ? '' : 'border-r border-gray-200'} transition-all duration-300 ${isCollapsed ? 'w-20' : (isMobile ? 'w-full' : 'w-64')} h-screen flex flex-col shrink-0 ${isMobile ? 'flex' : 'hidden md:flex'}`}>
      {/* Logo */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-center">
        {isCollapsed ? (
          <Logo showText={false} iconSize={40} />
        ) : (
          <Logo subtitle="Restaurant Dashboard" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto no-scrollbar">
        <div className="space-y-2 mb-8">
          {menuItems.map((item) => {
            const Icon = item.icon
            const badgeCount = item.id === 'orders' ? counts.orders : item.id === 'tables' ? counts.tables : null
            const planDetails = getPlanDetails(subData.planName)
            const isLocked = 
              (item.id === 'customers' && !planDetails.crmUnlocked) ||
              (item.id === 'analytics' && !planDetails.advancedAnalytics)

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                title={isCollapsed ? item.label : ''}
                className={`w-full flex items-center rounded-lg transition-all duration-200 relative group ${
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  activeItem === item.id
                    ? isCollapsed
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 font-bold'
                    : isLocked
                    ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {/* Icon */}
                <div className="relative shrink-0">
                  <Icon className="w-5 h-5" />
                  {isCollapsed && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center ring-1 ring-white shadow-sm">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </div>

                {/* Label + badge — only when expanded */}
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-sm text-left truncate">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="ml-auto min-w-5 h-5 px-1.5 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shrink-0">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                    {isLocked && (
                      <span className="ml-auto text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">Pro</span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>

        <div className="space-y-2 mb-10">
          {!isCollapsed && (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-3 mb-2">Support &amp; Ops</p>
          )}
          {supportItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                title={isCollapsed ? item.label : ''}
                className={`w-full flex items-center rounded-lg transition-all duration-200 ${
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  activeItem === item.id
                    ? isCollapsed
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Subscription Status Widget */}
        {!isCollapsed && (
           <div className="mt-auto px-3 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between">
                 <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-white border-slate-200 text-slate-500">{subData.planName} Plan</Badge>
                 <span className={`text-[10px] font-black uppercase tracking-widest ${subData.daysLeft <= 5 ? 'text-rose-600' : 'text-blue-600'}`}>
                    {subData.daysLeft} Days Left
                 </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                 <div 
                    className={`h-full rounded-full transition-all duration-1000 ${subData.daysLeft <= 5 ? 'bg-rose-500 animate-pulse' : 'bg-blue-600'}`} 
                    style={{ width: `${(subData.daysLeft / 30) * 100}%` }}
                 />
              </div>

              {subData.daysLeft <= 5 && (
                 <Button 
                    onClick={() => navigate('/pricing')}
                    className="w-full h-10 rounded-xl bg-slate-950 hover:bg-black text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"
                 >
                    Renew Now
                 </Button>
              )}
           </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition-colors group mb-2"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
        >
          {isCollapsed ? (
            <Menu className="w-5 h-5" />
          ) : (
            <>
              <X className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
