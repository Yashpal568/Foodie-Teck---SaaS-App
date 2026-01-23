import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout({ children, activeItem, setActiveItem, currency, onCurrencyChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    // In a real app, you would apply dark mode classes here
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar 
          isDarkMode={isDarkMode} 
          toggleDarkMode={toggleDarkMode}
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
