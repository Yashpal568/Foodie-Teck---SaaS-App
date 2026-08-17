import { Search, Plus, ChefHat, Filter, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import CurrencySelector from '@/components/ui/currency-selector'
import CategoryManager from './CategoryManager'
import BulkImportExport from './BulkImportExport'
import MenuTemplates from './MenuTemplates'
import PriceHistory from './PriceHistory'

export default function MenuNavbar({ 
  itemsCount, 
  searchTerm, 
  onSearchChange, 
  onAddNew, 
  currency, 
  onCurrencyChange,
  menuItems,
  onMenuItemsChange,
  onMenuItemsAppend,
  onCategoriesChange,
  restaurantId,
  planDetails,
  onUpgradeClick
}) {
  const maxLimit = planDetails?.menuItemLimit || 25
  const isNearLimit = itemsCount >= maxLimit

  return (
    <div className="hidden lg:flex items-center gap-4 lg:gap-5 xl:gap-6 px-4 lg:px-6 py-5 bg-white/70 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 transition-all">
      {/* Left Area: Branding & Context */}
      <div className="flex flex-col shrink-0">
        <div className="flex items-center gap-2 text-[10px] font-bold text-orange-600 uppercase tracking-[0.2em] mb-1">
          <ChefHat className="w-3.5 h-3.5" />
          <span>Inventory & Operations</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap leading-none transition-all">Inventory</h1>
          
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className={`${isNearLimit ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-100'} font-bold px-2 py-0.5 h-6 text-xs min-w-fit flex items-center gap-1`}>
              <span>{itemsCount}</span>
              <span className="text-slate-400 font-normal">/ {maxLimit >= 9999 ? '∞' : maxLimit}</span>
            </Badge>

            {planDetails && planDetails.name === 'Starter' && (
              <button 
                onClick={onUpgradeClick}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1"
              >
                <span>⚡ Upgrade</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-xs lg:text-[11px] xl:text-xs text-gray-500 font-medium mt-1.5 max-w-50 lg:max-w-62.5 xl:max-w-lg line-clamp-1">
          {planDetails?.name || 'Starter'} Plan: {itemsCount} of {maxLimit >= 9999 ? 'Unlimited' : maxLimit} items configured.
        </p>
      </div>

      {/* Spacer to push tools to the right */}
      <div className="flex-1" />

      {/* Right Area: Tools & Primary Action */}
      <div className="flex items-center gap-3 lg:gap-4 shrink-0">
        {/* Secondary Toolset */}
        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-sm">
          <TooltipProvider delayDuration={0}>
            <div className="flex items-center gap-0.5 lg:gap-1">
              <CategoryManager onCategoriesChange={onCategoriesChange} restaurantId={restaurantId} showLabel={false} />
              <BulkImportExport 
                menuItems={menuItems}
                restaurantId={restaurantId}
                onImport={onMenuItemsChange}
                showLabel={false}
              />
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
                currentItemsCount={menuItems.length}
                showLabel={false}
              />
              <PriceHistory menuItems={menuItems} showLabel={false} />
            </div>
          </TooltipProvider>
        </div>

        <div className="h-8 w-px bg-gray-200 mx-0.5" />

        <div className="flex items-center gap-2 lg:gap-3">
          <CurrencySelector 
            value={currency} 
            onChange={onCurrencyChange}
            className="h-10 border-none bg-gray-50 hover:bg-white ring-1 ring-gray-200 hover:ring-gray-300 rounded-xl shadow-sm font-bold text-xs lg:text-sm px-3 lg:px-4 min-w-22.5 lg:min-w-27.5 transition-all"
          />

          <Button 
            onClick={onAddNew} 
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-10 lg:h-11 px-3 lg:px-4 xl:px-6 rounded-xl shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap text-xs lg:text-sm flex items-center gap-1.5 lg:gap-2 group"
          >
            <div className="p-0.5 lg:p-1 bg-white/20 rounded-lg group-hover:scale-110 transition-transform hidden sm:block">
              <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            </div>
            <span>Add New Item</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
