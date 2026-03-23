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
import { Separator } from '@/components/ui/separator'
import Logo from '@/components/ui/Logo'
import { saveAndClearWorkspace } from '@/utils/workspace'

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

export default function Sidebar({ activeItem, setActiveItem, isCollapsed, setIsCollapsed, isMobile = false }) {
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ orders: 0, tables: 0 })

  useEffect(() => {
    const updateCounts = () => {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      const activeOrders = orders.filter(o => !['FINISHED', 'CANCELLED'].includes(o.status))
      
      const tables = JSON.parse(localStorage.getItem('tableSessions') || '[]')
      const activeTables = tables.filter(t => t.status === 'occupied' || t.status === 'billing')
      
      setCounts({
        orders: activeOrders.length,
        tables: activeTables.length
      })
    }

    updateCounts()
    window.addEventListener('storage', updateCounts)
    window.addEventListener('orderUpdated', updateCounts)
    
    return () => {
      window.removeEventListener('storage', updateCounts)
      window.removeEventListener('orderUpdated', updateCounts)
    }
  }, [])

  const handleNavigation = (item) => {
    setActiveItem(item.id)
    navigate(item.route)
  }

  const handleSignOut = () => {
    saveAndClearWorkspace()
    localStorage.removeItem('servora_user')
    navigate('/login')
  }

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
      <nav className="flex-1 p-4">
        <div className="space-y-2">
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

        <div className="space-y-2">
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
