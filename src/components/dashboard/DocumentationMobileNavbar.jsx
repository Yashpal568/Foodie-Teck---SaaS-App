import React, { useState } from 'react'
import { Menu, Bell, Search, BookOpen, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Sidebar from '../layout/Sidebar'
import Logo from '@/components/ui/Logo'

const DocumentationMobileNavbar = ({ activeItem, setActiveItem, onSearch, searchTerm }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="lg:hidden sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 h-16 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 rounded-xl">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-none">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">Access all dashboard sections</SheetDescription>
            <Sidebar 
                activeItem={activeItem} 
                setActiveItem={(item) => {
                    setActiveItem(item)
                    setIsOpen(false)
                }} 
                isCollapsed={false}
                setIsCollapsed={() => {}}
                isMobile={true}
            />
          </SheetContent>
        </Sheet>
        
        <Logo subtitle="Docs" className="ml-2" />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search Button */}
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={onSearch}
            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
        >
          <Search className="w-5 h-5" />
        </Button>
        
        {/* Documentation Toggle */}
        <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
        >
          <BookOpen className="w-5 h-5" />
        </Button>
        
        {/* Notifications */}
        <NotificationDropdown />
        
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center ml-1">
          <span className="text-xs font-bold text-blue-600">U</span>
        </div>
      </div>
    </div>
  )
}

export default DocumentationMobileNavbar
