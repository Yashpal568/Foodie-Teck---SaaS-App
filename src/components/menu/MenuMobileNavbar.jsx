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
  onMenuItemsChange,
  onMenuItemsAppend,
  restaurantId,
  planDetails,
  onUpgradeClick
}) {
  const maxLimit = planDetails?.menuItemLimit || 25
  const isNearLimit = (menuItems?.length || 0) >= maxLimit

  const handleNavigation = (item) => {
    setActiveItem(item.id)
    navigate(item.route)
  }

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-slate-50/90 backdrop-blur-xl border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-4 shadow-sm">
      {/* Left Section: Page Title */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <ChefHat className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none">Inventory</span>
        </div>
        <h2 className="text-sm font-black text-slate-900 truncate tracking-tight uppercase leading-none">Menu Store</h2>
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
                   <CategoryManager onCategoriesChange={onCategoriesChange} restaurantId={restaurantId}/>
                 </DropdownMenuItem>
                 <DropdownMenuItem inset={false} asChild className="p-0 focus:bg-transparent">
                   <BulkImportExport 
                    menuItems={menuItems}
                    restaurantId={restaurantId}
                    onImport={onMenuItemsChange}
                   />
                 </DropdownMenuItem>
                 <DropdownMenuItem inset={false} asChild className="p-0 focus:bg-transparent">
                   <MenuTemplates 
                    onApplyTemplate={(items, categories) => {
                      if (onMenuItemsAppend) {
                        onMenuItemsAppend(items)
                        onCategoriesChange(prev => {
                          const newCats = [...new Set([...prev, ...categories])]
                          return newCats
                        })
                      }
                    }}
                    restaurantId={restaurantId}
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
        
        <div className="flex items-center gap-1.5">
           <div className="flex items-center px-2 py-1 bg-blue-50/80 border border-blue-100 rounded-lg text-[10px] font-bold text-blue-700">
             <span>{menuItems?.length || 0}</span>
             <span className="text-slate-400 font-normal">/{maxLimit >= 9999 ? '∞' : maxLimit}</span>
           </div>

           {planDetails?.name === 'Starter' && (
             <button
               onClick={onUpgradeClick}
               className="h-8 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold"
             >
               Upgrade
             </button>
           )}

           <Button 
             onClick={onAddNew} 
             size="icon" 
             className="h-9 w-9 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md shadow-orange-600/30 transition-all border-none shrink-0"
           >
             <Plus className="w-4 h-4" />
           </Button>
         </div>
      </div>
    </div>
  )
}
