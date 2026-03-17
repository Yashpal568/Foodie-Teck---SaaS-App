import { Menu, Users, RefreshCw, Download, ChefHat, Activity, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import Sidebar from '../layout/Sidebar'

export default function CustomerMobileNavbar({ activeItem, setActiveItem, navigate, onRefresh, onDownload }) {
  const handleNavigation = (item) => {
    setActiveItem(item.id)
    navigate(item.route)
  }

  return (
    <div className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-100">
              <Menu className="w-5 h-5 text-gray-600" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 border-r-0 bg-white">
            <Sidebar 
              activeItem={activeItem} 
              setActiveItem={setActiveItem} 
              isCollapsed={false}
              setIsCollapsed={() => {}}
              isMobile={true}
            />
          </SheetContent>
        </Sheet>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 translate-y-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">Studio</span>
          </div>
          <span className="text-sm font-black text-gray-900 leading-none">Customer Hub</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl h-10 w-10 hover:bg-gray-100"
          onClick={onRefresh}
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl h-10 w-10 hover:bg-gray-100"
          onClick={onDownload}
        >
          <Download className="w-4 h-4 text-gray-600" />
        </Button>
      </div>
    </div>
  )
}
