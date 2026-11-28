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
    <div className="lg:hidden bg-transparent px-4 pt-3.5 pb-1 space-y-2">
      {/* Row 1: INVENTORY & OPERATIONS pill */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9.5px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
          <ChefHat className="w-3 h-3 shrink-0" />
          <span>Inventory & Operations</span>
        </span>
      </div>

      {/* Row 2: Inventory Title on left + INR & Grid Icon on right */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex flex-col min-w-0">
          <h2 className="text-lg font-extrabold text-slate-950 truncate tracking-tight leading-tight">
            Inventory ({menuItems?.length || 0} / {maxLimit >= 9999 ? '∞' : maxLimit})
          </h2>
          <p className="text-[11px] text-slate-500 font-medium truncate">
            {planDetails?.name || 'All-in-One Unlimited'}: {menuItems?.length || 0} items live
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {planDetails?.tableLimit < 9999 && (
            <button
              onClick={onUpgradeClick}
              className="h-8 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold shrink-0"
            >
              Renew
            </button>
          )}
          <CurrencySelector
            value={currency}
            onChange={onCurrencyChange}
            className="h-8 w-auto min-w-0 border border-slate-200/80 bg-white rounded-full font-bold text-[11px] px-2.5 shadow-2xs"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 rounded-full bg-white border border-slate-200/80 hover:bg-slate-50 shadow-2xs shrink-0">
                <LayoutGrid className="w-3.5 h-3.5" />
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
