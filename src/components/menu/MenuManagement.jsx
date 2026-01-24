import { useState, useEffect } from 'react'
import { Plus, Search, Filter, ChefHat, ArrowLeft, Eye, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import MenuItemForm from './MenuItemForm'
import MenuListView from './MenuListView'
import { formatPrice } from '@/components/ui/currency-selector'
import CurrencySelector from '@/components/ui/currency-selector'
import ImageStorage from '@/utils/imageStorage'

// Load menu items from localStorage
const loadMenuItems = () => {
  try {
    const savedItems = localStorage.getItem('menuItems')
    return savedItems ? JSON.parse(savedItems) : []
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
    console.error('Error saving menu items:', error)
  }
}

const categories = ['All', 'Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads']
const types = ['All', 'VEG', 'NON_VEG']
const stockStatuses = ['All', 'In Stock', 'Out of Stock']

export default function MenuManagement() {
  const [menuItems, setMenuItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [currency, setCurrency] = useState('INR') // Default to Indian Rupee
  
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
      const updatedItems = menuItems.map(item => 
        item._id === editingItem._id ? { ...itemData, updatedAt: new Date() } : item
      )
      setMenuItems(updatedItems)
      saveMenuItems(updatedItems)
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
      <div className="p-6">
        <MenuItemForm
          item={editingItem}
          currency={currency}
          onSave={handleSaveItem}
          onCancel={handleCancelForm}
        />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
                  <p className="text-gray-600">Manage your restaurant menu items efficiently</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button onClick={() => setShowForm(true)} size="lg" className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Item
                </Button>
                
                <CurrencySelector 
                  value={currency} 
                  onChange={setCurrency}
                  className="border-gray-200"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                  <p className="text-sm text-gray-600">Total Items</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">📋</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{inStockItems}</p>
                  <p className="text-sm text-gray-600">In Stock</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">{outOfStockItems}</p>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600">✗</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{vegItems}</p>
                  <p className="text-sm text-gray-600">Vegetarian</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">🥬</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">{nonVegItems}</p>
                  <p className="text-sm text-gray-600">Non-Vegetarian</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600">🍖</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List View */}
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
    </TooltipProvider>
  )
}
