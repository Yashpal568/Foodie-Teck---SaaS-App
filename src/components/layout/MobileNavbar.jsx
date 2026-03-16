import { useNavigate, useLocation } from 'react-router-dom'
import { Home, ShoppingCart, ChefHat, Receipt, Settings } from 'lucide-react'

const navItems = [
  { icon: Home, label: 'Home', id: 'dashboard', route: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', id: 'orders', route: '/dashboard' },
  { icon: ChefHat, label: 'Menu', id: 'menu', route: '/dashboard' },
  { icon: Receipt, label: 'Analytics', id: 'analytics', route: '/dashboard' },
  { icon: Settings, label: 'Settings', id: 'settings', route: '/dashboard' }
]

export default function MobileNavbar({ activeItem, setActiveItem }) {
  const navigate = useNavigate()
  
  const handleNavigation = (item) => {
    setActiveItem(item.id)
    navigate(item.route)
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-gray-100 px-2 py-2 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeItem === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className={`flex flex-col items-center gap-1 pt-1 pb-1 px-3 min-w-[64px] rounded-xl transition-all duration-300 relative ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600 active:scale-90'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full" />
              )}
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-80'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
