import { useState, useEffect, useMemo } from 'react'
import { Search, ShoppingCart, Plus, Minus, X, CheckCircle, AlertCircle, Star, Flame, Leaf, RefreshCw, Sparkles, Timer, MapPin, Heart, Award, TrendingUp, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatPrice } from '@/components/ui/currency-selector'
import { useOrderManagement, ORDER_STATUS } from '@/hooks/useOrderManagement'
import OrderTracking from '@/components/order/OrderTracking'

const restaurantData = {
  name: "FoodieTech Restaurant",
  rating: 4.8,
  deliveryTime: "15-20 min",
  cuisine: "Multi-Cuisine",
  specialties: ["Fast Food", "Traditional", "Desserts"]
}

const loadMenuItems = () => {
  try {
    const savedItems = localStorage.getItem('menuItems')
    return savedItems ? JSON.parse(savedItems) : []
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
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [showOrderTracking, setShowOrderTracking] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { createOrder, updateStatus, getOrdersByTable } = useOrderManagement(restaurantId)

  useEffect(() => {
    const items = loadMenuItems()
    setMenuItems(items)
    setLoading(false)

    const params = new URLSearchParams(window.location.search)
    setTableNumber(params.get('table') || 'N/A')
    setRestaurantId(params.get('restaurant') || 'default')
  }, [])

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => 
      item.isInStock && 
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [menuItems, searchTerm])

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [filteredItems])

  const addToCart = (item) => {
    const existing = cart.find(i => i._id === item._id)
    if (existing) {
      setCart(cart.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setCart([...cart, { ...item, quantity: 1 }])
    }
  }

  const removeFromCart = (itemId) => {
    const existing = cart.find(i => i._id === itemId)
    if (existing?.quantity > 1) {
      setCart(cart.map(i => i._id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
    } else {
      setCart(cart.filter(i => i._id !== itemId))
    }
  }

  const getQuantity = (itemId) => cart.find(i => i._id === itemId)?.quantity || 0
  const getTotalPrice = () => cart.reduce((t, i) => t + (i.price * i.quantity), 0)
  const getTotalItems = () => cart.reduce((t, i) => t + i.quantity, 0)

  const placeOrder = () => {
    if (cart.length === 0) return
    const orderData = {
      restaurantId,
      tableNumber,
      items: cart,
      subtotal: getTotalPrice(),
      tax: getTotalPrice() * 0.05,
      total: getTotalPrice() * 1.05
    }
    const order = createOrder(orderData)
    setCurrentOrder(order)
    setOrderPlaced(true)
    setShowCheckout(false)
    setCart([])
    setTimeout(() => setShowOrderTracking(true), 2000)
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Loading Menu...</div>

  if (showOrderTracking && currentOrder) {
    return <OrderTracking orderId={currentOrder.id} onClose={() => setShowOrderTracking(false)} />
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-orange-600 text-white p-6 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Utensils className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">{restaurantData.name}</h1>
              <p className="text-xs opacity-90">Table {tableNumber}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Badge variant="secondary" className="bg-orange-500 text-white border-none">
              {restaurantData.rating} ★
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Menu Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              className="pl-10 h-12 bg-white" 
              placeholder="Search for dishes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 border-l-4 border-orange-500 pl-3">
                {category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <Card key={item._id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0 flex h-32">
                      <div className="w-1/3 bg-gray-200">
                        {item.photo ? (
                          <img src={item.photo} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full flex items-center justify-center text-2xl bg-orange-50">
                            {item.type === 'VEG' ? '🥗' : '🍖'}
                          </div>
                        )}
                      </div>
                      <div className="w-2/3 p-3 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                            {item.type === 'VEG' ? <Leaf className="h-4 w-4 text-green-500" /> : <Flame className="h-4 w-4 text-red-500" />}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-bold text-orange-600">{formatPrice(item.price)}</span>
                          <div className="flex items-center gap-2">
                            {getQuantity(item._id) > 0 ? (
                              <>
                                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => removeFromCart(item._id)}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-bold">{getQuantity(item._id)}</span>
                                <Button size="icon" className="h-7 w-7 bg-orange-600" onClick={() => addToCart(item)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="outline" className="text-orange-600 border-orange-600" onClick={() => addToCart(item)}>
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Cart Sidebar */}
        <div className="hidden lg:block">
          <Card className="sticky top-28">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Your Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-auto">
                    {cart.map(item => (
                      <div key={item._id} className="flex justify-between text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-orange-600">{formatPrice(getTotalPrice())}</span>
                    </div>
                    <Button className="w-full bg-orange-600" onClick={() => setShowCheckout(true)}>
                      Checkout
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Mobile Floating Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 w-full bg-white p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] lg:hidden z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">{getTotalItems()} Items</p>
              <p className="text-lg font-bold text-orange-600">{formatPrice(getTotalPrice())}</p>
            </div>
            <Button className="bg-orange-600 px-8" onClick={() => setShowCheckout(true)}>
              View Cart
            </Button>
          </div>
        </div>
      )}

      {/* Checkout Modal Overlay */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <Card className="max-w-md w-full animate-in zoom-in-95">
            <CardHeader>
              <CardTitle>Confirm Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item._id} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Amount</span>
                <span className="text-orange-600">{formatPrice(getTotalPrice())}</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowCheckout(false)}>Cancel</Button>
                <Button className="flex-1 bg-orange-600" onClick={placeOrder}>Place Order</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}