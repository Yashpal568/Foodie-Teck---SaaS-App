import { Menu, Users, RefreshCw, Download, ChefHat, Activity, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { menuItems as navigationItems, supportItems as sidebarSupportItems } from '../layout/Sidebar'

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
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800 tracking-tight">FoodieTech</h1>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-0.5">Studio Management</p>
                </div>
              </div>
              
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Access different sections of the dashboard.</SheetDescription>

              <div className="space-y-1.5">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                      activeItem === item.id 
                        ? 'bg-blue-50/50 text-blue-600 font-bold ring-1 ring-inset ring-blue-100/50' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${activeItem === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-sm tracking-tight">{item.label}</span>
                  </button>
                ))}
              </div>

              <Separator className="my-6 bg-gray-100" />

              <div className="space-y-1.5">
                {sidebarSupportItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                      activeItem === item.id 
                        ? 'bg-blue-50/50 text-blue-600 font-bold' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0 text-gray-400" />
                    <span className="text-sm tracking-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
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
