import { useState, useEffect } from 'react'
import { Plus, Search, Filter, ChefHat, ArrowLeft, Eye, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import MenuItemForm from './MenuItemForm'
import MenuListView from './MenuListView'
import { formatPrice } from '@/components/ui/currency-selector'
import CurrencySelector from '@/components/ui/currency-selector'
import ImageStorage from '@/utils/imageStorage'

// Sample data based on database schema
const initialMenuItems = [
  {
    _id: '1',
    restaurantId: 'restaurant-123',
    name: 'Butter Chicken',
    description: 'Tender chicken pieces cooked in a rich, creamy tomato-based sauce with aromatic spices and butter.',
    price: 15.99,
    photo: '',
    category: 'Main Course',
    type: 'NON_VEG',
    isInStock: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-22')
  },
  {
    _id: '2',
    restaurantId: 'restaurant-123',
    name: 'Paneer Tikka',
    description: 'Cubes of cottage cheese marinated in yogurt and spices, grilled to perfection in a tandoor.',
    price: 12.99,
    photo: '',
    category: 'Starters',
    type: 'VEG',
    isInStock: true,
    createdAt: new Date('2024-01-19'),
    updatedAt: new Date('2024-01-21')
  },
  {
    _id: '3',
    restaurantId: 'restaurant-123',
    name: 'Margherita Pizza',
    description: 'Classic Italian pizza with fresh mozzarella, tomato sauce, and basil leaves.',
    price: 11.99,
    photo: '',
    category: 'Main Course',
    type: 'VEG',
    isInStock: false,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-20')
  }
]

const categories = ['All', 'Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Soups', 'Salads']
const types = ['All', 'VEG', 'NON_VEG']
const stockStatuses = ['All', 'In Stock', 'Out of Stock']

export default function MenuManagement() {
  const [menuItems, setMenuItems] = useState(initialMenuItems)
  const [filteredItems, setFilteredItems] = useState(initialMenuItems)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [currency, setCurrency] = useState('INR') // Default to Indian Rupee
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')

  // Load saved images from localStorage on component mount
  useEffect(() => {
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
      setMenuItems(items =>
        items.map(item => item._id === editingItem._id ? itemData : item)
      )
      // Save image to localStorage if it exists
      if (itemData.photo) {
        ImageStorage.saveImage(editingItem._id, itemData.photo)
      }
    } else {
      // Add new item
      const newItem = {
        ...itemData,
        _id: Date.now().toString()
      }
      setMenuItems([...menuItems, newItem])
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
      setMenuItems(items => items.filter(item => item._id !== itemId))
      // Remove image from localStorage
      ImageStorage.removeImage(itemId)
    }
  }

  const handleToggleStock = (itemId, newStockStatus) => {
    setMenuItems(items =>
      items.map(item =>
        item._id === itemId
          ? { ...item, isInStock: newStockStatus, updatedAt: new Date() }
          : item
      )
    )
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-orange-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
              <p className="text-gray-600">Manage your restaurant menu items</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Item
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new menu item to your restaurant</p>
              </TooltipContent>
            </Tooltip>
            
            <CurrencySelector 
              value={currency} 
              onChange={setCurrency}
              className="border-gray-200"
            />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            <p className="text-sm text-gray-600">Total Items</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-2xl font-bold text-green-600">{inStockItems}</p>
            <p className="text-sm text-gray-600">In Stock</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-2xl font-bold text-red-600">{outOfStockItems}</p>
            <p className="text-sm text-gray-600">Out of Stock</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-2xl font-bold text-green-600">{vegItems}</p>
            <p className="text-sm text-gray-600">Vegetarian</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-2xl font-bold text-red-600">{nonVegItems}</p>
            <p className="text-sm text-gray-600">Non-Vegetarian</p>
          </div>
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
