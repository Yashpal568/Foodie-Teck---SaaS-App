import React, { useState } from 'react'
import { Menu, ChefHat, Bell, Search, RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Sidebar from '../layout/Sidebar'

const DashboardMobileNavbar = ({ activeItem, setActiveItem, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="lg:hidden sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 rounded-xl">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-none">
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
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">FoodieTech</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-tight">Management</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={onRefresh}
            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
        <div className="relative">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 rounded-xl">
            <Bell className="w-5 h-5" />
          </Button>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center ml-1">
           <span className="text-[10px] font-bold text-blue-700">JD</span>
        </div>
      </div>
    </div>
  )
}

export default DashboardMobileNavbar
