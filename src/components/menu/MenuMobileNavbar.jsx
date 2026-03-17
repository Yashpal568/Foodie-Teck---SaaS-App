import { Menu, Plus, Search, ChefHat, LayoutGrid, Settings, HelpCircle } from 'lucide-react'
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
} from "@/components/ui/dropdown-menu"
import { Separator } from '@/components/ui/separator'
import Sidebar from '../layout/Sidebar'
import CategoryManager from './CategoryManager'
import BulkImportExport from './BulkImportExport'
import MenuTemplates from './MenuTemplates'
import PriceHistory from './PriceHistory'
import CurrencySelector from '@/components/ui/currency-selector'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function MenuMobileNavbar({ 
  onAddNew, 
  activeItem, 
  setActiveItem, 
  navigate,
  currency,
  onCurrencyChange,
  onCategoriesChange,
  menuItems,
  onMenuItemsChange
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
      <div className="flex-1 flex flex-col justify-center min-w-0 -mt-0.5">
        <div className="flex items-center gap-1.5">
          <ChefHat className="w-2.5 h-2.5 text-orange-500" />
          <span className="text-[8px] font-black text-orange-600 uppercase tracking-[0.15em] leading-none">Inventory</span>
        </div>
        <h2 className="text-xs font-black text-gray-900 truncate tracking-tight uppercase leading-tight">Menu Store</h2>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-50/50 p-1 rounded-xl ring-1 ring-inset ring-gray-100">
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 rounded-lg hover:bg-white transition-all">
                 <LayoutGrid className="w-4 h-4" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-gray-100 shadow-2xl">
               <DropdownMenuLabel inset={false} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1.5">Management</DropdownMenuLabel>
               <div className="space-y-1">
                 <DropdownMenuItem inset={false} asChild className="p-0 focus:bg-transparent">
                   <CategoryManager onCategoriesChange={onCategoriesChange} />
                 </DropdownMenuItem>
                 <DropdownMenuItem inset={false} asChild className="p-0 focus:bg-transparent">
                   <BulkImportExport 
                    menuItems={menuItems} 
                    onImport={(items) => {
                      const updatedItems = [...menuItems, ...items]
                      onMenuItemsChange(updatedItems)
                    }}
                   />
                 </DropdownMenuItem>
                 <DropdownMenuItem inset={false} asChild className="p-0 focus:bg-transparent">
                   <MenuTemplates 
                    onApplyTemplate={(items, categories) => {
                      const updatedItems = [...menuItems, ...items]
                      onMenuItemsChange(updatedItems)
                      onCategoriesChange(categories)
                    }}
                    currentItemsCount={menuItems?.length || 0}
                   />
                 </DropdownMenuItem>
                 <DropdownMenuItem inset={false} asChild className="p-0 focus:bg-transparent">
                   <PriceHistory menuItems={menuItems} />
                 </DropdownMenuItem>
               </div>
               <DropdownMenuSeparator className="my-2 bg-gray-100" />
               <DropdownMenuLabel inset={false} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1.5">Settings</DropdownMenuLabel>
               <div className="px-1 py-1">
                 <CurrencySelector 
                    value={currency} 
                    onChange={onCurrencyChange}
                    className="h-10 w-full border-none bg-gray-50/50 hover:bg-gray-50 rounded-xl font-bold text-xs px-3 transition-all ring-1 ring-inset ring-gray-100"
                  />
               </div>
             </DropdownMenuContent>
           </DropdownMenu>
        </div>
        
        <div className="h-8 w-[1px] bg-gray-200 mx-0.5 hidden sm:block" />

        <Button 
          onClick={onAddNew} 
          size="icon" 
          className="h-10 w-10 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-lg shadow-orange-600/30 transition-all border-none shrink-0"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
