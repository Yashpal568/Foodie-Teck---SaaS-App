import { useState, useEffect } from 'react'
import { Search, ShoppingCart, Plus, Minus, X, User, Clock, CheckCircle, AlertCircle, Star, ChefHat, Flame, Leaf, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatPrice } from '@/components/ui/currency-selector'
import { cn } from '@/lib/utils'

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
    // Return empty array if no saved items - no hardcoded fallback
    return []
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

  // Listen for storage changes to sync price updates
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'menuItems') {
        console.log('CustomerMenu - Menu items updated in storage, refreshing...')
        try {
          const items = loadMenuItems()
          setMenuItems(items)
          console.log('CustomerMenu - Reloaded menu items:', items)
        } catch (err) {
          console.error('CustomerMenu - Error reloading menu items:', err)
        }
      }
    }

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange)

    // Also check for updates when window gains focus
    const handleFocus = () => {
      console.log('CustomerMenu - Window focused, checking for updates...')
      try {
        const items = loadMenuItems()
        setMenuItems(items)
        console.log('CustomerMenu - Reloaded menu items on focus:', items)
      } catch (err) {
        console.error('CustomerMenu - Error reloading menu items on focus:', err)
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleFocus)
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

  const getQuantity = (itemId) => {
    const item = cart.find(cartItem => cartItem._id === itemId)
    return item ? item.quantity : 0
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

  const clearCart = () => {
    setCart([])
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

  const refreshMenu = () => {
    console.log('CustomerMenu - Manual refresh triggered')
    try {
      setLoading(true)
      const items = loadMenuItems()
      setMenuItems(items)
      console.log('CustomerMenu - Manually reloaded menu items:', items)
      setError(null)
    } catch (err) {
      console.error('CustomerMenu - Error manually reloading menu items:', err)
      setError('Failed to refresh menu items')
    } finally {
      setLoading(false)
    }
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

  // Checkout Modal
  if (showCheckout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-center">Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Restaurant:</span>
                <span className="font-medium">{restaurantData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Table:</span>
                <span className="font-medium">{tableNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Items:</span>
                <span className="font-medium">{getTotalItems()}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item._id} className="flex justify-between text-sm">
                  <span>{item.name} ×{item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(getTotalPrice())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tax (5%)</span>
                <span className="font-medium">{formatPrice(getTotalPrice() * 0.05)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-orange-600">{formatPrice(getTotalPrice() * 1.05)}</span>
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
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                Place Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">FT</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{restaurantData.name}</h1>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Table {tableNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                <Clock className="w-3 h-3 mr-1" />
                Session Active
              </Badge>
              <Button 
                variant="outline"
                size="sm"
                onClick={refreshMenu}
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
                title="Refresh menu items"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={requestBill}
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                Request Bill
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Section */}
          <div className="lg:col-span-2">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search for dishes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                />
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-8">
              {Object.keys(groupedItems).length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-5xl">🍽️</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No Menu Items Available</h3>
                  <p className="text-gray-600 text-lg mb-4">
                    {menuItems.length === 0 
                      ? "The restaurant hasn't added any menu items yet." 
                      : "No menu items match your search criteria."}
                  </p>
                  {menuItems.length === 0 && (
                    <p className="text-gray-500">Please contact the restaurant staff to add menu items.</p>
                  )}
                </div>
              ) : (
                Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category} className="mb-8">
                    {/* Category Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-md">
                        {category === 'Starters' && <Flame className="w-6 h-6 text-white" />}
                        {category === 'Main Course' && <ChefHat className="w-6 h-6 text-white" />}
                        {category === 'Desserts' && <Star className="w-6 h-6 text-white" />}
                        {!['Starters', 'Main Course', 'Desserts'].includes(category) && <Leaf className="w-6 h-6 text-white" />}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{category}</h2>
                        <p className="text-sm text-gray-600">{items.length} items</p>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-orange-200 to-transparent"></div>
                    </div>

                    {/* Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {items.map((item) => (
                        <Card key={item._id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex gap-4">
                              {/* Item Image */}
                              <div className="w-32 h-32 bg-gray-100 flex-shrink-0">
                                {item.photo ? (
                                  <img 
                                    src={item.photo} 
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="text-3xl mb-1">
                                        {item.type === 'VEG' ? '🥗' : '🍖'}
                                      </div>
                                      <span className="text-xs text-gray-500">No Image</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Item Details */}
                              <div className="flex-1 p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                                      {item.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                      {item.description}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant={item.type === 'VEG' ? 'default' : 'destructive'}
                                    className="ml-2"
                                  >
                                    {item.type === 'VEG' ? (
                                      <span className="flex items-center gap-1">
                                        <Leaf className="w-3 h-3" />
                                        VEG
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <Flame className="w-3 h-3" />
                                        NON-VEG
                                      </span>
                                    )}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="text-xl font-bold text-orange-600">
                                    {formatPrice(item.price)}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => removeFromCart(item._id)}
                                      className="w-8 h-8 rounded-full p-0 border-gray-300 hover:border-red-400 hover:bg-red-50"
                                      disabled={getQuantity(item._id) === 0}
                                    >
                                      <Minus className="w-4 h-4" />
                                    </Button>
                                    
                                    <div className="w-8 text-center font-bold text-lg">
                                      {getQuantity(item._id)}
                                    </div>
                                    
                                    <Button
                                      size="sm"
                                      onClick={() => addToCart(item)}
                                      className="w-8 h-8 rounded-full p-0 bg-orange-500 hover:bg-orange-600 text-white"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
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

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="border-0 shadow-lg overflow-hidden">
                {/* Cart Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4">
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-6 h-6" />
                      <span className="text-lg">Your Order</span>
                    </div>
                    {getTotalItems() > 0 && (
                      <Badge className="bg-white text-orange-600 border-0 px-3 py-1 font-bold">
                        {getTotalItems()} items
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                
                <CardContent className="p-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
                      <p className="text-gray-600">Add items from the menu to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Cart Items */}
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {cart.map((item) => (
                          <div key={item._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm text-gray-900">{item.name}</h4>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-sm text-gray-600">{formatPrice(item.price)} × {item.quantity}</span>
                                <span className="text-sm font-bold text-orange-600">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCart(item._id)}
                              className="w-8 h-8 rounded-full p-0 text-red-500 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      <Separator />
                      
                      {/* Price Breakdown */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-medium">{formatPrice(getTotalPrice())}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax (5%)</span>
                          <span className="font-medium">{formatPrice(getTotalPrice() * 0.05)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span className="text-orange-600">{formatPrice(getTotalPrice() * 1.05)}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-3">
                        <Button 
                          onClick={() => setShowCheckout(true)} 
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 text-lg"
                        >
                          Proceed to Checkout
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={clearCart} 
                          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Clear Cart
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
