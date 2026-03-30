import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingCart, Plus, Minus, X, CheckCircle, AlertCircle, Star, Leaf, RefreshCw, Sparkles, Timer, MapPin, Heart, Award, TrendingUp, Utensils, User, ShoppingBag, Phone, Mail, Facebook, Twitter, Instagram, Menu, BellRing } from 'lucide-react'
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
import { 
  fetchMenuItems, 
  fetchGstSettings, 
  getRestaurantByEmail,
  getTableSessions,
  updateTableStatus as updateTableAPI,
  requestWaiter
} from '@/lib/api'

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
  const [activeOrderId, setActiveOrderId] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [gstRate, setGstRate] = useState(0)
  const [gstLabel, setGstLabel] = useState('GST')
  const [isSaving, setIsSaving] = useState(false)
  const [buttonPosition, setButtonPosition] = useState({ 
    x: 0, 
    y: 0,
    offsetX: 0,
    offsetY: 0
  }) 
  const [isDragging, setIsDragging] = useState(false)
  const [customerName, setCustomerName] = useState('')
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
    const loadInitialData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const params = new URLSearchParams(window.location.search)
        let resId = params.get('restaurant') || 'default'
        
        // Defensive: If table param is mangled with "Restaurant: UUID", strip it
        let rawTable = params.get('table') || 'N/A'
        if (rawTable.includes(' Restaurant:')) {
          rawTable = rawTable.split(' Restaurant:')[0].trim()
        }
        setTableNumber(rawTable)

        // 0. Identity Resolution: If resId is an email, resolve to UUID for cloud-native storage
        if (resId.includes('@')) {
          console.log(`🔗 Resolving legacy email ID: ${resId}`)
          const profile = await getRestaurantByEmail(resId)
          if (profile && profile.id) {
            resId = profile.id
            console.log(`✅ Resolved to UUID: ${resId}`)
          }
        }
        setRestaurantId(resId)

        // 1. Load menu items from Supabase
        console.log(`📡 Fetching live menu for node: ${resId}`)
        let items = await fetchMenuItems(resId)
        let effectiveId = resId

        // REPAIR: If empty and resId Is an email, try fixing it
        if ((!items || items.length === 0) && resId.includes('@')) {
           console.log('🔄 Detected email ID in URL. Rescuing UUID...')
           const profile = await getRestaurantByEmail(resId)
           if (profile) {
              effectiveId = profile.id
              setRestaurantId(effectiveId)
              items = await fetchMenuItems(effectiveId)
              console.log(`✅ Rescued! Using UUID: ${effectiveId}`)
           }
        }
        
        if (items && items.length > 0) {
          setMenuItems(items)
          console.log(`✅ Loaded ${items.length} items from database`)
        } else {
          setMenuItems([])
          console.log('⚠️ No menu items found for this restaurant node.')
        }

        // 2. Load GST Config from Supabase
        const gst = await fetchGstSettings(effectiveId)
        if (gst && gst.enabled && Number(gst.rate) > 0) {
          setGstRate(Number(gst.rate))
          setGstLabel(gst.label || 'GST')
        } else {
          setGstRate(0)
        }
        
      } catch (error) {
        console.error('Error loading menu items:', error)
        setError('Unable to load menu items. Please check the restaurant ID.')
        setMenuItems([])
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Emit table session start event when customer scans QR code
  useEffect(() => {
    if (tableNumber && tableNumber !== 'N/A' && restaurantId) {
      console.log('Customer scanned QR code for table:', tableNumber)
      
      const syncScanToCloud = async () => {
        try {
          // Check if table is already active
          const sessions = await getTableSessions(restaurantId);
          const currentT = sessions.find(s => s.table_number === parseInt(tableNumber));
          
          if (!currentT || currentT.status === 'available' || currentT.status === 'needs-cleaning') {
             console.log('Marking table as occupied in cloud...');
             await updateTableAPI(restaurantId, parseInt(tableNumber), {
                status: 'occupied',
                session_start: new Date().toISOString(),
                last_activity: new Date().toISOString()
             });
          }
        } catch (err) {
          console.error('Failed to sync scan to cloud:', err);
        }
      };
      
      syncScanToCloud();
    }
  }, [tableNumber, restaurantId])

  // Check for session completion and clear active order
  useEffect(() => {
    if (activeOrderId && currentOrder) {
      if (currentOrder.status === ORDER_STATUS.FINISHED) {
        setActiveOrderId(null)
        setCurrentOrder(null)
      }
    }
  }, [activeOrderId, currentOrder])

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
      const totalOffset = navbarHeight + stickyBarHeight - 10 
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

  const handleDragStart = useCallback((e) => {
    setIsDragging(true)
    const touch = e.touches ? e.touches[0] : e
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const offsetX = touch.clientX - rect.left - rect.width / 2
    const offsetY = touch.clientY - rect.top - rect.height / 2
    setButtonPosition({ x: touch.clientX - offsetX, y: touch.clientY - offsetY, offsetX: offsetX, offsetY: offsetY })
  }, [])

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return
    const touch = e.touches ? e.touches[0] : e
    let newX = touch.clientX - (buttonPosition.offsetX || 0)
    let newY = touch.clientY - (buttonPosition.offsetY || 0)
    const padding = 20
    const buttonSize = 56 
    newX = Math.max(padding, Math.min(window.innerWidth - padding - buttonSize, newX))
    newY = Math.max(padding, Math.min(window.innerHeight - padding - buttonSize, newY))
    setButtonPosition(prev => ({ ...prev, x: newX, y: newY }))
  }, [isDragging, buttonPosition.offsetX, buttonPosition.offsetY])

  const handleDragEnd = useCallback(() => setIsDragging(false), [])

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

  const placeOrder = async () => {
    if (cart.length === 0) return
    setIsSaving(true)
    try {
      const taxAmount = getTotalPrice() * (gstRate / 100)
      const orderData = {
        restaurantId,
        tableNumber,
        customerName: customerName || 'Guest Customer',
        items: cart,
        subtotal: getTotalPrice(),
        tax: taxAmount,
        total: getTotalPrice() + taxAmount,
        gstRate,
        gstLabel,
        type: 'DINE-IN'
      }

      console.log('🚀 Sending order to Supabase...', orderData)
      const order = await createOrder(orderData)
      
      if (order && order.id) {
        console.log('✅ Order Success Cloud ID:', order.id)
        setCurrentOrder(order)
        setActiveOrderId(order.id)
        setOrderPlaced(true)
        setShowConfirmModal(false)
        setCart([])
        setTimeout(() => setShowOrderTracking(true), 1500)
      } else {
        throw new Error('Database did not return a valid order ID')
      }
    } catch (err) {
      console.error('❌ Order Placement Failed:', err)
      alert('Failed to place order. Please check your connection.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCallWaiter = async () => {
    setIsSaving(true)
    try {
      await requestWaiter(restaurantId, tableNumber, customerName || 'Guest Table ' + tableNumber)
      alert('🛎️ Service requested. A waiter will be with you shortly.')
    } catch (err) {
      console.error('Waiter call failed:', err)
      alert('Service request failed. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const popularItems = useMemo(() => {
    return menuItems.filter(item => item.isInStock).slice(0, 6)
  }, [menuItems])

  if (loading) return <div className="flex h-screen items-center justify-center">Loading Menu...</div>

  if (showOrderTracking && currentOrder) {
    return <OrderTracking orderId={currentOrder.id} restaurantId={restaurantId} onClose={() => setShowOrderTracking(false)} />
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col pb-32 lg:pb-0 overflow-x-hidden">
      <Navbar className="bg-white/95 backdrop-blur-3xl sticky top-0 z-50 border-b border-slate-100/40 h-24">
        <NavbarContent className="max-w-[1500px] mx-auto px-10 w-full flex items-center justify-between gap-12">
          <NavbarBrand className="flex items-center gap-3 cursor-pointer">
            <Logo showText={true} iconSize={32} />
          </NavbarBrand>

          <div className="hidden lg:flex flex-1 max-w-2xl relative group items-center">
            <div className="absolute left-6 text-slate-400">
               <Search className="h-5 w-5 group-focus-within:text-slate-900 transition-colors" />
            </div>
            <Input 
              ref={searchInputRef} 
              type="text" 
              placeholder="Search for dishes, cuisines or favorites..." 
              className="w-full h-16 pl-16 pr-16 bg-[#f8fafc] border-transparent rounded-full focus-visible:ring-0 focus-visible:bg-white focus-visible:border-slate-100 transition-all text-[13px] font-bold tracking-tight text-slate-900 shadow-sm" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            <div className="absolute right-6 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-tighter shadow-sm">ESC</div>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden lg:flex items-center gap-4 bg-slate-50/50 px-6 py-2.5 rounded-2xl border border-slate-100/40">
                <div className="flex flex-col items-center border-r border-slate-200/60 pr-4 leading-none">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TABLE</span>
                   <span className="text-sm font-black text-slate-900">{tableNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                   <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.1em]">ACTIVE</span>
                </div>
             </div>
             <Button variant="ghost" size="icon" className="h-12 w-12 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all">
                <User className="h-5 w-5" />
             </Button>
          </div>
        </NavbarContent>
        <NavbarMenu isOpen={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <NavbarMenuItem onClick={() => setMobileMenuOpen(false)}>
            <div className="flex items-center gap-3"><Utensils className="h-5 w-5 text-zinc-600" /><div><div className="font-medium">{restaurantData.name}</div><div className="text-sm text-zinc-500">Table {tableNumber}</div></div></div>
          </NavbarMenuItem>
          {activeOrderId && <NavbarMenuItem onClick={() => { setShowOrderTracking(true); setMobileMenuOpen(false); }}><div className="flex items-center gap-3"><Timer className="h-5 w-5 text-blue-600" /><div className="font-medium text-blue-600">Track Current Order</div></div></NavbarMenuItem>}
        </NavbarMenu>
      </Navbar>

      <div className="w-full bg-white border-b border-zinc-100/50 lg:hidden px-6 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-100"><Utensils className="h-7 w-7" /></div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100/60 shadow-sm shadow-amber-50">
                <Star className="w-3 h-3 text-amber-500 fill-current" /><span className="text-[11px] font-black text-amber-700 leading-none">{restaurantData.rating}</span>
              </div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">/ {restaurantData.cuisine}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col"><h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none mb-1">Deliciously Crafted</h1><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Exquisite flavors, exclusively for your table</p></div>
      </div>

      <div className="w-full max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[72%_minmax(380px,28%)] gap-10 items-start overflow-visible">
        <div className="space-y-12 w-full">
          
          {/* ⭐ PREMIUM SELECTIONS / FEATURED PICKS — RESPONSIVE CLONE ⭐ */}
          {popularItems.length > 0 && !searchTerm && (
            <section className="space-y-6 lg:space-y-8">
              {/* Desktop Header */}
              <div className="hidden lg:flex items-end justify-between px-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Sparkles className="h-4 w-4 fill-amber-500" />
                    <h2 className="text-[11px] font-black uppercase tracking-[0.25em] leading-none">Premium Selections</h2>
                  </div>
                  <h3 className="text-[22px] font-black text-slate-900 uppercase tracking-tight leading-none">Handcrafted favorites just for you</h3>
                </div>
                <Button variant="ghost" className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Explore All</Button>
              </div>

              {/* Mobile Header */}
              <div className="flex lg:hidden items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Featured Picks</h2>
                </div>
                <Button variant="link" className="text-blue-600 font-black text-xs uppercase p-0 h-auto tracking-wider">View All</Button>
              </div>

              {/* Desktop View — Large Portfolio Cards */}
              <div className="hidden lg:flex overflow-x-auto gap-6 pb-10 px-2 -mx-2 no-scrollbar scroll-smooth">
                {popularItems.map((item) => (
                  <motion.div 
                    key={item._id} 
                    whileHover={{ y: -5 }}
                    className="flex-shrink-0 w-[180px] group cursor-pointer"
                  >
                    <div className="space-y-4">
                      <div className="relative aspect-square w-full rounded-[1.75rem] overflow-hidden bg-slate-50 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.08)] border border-slate-100/50">
                        {item.photo ? (
                          <img src={item.photo} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">
                            {item.category.toLowerCase().includes('drink') ? '🥤' : '🥘'}
                          </div>
                        )}
                      </div>
                      <div className="px-1">
                        <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-tight mb-0.5 truncate">{item.name}</h4>
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-3 truncate">{item.category}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[14px] font-black text-slate-900 tracking-tighter">{formatPrice(item.price)}</span>
                          <div className="flex items-center gap-2">
                            {getQuantity(item._id) > 0 ? (
                              <div className="flex items-center bg-slate-900 rounded-full p-0.5 shadow-lg h-8">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-white hover:bg-white/10 p-0"
                                  onClick={(e) => { e.stopPropagation(); removeFromCart(item._id); }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-[10px] text-white font-black min-w-[12px] text-center">{getQuantity(item._id)}</span>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  className="h-6 w-6 text-white hover:bg-white/10 p-0"
                                  onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-[#f3f4f6] text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-[#111827] border-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Mobile View — Horizontal Cards */}
              <div className="flex lg:hidden overflow-x-auto gap-4 pb-6 px-2 -mx-2 no-scrollbar scroll-smooth">
                {popularItems.map((item) => (
                  <motion.div 
                    key={item._id}
                    className="flex-shrink-0 w-[280px] bg-white rounded-3xl p-4 flex items-center gap-4 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.04)] border border-slate-50"
                  >
                    <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-50 flex-shrink-0">
                      {item.photo ? (
                        <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">
                          {item.category.toLowerCase().includes('drink') ? '🥤' : '🥘'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[15px] font-bold text-slate-900 truncate mb-0.5">{item.name}</h4>
                      <p className="text-[11px] font-medium text-slate-400 truncate mb-2">{item.category}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-slate-900">{formatPrice(item.price)}</span>
                        
                        {getQuantity(item._id) > 0 ? (
                          <div className="flex items-center gap-2.5 bg-slate-900 rounded-xl p-1 shadow-lg shrink-0">
                             <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-white hover:bg-white/10 p-0"
                              onClick={(e) => { e.stopPropagation(); removeFromCart(item._id); }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-[11px] text-white font-black min-w-[12px] text-center">{getQuantity(item._id)}</span>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              className="h-6 w-6 text-white hover:bg-white/10 p-0"
                              onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="icon" 
                            className="h-8 w-8 bg-slate-900 text-white rounded-xl shadow-lg border-0 shrink-0 active:scale-90 transition-transform"
                            onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          <div className="sticky top-[80px] z-40 px-0 pt-8 pb-8 bg-white lg:hidden transition-all duration-500">
             <div className="px-8 mb-8">
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 z-10"><Search className="h-5 w-5" /></div>
                  <Input 
                    ref={searchInputRef} 
                    type="text" 
                    className="pl-16 h-16 bg-[#f8fafc] border-transparent rounded-[2rem] text-[13px] font-black uppercase tracking-[0.2em] placeholder:text-slate-300 focus-visible:bg-white focus-visible:border-slate-100 focus-visible:ring-0 transition-all" 
                    placeholder="SEARCH DISHES..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
             </div>
            <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar px-8 scroll-smooth items-center">
              {categories.map((category) => (
                <button 
                  key={category} 
                  onClick={() => scrollToCategory(category)} 
                  className={`flex-shrink-0 px-10 py-[1.125rem] rounded-full text-[12px] font-black uppercase tracking-[0.15em] transition-all duration-300 relative ${
                    activeCategory === category 
                    ? 'bg-[#0f172a] text-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.45)] scale-105 z-10' 
                    : 'bg-white text-[#94a3b8] border border-slate-100/60 hover:text-slate-800'
                  }`}
                >
                  <span className="relative z-10">{category}</span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {Object.entries(groupedItems).map(([category, items], sectionIdx) => (
              <motion.div key={category} ref={el => { categoryRefs.current[category] = el }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.5, delay: sectionIdx * 0.1 }} className="space-y-6 pt-10">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-1.5 h-8 bg-slate-900 rounded-full" />
                  <div><h2 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">{category}</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Selection curated by Executive Chef</p></div>
                  <Badge className="bg-slate-900 text-white font-bold ml-auto rounded-lg px-3 py-1 text-[10px] shadow-sm shadow-slate-200">{items.length} OPTIONS</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:grid-cols-2">
                  {items.map((item, idx) => (
                    <Card key={item._id} className="border border-zinc-100/50 shadow-[0_15px_60px_-15px_rgba(0,0,0,0.06)] rounded-[2.5rem] overflow-hidden group hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 transition-all duration-500 bg-white">
                      <CardContent className="p-0 lg:hidden">
                        <div className="flex flex-col">
                          <div className="relative h-56 w-full bg-zinc-100 overflow-hidden">{item.photo ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl opacity-40">{item.type === 'VEG' ? '🥗' : '🍖'}</div>}</div>
                          <div className="p-6 relative">
                            <div className="absolute -top-6 right-6">
                              {getQuantity(item._id) > 0 ? (
                                <div className="flex items-center bg-slate-900 rounded-2xl p-1.5 shadow-2xl scale-110">
                                  <Button size="icon" variant="ghost" className="h-9 w-9 text-white" onClick={() => removeFromCart(item._id)}><Minus className="h-4 w-4" /></Button>
                                  <span className="w-10 text-center text-white font-black text-lg">{getQuantity(item._id)}</span>
                                  <Button size="icon" className="h-9 w-9 bg-white text-slate-900" onClick={() => addToCart(item)}><Plus className="h-4 w-4" /></Button>
                                </div>
                              ) : (
                                <Button onClick={() => addToCart(item)} className="h-12 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl shadow-2xl font-black uppercase tracking-widest text-[11px] flex gap-2 items-center">Add <Plus className="w-4 h-4" /></Button>
                              )}
                            </div>
                            <div className="mb-4"><h3 className="text-lg font-bold text-slate-900 tracking-tight leading-tight mb-2">{item.name}</h3><p className="text-sm text-slate-500 line-clamp-2">{item.description}</p></div>
                            <div className="flex items-center gap-2"><p className="text-xl font-bold text-slate-900">{formatPrice(item.price)}</p></div>
                          </div>
                        </div>
                      </CardContent>
                      <CardContent className="p-5 max-lg:hidden relative">
                        <div className="flex gap-6 items-center">
                          <div className="w-28 h-28 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 relative">{item.photo ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">{item.type === 'VEG' ? '🥗' : '🍖'}</div>}</div>
                          <div className="flex-1 flex flex-col py-1">
                            <div className="flex justify-between items-start mb-1"><div><h3 className="text-base font-bold text-slate-900 tracking-tight uppercase leading-none">{item.name}</h3></div></div>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1 italic">{item.description}</p>
                            <div className="flex justify-between items-center mt-5">
                              <div className="flex flex-col"><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Investment</span><span className="text-xl font-black text-slate-900 tracking-tighter">{formatPrice(item.price)}</span></div>
                              <div className="flex items-center gap-2">
                                {getQuantity(item._id) > 0 ? (
                                  <div className="flex items-center bg-slate-900 rounded-2xl p-1 shadow-xl"><Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={(e) => { e.stopPropagation(); removeFromCart(item._id); }}><Minus className="h-4 w-4" /></Button><span className="w-6 text-center text-[13px] text-white font-black">{getQuantity(item._id)}</span><Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={(e) => { e.stopPropagation(); addToCart(item); }}><Plus className="h-4 w-4" /></Button></div>
                                ) : ( <Button size="sm" className="h-11 px-8 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-[11px]" onClick={(e) => { e.stopPropagation(); addToCart(item); }}>Add</Button> )}
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
        </div>

      {/* 🛎️ PREMIUM FLOATING CONCIERGE BUTTON */}
      <motion.div
        drag
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
        style={{ 
          position: 'fixed',
          left: buttonPosition.x || 'auto',
          top: buttonPosition.y || 'auto',
          right: !buttonPosition.x ? '20px' : 'auto',
          bottom: !buttonPosition.y ? '100px' : 'auto',
          zIndex: 49,
          touchAction: 'none'
        }}
        className="lg:hidden"
      >
        <Button
          onClick={(e) => { 
            if (isDragging) return;
            handleCallWaiter();
          }}
          className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] hover:bg-black transition-all flex items-center justify-center p-0 border-2 border-white/20"
        >
          <BellRing className="w-6 h-6" />
        </Button>
      </motion.div>

      <aside className="hidden lg:block sticky top-8 self-start w-full">
          <Card className="border border-zinc-100 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.12)] rounded-[3rem] overflow-hidden bg-white/80 backdrop-blur-3xl">
            <CardHeader className="py-8 px-8 border-b border-zinc-100 bg-slate-900">
              <div className="flex items-center justify-between"><CardTitle className="text-sm font-black text-white uppercase tracking-[0.25em] flex items-center gap-4 italic leading-none"><ShoppingBag className="h-4 w-4" />My Portfolio</CardTitle><Badge className="bg-blue-600 text-white px-2 py-0.5 text-[10px] rounded-md">{getTotalItems()} ITEMS</Badge></div>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="py-24 px-8 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mb-6"><ShoppingBag className="w-10 h-10 text-zinc-200" /></div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Portfolio is Empty</h3>
                </div>
              ) : (
                <>
                  <div className="max-h-[40vh] overflow-y-auto px-8 py-8 space-y-6 no-scrollbar">{cart.map(item => (<div key={item._id} className="flex justify-between items-start gap-6 group/item"><div className="flex-1 space-y-1"><p className="text-xs font-black text-slate-800 uppercase italic group-hover/item:text-blue-600 transition-colors leading-none">{item.name}</p><div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Qty: {item.quantity}</span></div></div><span className="text-sm font-black text-slate-900 tracking-tighter">{formatPrice(item.price * item.quantity)}</span></div>))}</div>
                  <div className="px-8 py-8 bg-slate-50/50 border-t border-zinc-100/50 space-y-6">
                    <div className="flex justify-between items-end px-1"><div className="space-y-1"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Investment</span></div><span className="text-3xl font-black text-slate-900 tracking-[calc(-0.05em)]">{formatPrice(getTotalPrice())}</span></div>
                    <Button className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] shadow-2xl transition-all" onClick={() => setShowConfirmModal(true)}>Place Order <Plus className="ml-3 w-4 h-4" /></Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <MenuBottomNavbar activeTab={activeTab} setActiveTab={setActiveTab} cartCount={getTotalItems()} hasActiveOrder={!!activeOrderId} onCartClick={() => cart.length > 0 && setShowConfirmModal(true)} onSearchClick={handleSearchFocus} onTrackClick={() => setShowOrderTracking(true)} orderStatus={currentOrder?.status} />

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="max-w-xl w-full border-zinc-200 shadow-2xl overflow-hidden rounded-2xl bg-white">
            <CardHeader className="bg-zinc-50 border-b pb-4"><div className="flex items-center justify-between"><CardTitle className="text-xl font-bold text-black flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-zinc-900" />Confirm Order</CardTitle><Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => setShowConfirmModal(false)}><X className="w-4 h-4" /></Button></div></CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2"><label className="text-sm font-semibold text-zinc-700 block">Your Name</label><Input placeholder="Enter your name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-11 border-zinc-200" /></div>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">{cart.map(item => (<div key={item._id} className="flex justify-between items-center"><div className="flex flex-col"><span className="font-semibold text-zinc-900">{item.name}</span><span className="text-xs text-zinc-500">Qty: {item.quantity}</span></div><span className="font-bold text-black">{formatPrice(item.price * item.quantity)}</span></div>))}</div>
              <div className="pt-4 border-t border-zinc-100 space-y-3">
                <div className="flex justify-between items-center text-sm text-zinc-600"><span>Subtotal</span><span className="font-medium">{formatPrice(getTotalPrice())}</span></div>
                {gstRate > 0 && (<div className="flex justify-between items-center text-sm text-emerald-700"><span>{gstLabel} ({gstRate}%)</span><span className="font-bold">{formatPrice(getTotalPrice() * gstRate / 100)}</span></div>)}
                <div className="flex justify-between items-center pt-2"><span className="text-lg font-bold text-black">Total Amount</span><span className="text-2xl font-black text-black">{formatPrice(getTotalPrice() + getTotalPrice() * gstRate / 100)}</span></div>
              </div>
              <div className="flex gap-4 pt-4"><Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setShowConfirmModal(false)}>Cancel</Button><Button className="flex-1 h-12 rounded-xl bg-black text-white font-bold" onClick={placeOrder} disabled={isSaving}>{isSaving ? 'Processing...' : 'Place Order'}</Button></div>
            </CardContent>
          </Card>
        </div>
      )}

      <footer className="bg-white border-t border-zinc-100 pt-16 pb-32 mt-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col items-center gap-8">
          <div className="flex items-center gap-3"><Logo showText={true} iconSize={32} /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">&copy; 2024 Servora Executive. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  )
}