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
import { Skeleton } from '@/components/ui/skeleton'
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
  getRestaurantProfile,
  getTableSessions,
  updateTableStatus as updateTableAPI,
  requestWaiter
} from '@/lib/api'

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
  const [showWaiterPopup, setShowWaiterPopup] = useState(false)
  const [restaurantData, setRestaurantData] = useState({
    name: "Servora",
    rating: 4.8,
    cuisine: "Multi-Cuisine"
  })
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

        // 1. Fetch Restaurant Profile for Dynamic UI
        if (resId && resId !== 'default') {
          const profile = await getRestaurantProfile(resId)
          if (profile) {
             setRestaurantData(prev => ({
               ...prev,
               name: profile.business_name || 'Servora',
               logo: profile.logo_url,
               photo: profile.cover_url,
               description: profile.description
             }))
          }
        }

        // 2. Load menu items from Supabase
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
              
              // Also fetch actual profile using the rescued UUID
              const actualProfile = await getRestaurantProfile(effectiveId)
              if (actualProfile) {
                setRestaurantData(prev => ({
                  ...prev,
                  name: actualProfile.business_name || 'Servora',
                  logo: actualProfile.logo_url,
                  photo: actualProfile.cover_url,
                  description: actualProfile.description
                }))
              }
              
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
      setShowWaiterPopup(true)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col p-6 space-y-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-48 w-full rounded-3xl" />
            <Skeleton className="h-48 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  if (showOrderTracking && currentOrder) {
    return <OrderTracking orderId={currentOrder.id} restaurantId={restaurantId} onClose={() => setShowOrderTracking(false)} />
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col pb-32 lg:pb-0 overflow-x-hidden">
      {/* 💻 DESKTOP NAVBAR */}
      <Navbar className="hidden lg:flex bg-white/95 backdrop-blur-3xl sticky top-0 z-50 border-b border-slate-100/40 h-24">
        <NavbarContent className="max-w-375 mx-auto px-10 w-full flex items-center justify-between gap-12">
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
                   <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">ACTIVE</span>
                </div>
             </div>
             <Button variant="ghost" size="icon" className="h-12 w-12 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all">
                <User className="h-5 w-5" />
             </Button>
          </div>
        </NavbarContent>
      </Navbar>

      {/* 📱 MOBILE NAVBAR & HERO (Matches Premium Shadcn Layout) */}
      <div className="lg:hidden px-4 pt-4 pb-2">
        {/* White Top Navbar */}
        <div className="bg-white px-5 py-4 flex items-center justify-between rounded-t-[2rem] shadow-sm relative z-10">
          <Logo showText={true} iconSize={24} />
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 rounded-full h-10 w-10">
            <User className="h-5 w-5" />
          </Button>
        </div>

        {/* Dark Hero Section */}
        <div className="w-full relative overflow-hidden bg-slate-900 rounded-b-[2rem] shadow-xl -mt-1">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img 
              src={restaurantData.photo || restaurantData.coverImage || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1934&auto=format&fit=crop"} 
              alt="Restaurant Atmosphere" 
              className="w-full h-full object-cover opacity-20" 
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-[#0f172a]/60" />
          </div>
          
          <div className="relative z-10 px-6 pt-8 pb-10 flex flex-col gap-8">
            <div className="flex items-center gap-5">
              <div className="h-[4.5rem] w-[4.5rem] rounded-[1.25rem] bg-white/5 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg overflow-hidden">
                {restaurantData.logo || restaurantData.photo || restaurantData.image ? (
                  <img src={restaurantData.logo || restaurantData.photo || restaurantData.image} alt={restaurantData.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <Utensils className="h-8 w-8 text-white/90" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-[12px] font-black text-amber-50 leading-none">{restaurantData.rating}</span>
                  </div>
                  <div className="bg-white/10 text-slate-200 px-2.5 py-1 rounded-xl border border-white/5 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest leading-none flex items-center">
                    {restaurantData.cuisine}
                  </div>
                </div>
                <h2 className="text-white text-[22px] font-bold tracking-tight flex items-center gap-2.5 mt-1">
                  Table {tableNumber} <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                </h2>
              </div>
            </div>
            
            <div className="flex flex-col">
              <h1 className="text-[32px] font-black text-white uppercase tracking-tighter italic leading-none mb-3">
                Welcome to<br/><span className="text-indigo-400">{restaurantData.name}</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Enjoy exquisite flavors, exclusively at your table
              </p>
            </div>
          </div>
        </div>
      </div>


      <div className="w-full max-w-350 mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[72%_minmax(380px,28%)] gap-10 items-start overflow-visible">
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
                <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase italic">Popular Selections</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Hand-picked recommendations by our head chef</p>
                </div>
              </div>

              {/* Desktop View — Large Portfolio Cards */}
              <div className="hidden lg:flex overflow-x-auto gap-6 pb-10 px-2 -mx-2 no-scrollbar scroll-smooth">
                {popularItems.map((item) => (
                  <motion.div 
                    key={item._id} 
                    whileHover={{ y: -5 }}
                    className="shrink-0 w-45 group cursor-pointer"
                  >
                    <div className="space-y-4">
                      <div className="relative aspect-square w-full rounded-[1.75rem] overflow-hidden bg-slate-50 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.08)] border border-slate-100/50">
                        {(item.photo || item.image_url || item.image || item.imageUrl) ? (
                          <img src={item.photo || item.image_url || item.image || item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
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
                                <span className="text-[10px] text-white font-black min-w-3 text-center">{getQuantity(item._id)}</span>
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
                    className="shrink-0 w-70 bg-white rounded-3xl p-4 flex items-center gap-4 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.04)] border border-slate-50"
                  >
                    <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-50 shrink-0">
                      {(item.photo || item.image_url || item.image || item.imageUrl) ? (
                        <img src={item.photo || item.image_url || item.image || item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
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
                            <span className="text-[11px] text-white font-black min-w-3 text-center">{getQuantity(item._id)}</span>
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

          <div className="sticky top-20 z-40 px-0 pt-6 pb-6 bg-white/80 backdrop-blur-xl border-b border-white/20 lg:hidden transition-all duration-500 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
             <div className="px-6 mb-6">
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 z-10">
                    <Search className="h-5 w-5 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <Input 
                    ref={searchInputRef} 
                    type="text" 
                    className="pl-14 h-14 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-[1.5rem] text-[13px] font-bold tracking-wide placeholder:text-slate-400 focus-visible:bg-white focus-visible:border-indigo-200 focus-visible:ring-4 focus-visible:ring-indigo-500/10 transition-all shadow-sm" 
                    placeholder="Search dishes..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
             </div>
            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar px-6 scroll-smooth items-center">
              {categories.map((category) => (
                <button 
                  key={category} 
                  onClick={() => scrollToCategory(category)} 
                  className={`shrink-0 px-6 py-3 rounded-2xl text-[13px] font-bold tracking-wide transition-all duration-300 relative border ${
                    activeCategory === category 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105 z-10' 
                    : 'bg-white/60 text-slate-500 border-slate-200/60 hover:text-slate-900 hover:bg-white'
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
                  {items.map((item, idx) => {
                    const itemImg = item.photo || item.image_url || item.image || item.imageUrl
                    return (
                    <Card key={item._id} className="border border-zinc-100/50 shadow-[0_15px_60px_-15px_rgba(0,0,0,0.06)] rounded-[2.5rem] overflow-hidden group hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 transition-all duration-500 bg-white">
                      <CardContent className="p-0 lg:hidden">
                        <div className="flex flex-col">
                          <div className="relative h-56 w-full bg-zinc-100 overflow-hidden">{itemImg ? <img src={itemImg} alt={item.name} className="w-full h-full object-cover" crossOrigin="anonymous" /> : <div className="w-full h-full flex items-center justify-center text-5xl opacity-40">{item.type === 'VEG' ? '🥗' : '🍖'}</div>}</div>
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
                          <div className="w-28 h-28 bg-slate-50 rounded-2xl overflow-hidden shrink-0 relative">{itemImg ? <img src={itemImg} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">{item.type === 'VEG' ? '🥗' : '🍖'}</div>}</div>
                          <div className="flex-1 flex flex-col py-1">
                            <div className="flex justify-between items-start mb-1"><div><h3 className="text-base font-bold text-slate-900 tracking-tight uppercase leading-none">{item.name}</h3></div></div>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1 italic">{item.description}</p>
                            <div className="flex justify-between items-center mt-5">
                              <div className="flex flex-col"><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Investment</span><span className="text-xl font-black text-slate-900 tracking-tighter">{formatPrice(item.price)}</span></div>
                              <div className="flex items-center gap-2">
                                {getQuantity(item._id) > 0 ? (
                                  <div className="flex items-center bg-slate-900 rounded-2xl p-1 shadow-xl"><Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={(e) => { e.stopPropagation(); removeFromCart(item._id); }}><Minus className="h-4 w-4" /></Button><span className="w-6 text-center text-[13px] text-white font-black">{getQuantity(item._id)}</span><Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={(e) => { e.stopPropagation(); addToCart(item); }}><Plus className="h-4 w-4" /></Button></div>
                                ) : (
                                  <Button size="icon" className="h-9 w-9 bg-slate-900 text-white rounded-xl shadow-lg border-0 shrink-0 active:scale-90 transition-transform" onClick={(e) => { e.stopPropagation(); addToCart(item); }}><Plus className="h-4 w-4" /></Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    )
                  })}
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

      <Sheet open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] rounded-t-[2.5rem] bg-white p-0 border-0 flex flex-col">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 bg-white/80 backdrop-blur-xl sticky top-0 z-10 flex flex-row items-center justify-between text-left">
            <SheetTitle className="text-xl font-bold text-slate-900 flex items-center gap-2 m-0">
              <ShoppingBag className="w-5 h-5 text-slate-900" /> Confirm Order
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/50">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 block ml-1">Dining As</label>
              <Input 
                placeholder="Enter your name (Optional)" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                className="h-14 border-slate-200/80 bg-white rounded-2xl text-base shadow-sm focus-visible:ring-indigo-500/20 px-4" 
              />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 block ml-1">Your Portfolio</label>
              <div className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm space-y-2">
                {cart.map(item => (
                  <div key={item._id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-black text-slate-900">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                <span>Subtotal</span>
                <span className="text-slate-900">{formatPrice(getTotalPrice())}</span>
              </div>
              {gstRate > 0 && (
                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                  <span>{gstLabel} ({gstRate}%)</span>
                  <span className="text-slate-900">{formatPrice(getTotalPrice() * gstRate / 100)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-lg font-black text-slate-900 uppercase tracking-tight">Total</span>
                <span className="text-3xl font-black text-indigo-600 tracking-tighter">
                  {formatPrice(getTotalPrice() + getTotalPrice() * gstRate / 100)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white border-t border-slate-100 sticky bottom-0 z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col gap-3">
            <Button 
              className="w-full h-16 rounded-[1.5rem] bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[13px] shadow-xl transition-all" 
              onClick={placeOrder} 
              disabled={isSaving}
            >
              {isSaving ? 'Processing...' : 'Place Order'} <Plus className="ml-2 w-4 h-4" />
            </Button>
            <Button 
              variant="ghost"
              className="w-full h-12 rounded-[1.5rem] text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold uppercase tracking-widest text-[11px] transition-all" 
              onClick={() => setShowConfirmModal(false)}
            >
              Back to Menu
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <footer className="bg-white border-t border-zinc-100 pt-16 pb-32 mt-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col items-center gap-8">
          <div className="flex items-center gap-3"><Logo showText={true} iconSize={32} /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">&copy; 2024 Servora Executive. All Rights Reserved.</p>
        </div>
      </footer>

      {/* Waiter Call Popup */}
      <AnimatePresence>
        {showWaiterPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Decorative background circle */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-50 rounded-full opacity-50 pointer-events-none" />
              
              <div className="w-20 h-20 bg-emerald-100/50 rounded-full flex items-center justify-center mb-6 relative z-10 border border-emerald-100">
                <BellRing className="w-8 h-8 text-emerald-600 animate-[bounce_2s_infinite]" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3 relative z-10">
                Waiter Called
              </h3>
              <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed relative z-10">
                We've notified the concierge. Someone will be right at your table!
              </p>
              <Button 
                onClick={() => setShowWaiterPopup(false)}
                className="w-full h-14 rounded-[1.25rem] bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl hover:shadow-2xl relative z-10"
              >
                Okay, Thanks!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}