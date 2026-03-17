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
import { menuItems as navigationItems, supportItems as sidebarSupportItems } from '../layout/Sidebar'

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
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">FoodieTech</h1>
                  <p className="text-xs text-gray-500 font-medium">Studio Management</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-1.5">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeItem === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50/50 text-blue-600 font-bold ring-1 ring-inset ring-blue-100/50'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                      <span className="text-sm tracking-tight">{item.label}</span>
                    </button>
                  )
                })}
              </div>

              <Separator className="my-6" />

              <div className="space-y-1.5">
                {sidebarSupportItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeItem === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50/50 text-blue-600 font-bold'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm tracking-tight">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </nav>
          </div>
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
