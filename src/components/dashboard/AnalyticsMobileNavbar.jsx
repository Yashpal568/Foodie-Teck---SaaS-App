import React, { useMemo, useState, useEffect } from 'react'
import { Menu, ChefHat, BarChart3, Calendar, ChevronDown, Activity, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Separator } from '@/components/ui/separator'
import Sidebar from '../layout/Sidebar'

export default function AnalyticsMobileNavbar({ 
  activeItem, 
  setActiveItem, 
  navigate,
  timeRange,
  setTimeRange 
}) {
  
  const handleNavigation = (item) => {
    setActiveItem(item.id)
    navigate(item.route)
  }

  const getTimeRangeLabel = (val) => {
    switch(val) {
      case '7days': return '7 Days'
      case '30days': return '1 Month'
      case '90days': return '3 Months'
      case 'all': return 'All Time'
      default: return 'Custom'
    }
  }

  return (
    <div className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
      {/* Mobile Menu Trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-600 bg-gray-50/50 rounded-xl hover:bg-white ring-1 ring-inset ring-gray-100 transition-all">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 bg-white border-r">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">Access all dashboard sections</SheetDescription>
          <Sidebar 
            activeItem={activeItem} 
            setActiveItem={setActiveItem} 
            isCollapsed={false}
            setIsCollapsed={() => {}}
            isMobile={true}
          />
        </SheetContent>
      </Sheet>

      {/* Center Section: Page Title */}
      <div className="flex-1 flex flex-col justify-center min-w-0 -mt-0.5 ml-1">
        <div className="flex items-center gap-1.5">
          <Activity className="w-2.5 h-2.5 text-blue-500" />
          <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.15em] leading-none">Studio</span>
        </div>
        <h2 className="text-xs font-black text-gray-900 truncate tracking-tight uppercase leading-tight">Analytics Center</h2>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 px-3 bg-gray-50/50 rounded-xl ring-1 ring-inset ring-gray-100 flex items-center gap-2 text-xs font-bold text-gray-700 hover:bg-white transition-all">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{getTimeRangeLabel(timeRange)}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-2xl border-gray-100 shadow-2xl">
            <DropdownMenuLabel inset={false} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-2">Select Duration</DropdownMenuLabel>
            <DropdownMenuSeparator className="hidden" />
            <DropdownMenuRadioGroup value={timeRange} onValueChange={setTimeRange} className="space-y-0.5">
              <DropdownMenuRadioItem value="7days" inset={false} className="rounded-xl px-3 py-2 text-xs font-bold focus:bg-blue-50 focus:text-blue-600 cursor-pointer">
                Last 7 Days
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="30days" inset={false} className="rounded-xl px-3 py-2 text-xs font-bold focus:bg-blue-50 focus:text-blue-600 cursor-pointer">
                Last 30 Days
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="90days" inset={false} className="rounded-xl px-3 py-2 text-xs font-bold focus:bg-blue-50 focus:text-blue-600 cursor-pointer">
                Last 90 Days
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="all" inset={false} className="rounded-xl px-3 py-2 text-xs font-bold focus:bg-blue-50 focus:text-blue-600 cursor-pointer">
                All Time History
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
