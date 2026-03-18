import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingCart, Plus, Minus, X, CheckCircle, AlertCircle, Star, Leaf, RefreshCw, Sparkles, Timer, MapPin, Heart, Award, TrendingUp, Utensils, User, ShoppingBag, Phone, Mail, Facebook, Twitter, Instagram, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { 
  Navbar, 
  NavbarContent, 
  NavbarBrand, 
  NavbarItem, 
  NavbarMenuToggle, 
  NavbarMenu, 
  NavbarMenuItem 
} from '@/components/ui/navbar'
import Logo from '@/components/ui/Logo'
import { TrackOrderButton } from '@/components/ui/track-order-button'
import { formatPrice } from '@/components/ui/currency-selector'
import { trackMenuVisit, trackItemView } from '@/components/menu/MenuAnalytics'
import { useOrderManagement, ORDER_STATUS } from '@/hooks/useOrderManagement'
import OrderTracking from '@/components/order/OrderTracking'
import MenuService from '@/services/menuService'
import MenuBottomNavbar from '@/components/menu/MenuBottomNavbar'

const restaurantData = {
  name: "Servora",
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
  const [buttonPosition, setButtonPosition] = useState({ 
    x: 0, 
    y: 0,
    offsetX: 0,
    offsetY: 0
  }) // Cart button position with offsets
  const [isDragging, setIsDragging] = useState(false) // Drag state
  const [customerName, setCustomerName] = useState('') // Name capture for CRM
  const [activeTab, setActiveTab] = useState('menu')
  const [activeCategory, setActiveCategory] = useState(null)
  const searchInputRef = useRef(null)
  const categoryRefs = useRef({})


  const { createOrder, updateStatus, getOrdersByTable } = useOrderManagement(restaurantId)

  // Track menu visit on mount
  useEffect(() => {
    trackMenuVisit()
  }, [])

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

  const categories = useMemo(() => Object.keys(groupedItems), [groupedItems])

  const handleSearchFocus = useCallback(() => {
    setActiveTab('search')
    if (searchInputRef.current) {
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      searchInputRef.current.focus()
    }
  }, [])

  const scrollToCategory = useCallback((category) => {
    setActiveCategory(category)
    const element = categoryRefs.current[category]
    if (element) {
      const navbarHeight = 64
      const stickyBarHeight = 140
      const totalOffset = navbarHeight + stickyBarHeight - 10 // Refined padding
      const bodyRect = document.body.getBoundingClientRect().top
      const elementRect = element.getBoundingClientRect().top
      const elementPosition = elementRect - bodyRect
      const offsetPosition = elementPosition - totalOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }, [])

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0])
    }
  }, [categories, activeCategory])

  const addToCart = (item) => {
    // Track item view when added to cart
    trackItemView(item._id)

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
      customerName: customerName || 'Guest Customer',
      items: cart,
      subtotal: getTotalPrice(),
      tax: getTotalPrice() * 0.05,
      total: getTotalPrice() * 1.05,
      type: 'DINE-IN'
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
    <div className="min-h-screen bg-zinc-50 flex flex-col pb-32 lg:pb-0 overflow-x-hidden">
      {/* Elite Executive Navbar - Integrated Desktop Experience */}
      {/* Elite Studio Navbar - Integrated Executive Experience */}
      <Navbar className="bg-white/90 backdrop-blur-3xl sticky top-0 z-50 border-b border-slate-100/60 h-20">
        <NavbarContent className="max-w-[1400px] mx-auto px-6 w-full flex items-center justify-between gap-10">
          
          {/* Brand & Table Context */}
          {/* Brand Identity - Studio Left-Aligned Experience */}
          <div className="flex items-center justify-between w-full lg:w-auto lg:gap-8 flex-shrink-0">
            <div className="flex items-center gap-3 lg:gap-4">
              <NavbarBrand className="flex items-center gap-2 group cursor-pointer">
                <Logo showText={true} iconSize={28} className="lg:scale-110" />
              </NavbarBrand>
            </div>

            {/* Mobile Actions & Persistent Context (Right Side) */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="flex flex-col items-end pr-3 border-r border-slate-100/60 leading-none">
                <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1 underline decoration-slate-200 underline-offset-2">Table-0{tableNumber}</span>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-11 w-11 text-slate-500 bg-slate-50 rounded-2xl transition-all border border-slate-100/50 active:bg-slate-100"
                onClick={() => setShowOrderTracking(true)}
              >
                <User className="h-4 w-4" />
              </Button>
            </div>

            {/* Premium Table Context - Desktop Only Badge */}
            <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-slate-100/60">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mb-1">Table</span>
                <span className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">{tableNumber}</span>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-200" />
            </div>
          </div>

          {/* Luxury Command Search - Desktop Focused */}
          <div className="hidden lg:flex flex-1 max-w-xl relative group">
             <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
               <Search className="h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
             </div>
             <Input 
               ref={searchInputRef}
               type="text"
               placeholder="SEARCH DISHES OR CATEGORIES..."
               className="w-full h-14 pl-12 bg-slate-50 border-transparent rounded-[1.5rem] focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-slate-100 focus-visible:bg-white focus-visible:border-slate-200 transition-all text-[11px] font-bold tracking-widest uppercase placeholder:text-slate-300"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-200/50">
                <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">CMD + K</span>
             </div>
          </div>

          {/* Action Hub - Right side (Desktop Focused) */}
          <div className="hidden lg:flex items-center gap-3 lg:gap-5 flex-shrink-0">
            {/* Desktop Metrics */}
            <div className="flex items-center gap-6 px-6 py-2.5 bg-slate-50 rounded-2xl border border-slate-100/50">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Session</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Live</span>
                </div>
              </div>
            </div>

            {activeOrderId && (
              <TrackOrderButton
                isActive={showOrderTracking}
                orderStatus={currentOrder?.status}
                onClick={() => setShowOrderTracking(true)}
                className="scale-90 hover:scale-95 transition-transform"
              />
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-[1.25rem] transition-all group/user"
            >
              <User className="h-5 w-5 group-hover/user:scale-110 transition-transform" />
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
          
          {activeOrderId && (
            <NavbarMenuItem onClick={() => {
              setShowOrderTracking(true)
              setMobileMenuOpen(false)
            }}>
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-blue-600" />
                <div className="font-medium text-blue-600">Track Current Order</div>
              </div>
            </NavbarMenuItem>
          )}
        </NavbarMenu>
      </Navbar>

      {/* Global Restaurant Profile Section - Restored for all screens (Compact Mobile View) */}
      <div className="w-full bg-white border-b border-zinc-100/50 lg:hidden">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-100">
                <Utensils className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                {/* Brand Name moved to Navbar for cleaner mobile layout */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100/60 shadow-sm shadow-amber-50">
                    <Star className="w-3 h-3 text-amber-500 fill-current" />
                    <span className="text-[11px] font-black text-amber-700 leading-none">{restaurantData.rating}</span>
                  </div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">/ {restaurantData.cuisine}</span>
                  <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100/60 shadow-sm shadow-emerald-50">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">Live Now</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Relatable Slogan - Fills visual space with authority */}
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none mb-1">
                Deliciously Crafted
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Exquisite flavors, exclusively for your table
              </p>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
              <div className="bg-blue-50/80 border border-blue-100/50 px-4 py-2 rounded-2xl flex items-center gap-2.5 flex-shrink-0 transition-all shadow-[0_2px_10px_rgba(59,130,246,0.05)]">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                <span className="text-[8.5px] font-black text-blue-700 uppercase tracking-[0.2em] leading-none">{restaurantData.deliveryTime}</span>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-100/50 px-4 py-2 rounded-2xl flex items-center gap-2.5 flex-shrink-0 transition-all shadow-[0_2px_10px_rgba(16,185,129,0.05)]">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span className="text-[8.5px] font-black text-emerald-700 uppercase tracking-[0.2em] leading-none">Veg Selection</span>
              </div>

              <div className="bg-amber-50/80 border border-amber-100/50 px-4 py-2 rounded-2xl flex items-center gap-2.5 flex-shrink-0 transition-all shadow-[0_2px_10px_rgba(245,158,11,0.05)]">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                <span className="text-[8.5px] font-black text-amber-700 uppercase tracking-[0.2em] leading-none">Top Choice</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[72%_minmax(380px,28%)] gap-10 items-start overflow-visible">
        {/* Menu Section */}
        <div className="space-y-12 w-full">
          {/* Featured Picks - Reference Style Horizontal Scroll (MOBILE ONLY) */}
          <div className="lg:hidden space-y-4">
            <div className="flex items-center justify-between px-0">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Featured Picks
              </h2>
              <button 
                onClick={() => {
                  const firstCat = categories[0]
                  if (firstCat) scrollToCategory(firstCat)
                }}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline active:scale-95 transition-transform"
              >
                View All
              </button>
            </div>
            
            <div className="flex overflow-x-auto gap-4 no-scrollbar -mx-6 px-6 pb-2">
              {menuItems.filter(i => i.isInStock).slice(0, 6).map((item) => (
                <div 
                  key={item._id} 
                  onClick={() => addToCart(item)}
                  className="flex-shrink-0 w-72 bg-white rounded-2xl border border-zinc-100 p-3 flex gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <div className="w-20 h-20 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 relative shadow-sm border border-zinc-50">
                    <img src={item.photo || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} className="w-full h-full object-cover" alt={item.name} />
                    {getQuantity(item._id) > 0 && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="text-white font-black text-xs">+{getQuantity(item._id)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col py-0.5">
                    <div>
                      <h4 className="text-[13px] font-black text-slate-900 uppercase italic truncate leading-tight mb-0.5">{item.name}</h4>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight truncate">{item.category}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <p className="text-base font-black text-slate-900 tracking-tighter">{formatPrice(item.price)}</p>
                      <Plus className="w-4 h-4 text-blue-600 font-black stroke-[3px]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legacy Featured Picks - Hidden to prioritize Premium Selections */}
          <div className="hidden lg:hidden">
             <div className="pt-8 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Featured Picks
                  </h2>
                </div>
                <div className="flex overflow-x-auto gap-4 no-scrollbar -mx-4 px-4 pb-2">
                  {/* ... mobile items ... */}
                </div>
             </div>
          </div>

          {/* Premium Featured Picks - Executive Grid Look (PC ONLY) */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Premium Selections
                </h2>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em] px-0.5">Selection curated by our executive chef</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-2xl font-bold text-[10px] uppercase tracking-widest border-slate-200 hover:bg-slate-900 hover:text-white transition-all px-6 h-10">
                Explore All
              </Button>
            </div>
            
            <div className="grid grid-cols-4 gap-6">
              {menuItems.filter(i => i.isInStock).slice(0, 4).map((item) => (
                <div 
                  key={item._id} 
                  onClick={() => addToCart(item)}
                  className="group bg-white rounded-3xl border border-zinc-100/60 p-4 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2 cursor-pointer relative"
                >
                  <div className="aspect-square rounded-2xl bg-slate-50 overflow-hidden mb-4 relative shadow-sm group-hover:shadow-md transition-shadow">
                    <img src={item.photo || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                    {getQuantity(item._id) > 0 && (
                      <div className="absolute top-2 right-2 h-7 w-7 bg-slate-900 flex items-center justify-center rounded-lg shadow-xl shadow-slate-900/40">
                        <span className="text-white font-black text-[10px]">+{getQuantity(item._id)}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 uppercase italic truncate">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.category}</p>
                    <div className="flex items-center justify-between pt-2">
                       <span className="text-base font-black text-slate-900">{formatPrice(item.price)}</span>
                       <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all">
                         <Plus className="w-3.5 h-3.5" />
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Executive Search & Category Hub - Studio Mobile Experience */}
          <div className="sticky top-[80px] z-40 px-0 pt-6 pb-6 bg-white/95 backdrop-blur-3xl border-b border-slate-100/80 shadow-sm lg:hidden transition-all duration-500">
             {/* Luxury Mobile Search */}
             <div className="px-6 mb-6">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 z-10">
                    <Search className="h-4 w-4" />
                  </div>
                  <Input 
                    ref={searchInputRef}
                    type="text"
                    className="pl-11 h-12 bg-slate-50 border-transparent rounded-2xl text-[11px] font-bold uppercase tracking-widest placeholder:text-slate-300 focus-visible:bg-white focus-visible:border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all shadow-sm shadow-slate-100/30" 
                    placeholder="Search dishes..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-slate-300" />
                </div>
             </div>

            {/* Premium Studio Category Scroller */}
            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar px-6 scroll-smooth">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => scrollToCategory(category)}
                  className={`flex-shrink-0 px-7 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all relative overflow-hidden group/cat ${
                    activeCategory === category 
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                    : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <span className="relative z-10">{category}</span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {Object.entries(groupedItems).map(([category, items], sectionIdx) => (
              <motion.div 
                key={category} 
                ref={el => { categoryRefs.current[category] = el }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: sectionIdx * 0.1 }}
                className="space-y-6 pt-10"
              >
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-1.5 h-8 bg-slate-900 rounded-full" />
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">
                      {category}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Selection curated by Executive Chef</p>
                  </div>
                  <Badge className="bg-slate-900 text-white font-bold ml-auto rounded-lg px-3 py-1 text-[10px] shadow-sm shadow-slate-200">
                    {items.length} OPTIONS
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:grid-cols-2">
                  {items.map((item, idx) => (
                    <Card key={item._id} className="border border-zinc-100/50 shadow-[0_15px_60px_-15px_rgba(0,0,0,0.06)] rounded-[2.5rem] overflow-hidden group hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 transition-all duration-500 bg-white">
                      {/* Premium Mobile Card Layout */}
                      <CardContent className="p-0 lg:hidden">
                        <div className="flex flex-col">
                          {/* Image Layer */}
                          <div className="relative h-56 w-full bg-zinc-100 transition-transform duration-700 group-hover:scale-105">
                            {item.photo ? (
                              <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-5xl opacity-40 grayscale group-hover:grayscale-0 transition-all">
                                {item.type === 'VEG' ? '🥗' : '🍖'}
                              </div>
                            )}
                            
                            {/* Executive Badges */}
                            <div className="absolute top-4 left-4 flex gap-2">
                              <div className={cn(
                                "h-7 w-7 rounded-lg border-2 border-white flex items-center justify-center shadow-lg",
                                item.type === 'VEG' ? "bg-emerald-500" : "bg-rose-500"
                              )}>
                                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                              </div>
                              <div className="bg-white/80 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-lg">
                                 Executive Pack
                              </div>
                            </div>
                            
                            {/* Best Seller Glow */}
                            {idx === 0 && (
                              <div className="absolute top-4 right-4 bg-amber-400 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                Best Seller
                              </div>
                            )}
                          </div>
                          
                          {/* Detail Layer */}
                          <div className="p-6 relative">
                            {/* Floating Add Trigger */}
                            <div className="absolute -top-6 right-6">
                              {getQuantity(item._id) > 0 ? (
                                <div className="flex items-center bg-slate-900 rounded-2xl p-1.5 shadow-2xl shadow-slate-900/30 scale-110 active:scale-105 transition-transform">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-9 w-9 text-white hover:bg-white/10" 
                                    onClick={() => removeFromCart(item._id)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-10 text-center text-white font-black text-lg">{getQuantity(item._id)}</span>
                                  <Button 
                                    size="icon" 
                                    className="h-9 w-9 bg-white text-slate-900 hover:bg-blue-50" 
                                    onClick={() => addToCart(item)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  onClick={() => addToCart(item)}
                                  className="h-12 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl shadow-2xl shadow-slate-900/30 font-black uppercase tracking-widest text-[11px] flex gap-2 items-center group/btn active:scale-95 transition-all"
                                >
                                  Add
                                  <Plus className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
                                </Button>
                              )}
                            </div>
                            
                            <div className="mb-4">
                              <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-tight mb-2">{item.name}</h3>
                              <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">{item.description}</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <p className="text-xl font-bold text-slate-900">{formatPrice(item.price)}</p>
                              <div className="h-1 w-1 rounded-full bg-slate-200" />
                              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.15em]">Inclusive of taxes</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>

                      {/* Desktop Card View - Elite Minimalist (Restored Reference + Premium) */}
                      <CardContent className="p-5 max-lg:hidden relative">
                        <div className="flex gap-6 items-center">
                          {/* Premium Image Frame */}
                          <div className="w-28 h-28 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 relative group-hover:shadow-2xl transition-all duration-700">
                            {item.photo ? (
                              <img src={item.photo} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl opacity-30 grayscale group-hover:grayscale-0 transition-all">
                                {item.type === 'VEG' ? '🥗' : '🍖'}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          
                          <div className="flex-1 flex flex-col py-1">
                            <div className="flex justify-between items-start mb-1">
                              <div className="space-y-1">
                                <h3 className="text-base font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors uppercase leading-none">{item.name}</h3>
                                <div className="flex items-center gap-2">
                                  {item.type && (
                                    <div className={cn(
                                      "px-2 py-0.5 rounded-md border text-[8px] font-bold uppercase tracking-widest",
                                      item.type === 'VEG' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
                                    )}>
                                      {item.type}
                                    </div>
                                  )}
                                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Executive Choice</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 font-bold line-clamp-2 mt-1 leading-relaxed italic">{item.description}</p>
                            
                            <div className="flex justify-between items-center mt-5">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Investment</span>
                                <span className="text-xl font-black text-slate-900 tracking-tighter">{formatPrice(item.price)}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {getQuantity(item._id) > 0 ? (
                                  <div className="flex items-center bg-slate-900 rounded-2xl p-1 shadow-xl shadow-slate-200">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10 rounded-xl" onClick={(e) => { e.stopPropagation(); removeFromCart(item._id); }}>
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-6 text-center text-[13px] text-white font-black">{getQuantity(item._id)}</span>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10 rounded-xl" onClick={(e) => { e.stopPropagation(); addToCart(item); }}>
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button 
                                    size="sm"
                                    className="h-11 px-8 bg-slate-900 hover:bg-black text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-slate-200 uppercase tracking-widest text-[11px]" 
                                    onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                  >
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
            </motion.div>
          ))}
        </AnimatePresence>

          {/* Show when no menu items are available */}
          {Object.keys(groupedItems).length === 0 && !loading && (
            <Card className="text-center py-12 border-zinc-200">
              <CardContent className="pt-6">
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

        {/* Desktop Cart Sidebar - Elite Glassmorphic Folio */}
        <aside className="hidden lg:block sticky top-8 self-start w-full transition-all duration-700">
          <Card className="border border-zinc-100/30 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.12)] rounded-[3rem] overflow-hidden bg-white/80 backdrop-blur-3xl ring-1 ring-white/50 h-fit">
            <CardHeader className="py-8 px-8 border-b border-zinc-100 bg-slate-900">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-white uppercase tracking-[0.25em] flex items-center gap-4 italic leading-none">
                  <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-white" />
                  </div>
                  My Portfolio
                </CardTitle>
                <Badge className="bg-blue-600 text-white border-none font-black px-2 py-0.5 text-[10px] rounded-md shadow-lg shadow-blue-500/20">
                  {getTotalItems()} ITEMS
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="py-24 px-8 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mb-6 border border-slate-100 shadow-inner group/empty">
                    <ShoppingBag className="w-10 h-10 text-zinc-200 group-hover/empty:scale-110 transition-transform" />
                  </div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Portfolio is Empty</h3>
                  <p className="text-[10px] text-zinc-300 font-bold max-w-[160px] text-center uppercase leading-tight">Add your selections to begin the culinary journey</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[40vh] overflow-y-auto px-8 py-8 space-y-6 no-scrollbar">
                    {cart.map(item => (
                      <div key={item._id} className="flex justify-between items-start gap-6 group/item">
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-black text-slate-800 uppercase italic group-hover/item:text-blue-600 transition-colors leading-none">{item.name}</p>
                          <div className="flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Quantity: {item.quantity}</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-900 tracking-tighter">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-8 py-8 bg-slate-50/50 border-t border-zinc-100/50 space-y-6">
                    <div className="flex justify-between items-end px-1">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Investment</span>
                        <div className="flex items-center gap-1.5 opacity-50">
                           <CheckCircle className="h-3 w-3 text-emerald-500" />
                           <span className="text-[9px] font-bold text-slate-400 uppercase italic tracking-widest">Inclusive of all taxes</span>
                        </div>
                      </div>
                      <span className="text-3xl font-black text-slate-900 tracking-[calc(-0.05em)]">{formatPrice(getTotalPrice())}</span>
                    </div>
                    <Button 
                      className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.98] group/proc" 
                      onClick={() => setShowConfirmModal(true)}
                    >
                      Place Order
                      <Plus className="ml-3 w-4 h-4 group-hover/proc:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Premium Bottom Navigation - Zomato/Swiggy Style */}
      <MenuBottomNavbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={getTotalItems()}
        hasActiveOrder={!!activeOrderId}
        onCartClick={() => cart.length > 0 && setShowConfirmModal(true)}
        onSearchClick={handleSearchFocus}
        onTrackClick={() => setShowOrderTracking(true)}
        orderStatus={currentOrder?.status}
      />


      {/* Checkout Modal Overlay - Polished Responsive Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <Card className="max-w-xl w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border-zinc-200 shadow-2xl overflow-hidden rounded-2xl">
            <CardHeader className="bg-zinc-50/50 border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-black flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-zinc-900" />
                  Confirm Your Order
                </CardTitle>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-zinc-200" onClick={() => setShowConfirmModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Customer Name Capture */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 block">Your Name (for order tracking)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input 
                    placeholder="Enter your name" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-10 h-11 border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400"
                  />
                </div>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {cart.map(item => (
                  <div key={item._id} className="flex justify-between items-center group">
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-900 group-hover:text-black transition-colors">{item.name}</span>
                      <span className="text-xs text-zinc-500 font-medium">Quantity: {item.quantity}</span>
                    </div>
                    <span className="font-bold text-black tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-zinc-100 space-y-3">
                <div className="flex justify-between items-center text-sm text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatPrice(getTotalPrice())}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-zinc-600">
                  <span>Tax & Fees (5%)</span>
                  <span className="font-medium">{formatPrice(getTotalPrice() * 0.05)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-black">Total Amount</span>
                  <span className="text-2xl font-black text-black tabular-nums">{formatPrice(getTotalPrice() * 1.05)}</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl border-zinc-200 text-zinc-600 font-semibold hover:bg-zinc-50 hover:text-black transition-all" 
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-12 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold shadow-lg shadow-black/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2" 
                  onClick={placeOrder}
                >
                  Place Order
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Simplified Premium Light Footer - Harmonized with page UI */}
      <footer className="bg-white border-t border-zinc-100 pt-16 pb-32 lg:pb-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
            {/* Brand Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                  <Utensils className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Servora</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Executive Dining</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 font-bold leading-relaxed max-w-sm">
                Premium digital dining experience crafted for the modern gourmet. Enjoy elite hospitality at your table.
              </p>
              <div className="flex items-center gap-4">
                <Instagram className="w-5 h-5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer" />
                <Facebook className="w-5 h-5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" />
                <Twitter className="w-5 h-5 text-slate-400 hover:text-sky-500 transition-colors cursor-pointer" />
              </div>
            </div>

            {/* Quick Support */}
            <div className="flex flex-col md:items-end space-y-6">
              <div className="w-full md:max-w-[200px]">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Guest Concierge</h4>
                <nav className="flex flex-col gap-3">
                  {['Need Help?', 'Contact Support', 'Privacy Policy', 'Terms of Service'].map(link => (
                    <a key={link} href="#" className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors w-fit">{link}</a>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              &copy; 2024 Servora Executive. All Rights Reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Systems Secure
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}