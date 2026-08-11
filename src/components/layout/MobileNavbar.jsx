import { useNavigate, useLocation } from 'react-router-dom'
import { Home, ShoppingCart, ChefHat, Receipt, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { icon: Home, label: 'Home', id: 'dashboard', route: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', id: 'orders', route: '/dashboard' },
  { icon: ChefHat, label: 'Menu', id: 'menu', route: '/dashboard' },
  { icon: Receipt, label: 'Analytics', id: 'analytics', route: '/dashboard' },
  { icon: Settings, label: 'Settings', id: 'settings', route: '/dashboard' }
]

export default function MobileNavbar({ activeItem, setActiveItem }) {
  const navigate = useNavigate()
  
  const handleNavigation = async (item) => {
    setActiveItem(item.id)
    
    // Identity-Safe Mobile Navigation
    if (item.route === '/dashboard') {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (user?.email) {
        navigate(`/console/${user.email}`)
        return
      }
    }
    
    navigate(item.route)
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-2 py-1 safe-area-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around max-w-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeItem === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px] rounded-xl transition-all duration-200 relative ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-400 active:scale-90'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full" />
              )}
              <div className={`p-1.5 rounded-lg transition-all duration-200 ${isActive ? 'bg-blue-50' : ''}`}>
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
