import { useState, useEffect } from 'react'
import { Search, ShoppingCart, Plus, Minus, X, User, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatPrice } from '@/components/ui/currency-selector'

// Mock restaurant data (in production, this would come from API)
const restaurantData = {
  name: "FoodieTech Restaurant",
  logo: "",
  description: "Delicious food delivered with love",
  currency: "INR"
}

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
        description: 'Tender chicken pieces cooked in a rich, creamy tomato-based sauce with aromatic spices and butter.',
        price: 280,
        photo: '',
        category: 'Main Course',
        type: 'NON_VEG',
        isInStock: true
      },
      {
        _id: '2',
        name: 'Paneer Tikka',
        description: 'Cubes of cottage cheese marinated in yogurt and spices, grilled to perfection in a tandoor.',
        price: 220,
        photo: '',
        category: 'Starters',
        type: 'VEG',
        isInStock: true
      },
      {
        _id: '3',
        name: 'Margherita Pizza',
        description: 'Classic Italian pizza with fresh mozzarella, tomato sauce, and basil leaves.',
        price: 180,
        photo: '',
        category: 'Main Course',
        type: 'VEG',
        isInStock: false
      }
    ]
  } catch (error) {
    console.error('Error loading menu items:', error)
    return []
  }
}

export default function CustomerMenu() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState([])
  const [tableNumber, setTableNumber] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load menu items from localStorage on component mount
  useEffect(() => {
    try {
      setLoading(true)
      const items = loadMenuItems()
      console.log('CustomerMenu - Loaded menu items:', items)
      setMenuItems(items)
      setError(null)
    } catch (err) {
      console.error('CustomerMenu - Error loading menu items:', err)
      setError('Failed to load menu items')
    } finally {
      setLoading(false)
    }
  }, [])

  // Parse URL parameters on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const table = urlParams.get('table')
      const restaurant = urlParams.get('restaurant')
      
      console.log('CustomerMenu - URL params:', { table, restaurant })
      
      if (table && restaurant) {
        setTableNumber(table)
        setRestaurantId(restaurant)
        setIsSessionActive(true)
      }
    } catch (err) {
      console.error('CustomerMenu - Error parsing URL params:', err)
      setError('Failed to parse URL parameters')
    }
  }, [])

  // Filter menu items based on search and stock
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch && item.isInStock
  })

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {})

  // Debug logging
  console.log('CustomerMenu - Debug:', {
    menuItems: menuItems.length,
    filteredItems: filteredItems.length,
    groupedItems: Object.keys(groupedItems),
    searchTerm,
    tableNumber,
    restaurantId
  })

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id)
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem._id === item._id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ))
    } else {
      setCart([...cart, { ...item, quantity: 1 }])
    }
  }

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId))
  }

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
    } else {
      setCart(cart.map(item => 
        item._id === itemId ? { ...item, quantity } : item
      ))
    }
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const placeOrder = () => {
    if (cart.length === 0) return
    
    // In production, this would send the order to the backend
    console.log('Order placed:', {
      restaurantId,
      tableNumber,
      items: cart,
      total: getTotalPrice()
    })
    
    setOrderPlaced(true)
    setShowCheckout(false)
    setCart([])
  }

  const requestBill = () => {
    // In production, this would update the order status to BILL_REQUESTED
    console.log('Bill requested for table:', tableNumber)
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Menu...</h2>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
            <p className="text-gray-600 mb-6">
              Your order has been sent to the kitchen. We'll notify you when it's ready.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Table {tableNumber} • Order #{Date.now().getTime()}
            </p>
            <Button onClick={() => setOrderPlaced(false)} className="w-full">
              Continue Ordering
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">FT</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{restaurantData.name}</h1>
                <p className="text-sm text-gray-600">Table {tableNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <Clock className="w-3 h-3 mr-1" />
                Session Active
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={requestBill}
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                Request Bill
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu */}
          <div className="lg:col-span-2">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Menu Items by Category */}
            <div className="space-y-6">
              {Object.keys(groupedItems).length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-gray-400 text-3xl">🍽️</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Menu Items Available</h3>
                  <p className="text-gray-600 mb-4">
                    {menuItems.length === 0 
                      ? "The restaurant hasn't added any menu items yet." 
                      : "No menu items match your search criteria."}
                  </p>
                  {menuItems.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Please contact the restaurant staff to add menu items.
                    </p>
                  )}
                </div>
              ) : (
                Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category}>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{category}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((item) => (
                      <Card key={item._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                              {item.photo ? (
                                <img 
                                  src={item.photo} 
                                  alt={item.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                                  <span className="text-gray-400 text-xs text-center">No Image</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-medium text-gray-900">{item.name}</h3>
                                <Badge 
                                  variant={item.type === 'VEG' ? 'default' : 'destructive'}
                                  className={item.type === 'VEG' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                                >
                                  {item.type}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                {item.description}
                              </p>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-900">
                                  {formatPrice(item.price)}
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => addToCart(item)}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Your Order
                  {getTotalItems() > 0 && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {getTotalItems()}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
                    <p className="text-sm text-gray-600">Add items from the menu to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Cart Items */}
                    <div className="space-y-3 max-h-64 overflow-auto">
                      {cart.map((item) => (
                        <div key={item._id} className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            {item.photo ? (
                              <img 
                                src={item.photo} 
                                alt={item.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-400">No Image</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromCart(item._id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Total */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{formatPrice(getTotalPrice())}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax (10%)</span>
                        <span className="font-medium">{formatPrice(getTotalPrice() * 0.1)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base font-medium">
                        <span>Total</span>
                        <span className="text-lg">{formatPrice(getTotalPrice() * 1.1)}</span>
                      </div>
                    </div>

                    {/* Checkout Button */}
                    <Button 
                      onClick={() => setShowCheckout(true)}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      size="lg"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Place Order
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Confirm Your Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Table:</span>
                  <span className="font-medium">{tableNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Items:</span>
                  <span className="font-medium">{getTotalItems()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="font-medium">{formatPrice(getTotalPrice() * 1.1)}</span>
                </div>
              </div>
              
              <Alert>
                <AlertDescription>
                  Your order will be sent to the kitchen and prepared fresh.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCheckout(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={placeOrder}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Place Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
