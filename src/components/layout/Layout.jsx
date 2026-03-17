import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import MobileNavbar from './MobileNavbar'

export default function Layout({ children, activeItem, setActiveItem, currency, onCurrencyChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar 
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className={(activeItem === 'orders' || activeItem === 'menu' || activeItem === 'analytics' || activeItem === 'tables' || activeItem === 'customers') ? 'hidden lg:block' : 'block'}>
          <Navbar 
            activeItem={activeItem}
            setActiveItem={setActiveItem}
            currency={currency}
            onCurrencyChange={onCurrencyChange}
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
