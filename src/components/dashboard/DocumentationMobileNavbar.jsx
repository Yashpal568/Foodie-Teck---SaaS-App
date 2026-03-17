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
    <div className="lg:hidden sticky top-0 z-[60] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 h-16 flex items-center justify-between gap-4">
      {/* Left Action: Menu & Logo */}
      <div className="flex items-center gap-2">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100 rounded-xl w-10 h-10">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 border-none shadow-2xl">
            <SheetTitle className="sr-only">Main Menu</SheetTitle>
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
        <Logo subtitle="Docs" iconSize={26} showText={true} />
      </div>

      {/* Right Action: Notifications & Profile */}
      <div className="flex items-center gap-2">
        <NotificationDropdown />
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-[10px] shadow-lg shadow-blue-200">
          JD
        </div>
      </div>
    </div>
  )
}

export default DocumentationMobileNavbar
