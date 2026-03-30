import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import MobileNavbar from './MobileNavbar'
import OrderNotification from '../dashboard/OrderNotification'

export default function Layout({ children, activeItem, setActiveItem, currency, onCurrencyChange, restaurantId }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-x-hidden">
      <OrderNotification 
        restaurantId={restaurantId} 
        onOrderClick={() => setActiveItem('orders')} 
      />
      {activeItem !== 'docs' && (
        <Sidebar 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          restaurantId={restaurantId}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className={(activeItem === 'dashboard' || activeItem === 'orders' || activeItem === 'menu' || activeItem === 'analytics' || activeItem === 'tables' || activeItem === 'customers' || activeItem === 'qr-codes' || activeItem === 'help' || activeItem === 'docs' || activeItem === 'settings') ? 'hidden lg:block' : 'block'}>
          <Navbar 
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            currency={currency}
            onCurrencyChange={onCurrencyChange}
            restaurantId={restaurantId}
          />
        </div>
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          {children}
        </main>
        
        <MobileNavbar 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
        />
      </div>
    </div>
  )
}
