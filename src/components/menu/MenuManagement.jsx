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
import PriceHistory, { recordPriceChange } from './PriceHistory'
import { formatPrice } from '@/components/ui/currency-selector'
import CurrencySelector from '@/components/ui/currency-selector'
import ImageStorage from '@/utils/imageStorage'
import MenuNavbar from './MenuNavbar'
import MenuMobileNavbar from './MenuMobileNavbar'

// Load menu items from localStorage
const loadMenuItems = () => {
  try {
    const savedItems = localStorage.getItem('menuItems')
    if (savedItems) {
      return JSON.parse(savedItems)
    }
    // Return default items if no saved items
    return [
      {
        _id: '1',
        name: 'Butter Chicken',
        description: 'Tender chicken pieces cooked in a rich, creamy tomato-based curry with aromatic spices.',
        price: 250,
        category: 'Main Course',
        type: 'NON_VEG',
        isInStock: true,
        restaurantId: 'restaurant-123',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '2',
        name: 'Paneer Tikka',
        description: 'Soft cubes of paneer marinated in spices and grilled to perfection.',
        price: 180,
        category: 'Starters',
        type: 'VEG',
        isInStock: true,
        restaurantId: 'restaurant-123',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '3',
        name: 'Dal Makhani',
        description: 'Creamy black lentils cooked with butter and aromatic spices.',
        price: 150,
        category: 'Main Course',
        type: 'VEG',
        isInStock: true,
        restaurantId: 'restaurant-123',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '4',
        name: 'Gulab Jamun',
        description: 'Soft and spongy milk solids soaked in sugar syrup.',
        price: 60,
        category: 'Desserts',
        type: 'VEG',
        isInStock: true,
        restaurantId: 'restaurant-123',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  } catch (error) {
    console.error('Error loading menu items:', error)
    return []
  }
}

// Save menu items to localStorage
const saveMenuItems = (items) => {
  try {
    localStorage.setItem('menuItems', JSON.stringify(items))
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded, clearing old data...')
      try {
        const keys = Object.keys(localStorage)
        for (const key of keys) {
          if (key.startsWith('temp_') || key.startsWith('image_')) {
            localStorage.removeItem(key)
          }
        }
        localStorage.setItem('menuItems', JSON.stringify(items))
      } catch (retryError) {
        console.error('Still unable to save to localStorage:', retryError)
        alert('Storage quota exceeded. Please clear some data or try again later.')
      }
    } else {
      console.error('Error saving menu items:', error)
    }
  }
}

export default function MenuManagement({ currency, onCurrencyChange, activeItem, setActiveItem, navigate }) {
  const [menuItems, setMenuItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [dynamicCategories, setDynamicCategories] = useState(['Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads'])
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')

  // Load menu items on mount
  useEffect(() => {
    const items = loadMenuItems()
    setMenuItems(items)
    setFilteredItems(items)
    
    if (!localStorage.getItem('menuItems')) {
      saveMenuItems(items)
    }
    
    const savedImages = ImageStorage.getAllImages()
    setMenuItems(items => 
      items.map(item => ({
        ...item,
        photo: savedImages[item._id] || item.photo
      }))
    )
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = menuItems
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSaveItem = (itemData) => {
    if (editingItem) {
      const oldItem = menuItems.find(item => item._id === editingItem._id)
      const updatedItems = menuItems.map(item => 
        item._id === editingItem._id ? { ...itemData, updatedAt: new Date() } : item
      )
      setMenuItems(updatedItems)
      saveMenuItems(updatedItems)
      if (oldItem && oldItem.price !== itemData.price) {
        recordPriceChange(editingItem._id, itemData.name, oldItem.price, itemData.price)
      }
      if (itemData.photo) {
        ImageStorage.saveImage(editingItem._id, itemData.photo)
      }
    } else {
      const newItem = {
        ...itemData,
        _id: Date.now().toString(),
        restaurantId: 'restaurant-123',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      const updatedItems = [...menuItems, newItem]
      setMenuItems(updatedItems)
      saveMenuItems(updatedItems)
      if (itemData.tempPhoto) {
        ImageStorage.saveImage(newItem._id, itemData.tempPhoto)
        newItem.photo = itemData.tempPhoto
        delete newItem.tempPhoto
      } else if (itemData.photo) {
        ImageStorage.saveImage(newItem._id, itemData.photo)
      }
    }
    setShowForm(false)
    setEditingItem(null)
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleDeleteItem = (itemId) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      const updatedItems = menuItems.filter(item => item._id !== itemId)
      setMenuItems(updatedItems)
      saveMenuItems(updatedItems)
      ImageStorage.removeImage(itemId)
    }
  }

  const handleToggleStock = (itemId, newStockStatus) => {
    const updatedItems = menuItems.map(item =>
      item._id === itemId ? { ...item, isInStock: newStockStatus, updatedAt: new Date() } : item
    )
    setMenuItems(updatedItems)
    saveMenuItems(updatedItems)
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
          onMenuItemsChange={(updatedItems) => {
            setMenuItems(updatedItems)
            saveMenuItems(updatedItems)
          }}
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
          onMenuItemsChange={(updatedItems) => {
            setMenuItems(updatedItems)
            saveMenuItems(updatedItems)
          }}
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
