import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import MobileNavbar from './MobileNavbar'
import OrderNotification from '../dashboard/OrderNotification'
import WaiterCallBanner from '../dashboard/WaiterCallBanner'

export default function Layout({ children, activeItem, setActiveItem, currency, onCurrencyChange, restaurantId, plan, onUpgradeClick }) {
  // Collapse automatically into 74px Icon Rail on Tablet (768px–1023px), expand to 244px on Desktop (>=1024px)
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false
  )

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      if (w >= 768 && w < 1024) setIsCollapsed(true)
      else if (w >= 1024) setIsCollapsed(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex flex-1 min-h-0 h-full bg-slate-50 overflow-hidden">
      <OrderNotification 
        restaurantId={restaurantId} 
        onOrderClick={() => setActiveItem('orders')} 
      />

      {/* Sidebar: hidden on mobile (<md), collapsed-by-default on iPad (md-lg), full on desktop (lg+) */}
      {activeItem !== 'docs' && (
        <Sidebar 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          restaurantId={restaurantId}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <Navbar 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          currency={currency}
          onCurrencyChange={onCurrencyChange}
          restaurantId={restaurantId}
          plan={plan}
          onUpgradeClick={onUpgradeClick}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        <WaiterCallBanner restaurantId={restaurantId} />
        {/* pb-24 on mobile for bottom nav bar clearance; pb-8 on md+ */}
        <main className={`flex-1 overflow-auto bg-[#F8FAFC] pb-24 md:pb-8 group ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
          {children}
        </main>

        {/* Bottom navigation bar — only visible on mobile (<md) */}
        <MobileNavbar
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          restaurantId={restaurantId}
        />
      </div>
    </div>
  )
}
