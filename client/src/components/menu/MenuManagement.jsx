import { useState, useEffect } from 'react'
import { Plus, Search, Filter, ChefHat, ArrowLeft, Eye, Edit, Trash2, ToggleLeft, ToggleRight, Copy, LayoutGrid, CheckCircle2, AlertCircle, Leaf, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import MenuItemForm from './MenuItemForm'
import MenuListView from './MenuListView'
import CategoryManager from './CategoryManager'
import BulkImportExport from './BulkImportExport'
import MenuTemplates from './MenuTemplates'
import PriceHistory from './PriceHistory'
import { formatPrice } from '@/components/ui/currency-selector'
import CurrencySelector from '@/components/ui/currency-selector'
import ImageStorage from '@/utils/imageStorage'
import MenuNavbar from './MenuNavbar'
import MenuMobileNavbar from './MenuMobileNavbar'
import DeleteConfirmModal from './DeleteConfirmModal'
import { fetchMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemStock, ensureValidRestaurantUUID, bulkReplaceMenuItems, bulkAddMenuItems, recordPriceChange } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import UpgradePlanModal from '../dashboard/UpgradePlanModal'
import { getPlanDetails } from '@/utils/planLimits'

export default function MenuManagement({ currency, onCurrencyChange, activeItem, setActiveItem, navigate, plan, restaurantId: propRestaurantId }) {
  const [menuItems, setMenuItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentRid, setCurrentRid] = useState(null)
  const [dynamicCategories, setDynamicCategories] = useState(['Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads'])
  
  const planDetails = getPlanDetails(plan?.name)
  
  // Custom Delete Modal state
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isDeletingItem, setIsDeletingItem] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')

  // ── Smart Data Fetching: Strictly scoped to active console restaurantId (never cross-tenant cache) ──
  useEffect(() => {
    let active = true
    const init = async () => {
      setIsLoading(true)
      setMenuItems([])
      setFilteredItems([])

      const pathSlug =
        typeof window !== 'undefined' && window.location.pathname.includes('/console/')
          ? decodeURIComponent(window.location.pathname.split('/console/')[1] || '').split('/')[0]
          : null

      const target = propRestaurantId || pathSlug || 'demo-merchant'
      const isDemo = target === 'demo-merchant' || target === 'demo' || target === 'guest'

      let rid = isDemo ? 'demo-merchant' : target
      if (!isDemo) {
        try {
          const uuid = await ensureValidRestaurantUUID(target)
          if (uuid) rid = uuid
        } catch {
          // keep resolved target
        }
      }

      if (!active) return
      setCurrentRid(rid)
      try {
        const items = await fetchMenuItems(rid)
        if (active) {
          setMenuItems(items)
          setFilteredItems(items)
        }
      } catch (err) {
        console.error('Menu load error:', err)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    init()
    return () => { active = false }
  }, [propRestaurantId])

  // Apply filters
  useEffect(() => {
    let filtered = menuItems
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }
    if (typeFilter !== 'All') {
      filtered = filtered.filter(item => item.type === typeFilter)
    }
    if (stockFilter === 'In Stock') {
      filtered = filtered.filter(item => item.isInStock)
    } else if (stockFilter === 'Out of Stock') {
      filtered = filtered.filter(item => !item.isInStock)
    }
    setFilteredItems(filtered)
  }, [menuItems, searchTerm, categoryFilter, typeFilter, stockFilter])

  // ── Create or Update menu item via Supabase ──
  const handleSaveItem = async (itemData) => {
    const rid = currentRid || propRestaurantId || 'demo-merchant'
    setIsSaving(true)
    try {
      if (editingItem) {
        // UPDATE
        const oldItem = menuItems.find(item => item.id === editingItem.id || item._id === editingItem._id)
        const updated = await updateMenuItem(editingItem.id || editingItem._id, itemData, rid)
        setMenuItems(prev => prev.map(i => (i.id === editingItem.id || i._id === editingItem._id) ? updated : i))
        setFilteredItems(prev => prev.map(i => (i.id === editingItem.id || i._id === editingItem._id) ? updated : i))
        if (oldItem && Number(oldItem.price) !== Number(itemData.price)) {
          recordPriceChange(rid, itemData.name, oldItem.price, itemData.price, editingItem.id || editingItem._id)
        }
        toast.success(`✨ "${itemData.name}" has been updated successfully!`)
      } else {
        // CREATE
        const created = await createMenuItem(rid, itemData)
        setMenuItems(prev => [...prev, created])
        setFilteredItems(prev => [...prev, created])
        toast.success(`🎉 "${itemData.name}" has been added successfully!`)
      }
    } catch (err) {
      console.error('Save menu item error:', err)
      toast.error('Failed to save menu item')
    } finally {
      setIsSaving(false)
      setShowForm(false)
      setEditingItem(null)
    }
  }

  // ── Bulk Create via Supabase ──
  const handleBulkImport = async (items) => {
    if (!currentRid) return
    setIsLoading(true)
    try {
      const savedItems = await bulkReplaceMenuItems(currentRid, items)
      setMenuItems(savedItems)
      setFilteredItems(savedItems)
      toast.success(`📦 ${savedItems.length} menu items imported successfully!`)
    } catch (err) {
      console.error('Bulk import error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Bulk Append via Supabase ──
  const handleBulkAppend = async (items) => {
    if (!currentRid) return
    setIsLoading(true)
    try {
      const savedItems = await bulkAddMenuItems(currentRid, items)
      // Merge new items with current menuItems
      setMenuItems(prev => [...prev, ...savedItems])
      toast.success(`📦 ${savedItems.length} menu items appended successfully!`)
    } catch (err) {
      console.error('Bulk append error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setShowForm(true)
  }

  // ── Open Custom Delete Confirmation Modal ──
  const handleDeleteItem = (itemOrId) => {
    let target = itemOrId
    if (typeof itemOrId === 'string') {
      target = menuItems.find(i => (i.id === itemOrId || i._id === itemOrId)) || { id: itemOrId, _id: itemOrId, name: 'Menu Item' }
    }
    setItemToDelete(target)
  }

  // ── Execute Delete via Supabase ──
  const confirmDeleteItem = async () => {
    if (!itemToDelete) return
    setIsDeletingItem(true)
    const itemId = itemToDelete.id || itemToDelete._id
    const itemName = itemToDelete.name || 'Menu item'
    try {
      await deleteMenuItem(itemId, currentRid)
      setMenuItems(prev => prev.filter(i => (i.id !== itemId && i._id !== itemId)))
      setFilteredItems(prev => prev.filter(i => (i.id !== itemId && i._id !== itemId)))
      ImageStorage.removeImage(itemId)
      toast.success(`🗑️ "${itemName}" has been deleted successfully!`)
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete menu item')
    } finally {
      setIsDeletingItem(false)
      setItemToDelete(null)
    }
  }

  // ── Toggle stock via Supabase ──
  const handleToggleStock = async (itemId, newStockStatus) => {
    const rid = currentRid || propRestaurantId || 'demo-merchant'
    const itemObj = menuItems.find(i => (i.id === itemId || i._id === itemId))
    const itemName = itemObj?.name || 'Item'
    try {
      const updated = await toggleMenuItemStock(itemId, newStockStatus, rid)
      setMenuItems(prev => prev.map(i => (i.id === itemId || i._id === itemId) ? { ...i, ...updated, isInStock: newStockStatus } : i))
      toast.success(`⚡ "${itemName}" is now ${newStockStatus ? 'In Stock' : 'Out of Stock'}!`)
    } catch (err) {
      console.error('Toggle stock error:', err)
    }
  }

  const totalItems = menuItems.length
  const inStockItems = menuItems.filter(item => item.isInStock).length
  const outOfStockItems = totalItems - inStockItems
  const vegItems = menuItems.filter(item => item.type === 'VEG').length
  const nonVegItems = menuItems.filter(item => item.type === 'NON_VEG').length
  const activeCategoryCount = new Set(menuItems.map(i => String(i.category || '').trim()).filter(Boolean)).size
  const livePercent = totalItems > 0 ? Math.round((inStockItems / totalItems) * 100) : 0
  const vegPercent = totalItems > 0 ? Math.round((vegItems / totalItems) * 100) : 0

  if (showForm) {
    return (
      <div className="bg-[#f8fafc] min-h-screen px-4 sm:px-6 lg:px-8 py-6">
        <MenuItemForm 
          item={editingItem} 
          onSave={handleSaveItem} 
          onCancel={() => { setShowForm(false); setEditingItem(null); }}
          currency={currency}
          categories={dynamicCategories}
        />
      </div>
    )
  }

  const handleAddNew = () => {
    if (menuItems.length >= planDetails.menuItemLimit) {
      setShowUpgradeModal(true)
      toast.error(`⚠️ Menu Item Limit Reached (${menuItems.length}/${planDetails.menuItemLimit})`, {
        description: `Please renew your ${planDetails.name || 'All-in-One Unlimited'} plan to add more dishes!`
      })
      return
    }
    setShowForm(true)
  }

  return (
    <TooltipProvider>
      <div className="bg-[#f8fafc]/50 min-h-screen">
        <MenuNavbar 
          itemsCount={menuItems.length}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAddNew={handleAddNew}
          currency={currency}
          onCurrencyChange={onCurrencyChange}
          menuItems={menuItems}
          restaurantId={currentRid}
          onMenuItemsChange={handleBulkImport}
          onMenuItemsAppend={handleBulkAppend}
          onCategoriesChange={setDynamicCategories}
          planDetails={planDetails}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />

        <MenuMobileNavbar 
          onAddNew={handleAddNew}
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
          currency={currency}
          onCurrencyChange={onCurrencyChange}
          onCategoriesChange={setDynamicCategories}
          menuItems={menuItems}
          restaurantId={currentRid}
          onMenuItemsChange={handleBulkImport}
          onMenuItemsAppend={handleBulkAppend}
          planDetails={planDetails}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />

        {/* Upgrade Plan Modal */}
        <UpgradePlanModal 
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          currentPlanName={planDetails.name}
          limitType="menu"
          currentUsage={menuItems.length}
          maxLimit={planDetails.menuItemLimit}
          restaurantId={currentRid}
          merchantEmail={currentRid === 'demo-merchant' ? 'demo@servora.app' : ''}
          merchantName={currentRid === 'demo-merchant' ? 'Servora Demo Kitchen' : 'Restaurant Admin'}
          onUpgradeSuccess={() => {
            setShowUpgradeModal(false)
            toast.success('🎉 Plan Upgraded Successfully! Catalog limits expanded.')
          }}
        />

        <div className="p-3.5 md:p-6 lg:p-8 pb-24 md:pb-10 space-y-4 md:space-y-6 max-w-[1600px] mx-auto">
          {/* 5 Individual Executive KPI Stat Cards (Horizontal scroll strip on mobile, 5-col grid on desktop) */}
          <div className="flex lg:grid lg:grid-cols-5 gap-3 overflow-x-auto no-scrollbar pb-1 snap-x">
            <div className="min-w-[148px] lg:min-w-0 shrink-0 snap-start bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs hover:shadow-sm hover:border-blue-200/80 transition-[box-shadow,border-color] duration-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Items</span>
                <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">{totalItems}</p>
              <p className="text-[10.5px] font-medium text-blue-600 mt-0.5">
                {activeCategoryCount} {activeCategoryCount === 1 ? 'category' : 'categories'} active
              </p>
            </div>

            <div className="min-w-[148px] lg:min-w-0 shrink-0 snap-start bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs hover:shadow-sm hover:border-emerald-200/80 transition-[box-shadow,border-color] duration-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Active</span>
                <div className="w-6.5 h-6.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight tabular-nums">{inStockItems}</p>
              <p className="text-[10.5px] font-medium text-emerald-600 mt-0.5">
                • {livePercent}% visible
              </p>
            </div>

            <div className="min-w-[148px] lg:min-w-0 shrink-0 snap-start bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs hover:shadow-sm hover:border-rose-200/80 transition-[box-shadow,border-color] duration-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Alerts</span>
                <div className="w-6.5 h-6.5 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${outOfStockItems > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {outOfStockItems}
              </p>
              <p className={`text-[10.5px] font-medium mt-0.5 ${outOfStockItems > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {outOfStockItems === 0 ? 'Healthy • No stockouts' : `${outOfStockItems} out of stock`}
              </p>
            </div>

            <div className="min-w-[148px] lg:min-w-0 shrink-0 snap-start bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs hover:shadow-sm hover:border-emerald-200/80 transition-[box-shadow,border-color] duration-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pure Veg</span>
                <div className="w-6.5 h-6.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Leaf className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight tabular-nums">{vegItems}</p>
              <p className="text-[10.5px] font-medium text-emerald-600 mt-0.5">
                {vegPercent}% vegetarian menu
              </p>
            </div>

            <div className="min-w-[148px] lg:min-w-0 shrink-0 snap-start bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs hover:shadow-sm hover:border-amber-200/80 transition-[box-shadow,border-color] duration-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Non-Veg</span>
                <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <Flame className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${nonVegItems > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {nonVegItems}
              </p>
              <p className="text-[10.5px] font-medium text-slate-400 mt-0.5">
                {nonVegItems === 0 ? 'Zero items configured' : `${nonVegItems} non-veg items`}
              </p>
            </div>
          </div>

          {/* List View */}
          <div className="md:px-0">
            <MenuListView
              items={filteredItems}
              currency={currency}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onToggleStock={handleToggleStock}
              onAddNew={() => setShowForm(true)}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              stockFilter={stockFilter}
              onStockFilterChange={setStockFilter}
            />
          </div>

          {/* Mobile Sticky Floating Action Pill (+ New Dish) */}
          <div className="fixed bottom-20 right-4 lg:hidden z-50">
            <Button 
              onClick={handleAddNew} 
              className="h-10 px-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 text-xs font-bold transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Dish</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Premium Shadcn Studio Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDeleteItem}
        title="Delete Menu Item?"
        itemName={typeof itemToDelete === 'object' ? itemToDelete?.name : ''}
        isDeleting={isDeletingItem}
      />
    </TooltipProvider>
  )
}
