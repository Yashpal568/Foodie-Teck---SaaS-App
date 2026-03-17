import { Menu, ChefHat, Users, RefreshCw, Plus, Activity, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from '@/components/ui/separator'
import Sidebar from '../layout/Sidebar'

export default function TableMobileNavbar({ 
  activeItem, 
  setActiveItem, 
  navigate,
  onRefresh,
  onAddTable
}) {
  
  const handleNavigation = (item) => {
    setActiveItem(item.id)
    navigate(item.route)
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
        <SheetContent side="left" className="w-[280px] p-0 bg-white border-r text-left">
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
        <h2 className="text-xs font-black text-gray-900 truncate tracking-tight uppercase leading-tight">Table Hub</h2>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 bg-gray-50/50 rounded-xl ring-1 ring-inset ring-gray-100 text-gray-600 hover:bg-white transition-all"
          onClick={onRefresh}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        <Button 
          className="h-10 px-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 text-xs font-bold hover:bg-blue-700 transition-all"
          onClick={onAddTable}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>
    </div>
  )
}
