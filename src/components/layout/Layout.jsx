import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

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
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          currency={currency}
          onCurrencyChange={onCurrencyChange}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
