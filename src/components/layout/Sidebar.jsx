import { useState, useEffect, useMemo } from 'react'
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
  LogOut
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Logo from '@/components/ui/Logo'
import { saveAndClearWorkspace } from '@/utils/workspace'
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

  const [resolvedId, setResolvedId] = useState(null)
  
  // Resolve Identity (Email to UUID)
  useEffect(() => {
    async function resolve() {
      if (!restaurantId) return
      if (!restaurantId.includes('@')) {
        setResolvedId(restaurantId)
        return
      }
      
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('email', restaurantId.toLowerCase())
        .single()
      
      if (data?.id) {
        setResolvedId(data.id)
      }
    }
    resolve()
  }, [restaurantId])

  useEffect(() => {
    if (!resolvedId) return

    const fetchActiveCounts = async () => {
      // 1. Fetch Orders count (Pending & Preparing)
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', resolvedId)
        .in('status', ['PENDING', 'PREPARING'])

      // 2. Fetch Active Tables count
      const { count: tableCount } = await supabase
        .from('table_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', resolvedId)
        .in('status', ['occupied', 'billing'])

      // 3. Fetch Active Waiter Calls count
      const { count: waiterCount } = await supabase
        .from('waiter_calls')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', resolvedId)
        .eq('is_handled', false)

      setCounts({
        orders: (orderCount || 0) + (waiterCount || 0), // Include service requests in the orders alert
        tables: tableCount || 0
      })
    }

    fetchActiveCounts()

    // 🏆 Subscribe to Real-time Changes
    const orderChannel = supabase
      .channel('sidebar-orders')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `restaurant_id=eq.${resolvedId}`
      }, () => fetchActiveCounts())
      .subscribe()

    const tableChannel = supabase
      .channel('sidebar-tables')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'table_sessions',
        filter: `restaurant_id=eq.${resolvedId}`
      }, () => fetchActiveCounts())
      .subscribe()

    const waiterChannel = supabase
      .channel('sidebar-waiter')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'waiter_calls',
        filter: `restaurant_id=eq.${resolvedId}`
      }, () => fetchActiveCounts())
      .subscribe()

    return () => {
      supabase.removeChannel(orderChannel)
      supabase.removeChannel(tableChannel)
      supabase.removeChannel(waiterChannel)
    }
  }, [resolvedId])

  const handleNavigation = (item) => {
    setActiveItem(item.id)
    
    // Identity-Safe Navigation: Redirect to isolated console if departing from legacy routes
    if (item.route === '/dashboard') {
      const user = JSON.parse(localStorage.getItem('servora_user') || '{}')
      if (user.email && !window.location.pathname.startsWith('/console')) {
        navigate(`/console/${user.email}`)
        return
      }
    }
    
    // If we're already in the console, we don't need to navigate, just set the state (handled above)
    if (!window.location.pathname.startsWith('/console')) {
      navigate(item.route)
    }
  }

  const handleSignOut = () => {
    saveAndClearWorkspace()
    localStorage.removeItem('servora_user')
    navigate('/login')
  }
  const [subData, setSubData] = useState({ daysLeft: 30, planName: 'Starter' })

  useEffect(() => {
    const checkSub = () => {
      const savedPlan = localStorage.getItem('servora_plan')
      if (savedPlan) {
        const planData = JSON.parse(savedPlan)
        const purchaseDate = new Date(planData.purchaseDate || planData.activeSince || Date.now())
        const expiryDate = new Date(purchaseDate.getTime() + (30 * 24 * 60 * 60 * 1000))
        const now = new Date()
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        setSubData({ daysLeft, planName: planData.name })
      }
    }
    checkSub()
    window.addEventListener('storage', checkSub)
    return () => window.removeEventListener('storage', checkSub)
  }, [])

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} h-screen flex flex-col ${isMobile ? 'flex' : 'hidden lg:flex'}`}>
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

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  activeItem === item.id
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {badgeCount > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {badgeCount}
                      </Badge>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>

        <div className="space-y-2 mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-3 mb-2">Support & Ops</p>
          {supportItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  activeItem === item.id
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
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
