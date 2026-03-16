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
    // Try to save to localStorage
    localStorage.setItem('menuItems', JSON.stringify(items))
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // If quota exceeded, try to clear old data and save again
      console.warn('LocalStorage quota exceeded, clearing old data...')
      try {
        // Clear any old data that might be taking up space
        const keys = Object.keys(localStorage)
        for (const key of keys) {
          if (key.startsWith('temp_') || key.startsWith('image_')) {
            localStorage.removeItem(key)
          }
        }
        // Try saving again
        localStorage.setItem('menuItems', JSON.stringify(items))
      } catch (retryError) {
        console.error('Still unable to save to localStorage:', retryError)
        // Fallback: show error to user but don't crash
        alert('Storage quota exceeded. Please clear some data or try again later.')
      }
    } else {
      console.error('Error saving menu items:', error)
    }
  }
}

const categories = ['All', 'Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads']
const types = ['All', 'VEG', 'NON_VEG']
const stockStatuses = ['All', 'In Stock', 'Out of Stock']

export default function MenuManagement({ currency, onCurrencyChange }) {
  const [menuItems, setMenuItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  // Drop local currency state and use props
  const [dynamicCategories, setDynamicCategories] = useState(['Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads'])
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')

  // Load menu items from localStorage on component mount
  useEffect(() => {
    const items = loadMenuItems()
    setMenuItems(items)
    setFilteredItems(items)
    
    // Save items to localStorage if they were just loaded from defaults
    if (!localStorage.getItem('menuItems')) {
      saveMenuItems(items)
    }
    
    // Load saved images from localStorage
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Type filter
    if (typeFilter !== 'All') {
      filtered = filtered.filter(item => item.type === typeFilter)
    }

    // Stock filter
    if (stockFilter === 'In Stock') {
      filtered = filtered.filter(item => item.isInStock)
    } else if (stockFilter === 'Out of Stock') {
      filtered = filtered.filter(item => !item.isInStock)
    }

    setFilteredItems(filtered)
  }, [menuItems, searchTerm, categoryFilter, typeFilter, stockFilter])

  const handleSaveItem = (itemData) => {
    if (editingItem) {
      // Update existing item
      const oldItem = menuItems.find(item => item._id === editingItem._id)
      const updatedItems = menuItems.map(item => 
        item._id === editingItem._id ? { ...itemData, updatedAt: new Date() } : item
      )
      setMenuItems(updatedItems)
      saveMenuItems(updatedItems)
      
      // Track price change if price changed
      if (oldItem && oldItem.price !== itemData.price) {
        recordPriceChange(editingItem._id, itemData.name, oldItem.price, itemData.price)
      }
      
      // Save image to localStorage if it exists
      if (itemData.photo) {
        ImageStorage.saveImage(editingItem._id, itemData.photo)
      }
    } else {
      // Add new item
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
      
      // Save image to localStorage if it exists (handle tempPhoto for new items)
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
      // Remove image from localStorage
      ImageStorage.removeImage(itemId)
    }
  }

  const handleToggleStock = (itemId, newStockStatus) => {
    const updatedItems = menuItems.map(item =>
      item._id === itemId
        ? { ...item, isInStock: newStockStatus, updatedAt: new Date() }
        : item
    )
    setMenuItems(updatedItems)
    saveMenuItems(updatedItems)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingItem(null)
  }

  const handleGoBack = () => {
    // Navigate back to dashboard
    window.history.back()
  }

  // Calculate statistics
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
          onCancel={handleCancelForm}
          currency={currency}
          categories={dynamicCategories}
        />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-6 md:space-y-8 bg-[#f8fafc]/50 min-h-screen">
        {/* Header Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-orange-600 uppercase tracking-[0.2em]">
                <ChefHat className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Inventory & Operations</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 tracking-tight leading-none">
                Menu Management
              </h1>
              <p className="text-gray-500 max-w-sm text-xs md:text-base font-semibold leading-relaxed">
                Refine your restaurant's digital storefront with precision item control.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <Button 
                onClick={() => setShowForm(true)} 
                size="lg" 
                className="hidden md:flex bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Item
              </Button>
              <div className="hidden md:block">
                <CurrencySelector 
                  value={currency} 
                  onChange={onCurrencyChange}
                  className="h-12 border-none ring-1 ring-gray-200 rounded-xl bg-white shadow-sm font-bold"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions Strip */}
          <div className="relative">
            <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
              <div className="flex items-center gap-2 min-w-max">
                <CategoryManager onCategoriesChange={setDynamicCategories} />
                <BulkImportExport 
                  menuItems={menuItems} 
                  onImport={(items) => {
                    const updatedItems = [...menuItems, ...items]
                    setMenuItems(updatedItems)
                    saveMenuItems(updatedItems)
                  }}
                />
                <MenuTemplates 
                  onApplyTemplate={(items, categories) => {
                    const updatedItems = [...menuItems, ...items]
                    setMenuItems(updatedItems)
                    saveMenuItems(updatedItems)
                    setDynamicCategories(categories)
                  }}
                  currentItemsCount={menuItems.length}
                />
                <PriceHistory menuItems={menuItems} />
                
                <div className="md:hidden">
                  <CurrencySelector 
                    value={currency} 
                    onChange={onCurrencyChange}
                    className="h-10 border-none ring-1 ring-gray-100 rounded-xl bg-white min-w-[100px] font-bold text-xs"
                  />
                </div>
              </div>
            </div>
            {/* Subtle fade effect for scrolling on mobile */}
            <div className="absolute right-[-4px] top-0 bottom-3 w-12 bg-gradient-to-l from-[#f8fafc] via-[#f8fafc]/90 to-transparent md:hidden pointer-events-none" />
          </div>
        </div>

        {/* Executive Stats Panel */}
        <div className="md:px-0">
          <Card className="border-none shadow-md bg-white overflow-hidden ring-1 ring-gray-100 rounded-2xl">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-y divide-gray-100/60">
              {/* Total Items */}
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

              {/* In Stock */}
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

              {/* Out of Stock */}
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

              {/* Vegetarian */}
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

              {/* Non-Vegetarian */}
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
    </TooltipProvider>
  )
}
