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
import { fetchMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemStock, bulkReplaceMenuItems, bulkAddMenuItems, getCachedRestaurantId, getMyRestaurant, fetchPriceHistory, recordPriceChange } from '@/lib/api'
import { Loader2 } from 'lucide-react'


export default function MenuManagement({ currency, onCurrencyChange, activeItem, setActiveItem, navigate }) {
  const [menuItems, setMenuItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentRid, setCurrentRid] = useState(null)
  const [dynamicCategories, setDynamicCategories] = useState(['Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads'])
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')

  // ── Smart Data Fetching: Handle missing restaurantId automatically ──
  useEffect(() => {
    const init = async () => {
      let rid = getCachedRestaurantId()
      
      // Fail-safe: If ID is missing OR it's a legacy ID (email), fetch the real UUID
      if (!rid || rid.includes('@')) {
        console.log('Session cache issue (missing or email ID). Fetching from database...')
        try {
          const profile = await getMyRestaurant()
          if (profile) {
            rid = profile.id
            // Repair the session cache for other components
            const authUser = JSON.parse(localStorage.getItem('servora_user') || '{}')
            localStorage.setItem('servora_user', JSON.stringify({ ...authUser, restaurantId: rid }))
          }
        } catch (e) { 
          console.error('Profile fetch failed', e) 
        }
      }

      if (rid) {
        setCurrentRid(rid)
        try {
          const items = await fetchMenuItems(rid)
          setMenuItems(items)
          setFilteredItems(items)
        } catch (err) { 
          console.error('Menu load error:', err) 
        }
      }
      setIsLoading(false)
    }

    init()
  }, [])

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
    if (!currentRid) return
    setIsSaving(true)
    try {
      if (editingItem) {
        // UPDATE
        const oldItem = menuItems.find(item => item.id === editingItem.id)
        const updated = await updateMenuItem(editingItem.id, itemData)
        setMenuItems(prev => prev.map(i => i.id === editingItem.id ? updated : i))
        if (oldItem && Number(oldItem.price) !== Number(itemData.price)) {
          recordPriceChange(currentRid, itemData.name, oldItem.price, itemData.price, editingItem.id)
        }
        if (itemData.photo) ImageStorage.saveImage(editingItem.id, itemData.photo)
      } else {
        // CREATE
        const created = await createMenuItem(currentRid, itemData)
        setMenuItems(prev => [...prev, created])
        if (itemData.photo) ImageStorage.saveImage(created.id, itemData.photo)
      }
    } catch (err) {
      console.error('Save menu item error:', err)
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

  // ── Delete via Supabase ──
  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    try {
      await deleteMenuItem(itemId)
      setMenuItems(prev => prev.filter(i => i._id !== itemId))
      ImageStorage.removeImage(itemId)
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // ── Toggle stock via Supabase ──
  const handleToggleStock = async (itemId, newStockStatus) => {
    try {
      const updated = await toggleMenuItemStock(itemId, newStockStatus)
      setMenuItems(prev => prev.map(i => i._id === itemId ? updated : i))
    } catch (err) {
      console.error('Toggle stock error:', err)
    }
  }

  const totalItems = menuItems.length
  const inStockItems = menuItems.filter(item => item.isInStock).length
  const outOfStockItems = totalItems - inStockItems
  const vegItems = menuItems.filter(item => item.type === 'VEG').length
  const nonVegItems = menuItems.filter(item => item.type === 'NON_VEG').length

  if (showForm) {
    return (
      <div className="flex justify-center">
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

  return (
    <TooltipProvider>
      <div className="bg-[#f8fafc]/50 min-h-screen">
        <MenuNavbar 
          itemsCount={menuItems.length}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAddNew={() => setShowForm(true)}
          currency={currency}
          onCurrencyChange={onCurrencyChange}
          menuItems={menuItems}
          restaurantId={currentRid}
          onMenuItemsChange={handleBulkImport}
          onMenuItemsAppend={handleBulkAppend}
          onCategoriesChange={setDynamicCategories}
        />

        <MenuMobileNavbar 
          onAddNew={() => setShowForm(true)}
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
        />

        <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-6 md:space-y-8">
          {/* Stats Bar and List View */}

          {/* Executive Stats Panel */}
          <div className="md:px-0">
            <Card className="border-none shadow-md bg-white overflow-hidden ring-1 ring-gray-100 rounded-2xl">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-y divide-gray-100/60">
                <div className="p-4 md:p-6 bg-blue-50/5 hover:bg-blue-50/30 transition-colors group">
                  <div className="flex flex-col items-center text-center gap-1.5 md:gap-2">
                    <div className="w-10 h-10 bg-blue-600/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LayoutGrid className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[9px] md:text-[10px] font-semibold text-blue-600/80 uppercase tracking-widest">Total</p>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{totalItems}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 md:p-6 bg-green-50/5 hover:bg-green-50/30 transition-colors group">
                  <div className="flex flex-col items-center text-center gap-1.5 md:gap-2">
                    <div className="w-10 h-10 bg-green-600/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[9px] md:text-[10px] font-semibold text-green-600/80 uppercase tracking-widest">Live</p>
                      <p className="text-2xl md:text-3xl font-bold text-green-700 tracking-tight">{inStockItems}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 md:p-6 bg-red-50/5 hover:bg-red-50/30 transition-colors group">
                  <div className="flex flex-col items-center text-center gap-1.5 md:gap-2">
                    <div className="w-10 h-10 bg-red-600/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-[9px] md:text-[10px] font-semibold text-red-600/80 uppercase tracking-widest">Alert</p>
                      <p className="text-2xl md:text-3xl font-bold text-red-700 tracking-tight">{outOfStockItems}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 md:p-6 bg-emerald-50/5 hover:bg-emerald-50/30 transition-colors group">
                  <div className="flex flex-col items-center text-center gap-1.5 md:gap-2">
                    <div className="w-10 h-10 bg-emerald-600/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Leaf className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[9px] md:text-[10px] font-semibold text-emerald-600/80 uppercase tracking-widest">Veg</p>
                      <p className="text-2xl md:text-3xl font-bold text-emerald-700 tracking-tight">{vegItems}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 md:p-6 bg-orange-50/5 hover:bg-orange-50/30 transition-colors group col-span-2 md:col-span-1">
                  <div className="flex flex-col items-center text-center gap-1.5 md:gap-2">
                    <div className="w-10 h-10 bg-orange-600/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Flame className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-[9px] md:text-[10px] font-semibold text-orange-600/80 uppercase tracking-widest">Non-Veg</p>
                      <p className="text-2xl md:text-3xl font-bold text-orange-700 tracking-tight">{nonVegItems}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
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

          {/* Mobile Sticky Floating Action Button */}
          <div className="fixed bottom-24 right-6 md:hidden z-50">
            <Button 
              onClick={() => setShowForm(true)} 
              className="w-14 h-14 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-2xl shadow-orange-600/40 border-4 border-white flex items-center justify-center transition-all hover:scale-110 active:scale-90"
            >
              <Plus className="w-7 h-7" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
