import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, ShoppingCart, Plus, Minus, X, CheckCircle, AlertCircle, Star, Leaf, RefreshCw, Sparkles, Timer, MapPin, Heart, Award, TrendingUp, Utensils, User, ShoppingBag, Phone, Mail, Facebook, Twitter, Instagram, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { 
  Navbar, 
  NavbarContent, 
  NavbarBrand, 
  NavbarItem, 
  NavbarMenuToggle, 
  NavbarMenu, 
  NavbarMenuItem 
} from '@/components/ui/navbar'
import { TrackOrderButton } from '@/components/ui/track-order-button'
import { formatPrice } from '@/components/ui/currency-selector'
import { useOrderManagement, ORDER_STATUS } from '@/hooks/useOrderManagement'
import OrderTracking from '@/components/order/OrderTracking'
import MenuService from '@/services/menuService'

const restaurantData = {
  name: "FoodieTech",
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
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [showOrderTracking, setShowOrderTracking] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeOrderId, setActiveOrderId] = useState(null) // Track active order for this session
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Mobile menu state
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 }) // Cart button position
  const [isDragging, setIsDragging] = useState(false) // Drag state

  const { createOrder, updateStatus, getOrdersByTable } = useOrderManagement(restaurantId)

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load menu items from localStorage (persistent storage)
        const savedItems = localStorage.getItem('menuItems')
        
        console.log('Raw localStorage data:', savedItems)
        
        if (savedItems) {
          const items = JSON.parse(savedItems)
          console.log('Parsed menu items:', items)
          
          // Validate that items have required fields
          const validItems = items.filter(item => 
            item && item._id && item.name && item.price !== undefined && item.category && item.isInStock !== undefined
          )
          
          console.log('Valid menu items:', validItems)
          setMenuItems(validItems)
          console.log('Loaded dynamic menu items from localStorage')
        } else {
          // Start with empty menu - no hardcoded items
          setMenuItems([])
          console.log('No menu items found - empty menu ready for dynamic data')
        }
        
      } catch (error) {
        console.error('Error loading menu items:', error)
        setError('Unable to load menu items. Please add menu items through the dashboard.')
        setMenuItems([]) // Ensure no hardcoded items are shown
      } finally {
        setLoading(false)
      }
    }

    fetchMenuItems()

    const params = new URLSearchParams(window.location.search)
    setTableNumber(params.get('table') || 'N/A')
    setRestaurantId(params.get('restaurant') || 'default')
  }, [])

  // Emit table session start event when customer scans QR code
  useEffect(() => {
    if (tableNumber && tableNumber !== 'N/A') {
      console.log('Customer scanned QR code for table:', tableNumber)
      
      // Check if there's a completed order for this table
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      const tableOrders = orders.filter(order => 
        order.tableNumber === tableNumber && 
        (order.status === 'FINISHED' || order.status === 'CANCELLED')
      )
      
      // Only mark as occupied if there are no completed orders
      if (tableOrders.length === 0) {
        console.log('No completed orders found, marking table as occupied')
        
        // Direct table update - update localStorage directly
        const tableSessions = JSON.parse(localStorage.getItem('tableSessions') || '[]')
        const updatedTables = tableSessions.map(table => {
          if (table.tableNumber === parseInt(tableNumber)) {
            return {
              ...table,
              status: 'occupied',
              sessionStart: new Date().toISOString(),
              lastActivity: new Date().toISOString()
            }
          }
          return table
        })
        
        localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
        console.log('Table status updated directly in localStorage')
      } else {
        console.log('Found completed orders, not marking table as occupied')
      }
      
      // Also emit event for backup
      window.dispatchEvent(new CustomEvent('orderUpdated', { 
        detail: { 
          tableNumber: parseInt(tableNumber), 
          orderStatus: 'created',
          customers: 0, // Will be updated when order is placed
          orderId: null,
          revenue: 0
        }
      }))
    }
  }, [tableNumber])

  // Check for session completion and clear active order
  useEffect(() => {
    if (activeOrderId && currentOrder) {
      // If order is finished, clear the active order for next session
      if (currentOrder.status === ORDER_STATUS.FINISHED) {
        console.log('Order finished, updating table status to available')
        
        // Update table status back to available
        const tableSessions = JSON.parse(localStorage.getItem('tableSessions') || '[]')
        const updatedTables = tableSessions.map(table => {
          if (table.tableNumber === parseInt(tableNumber)) {
            return {
              ...table,
              status: 'available',
              customers: 0,
              currentOrder: null,
              sessionStart: null,
              sessionDuration: null,
              revenue: 0,
              needsCleaning: false,
              lastActivity: new Date().toISOString()
            }
          }
          return table
        })
        
        localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
        console.log('Table status updated to available in localStorage')
        
        // Emit event for backup
        window.dispatchEvent(new CustomEvent('orderUpdated', { 
          detail: { 
            tableNumber: parseInt(tableNumber), 
            orderStatus: 'finished',
            customers: 0,
            orderId: null,
            revenue: 0
          }
        }))
        
        setActiveOrderId(null)
        setCurrentOrder(null)
      }
    }
  }, [activeOrderId, currentOrder, tableNumber])

  const filteredItems = useMemo(() => {
    const filtered = menuItems.filter(item => 
      item.isInStock && 
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    console.log('Filtered items:', filtered)
    console.log('Total menu items:', menuItems.length)
    console.log('Search term:', searchTerm)
    return filtered
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

  // Drag functionality for cart button
  const handleDragStart = useCallback((e) => {
    setIsDragging(true)
    const touch = e.touches ? e.touches[0] : e
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    
    // Store the initial offset from the button center
    const offsetX = touch.clientX - rect.left - rect.width / 2
    const offsetY = touch.clientY - rect.top - rect.height / 2
    
    setButtonPosition({
      x: touch.clientX - offsetX,
      y: touch.clientY - offsetY,
      offsetX: offsetX,
      offsetY: offsetY
    })
  }, [])

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return
    
    const touch = e.touches ? e.touches[0] : e
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    // Calculate new position using the stored offset
    let newX = touch.clientX - (buttonPosition.offsetX || 0)
    let newY = touch.clientY - (buttonPosition.offsetY || 0)
    
    // Constrain to screen bounds with padding
    const padding = 20
    const buttonSize = 56 // Button size (14 * 4px = 56px)
    
    newX = Math.max(padding, Math.min(windowWidth - padding - buttonSize, newX))
    newY = Math.max(padding, Math.min(windowHeight - padding - buttonSize, newY))
    
    setButtonPosition(prev => ({
      ...prev,
      x: newX,
      y: newY
    }))
  }, [isDragging, buttonPosition.offsetX, buttonPosition.offsetY])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleDragMove)
      document.addEventListener('touchend', handleDragEnd)
      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      
      return () => {
        document.removeEventListener('touchmove', handleDragMove)
        document.removeEventListener('touchend', handleDragEnd)
        document.removeEventListener('mousemove', handleDragMove)
        document.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

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
    setActiveOrderId(order.id) // Set active order for this session
    setOrderPlaced(true)
    setShowConfirmModal(false) // Close confirmation modal
    setCart([])
    setTimeout(() => setShowOrderTracking(true), 2000)
    
    // Direct table update - update localStorage directly
    const tableSessions = JSON.parse(localStorage.getItem('tableSessions') || '[]')
    const updatedTables = tableSessions.map(table => {
      if (table.tableNumber === parseInt(tableNumber)) {
        return {
          ...table,
          status: 'occupied',
          customers: cart.reduce((sum, item) => sum + item.quantity, 0),
          currentOrder: order.id,
          revenue: getTotalPrice() * 1.05,
          sessionStart: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      }
      return table
    })
    
    localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
    console.log('Table updated directly in localStorage on order placement')
    
    console.log('Emitting order update event:', {
      tableNumber: parseInt(tableNumber),
      orderStatus: 'created',
      customers: cart.reduce((sum, item) => sum + item.quantity, 0),
      orderId: order.id,
      revenue: getTotalPrice() * 1.05
    })
    
    window.dispatchEvent(new CustomEvent('orderUpdated', { 
      detail: { 
        tableNumber: parseInt(tableNumber), 
        orderStatus: 'created',
        customers: cart.reduce((sum, item) => sum + item.quantity, 0),
        orderId: order.id,
        revenue: getTotalPrice() * 1.05
      }
    }))
    
    console.log('Order update event dispatched')
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Loading Menu...</div>

  if (showOrderTracking && currentOrder) {
    return <OrderTracking orderId={currentOrder.id} onClose={() => setShowOrderTracking(false)} />
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Shadcn Studio Navbar */}
      <Navbar>
        <NavbarContent className="max-w-7xl mx-auto px-4">
          {/* Mobile Menu Toggle */}
          <NavbarMenuToggle 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </NavbarMenuToggle>

          {/* Brand - Left Side */}
          <NavbarBrand className="flex-1">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <Utensils className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-black hidden md:block">{restaurantData.name}</h1>
            <h1 className="text-base font-bold text-black md:hidden">{restaurantData.name}</h1>
          </NavbarBrand>

          {/* Spacer for better spacing */}
          <div className="flex-1 lg:hidden"></div>

          {/* Desktop Items - Right Side */}
          <div className="hidden lg:flex items-center gap-4 flex-1 justify-end">
            <Badge variant="outline" className="border-zinc-300 text-zinc-600">
              Table {tableNumber}
            </Badge>
            {/* Track Order Button - Desktop */}
            {activeOrderId && (
              <TrackOrderButton
                isActive={showOrderTracking}
                orderStatus={currentOrder?.status}
                onClick={() => setShowOrderTracking(true)}
                className="scale-90"
              />
            )}
            <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-black">
              <User className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile Items - Right Side */}
          <div className="lg:hidden flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-300 text-zinc-600 text-xs">
              Table {tableNumber}
            </Badge>
            {/* Track Order Button - Mobile */}
            {activeOrderId && (
              <TrackOrderButton
                isActive={showOrderTracking}
                orderStatus={currentOrder?.status}
                onClick={() => setShowOrderTracking(true)}
                showLabel={false}
                className="h-8 w-8 p-0"
              />
            )}
            <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-black h-8 w-8">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </NavbarContent>

        {/* Mobile Menu */}
        <NavbarMenu isOpen={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <NavbarMenuItem onClick={() => setMobileMenuOpen(false)}>
            <div className="flex items-center gap-3">
              <Utensils className="h-5 w-5 text-zinc-600" />
              <div>
                <div className="font-medium">{restaurantData.name}</div>
                <div className="text-sm text-zinc-500">Table {tableNumber}</div>
              </div>
            </div>
          </NavbarMenuItem>
          
          {/* Track Order in Mobile Menu */}
          {activeOrderId && (
            <NavbarMenuItem onClick={() => {
              setShowOrderTracking(true)
              setMobileMenuOpen(false)
            }}>
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Track Order</div>
                  <div className="text-sm text-zinc-500">
                    {currentOrder?.status === 'preparing' && 'Preparing your order'}
                    {currentOrder?.status === 'ready' && 'Order ready!'}
                    {currentOrder?.status === 'served' && 'Order served'}
                  </div>
                </div>
              </div>
            </NavbarMenuItem>
          )}
        </NavbarMenu>
      </Navbar>

      <div className="max-w-7xl mx-auto p-4 lg:grid lg:grid-cols-[1fr_400px] lg:gap-8">
        {/* Menu Section */}
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
            <Input 
              className="pl-10 h-12 bg-white border-zinc-200 focus:border-zinc-400" 
              placeholder="Search for dishes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-bold text-black border-l-4 border-zinc-900 pl-3">
                {category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:grid-cols-2">
                {items.map((item) => (
                  <Card key={item._id} className="border-zinc-200 hover:border-zinc-300 transition-colors lg:block">
                    {/* Mobile List View */}
                    <CardContent className="p-4 lg:hidden">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.photo ? (
                            <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">
                              {item.type === 'VEG' ? '🥗' : '🍖'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-black line-clamp-1">{item.name}</h3>
                              <Badge variant="outline" className={`text-xs ${item.type === 'VEG' ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
                                {item.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{item.description}</p>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-black">{formatPrice(item.price)}</span>
                            <div className="flex items-center gap-2">
                              {getQuantity(item._id) > 0 ? (
                                <>
                                  <Button size="icon" variant="outline" className="h-7 w-7 border-zinc-300" onClick={() => removeFromCart(item._id)}>
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-sm font-bold text-black">{getQuantity(item._id)}</span>
                                  <Button size="icon" className="h-7 w-7 bg-black hover:bg-zinc-800" onClick={() => addToCart(item)}>
                                    <Plus className="h-3 w-3 text-white" />
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" className="bg-black hover:bg-zinc-800 text-white" onClick={() => addToCart(item)}>
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    
                    {/* Desktop Card View */}
                    <CardContent className="p-4 max-lg:hidden">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.photo ? (
                            <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {item.type === 'VEG' ? '🥗' : '🍖'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-black line-clamp-1">{item.name}</h3>
                              <Badge variant="outline" className={`text-xs ${item.type === 'VEG' ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
                                {item.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{item.description}</p>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-black">{formatPrice(item.price)}</span>
                            <div className="flex items-center gap-2">
                              {getQuantity(item._id) > 0 ? (
                                <>
                                  <Button size="icon" variant="outline" className="h-7 w-7 border-zinc-300" onClick={() => removeFromCart(item._id)}>
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-sm font-bold text-black">{getQuantity(item._id)}</span>
                                  <Button size="icon" className="h-7 w-7 bg-black hover:bg-zinc-800" onClick={() => addToCart(item)}>
                                    <Plus className="h-3 w-3 text-white" />
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" className="bg-black hover:bg-zinc-800 text-white" onClick={() => addToCart(item)}>
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Show when no menu items are available */}
          {Object.keys(groupedItems).length === 0 && !loading && (
            <Card className="text-center py-12 border-zinc-200">
              <CardContent>
                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Utensils className="w-10 h-10 text-zinc-400" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">No Menu Items Available</h3>
                <p className="text-zinc-600 mb-4">
                  Please add menu items through the dashboard menu management system.
                </p>
                <div className="space-y-2 text-sm text-zinc-500">
                  <p>• Add items using the restaurant dashboard</p>
                  <p>• Ensure items are marked as "In Stock"</p>
                  <p>• Refresh this page after adding items</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Desktop Cart Sidebar */}
        <div className="hidden lg:block">
          <Card className="sticky top-20 h-fit border-zinc-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-black">
                <ShoppingCart className="h-5 w-5" /> Your Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
                  <p className="text-zinc-500">Cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-auto">
                    {cart.map(item => (
                      <div key={item._id} className="flex justify-between text-sm">
                        <span className="text-zinc-700">{item.name} x{item.quantity}</span>
                        <span className="font-medium text-black">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="bg-zinc-200" />
                  <div className="space-y-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-black">Total</span>
                      <span className="text-black">{formatPrice(getTotalPrice())}</span>
                    </div>
                    <Button className="w-full bg-black hover:bg-zinc-800 text-white" onClick={() => setShowCheckout(true)}>
                      Checkout
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Floating Cart Button */}
      <div 
        className={`lg:hidden fixed z-50 transition-all duration-200 ${isDragging ? 'scale-110 shadow-2xl' : 'hover:scale-105'} ${cart.length === 0 ? 'pointer-events-none opacity-0' : ''}`}
        style={{
          left: buttonPosition.x === 0 ? 'auto' : `${buttonPosition.x}px`,
          right: buttonPosition.x === 0 ? '16px' : 'auto',
          bottom: buttonPosition.y === 0 ? '96px' : 'auto',
          top: buttonPosition.y === 0 ? 'auto' : `${buttonPosition.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <Button 
          className="h-14 w-14 rounded-full bg-black hover:bg-zinc-800 text-white shadow-lg select-none"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{ touchAction: 'none' }}
          onClick={() => cart.length > 0 && setShowCheckout(true)}
          disabled={cart.length === 0}
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-zinc-900 text-white text-xs rounded-full flex items-center justify-center">
            {getTotalItems()}
          </span>
        </Button>
      </div>

      {/* Mobile Cart Sheet - Separate from button */}
      <Sheet open={showCheckout && cart.length > 0} onOpenChange={(open) => {
        if (!open) setShowCheckout(false)
      }}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle className="text-black">Your Order</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-3 max-h-96 overflow-auto">
              {cart.map(item => (
                <div key={item._id} className="flex justify-between text-sm">
                  <span className="text-zinc-700">{item.name} x{item.quantity}</span>
                  <span className="font-medium text-black">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator className="bg-zinc-200" />
            <div className="space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-black">Total</span>
                <span className="text-black">{formatPrice(getTotalPrice())}</span>
              </div>
              <Button 
                className="w-full bg-black hover:bg-zinc-800 text-white" 
                onClick={() => {
                  // Close the sheet and show the confirmation modal
                  setShowCheckout(false)
                  setTimeout(() => setShowConfirmModal(true), 100)
                }}
              >
                Checkout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Checkout Modal Overlay */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <Card className="max-w-md w-full animate-in zoom-in-95 border-zinc-200">
            <CardHeader>
              <CardTitle className="text-black">Confirm Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item._id} className="flex justify-between text-sm">
                    <span className="text-zinc-700">{item.name} x{item.quantity}</span>
                    <span className="font-medium text-black">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <Separator className="bg-zinc-200" />
              <div className="flex justify-between font-bold text-lg">
                <span className="text-black">Total Amount</span>
                <span className="text-black">{formatPrice(getTotalPrice())}</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-zinc-300 text-zinc-700 hover:bg-zinc-50" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-black hover:bg-zinc-800 text-white" onClick={placeOrder}>Place Order</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Restaurant Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                  <Utensils className="h-3 w-3 text-white" />
                </div>
                <h3 className="font-bold text-black">{restaurantData.name}</h3>
              </div>
              <p className="text-sm text-zinc-600">
                {restaurantData.cuisine} • {restaurantData.deliveryTime}
              </p>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium text-black">{restaurantData.rating}</span>
                <span className="text-sm text-zinc-600">(2.5k reviews)</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <h4 className="font-semibold text-black">Quick Links</h4>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-zinc-600 hover:text-black transition-colors">
                  About Us
                </a>
                <a href="#" className="block text-sm text-zinc-600 hover:text-black transition-colors">
                  Contact
                </a>
                <a href="#" className="block text-sm text-zinc-600 hover:text-black transition-colors">
                  Privacy Policy
                </a>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-black">Contact</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <MapPin className="h-4 w-4" />
                  <span>123 Restaurant Street, City</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Phone className="h-4 w-4" />
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Mail className="h-4 w-4" />
                  <span>info@foodietech.com</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6 bg-zinc-200" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-zinc-600">
              2024 {restaurantData.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-zinc-600 hover:text-black transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-zinc-600 hover:text-black transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-zinc-600 hover:text-black transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}