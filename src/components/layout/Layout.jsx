import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import MobileNavbar from './MobileNavbar'
import OrderNotification from '../dashboard/OrderNotification'

export default function Layout({ children, activeItem, setActiveItem, currency, onCurrencyChange, restaurantId, plan, onUpgradeClick }) {
  // Sidebar starts expanded on all screen sizes (md+).
  // User can collapse it anytime using the PanelLeft toggle in the navbar.
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
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
        {/* pb-16 on mobile for bottom nav bar; pb-0 on md+ */}
        <main className={`flex-1 overflow-auto bg-[#f4f6f9] pb-16 md:pb-0 group ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
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
