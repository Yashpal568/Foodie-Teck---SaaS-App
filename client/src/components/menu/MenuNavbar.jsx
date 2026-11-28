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
    <div className="hidden lg:flex items-center gap-4 lg:gap-5 xl:gap-6 px-4 md:px-6 lg:px-8 pt-6 pb-2 max-w-[1600px] mx-auto bg-transparent">
      {/* Left Area: Branding & Context */}
      <div className="flex flex-col shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 uppercase tracking-[0.16em] mb-1">
          <span className="w-4.5 h-4.5 rounded-md bg-orange-50 border border-orange-200/70 flex items-center justify-center">
            <ChefHat className="w-3 h-3 text-orange-600" />
          </span>
          <span>Inventory & Operations</span>
        </div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-950 tracking-tight whitespace-nowrap leading-none">Inventory</h1>
          
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className={`${isNearLimit ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-indigo-50/90 text-indigo-700 border-indigo-200/70'} rounded-full font-bold px-2.5 py-0.5 h-6 text-xs min-w-fit flex items-center gap-1 border`}>
              <span>{itemsCount}</span>
              <span className="text-indigo-400 font-semibold">/ {maxLimit >= 9999 ? '∞' : maxLimit}</span>
            </Badge>

            {planDetails && planDetails.tableLimit < 9999 && (
              <button 
                onClick={onUpgradeClick}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>⚡ Renew</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400 font-medium mt-1 max-w-50 lg:max-w-72 xl:max-w-lg line-clamp-1">
          {planDetails?.name || 'All-in-One Unlimited'} Plan: {itemsCount} of {maxLimit >= 9999 ? 'Unlimited' : maxLimit} items configured.
        </p>
      </div>

      {/* Spacer to push tools to the right */}
      <div className="flex-1" />

      {/* Right Area: Tools & Primary Action */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Secondary Toolset */}
        <div className="flex items-center gap-0.5 bg-white px-1.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
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

        <CurrencySelector 
          value={currency} 
          onChange={onCurrencyChange}
          className="h-9.5 border border-slate-200/80 bg-white hover:bg-slate-50 rounded-xl shadow-2xs font-bold text-xs px-3 min-w-[88px] transition-colors"
        />

        <Button 
          onClick={onAddNew} 
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-9.5 px-4 rounded-xl shadow-xs shadow-amber-500/25 transition-all hover:-translate-y-0.5 active:scale-[0.98] whitespace-nowrap text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add New Item</span>
        </Button>
      </div>
    </div>
  )
}
