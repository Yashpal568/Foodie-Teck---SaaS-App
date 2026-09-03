import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingCart, Plus, Minus, X, CheckCircle, AlertCircle, Star, Leaf, RefreshCw, Sparkles, Timer, Clock, MapPin, Heart, Award, TrendingUp, Utensils, User, ShoppingBag, Phone, Mail, Facebook, Twitter, Instagram, Menu, BellRing, Flame, ArrowRight, ChevronRight, Check, Trash2, Receipt, ShieldCheck, ShieldAlert, QrCode, Lock, Sun, Moon } from 'lucide-react'
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
import { toast } from 'sonner'
import OrderTracking from '@/components/order/OrderTracking'
import MenuBottomNavbar from '@/components/menu/MenuBottomNavbar'
import MenuDealsCarousel from '@/components/menu/MenuDealsCarousel'
import { 
  verifyTableSignature, 
  generateTableSignature, 
  getLockedTableSession, 
  setLockedTableSession 
} from '@/utils/tableSecurity'
import { 
  fetchMenuItems, 
  fetchGstSettings, 
  getRestaurantByEmail, 
  getRestaurantProfile,
  getTableSessions,
  updateTableStatus as updateTableAPI,
  requestWaiter
} from '@/lib/api'

// 🥗 Swiggy / Zomato Signature Veg / Non-Veg Indicator Symbol
const FoodTypeBadge = ({ type }) => {
  const isVeg = type === 'VEG' || type === 'veg' || type === true;
  return (
    <div 
      className={`w-3.5 h-3.5 rounded-[3px] border ${isVeg ? 'border-emerald-600' : 'border-rose-600'} p-0.5 flex items-center justify-center bg-white shadow-xs shrink-0`} 
      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
    </div>
  );
};

// 🍽️ Swiggy / Zomato Real Food Photography for Category Plates
const getCategoryPlateInfo = (category = '', itemsInCategory = []) => {
  const c = category.toLowerCase();
  
  // 1. Check if any item in this category has an uploaded real photo
  const firstItemWithImg = itemsInCategory.find(
    i => i && (i.photo || i.image_url || i.image || i.imageUrl)
  );
  if (firstItemWithImg) {
    return {
      image: firstItemWithImg.photo || firstItemWithImg.image_url || firstItemWithImg.image || firstItemWithImg.imageUrl,
      emoji: '🍽️',
      border: 'border-orange-500/30'
    };
  }

  // 2. High-Definition Curated Food Photography
  if (c.includes('bread') || c.includes('naan') || c.includes('roti') || c.includes('paratha') || c.includes('kulcha')) {
    return {
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
      emoji: '🫓',
      border: 'border-amber-400/40'
    };
  }
  if (c.includes('starter') || c.includes('snack') || c.includes('appetizer') || c.includes('momo') || c.includes('dimsum')) {
    return {
      image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=400&q=80',
      emoji: '🥟',
      border: 'border-orange-400/40'
    };
  }
  if (c.includes('pizza')) {
    return {
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80',
      emoji: '🍕',
      border: 'border-red-400/40'
    };
  }
  if (c.includes('burger') || c.includes('sandwich')) {
    return {
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
      emoji: '🍔',
      border: 'border-amber-500/40'
    };
  }
  if (c.includes('biryani') || c.includes('rice') || c.includes('pulao')) {
    return {
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80',
      emoji: '🍚',
      border: 'border-orange-500/40'
    };
  }
  if (c.includes('noodle') || c.includes('pasta') || c.includes('chinese') || c.includes('chowmein')) {
    return {
      image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80',
      emoji: '🍜',
      border: 'border-red-500/40'
    };
  }
  if (c.includes('curry') || c.includes('main') || c.includes('gravy') || c.includes('dal') || c.includes('paneer') || c.includes('chicken')) {
    return {
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
      emoji: '🥘',
      border: 'border-orange-500/40'
    };
  }
  if (c.includes('drink') || c.includes('beverage') || c.includes('shake') || c.includes('juice') || c.includes('coffee') || c.includes('tea') || c.includes('mojito')) {
    return {
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80',
      emoji: '🥤',
      border: 'border-indigo-400/40'
    };
  }
  if (c.includes('dessert') || c.includes('cake') || c.includes('sweet') || c.includes('ice cream') || c.includes('pastry') || c.includes('gulab')) {
    return {
      image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
      emoji: '🍰',
      border: 'border-pink-400/40'
    };
  }
  if (c.includes('soup')) {
    return {
      image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80',
      emoji: '🍲',
      border: 'border-teal-400/40'
    };
  }
  if (c.includes('salad')) {
    return {
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
      emoji: '🥗',
      border: 'border-emerald-400/40'
    };
  }
  if (c.includes('thali') || c.includes('combo')) {
    return {
      image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=400&q=80',
      emoji: '🍱',
      border: 'border-amber-400/40'
    };
  }
  return {
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
    emoji: '🍽️',
    border: 'border-zinc-300'
  };
};

export default function CustomerMenu() {
  const routeParams = useParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState([])
  const [tableNumber, setTableNumber] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [showOrderTracking, setShowOrderTracking] = useState(false)
  const [showNoOrdersModal, setShowNoOrdersModal] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeOrderId, setActiveOrderId] = useState(() => {
    try {
      return sessionStorage.getItem('activeOrderId') || null
    } catch {
      return null
    }
  })
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

  // New state for Variant Selection Modal
  const [cardVariants, setCardVariants] = useState({})
  
  const handleToggleVariant = (e, itemId, variant) => {
    e.stopPropagation()
    setCardVariants(prev => ({ ...prev, [itemId]: variant }))
  }
  
  const getActiveVariant = (item) => {
    if (!item.halfPrice) return 'full'
    return cardVariants[item._id] || 'full'
  }
  const [customerName, setCustomerName] = useState('')
  const [cookingInstructions, setCookingInstructions] = useState('')
  const [activeTab, setActiveTab] = useState('menu')
  const [activeCategory, setActiveCategory] = useState(null)
  const [vegOnlyFilter, setVegOnlyFilter] = useState(false)
  const [showWaiterPopup, setShowWaiterPopup] = useState(false)
  const [theme, setTheme] = useState(() => {
    const hour = new Date().getHours()
    return (hour >= 18 || hour < 6) ? 'dark' : 'light'
  })

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  const [restaurantData, setRestaurantData] = useState({
    name: "Tiger Bistro",
    rating: 4.8,
    cuisine: "Multi-Cuisine • Gourmet Dining",
    photo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    logo: "",
    cover_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    coverImage: "",
    address: ""
  })
  const searchInputRef = useRef(null)
  const categoryRefs = useRef({})

  const { createOrder, updateStatus, getOrdersByTable } = useOrderManagement(restaurantId)

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const params = new URLSearchParams(window.location.search)
        let resId = routeParams?.restaurantId || params.get('restaurant') || 'default'
        
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

        // 🔒 TABLE SECURITY & SESSION LOCK (Prevents URL Manipulation)
        let rawTable = params.get('table') || ''
        if (rawTable.includes(' Restaurant:')) rawTable = rawTable.split(' Restaurant:')[0].trim()
        if (rawTable.includes('Restaurant:')) rawTable = rawTable.split('Restaurant:')[0].trim()
        if (rawTable.includes('&')) rawTable = rawTable.split('&')[0].trim()
        if (rawTable.includes(' ')) rawTable = rawTable.split(' ')[0].trim()
        rawTable = rawTable.replace(/[^0-9a-zA-Z_-]/g, '').trim()

        const sessionKey = `servora_active_table_${resId}`
        let storedTable = ''
        try {
          storedTable = sessionStorage.getItem(sessionKey) || ''
        } catch (e) {}

        let effectiveTable = '1'
        if (rawTable) {
          if (storedTable && storedTable !== rawTable) {
            // URL manipulation attempt: lock to verified session table
            console.log(`🔒 [URL Security Lock] Retaining verified table: ${storedTable}`)
            effectiveTable = storedTable
            try {
              window.history.replaceState(null, '', `/menu?restaurant=${resId}&table=${storedTable}`)
            } catch (e) {}
          } else {
            // Genuine scan / clean session
            effectiveTable = rawTable
            try {
              sessionStorage.setItem(sessionKey, rawTable)
            } catch (e) {}
          }
        } else if (storedTable) {
          effectiveTable = storedTable
        }

        setTableNumber(effectiveTable)

        // 🌟 Live Analytics: Track real menu visit / QR scan in Supabase & local cache
        if (resId && resId !== 'default') {
          trackMenuVisit(resId, effectiveTable)
        }

        // 1. Fetch Restaurant Profile for Dynamic UI
        const profile = await getRestaurantProfile(resId)
        if (profile) {
           const rawName = (profile.business_name || profile.name || '').trim()
           const safeName = (!rawName || /^(test|test\s*2|test2|test2@gmail\.com)$/i.test(rawName)) ? 'Tiger Bistro' : rawName

           setRestaurantData(prev => ({
             ...prev,
             name: safeName,
             logo: profile.logo_url || prev.logo,
             photo: profile.cover_url || profile.photo || prev.photo,
             description: profile.description || prev.description,
             cuisine: profile.cuisine || prev.cuisine,
             address: profile.address || prev.address
           }))
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
                const rescuedRawName = (actualProfile.business_name || actualProfile.name || '').trim()
                const rescuedSafeName = (!rescuedRawName || /^(test|test\s*2|test2|test2@gmail\.com)$/i.test(rescuedRawName)) ? 'Tiger Bistro' : rescuedRawName

                setRestaurantData(prev => ({
                  ...prev,
                  name: rescuedSafeName,
                  logo: actualProfile.logo_url || prev.logo,
                  photo: actualProfile.cover_url || actualProfile.photo || prev.photo,
                  description: actualProfile.description || prev.description,
                  cuisine: actualProfile.cuisine || prev.cuisine,
                  address: actualProfile.address || prev.address
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
    return menuItems.filter(item => {
      if (!item.isInStock) return false;
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        item.name.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query));
      
      const isVeg = item.type === 'VEG' || item.type === 'veg' || item.isVeg || item.is_veg;
      const matchesVeg = !vegOnlyFilter || isVeg;
      
      return matchesSearch && matchesVeg;
    });
  }, [menuItems, searchTerm, vegOnlyFilter])

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

  const addToCart = (item, variant = 'full') => {
    trackItemView(item._id)
    const price = variant === 'half' ? item.halfPrice : item.price
    const name = variant === 'half' ? `${item.name} (Half Plate)` : item.name
    const cartItemId = `${item._id}-${variant}`

    // Check stock limit across variants
    const totalInCart = cart.filter(i => i._id === item._id).reduce((sum, i) => sum + i.quantity, 0)
    if (item.quantity !== null && item.quantity !== undefined && totalInCart >= item.quantity) {
      toast.error(`Only ${item.quantity} available in stock`)
      return
    }

    const existing = cart.find(i => i.cartItemId === cartItemId)
    if (existing) {
      setCart(cart.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setCart([...cart, { ...item, cartItemId, price, name, variant, quantity: 1 }])
    }
  }

  const removeFromCart = (cartItemId) => {
    const existing = cart.find(i => i.cartItemId === cartItemId)
    if (existing?.quantity > 1) {
      setCart(cart.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity - 1 } : i))
    } else {
      setCart(cart.filter(i => i.cartItemId !== cartItemId))
    }
  }

  // Get total quantity of a specific item across all variants (for stock checking)
  const getTotalQuantityForItem = (itemId) => cart.filter(i => i._id === itemId).reduce((sum, i) => sum + i.quantity, 0)
  
  // Get quantity of a specific variant in cart
  const getQuantity = (cartItemId) => cart.find(i => i.cartItemId === cartItemId)?.quantity || 0

  const getTotalPrice = () => cart.reduce((t, i) => t + (i.price * i.quantity), 0)
  const getTotalItems = () => cart.reduce((t, i) => t + i.quantity, 0)

  const handleTrackOrders = useCallback(() => {
    setActiveTab('orders')
    if (currentOrder || activeOrderId) {
      setShowOrderTracking(true)
    } else {
      setShowNoOrdersModal(true)
    }
  }, [currentOrder, activeOrderId])

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
    if (isSaving || cart.length === 0) return
    setIsSaving(true)
    try {
      const taxAmount = getTotalPrice() * (gstRate / 100)
      const orderData = {
        restaurantId,
        tableNumber,
        customerName: customerName || 'Guest Customer',
        specialInstructions: cookingInstructions || undefined,
        notes: cookingInstructions || undefined,
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
        try {
          sessionStorage.setItem('activeOrderId', order.id)
        } catch (e) {
          console.error(e)
        }
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

  if (showOrderTracking && (currentOrder || activeOrderId)) {
    return (
      <OrderTracking 
        orderId={currentOrder?.id || activeOrderId} 
        restaurantId={restaurantId} 
        theme={theme}
        onClose={() => {
          setShowOrderTracking(false)
          setActiveTab('menu')
        }} 
        onOpenCart={() => {
          setShowOrderTracking(false)
          setActiveTab('cart')
          setShowConfirmModal(true)
        }}
        onOpenSearch={() => {
          setShowOrderTracking(false)
          setActiveTab('search')
          setTimeout(() => {
            searchInputRef.current?.focus()
          }, 150)
        }}
      />
    )
  }

  return (
    <div className={`min-h-screen flex flex-col pb-32 lg:pb-0 transition-colors duration-500 relative selection:bg-amber-500 selection:text-black ${
      theme === 'dark' ? 'bg-[#090a0f] text-white' : 'bg-[#faf8f5] text-zinc-900'
    }`}>
      {/* 🌟 LUXURY AMBIENT GLOW LIGHTING MESH 🌟 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-24 -left-24 w-105 h-105 rounded-full blur-[140px] transition-all duration-700 ${
          theme === 'dark' ? 'bg-amber-500/12' : 'bg-amber-400/20'
        }`} />
        <div className={`absolute top-1/3 -right-24 w-105 h-105 rounded-full blur-[140px] transition-all duration-700 ${
          theme === 'dark' ? 'bg-indigo-600/12' : 'bg-orange-400/15'
        }`} />
        <div className={`absolute bottom-24 -left-20 w-100 h-100 rounded-full blur-[140px] transition-all duration-700 ${
          theme === 'dark' ? 'bg-emerald-500/10' : 'bg-rose-400/12'
        }`} />
      </div>

      {/* 💻 STICKY DESKTOP NAVBAR */}
      <Navbar className={`hidden lg:flex backdrop-blur-2xl sticky top-0 z-50 border-b h-20 transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-zinc-950/90 border-zinc-800/80 text-white shadow-[0_4px_25px_rgba(0,0,0,0.5)]' 
          : 'bg-white/92 border-amber-100/70 text-zinc-900 shadow-xs'
      }`}>
        <NavbarContent className="max-w-375 mx-auto px-10 w-full flex items-center justify-between gap-12">
          <NavbarBrand className="flex items-center gap-3 cursor-pointer">
            <Logo showText={true} iconSize={32} />
          </NavbarBrand>

          <div className="hidden lg:flex flex-1 max-w-2xl relative group items-center">
            <div className="absolute left-6 text-slate-400">
               <Search className="h-5 w-5 group-focus-within:text-amber-500 transition-colors" />
            </div>
            <Input 
              ref={searchInputRef} 
              type="text" 
              placeholder="Search for dishes, cuisines or favorites..." 
              className={`w-full h-14 pl-16 pr-16 border rounded-full focus-visible:ring-2 focus-visible:ring-amber-500/20 transition-all text-[13px] font-bold tracking-tight shadow-sm ${
                theme === 'dark' 
                  ? 'bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:border-amber-500/50' 
                  : 'bg-[#f8fafc] border-transparent text-slate-900 placeholder:text-slate-400 focus-visible:bg-white focus-visible:border-amber-200'
              }`} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            <div className={`absolute right-6 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tighter shadow-sm ${
              theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}>ESC</div>
          </div>

          <div className="flex items-center gap-4">
             {/* ☀️ / 🌙 Desktop Day & Night Switcher Pill */}
             <motion.button
               whileTap={{ scale: 0.94 }}
               onClick={toggleTheme}
               className={`h-11 px-4 rounded-full border flex items-center gap-2 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                 theme === 'dark'
                   ? 'bg-zinc-900 border-zinc-700 text-amber-300 hover:bg-zinc-800'
                   : 'bg-white border-amber-200/80 text-amber-800 hover:bg-amber-50'
               }`}
               title={`Switch to ${theme === 'dark' ? 'Day Light' : 'Night Velvet'} Mode`}
             >
               <AnimatePresence mode="wait" initial={false}>
                 {theme === 'dark' ? (
                   <motion.div
                     key="dark"
                     initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
                     animate={{ rotate: 0, scale: 1, opacity: 1 }}
                     exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
                     transition={{ duration: 0.2 }}
                     className="flex items-center gap-1.5"
                   >
                     <Moon className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" />
                     <span className="text-[11px] uppercase tracking-wider font-black">NIGHT</span>
                   </motion.div>
                 ) : (
                   <motion.div
                     key="light"
                     initial={{ rotate: 90, scale: 0.6, opacity: 0 }}
                     animate={{ rotate: 0, scale: 1, opacity: 1 }}
                     exit={{ rotate: -90, scale: 0.6, opacity: 0 }}
                     transition={{ duration: 0.2 }}
                     className="flex items-center gap-1.5"
                   >
                     <Sun className="w-4 h-4 text-amber-500 fill-amber-400" />
                     <span className="text-[11px] uppercase tracking-wider font-black text-amber-900">DAY</span>
                   </motion.div>
                 )}
               </AnimatePresence>
             </motion.button>

             {tableNumber && tableNumber !== 'N/A' && (
               <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold shadow-xs ${
                 theme === 'dark'
                   ? 'bg-zinc-900 border-zinc-800 text-amber-300'
                   : 'bg-amber-50 border-amber-200/80 text-amber-900'
               }`}>
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                 <span className="font-mono uppercase tracking-wider">Table {tableNumber}</span>
               </div>
             )}
             
             <Button
               variant="outline"
               size="sm"
               onClick={handleCallWaiter}
               disabled={isSaving}
               className={`rounded-2xl h-11 px-4 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                 theme === 'dark'
                   ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                   : 'bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50'
               }`}
             >
               <BellRing className="h-4 w-4 text-amber-500 animate-pulse" />
               <span>Call Concierge</span>
             </Button>
          </div>
        </NavbarContent>
      </Navbar>

      {/* 📱 MOBILE HEADER BAR */}
      <header className={`lg:hidden px-4 py-3 sticky top-0 z-50 flex items-center justify-between backdrop-blur-xl border-b transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-zinc-950/90 border-zinc-800/80 text-white shadow-md' 
          : 'bg-white/90 border-zinc-200/60 text-zinc-900 shadow-xs'
      }`}>
        <div className="flex items-center gap-2">
          <Logo showText={true} iconSize={22} />
          {tableNumber && tableNumber !== 'N/A' && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ml-1 border ${
              theme === 'dark'
                ? 'bg-zinc-900 border-zinc-700 text-amber-300'
                : 'bg-amber-50/80 border-amber-200/60 text-amber-900'
            }`}>
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               <span className="text-[10px] font-black uppercase tracking-widest pt-px">Table {tableNumber}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className={`rounded-full h-9 w-9 p-0 flex items-center justify-center transition-all ${
              theme === 'dark'
                ? 'bg-zinc-900 border-zinc-800 text-amber-400'
                : 'bg-white border-zinc-200 text-amber-600'
            }`}
          >
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCallWaiter}
            className={`rounded-full h-9 w-9 p-0 flex items-center justify-center transition-all ${
              theme === 'dark'
                ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                : 'bg-white border-zinc-200 text-zinc-600'
            }`}
          >
            <BellRing className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* 📱 MOBILE RESTAURANT HERO BANNER */}
      <div className="lg:hidden relative z-10">

        {/* ⭐ PREMIUM RESTAURANT HERO BANNER & IDENTITY CARD (MATCHING DASHBOARD LAYOUT) ⭐ */}
        <div className="px-4 pt-3 pb-2">
          <div className={`group w-full rounded-[2rem] sm:rounded-[2.5rem] border shadow-[0_10px_35px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-500 hover:shadow-2xl ${
            theme === 'dark' ? 'bg-zinc-900/90 border-zinc-800/80 text-white hover:border-zinc-700' : 'bg-white/95 border-zinc-200/80 text-zinc-900 hover:border-amber-200'
          }`}>
            
            {/* 1. Full Vibrant Cover Banner Image */}
            <div className="relative h-44 sm:h-56 md:h-64 w-full bg-zinc-900 overflow-hidden">
              <img 
                src={restaurantData.photo || restaurantData.cover_url || restaurantData.coverImage || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"} 
                alt={restaurantData.name || "Restaurant Cover"} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/10" />

              {/* Live Table Badge on top of Banner */}
              {tableNumber && tableNumber !== 'N/A' && (
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white border border-white/20 px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-transform">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span>Table {tableNumber}</span>
                </div>
              )}

              {/* Rating on top of Banner */}
              <div className="absolute top-3 right-3 bg-emerald-600 text-white px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-lg font-black text-xs hover:scale-105 transition-transform">
                <Star className="w-3.5 h-3.5 fill-white text-white" />
                <span>{restaurantData.rating || '4.8'}</span>
              </div>
            </div>

            {/* 2. Restaurant Profile & Action Details */}
            <div className="p-4 sm:p-6 pt-0 relative">
              {/* Overlapping Restaurant Logo Avatar */}
              <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white p-1 shadow-xl border-2 border-white overflow-hidden shrink-0 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all duration-300">
                  {restaurantData.logo || restaurantData.photo ? (
                    <img 
                      src={restaurantData.logo || restaurantData.photo} 
                      alt={restaurantData.name} 
                      className="w-full h-full object-cover rounded-full group-hover:rotate-2 transition-transform duration-500" 
                      crossOrigin="anonymous" 
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-amber-400">
                      <Utensils className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/60 shadow-xs hover:scale-105 transition-transform">
                  <Timer className="w-3.5 h-3.5 text-amber-600" />
                  <span>Avg 15-20 mins prep</span>
                </div>
              </div>

              {/* Restaurant Name, Cuisine & Address */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className={`text-xl sm:text-2xl font-black tracking-tight leading-tight transition-colors ${
                    theme === 'dark' ? 'text-white group-hover:text-amber-300' : 'text-zinc-900'
                  }`}>
                    {restaurantData.name}
                  </h1>
                  <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 hover:scale-105 transition-transform">
                    Verified
                  </span>
                </div>
                <p className="text-xs font-semibold text-zinc-500">
                  {restaurantData.cuisine || "Multi-Cuisine"} {restaurantData.address ? `• ${restaurantData.address}` : '• Gourmet Dining'}
                </p>
              </div>

              {/* Context Highlights Pill Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-zinc-100 text-xs">
                {tableNumber && tableNumber !== 'N/A' && (
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-3 py-1.5 rounded-xl font-bold hover:scale-105 transition-transform">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Dine-In Mode</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-zinc-50 text-zinc-600 border border-zinc-200/60 px-3 py-1.5 rounded-xl font-semibold hover:scale-105 transition-transform">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Instant Table Ordering</span>
                </div>
              </div>

              {/* Signature Promo Strip */}
              <div className="mt-3 bg-linear-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/70 rounded-2xl p-2.5 px-3.5 flex items-center justify-between text-orange-900 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500 shrink-0 animate-pulse" />
                  <span className="text-xs font-bold text-orange-950">
                    Freshly Crafted Gourmet Meals • Exclusively At Your Table
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 hidden sm:inline-block">
                  Chef's Special
                </span>
              </div>

            </div>

          </div>
        </div>
      </div>

      <div className="w-full max-w-350 mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[72%_minmax(380px,28%)] gap-10 items-start overflow-visible">
        <div className="space-y-8 w-full">

          {/* 🎁 EXCLUSIVE DEALS & CHEF SPECIALS CAROUSEL (DYNAMIC FROM LIVE MENU) 🎁 */}
          {!searchTerm && menuItems.length > 0 && (
            <section className="pt-1">
              <MenuDealsCarousel 
                items={menuItems} 
                onSelectCategory={scrollToCategory} 
                onAddToCart={addToCart} 
              />
            </section>
          )}
          
          {/* 🍕 SWIGGY SIGNATURE "WHAT'S ON YOUR MIND?" CATEGORY CAROUSEL 🍕 */}
          {categories.length > 0 && !searchTerm && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className={`text-lg sm:text-xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>What's on your mind?</h2>
                  <p className={`text-[11px] font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Explore by popular dining categories</p>
                </div>
              </div>

              {/* Circular Plates Carousel */}
              <div className="flex overflow-x-auto gap-4 pb-3 pt-1 px-1 -mx-1 no-scrollbar scroll-smooth">
                {categories.map((cat, index) => {
                  const plateInfo = getCategoryPlateInfo(cat, groupedItems[cat] || []);
                  const isActive = activeCategory === cat;
                  return (
                    <motion.div
                      key={cat}
                      initial={{ opacity: 0, y: 10, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: index * 0.03, duration: 0.25 }}
                    >
                      <button
                        onClick={() => scrollToCategory(cat)}
                        className="group shrink-0 flex flex-col items-center gap-2 outline-none transition-all duration-300 active:scale-95 cursor-pointer"
                      >
                        {/* Real Food Image Circular Plate with 3D shadow */}
                        <div className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden border-2 ${
                          isActive 
                            ? 'border-amber-500 ring-4 ring-amber-500/30 scale-105 shadow-[0_14px_28px_rgba(245,158,11,0.4)]' 
                            : theme === 'dark'
                            ? 'border-zinc-700/80 shadow-md group-hover:border-amber-400/70 group-hover:ring-4 group-hover:ring-amber-400/30 group-hover:shadow-[0_16px_32px_rgba(245,158,11,0.35)] group-hover:-translate-y-2 group-hover:scale-105'
                            : 'border-zinc-200/80 shadow-[0_6px_16px_rgba(0,0,0,0.08)] group-hover:border-amber-300 group-hover:ring-4 group-hover:ring-amber-400/20 group-hover:shadow-[0_14px_26px_rgba(245,158,11,0.25)] group-hover:-translate-y-2 group-hover:scale-105'
                        } transition-all duration-300 relative ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                          <img 
                            src={plateInfo.image} 
                            alt={cat} 
                            className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-500" 
                            crossOrigin="anonymous"
                            loading="lazy"
                          />
                          {/* Shimmer light reflection overlay */}
                          <div className="absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-white/20 pointer-events-none group-hover:opacity-80 transition-opacity" />
                        </div>
                        
                        {/* Category Label */}
                        <span className={`text-[12px] font-bold tracking-tight max-w-22 text-center truncate transition-all duration-200 ${
                          isActive 
                            ? 'text-amber-500 font-black scale-105' 
                            : theme === 'dark' ? 'text-zinc-300 group-hover:text-amber-400 group-hover:font-black group-hover:scale-105' : 'text-zinc-700 group-hover:text-amber-600 group-hover:font-black group-hover:scale-105'
                        }`}>
                          {cat}
                        </span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ⭐ SWIGGY/ZOMATO CHEF'S PICKS & POPULAR DISHES CAROUSEL ⭐ */}
          {popularItems.length > 0 && !searchTerm && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-500 mb-0.5">
                    <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500 animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Chef's Special Picks</span>
                  </div>
                  <h2 className={`text-lg sm:text-xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Popular Selections</h2>
                  <p className={`text-[11px] font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Hand-picked guest favorites</p>
                </div>
              </div>

              {/* Horizontal Scroll Cards */}
              <div className="flex overflow-x-auto gap-4 pb-4 px-1 -mx-1 no-scrollbar scroll-smooth snap-x">
                {popularItems.map((item) => {
                  const itemImg = item.photo || item.image_url || item.image || item.imageUrl;
                  return (
                    <motion.div 
                      key={item._id} 
                      className={`shrink-0 w-60 sm:w-65 snap-start rounded-3xl p-3 border transition-all duration-300 flex flex-col justify-between group cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-zinc-900/85 border-zinc-800/90 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-2 hover:border-amber-500/50 hover:shadow-[0_22px_45px_rgba(0,0,0,0.7),0_0_20px_rgba(245,158,11,0.15)]'
                          : 'bg-white/95 border-zinc-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:-translate-y-2 hover:border-amber-300 hover:shadow-[0_16px_36px_rgba(0,0,0,0.12)]'
                      }`}
                    >
                      {/* Food Image Container */}
                      <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-100/10 flex items-center justify-center">
                        {itemImg ? (
                          <img 
                            src={itemImg} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <img 
                            src={getCategoryPlateInfo(item.category, []).image} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            crossOrigin="anonymous"
                          />
                        )}
                        
                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <FoodTypeBadge type={item.type} />
                        </div>
                        <div className="absolute top-2.5 right-2.5 z-10 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-sm group-hover:scale-105 transition-transform">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>4.8</span>
                        </div>

                        {/* Bottom Tag */}
                        <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-md text-zinc-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-white/60 shadow-xs flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500 fill-orange-500" /> Bestseller
                        </div>
                      </div>

                      {/* Details & Action Row */}
                      <div className="pt-3 flex flex-col justify-between flex-1">
                        <div>
                          <h4 className={`text-[14px] font-bold line-clamp-1 tracking-tight transition-colors duration-200 ${
                            theme === 'dark' ? 'text-white group-hover:text-amber-400' : 'text-zinc-900 group-hover:text-amber-600'
                          }`}>
                            {item.name}
                          </h4>
                          <p className={`text-[11px] font-medium line-clamp-1 mt-0.5 mb-3 ${
                            theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                          }`}>
                            {item.description || item.category}
                          </p>
                        </div>

                        <div className={`flex items-center justify-between pt-2 border-t ${
                          theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'
                        }`}>
                          <div className="flex flex-col gap-1 text-right">
                            {item.halfPrice && (
                              <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5 w-max ml-auto">
                                <button 
                                  onClick={(e) => handleToggleVariant(e, item._id, 'half')}
                                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer ${getActiveVariant(item) === 'half' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'}`}
                                >Half</button>
                                <button 
                                  onClick={(e) => handleToggleVariant(e, item._id, 'full')}
                                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer ${getActiveVariant(item) === 'full' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'}`}
                                >Full</button>
                              </div>
                            )}
                            <span className={`text-base font-black tracking-tight group-hover:scale-105 transition-transform duration-200 inline-block ${
                              theme === 'dark' ? 'text-white' : 'text-zinc-900'
                            }`}>
                              {formatPrice(getActiveVariant(item) === 'half' ? item.halfPrice : item.price)}
                            </span>
                          </div>

                          {getQuantity(`${item._id}-${getActiveVariant(item)}`) > 0 ? (
                            <div className="flex items-center bg-zinc-900 text-white rounded-xl p-1 shadow-md gap-2 border border-white/20">
                              <button 
                                className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-transform cursor-pointer" 
                                onClick={(e) => { e.stopPropagation(); removeFromCart(`${item._id}-${getActiveVariant(item)}`); }}
                              >
                                <Minus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                              </button>
                              <span className="text-xs font-black min-w-4 text-center text-white">
                                {getQuantity(`${item._id}-${getActiveVariant(item)}`)}
                              </span>
                              <button 
                                className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-transform cursor-pointer" 
                                onClick={(e) => { e.stopPropagation(); addToCart(item, getActiveVariant(item)); }}
                              >
                                <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                              </button>
                            </div>
                          ) : item.quantity !== null && item.quantity !== undefined && item.quantity <= 0 ? (
                            <div className="px-3 py-1.5 border border-red-500/20 bg-red-50/50 rounded-lg text-[10px] font-bold text-red-600 uppercase tracking-wider">
                              Out of Stock
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  addToCart(item, getActiveVariant(item))
                                }}
                                className={`px-4 py-1.5 border-2 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                                  theme === 'dark'
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500 hover:text-black hover:border-amber-400'
                                    : 'bg-white text-emerald-600 border-emerald-500/40 hover:bg-emerald-50 hover:border-emerald-500'
                                }`}
                              >
                                <span>ADD</span>
                                <Plus className="w-3.5 h-3.5 stroke-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          )}

          {/* 🔍 SWIGGY/ZOMATO STICKY SEARCH & QUICK FILTER BAR 🔍 */}
          <div className={`sticky top-13 lg:top-20 z-30 px-0 py-3 backdrop-blur-xl transition-all duration-300 space-y-3 ${
            theme === 'dark' ? 'bg-[#090a0f]/90' : 'bg-[#faf8f5]/90'
          }`}>
             {/* Search Input Box */}
             <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4 z-10 pointer-events-none">
                  <Search className="h-4 w-4 group-focus-within:text-amber-500 transition-colors" />
                </div>
                <Input 
                  ref={searchInputRef} 
                  type="text" 
                  className={`pl-11 pr-10 h-12 rounded-2xl text-[13px] font-bold tracking-wide focus-visible:ring-4 transition-all shadow-xs ${
                    theme === 'dark'
                      ? 'bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:bg-zinc-900 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/10'
                      : 'bg-white border-zinc-200/80 text-zinc-900 placeholder:text-zinc-400 focus-visible:bg-white focus-visible:border-amber-300 focus-visible:ring-amber-500/10'
                  }`} 
                  placeholder="Search dishes, breads, drinks or desserts..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
             </div>

             {/* Swiggy/Zomato Filter Row: Veg Toggle + Category Scroll Pills */}
              <div className="flex overflow-x-auto gap-2.5 pb-1 no-scrollbar scroll-smooth items-center">
                {/* 🥦 Pure Veg Toggle Button */}
                <button
                  onClick={() => setVegOnlyFilter(!vegOnlyFilter)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 border shadow-xs hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                    vegOnlyFilter 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/25 hover:bg-emerald-700' 
                      : theme === 'dark'
                      ? 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white'
                      : 'bg-white text-zinc-700 border-zinc-200/80 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-[3px] border ${vegOnlyFilter ? 'border-white bg-white' : 'border-emerald-600 bg-white'} p-[1.5px] flex items-center justify-center`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  </div>
                  <span>Veg Only</span>
                </button>

                {/* Category Pills */}
                {categories.map((category) => (
                  <button 
                    key={category} 
                    onClick={() => scrollToCategory(category)} 
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 border shadow-xs hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                      activeCategory === category 
                      ? theme === 'dark' ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-md' : 'bg-zinc-900 text-white border-zinc-900 shadow-zinc-900/20' 
                      : theme === 'dark'
                      ? 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800 hover:border-amber-500/40'
                      : 'bg-white text-zinc-600 border-zinc-200/80 hover:text-zinc-900 hover:bg-zinc-50 hover:border-amber-300'
                    }`}
                  >
                    <span>{category}</span>
                    <span className={`ml-1.5 text-[10px] font-semibold ${activeCategory === category ? (theme === 'dark' ? 'text-slate-900 font-black' : 'text-zinc-400') : 'text-zinc-500'}`}>
                      {groupedItems[category]?.length || 0}
                    </span>
                  </button>
                ))}
              </div>
           </div>

          {/* 🍽️ SWIGGY/ZOMATO SIGNATURE MENU ITEM LISTINGS 🍽️ */}
          <AnimatePresence mode="popLayout">
            {Object.entries(groupedItems).map(([category, items], sectionIdx) => (
              <motion.div 
                key={category} 
                ref={el => { categoryRefs.current[category] = el }} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true, margin: "-100px" }} 
                transition={{ duration: 0.4, delay: sectionIdx * 0.05 }} 
                className="space-y-4 pt-4"
              >
                {/* Category Header */}
                <div className={`flex items-center justify-between border-b pb-3 ${
                  theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200/70'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-6 rounded-full ${
                      theme === 'dark' ? 'bg-amber-400' : 'bg-zinc-900'
                    }`} />
                    <h2 className={`text-lg sm:text-xl font-black tracking-tight uppercase ${
                      theme === 'dark' ? 'text-white' : 'text-zinc-900'
                    }`}>{category}</h2>
                  </div>
                  <Badge className={`font-bold rounded-lg px-2.5 py-0.5 text-[11px] border shadow-none ${
                    theme === 'dark' ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-600 border-zinc-200/60'
                  }`}>
                    {items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}
                  </Badge>
                </div>

                {/* Swiggy/Zomato 2-Column Dish Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item, idx) => {
                    const itemImg = item.photo || item.image_url || item.image || item.imageUrl;
                    return (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-30px" }}
                        transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.18) }}
                      >
                        <Card 
                          className={`group rounded-3xl overflow-visible transition-all duration-300 border cursor-pointer h-full ${
                            theme === 'dark'
                              ? 'bg-zinc-900/85 border-zinc-800/80 text-white shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:-translate-y-1.5 hover:border-amber-500/50 hover:shadow-[0_20px_45px_rgba(0,0,0,0.75),0_0_20px_rgba(245,158,11,0.15)]'
                              : 'bg-white/95 border-zinc-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:-translate-y-1.5 hover:border-amber-400/60 hover:shadow-[0_16px_36px_rgba(0,0,0,0.10)]'
                          }`}
                        >
                          <CardContent className="p-4 sm:p-5 flex justify-between items-start gap-4">
                            {/* Left: Info & Price (65%) */}
                            <div className="flex-1 min-w-0 pr-1">
                              {/* Badges: Veg indicator & Rating */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <FoodTypeBadge type={item.type} />
                                <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md text-[10px] font-black border border-amber-200/50">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                  <span>4.8</span>
                                </div>
                                {idx % 4 === 0 && (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200/50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                    <Flame className="w-2.5 h-2.5 fill-orange-500 text-orange-500 animate-pulse" /> Bestseller
                                  </span>
                                )}
                              </div>

                              {/* Dish Title */}
                              <h3 className={`text-[15px] sm:text-base font-bold tracking-tight leading-snug transition-colors duration-200 ${
                                theme === 'dark' ? 'text-white group-hover:text-amber-400' : 'text-zinc-900 group-hover:text-amber-600'
                              }`}>
                                {item.name}
                              </h3>

                              {/* Price */}
                              <div className="flex flex-col gap-1.5 mt-1">
                                {item.halfPrice && (
                                  <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5 w-max">
                                    <button 
                                      onClick={(e) => handleToggleVariant(e, item._id, 'half')}
                                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer ${getActiveVariant(item) === 'half' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'}`}
                                    >Half</button>
                                    <button 
                                      onClick={(e) => handleToggleVariant(e, item._id, 'full')}
                                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer ${getActiveVariant(item) === 'full' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'}`}
                                    >Full</button>
                                  </div>
                                )}
                                <span className={`text-base sm:text-lg font-black tracking-tight group-hover:scale-105 transition-transform duration-200 inline-block ${
                                  theme === 'dark' ? 'text-white' : 'text-zinc-900'
                                }`}>
                                  {formatPrice(getActiveVariant(item) === 'half' ? item.halfPrice : item.price)}
                                </span>
                              </div>

                              {/* Description */}
                              {item.description ? (
                                <p className={`text-xs font-normal line-clamp-2 mt-1.5 leading-relaxed ${
                                  theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                                }`}>
                                  {item.description}
                                </p>
                              ) : (
                                <p className={`text-xs font-normal italic mt-1.5 ${
                                  theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
                                }`}>
                                  Freshly prepared upon order
                                </p>
                              )}
                            </div>

                            {/* Right: Square Food Thumbnail & Overlapping Swiggy ADD Stepper (35%) */}
                            <div className="relative shrink-0 flex flex-col items-center">
                              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-linear-to-br from-amber-50 to-orange-50/50 border border-zinc-100 shadow-xs flex items-center justify-center">
                                {itemImg ? (
                                  <img 
                                    src={itemImg} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                    crossOrigin="anonymous" 
                                  />
                                ) : (
                                  <img 
                                    src={getCategoryPlateInfo(item.category, []).image} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                    crossOrigin="anonymous" 
                                  />
                                )}
                              </div>

                              {/* Swiggy/Zomato Signature Overlapping ADD Button */}
                              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10">
                                {getQuantity(`${item._id}-${getActiveVariant(item)}`) > 0 ? (
                                  <div className="flex items-center bg-zinc-900 text-white rounded-xl p-1 shadow-lg gap-2 border border-white/20 whitespace-nowrap">
                                    <button 
                                      className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-transform cursor-pointer" 
                                      onClick={(e) => { e.stopPropagation(); removeFromCart(`${item._id}-${getActiveVariant(item)}`); }}
                                    >
                                      <Minus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                    </button>
                                    <motion.span 
                                      key={getQuantity(`${item._id}-${getActiveVariant(item)}`)} 
                                      initial={{ scale: 1.35 }} 
                                      animate={{ scale: 1 }} 
                                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                      className="text-xs font-black min-w-4 text-center text-white"
                                    >
                                      {getQuantity(`${item._id}-${getActiveVariant(item)}`)}
                                    </motion.span>
                                    <button 
                                      className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-transform cursor-pointer" 
                                      onClick={(e) => { e.stopPropagation(); addToCart(item, getActiveVariant(item)); }}
                                    >
                                      <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                    </button>
                                  </div>
                                ) : item.quantity !== null && item.quantity !== undefined && item.quantity <= 0 ? (
                                  <div className="px-3 py-1 bg-red-50/90 backdrop-blur border border-red-200 rounded-lg text-[9px] font-bold text-red-600 uppercase tracking-wider shadow-sm">
                                    Out of Stock
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        addToCart(item, getActiveVariant(item))
                                      }} 
                                      className={`px-5 py-1.5 border-2 hover:scale-110 active:scale-95 shadow-md rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                                        theme === 'dark'
                                          ? 'bg-zinc-900 text-amber-400 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 hover:shadow-[0_4px_15px_rgba(245,158,11,0.35)]'
                                          : 'bg-white text-emerald-600 border-emerald-500/40 hover:bg-emerald-50 hover:border-emerald-500'
                                      }`}
                                    >
                                      <span>ADD</span>
                                      <Plus className="w-3.5 h-3.5 stroke-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>



      {/* 🛎️ LUXURY DRAGGABLE FLOATING CONCIERGE BUTTON */}
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
          right: !buttonPosition.x ? '18px' : 'auto',
          bottom: !buttonPosition.y ? (cart.length > 0 ? '165px' : '90px') : 'auto',
          zIndex: 49,
          touchAction: 'none'
        }}
        className="lg:hidden"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-400/25 animate-ping pointer-events-none" />
          <Button
            onClick={(e) => { 
              if (isDragging) return;
              handleCallWaiter();
            }}
            className="relative h-14 w-14 rounded-full bg-slate-900 text-white shadow-[0_15px_30px_-5px_rgba(0,0,0,0.35)] hover:bg-black hover:scale-115 hover:rotate-12 hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] active:scale-95 transition-all flex items-center justify-center p-0 border-2 border-white/20 cursor-pointer"
          >
            <BellRing className="w-6 h-6 text-amber-400 animate-pulse" />
          </Button>
        </div>
      </motion.div>

      {/* 🖥️ DESKTOP LUXURY CART SIDEBAR */}
      <aside className="hidden lg:block sticky top-8 self-start w-full">
        <Card className={`border shadow-[0_20px_50px_rgba(0,0,0,0.06)] rounded-[2.5rem] overflow-hidden backdrop-blur-2xl transition-colors duration-500 ${
          theme === 'dark' ? 'bg-zinc-900/90 border-zinc-800/90 text-white shadow-2xl' : 'bg-white/90 border-zinc-200/80 text-zinc-900 shadow-sm'
        }`}>
          <CardHeader className={`py-6 px-6 border-b transition-colors duration-500 ${
            theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-900 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white'
                }`}>
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-wider">
                    My Order Cart
                  </CardTitle>
                  <p className={`text-[10px] font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-400'}`}>Table #{tableNumber || '1'} • Dine-In</p>
                </div>
              </div>
              <Badge className={`font-bold px-2.5 py-0.5 text-[11px] rounded-lg ${
                theme === 'dark' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-emerald-500 text-white'
              }`}>
                {getTotalItems()} {getTotalItems() === 1 ? 'Item' : 'Items'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {cart.length === 0 ? (
              <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-3 border ${
                  theme === 'dark' ? 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500' : 'bg-zinc-50 border-zinc-100 text-zinc-300'
                }`}>
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className={`text-sm font-black uppercase tracking-wider mb-1 ${
                  theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'
                }`}>Your cart is empty</h3>
                <p className="text-xs text-zinc-400 max-w-50">Select delicious dishes from the menu to build your feast.</p>
              </div>
            ) : (
              <>
                <div className={`max-h-[36vh] overflow-y-auto px-6 py-4 space-y-3 no-scrollbar divide-y ${
                  theme === 'dark' ? 'divide-zinc-800/80' : 'divide-zinc-100'
                }`}>
                  {cart.map((item, idx) => {
                    const itemImg = item.photo || item.image_url || item.image || item.imageUrl || getCategoryPlateInfo(item.category, []).image;
                    const uniqueKey = item.cartItemId || `${item._id}-${item.variant || 'full'}-${idx}`;
                    return (
                      <div key={uniqueKey} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border ${
                            theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200/60'
                          }`}>
                            <img src={itemImg} alt={item.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{item.name}</p>
                            <span className="text-[10px] text-zinc-400 font-semibold">{formatPrice(item.price)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`flex items-center rounded-lg p-0.5 gap-1.5 border ${
                            theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-zinc-900 text-white border-white/20'
                          }`}>
                            <button 
                              className="h-5 w-5 rounded-md flex items-center justify-center hover:bg-white/20 active:scale-90 cursor-pointer" 
                              onClick={() => removeFromCart(item.cartItemId)}
                            >
                              <Minus className="w-2.5 h-2.5 text-white" />
                            </button>
                            <span className="text-[11px] font-black min-w-3 text-center">{item.quantity}</span>
                            <button 
                              className="h-5 w-5 rounded-md flex items-center justify-center hover:bg-white/20 active:scale-90 cursor-pointer" 
                              onClick={() => addToCart(item, item.variant)}
                            >
                              <Plus className="w-2.5 h-2.5 text-white" />
                            </button>
                          </div>
                          <span className={`text-xs font-black min-w-14 text-right ${
                            theme === 'dark' ? 'text-white' : 'text-zinc-900'
                          }`}>
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={`px-6 py-5 border-t space-y-4 ${
                  theme === 'dark' ? 'bg-zinc-950/80 border-zinc-800' : 'bg-zinc-50/70 border-zinc-100'
                }`}>
                  <div className={`space-y-1.5 text-xs font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>{formatPrice(getTotalPrice())}</span>
                    </div>
                    {gstRate > 0 && (
                      <div className="flex justify-between">
                        <span>{gstLabel} ({gstRate}%)</span>
                        <span className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>{formatPrice(getTotalPrice() * gstRate / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-500 font-bold text-[11px]">
                      <span>Dine-In Service</span>
                      <span>Complimentary</span>
                    </div>
                  </div>

                  <div className={`pt-3 border-t flex justify-between items-center ${
                    theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200/80'
                  }`}>
                    <div>
                      <span className={`text-xs font-black uppercase tracking-wider block ${
                        theme === 'dark' ? 'text-white' : 'text-zinc-900'
                      }`}>Grand Total</span>
                      <span className="text-[9px] text-zinc-400">Incl. all taxes</span>
                    </div>
                    <span className={`text-2xl font-black tracking-tight ${
                      theme === 'dark' ? 'text-amber-400' : 'text-zinc-900'
                    }`}>
                      {formatPrice(getTotalPrice() + (getTotalPrice() * gstRate / 100))}
                    </span>
                  </div>

                  <Button 
                    className={`w-full h-14 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                        : 'bg-slate-900 hover:bg-black text-white'
                    }`} 
                    onClick={() => setShowConfirmModal(true)}
                  >
                    <span>Proceed to Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </aside>
      </div>

      {/* 📱 MOBILE UNIFIED FIXED BOTTOM DOCK (CART NOTIFICATION + NAVIGATION BAR) */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-md pointer-events-none flex flex-col gap-2.5 items-center">
        {/* Floating Cart Notification Bar */}
        <AnimatePresence>
          {cart.length > 0 && (
            <motion.div
              key="floating-cart"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full pointer-events-auto"
            >
              <button
                onClick={() => setShowConfirmModal(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white p-3 px-4.5 rounded-2xl shadow-[0_12px_32px_rgba(16,185,129,0.4)] flex items-center justify-between border border-emerald-500/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs">
                    {getTotalItems()}
                  </div>
                  <div className="text-left leading-tight">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100">
                      {getTotalItems() === 1 ? '1 Item' : `${getTotalItems()} Items`} Added
                    </p>
                    <p className="text-sm font-black text-white">
                      {formatPrice(getTotalPrice())}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-white text-emerald-700 px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm">
                  <span>View Cart</span>
                  <ArrowRight className="w-3 h-3 stroke-3" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation Bar */}
        <MenuBottomNavbar 
          className="relative bottom-auto left-auto translate-x-0 w-full"
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          cartCount={getTotalItems()} 
          hasActiveOrder={!!activeOrderId || !!currentOrder} 
          onCartClick={() => {
            setActiveTab('cart')
            setShowConfirmModal(true)
          }} 
          onSearchClick={handleSearchFocus} 
          onTrackClick={handleTrackOrders} 
          onCallWaiter={handleCallWaiter}
          orderStatus={currentOrder?.status} 
        />
      </div>

      {/* 🛍️ REDESIGNED LUXURY SWIGGY/ZOMATO ORDER SUMMARY SHEET */}
      <Sheet open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <SheetContent side="bottom" className={`h-[92vh] sm:h-[88vh] max-w-2xl mx-auto rounded-t-[2.5rem] p-0 border-0 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.4)] overflow-hidden transition-colors duration-500 ${
          theme === 'dark' ? 'bg-[#090a0f] text-white border-t border-zinc-800/80' : 'bg-zinc-50/95 text-zinc-900 backdrop-blur-2xl'
        }`}>
          {/* Header */}
          <SheetHeader className={`px-6 pt-4 pb-4 border-b backdrop-blur-xl sticky top-0 z-20 transition-colors duration-500 ${
            theme === 'dark' ? 'bg-zinc-950/90 border-zinc-800 text-white' : 'bg-white/90 border-zinc-200/80 text-zinc-900'
          }`}>
            {/* Center drag pill */}
            <div className={`w-12 h-1.5 rounded-full mx-auto mb-3 ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
                  theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-white'
                }`}>
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <SheetTitle className={`text-lg font-black tracking-tight leading-none m-0 ${
                    theme === 'dark' ? 'text-white' : 'text-zinc-900'
                  }`}>
                    Order Summary
                  </SheetTitle>
                  <p className={`text-[11px] font-semibold mt-0.5 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-400'}`}>
                    {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'} in your cart
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {tableNumber && tableNumber !== 'N/A' && (
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs border ${
                    theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Table {tableNumber}</span>
                  </div>
                )}
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    theme === 'dark' ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
            {cart.length === 0 ? (
              <div className="py-20 px-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className={`w-20 h-20 rounded-3xl border flex items-center justify-center ${
                  theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-zinc-100 border-zinc-200/60 text-zinc-400'
                }`}>
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className={`text-base font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Your Cart is Empty</h3>
                  <p className="text-xs text-zinc-400 max-w-60 mx-auto">Select delicious dishes from the menu to start your dine-in order.</p>
                </div>
                <Button 
                  onClick={() => setShowConfirmModal(false)}
                  className={`mt-2 rounded-2xl text-xs font-black uppercase tracking-wider px-6 h-12 shadow-md cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                      : 'bg-zinc-900 hover:bg-black text-white'
                  }`}
                >
                  Explore Menu
                </Button>
              </div>
            ) : (
              <>
            {/* 1. Dining Details Card */}
            <div className={`rounded-3xl p-4 sm:p-5 border shadow-xs space-y-3.5 ${
              theme === 'dark' ? 'bg-zinc-900/90 border-zinc-800/80 text-white' : 'bg-white border-zinc-200/80 text-zinc-900'
            }`}>
              <div className="flex items-center gap-2 font-bold text-xs">
                <User className={`w-4 h-4 ${theme === 'dark' ? 'text-amber-400' : 'text-emerald-600'}`} />
                <span>Guest Details</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                    Your Name (Optional)
                  </label>
                  <Input 
                    placeholder="e.g. John Doe" 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)} 
                    className={`h-11 rounded-xl text-xs font-semibold ${
                      theme === 'dark' 
                        ? 'border-zinc-750 bg-zinc-950/80 text-white placeholder:text-zinc-500 focus-visible:bg-zinc-950 focus-visible:border-amber-400' 
                        : 'border-zinc-200 bg-zinc-50/50 text-zinc-900 focus-visible:bg-white focus-visible:ring-emerald-500/20'
                    }`} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                    Special Cooking Request
                  </label>
                  <Input 
                    placeholder="e.g. Less spicy, extra sauce" 
                    value={cookingInstructions} 
                    onChange={(e) => setCookingInstructions(e.target.value)} 
                    className={`h-11 rounded-xl text-xs font-semibold ${
                      theme === 'dark' 
                        ? 'border-zinc-750 bg-zinc-950/80 text-white placeholder:text-zinc-500 focus-visible:bg-zinc-950 focus-visible:border-amber-400' 
                        : 'border-zinc-200 bg-zinc-50/50 text-zinc-900 focus-visible:bg-white focus-visible:ring-emerald-500/20'
                    }`} 
                  />
                </div>
              </div>
            </div>

            {/* 2. Cart Items List */}
            <div className={`rounded-3xl p-4 sm:p-5 border shadow-xs space-y-3 ${
              theme === 'dark' ? 'bg-zinc-900/90 border-zinc-800/80 text-white' : 'bg-white border-zinc-200/80 text-zinc-900'
            }`}>
              <div className={`flex items-center justify-between pb-2 border-b ${
                theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'
              }`}>
                <span className={`text-xs font-black uppercase tracking-wider ${
                  theme === 'dark' ? 'text-white' : 'text-zinc-900'
                }`}>
                  Cart Dishes ({getTotalItems()})
                </span>
                {cart.length > 0 && (
                  <button 
                    onClick={() => setCart([])} 
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              <div className={`divide-y ${theme === 'dark' ? 'divide-zinc-800/80' : 'divide-zinc-100'}`}>
                {cart.map(item => {
                  const itemImg = item.photo || item.image_url || item.image || item.imageUrl || getCategoryPlateInfo(item.category, []).image;
                  return (
                    <div key={item._id} className="py-3.5 flex items-center justify-between gap-3">
                      {/* Left: Veg badge + Thumbnail + Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-14 h-14 rounded-2xl overflow-hidden shrink-0 border ${
                          theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200/60'
                        }`}>
                          <img src={itemImg} alt={item.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <FoodTypeBadge type={item.type} />
                            <h4 className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                              {item.name}
                            </h4>
                          </div>
                          <span className="text-xs font-semibold text-zinc-400">
                            {formatPrice(item.price)} each
                          </span>
                        </div>
                      </div>

                      {/* Right: Quantity Stepper & Subtotal */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`flex items-center rounded-xl p-1 shadow-xs gap-2 border ${
                          theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-zinc-900 text-white border-white/20'
                        }`}>
                          <button 
                            className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-transform cursor-pointer" 
                            onClick={() => removeFromCart(item.cartItemId)}
                          >
                            <Minus className="w-3 h-3 text-white stroke-[2.5]" />
                          </button>
                          <span className="text-xs font-black min-w-4 text-center text-white">
                            {item.quantity}
                          </span>
                          <button 
                            className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-transform cursor-pointer" 
                            onClick={() => addToCart(item, item.variant)}
                          >
                            <Plus className="w-3 h-3 text-white stroke-[2.5]" />
                          </button>
                        </div>

                        <span className={`text-sm font-black min-w-16 text-right ${
                          theme === 'dark' ? 'text-white' : 'text-zinc-900'
                        }`}>
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add more dishes quick button */}
              <button 
                onClick={() => setShowConfirmModal(false)}
                className={`w-full py-2.5 mt-2 rounded-2xl border-2 border-dashed font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  theme === 'dark' 
                    ? 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700' 
                    : 'border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add more dishes from menu</span>
              </button>
            </div>

            {/* 3. Bill Breakup Summary */}
            <div className={`rounded-3xl p-5 border shadow-xs space-y-3.5 ${
              theme === 'dark' ? 'bg-zinc-900/90 border-zinc-800/80 text-white' : 'bg-white border-zinc-200/80 text-zinc-900'
            }`}>
              <div className={`flex items-center justify-between border-b pb-2.5 ${
                theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'
              }`}>
                <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  theme === 'dark' ? 'text-white' : 'text-zinc-900'
                }`}>
                  <Receipt className="w-3.5 h-3.5 text-zinc-400" />
                  Bill Summary
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  theme === 'dark' ? 'text-amber-400 bg-amber-500/15' : 'text-emerald-600 bg-emerald-50'
                }`}>
                  Dine-In Order
                </span>
              </div>

              <div className={`space-y-2 text-xs font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <div className="flex justify-between items-center">
                  <span>Item Subtotal</span>
                  <span className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>{formatPrice(getTotalPrice())}</span>
                </div>
                
                {gstRate > 0 && (
                  <div className="flex justify-between items-center">
                    <span>{gstLabel} ({gstRate}%)</span>
                    <span className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>{formatPrice(getTotalPrice() * gstRate / 100)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Service & Cutlery</span>
                  <span className="text-emerald-500 font-bold">Free / Included</span>
                </div>
              </div>

              <div className={`pt-3 border-t flex justify-between items-center ${
                theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200/80'
              }`}>
                <div>
                  <span className={`text-sm font-black uppercase tracking-tight block ${
                    theme === 'dark' ? 'text-white' : 'text-zinc-900'
                  }`}>
                    Grand Total
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400">
                    Incl. all taxes and charges
                  </span>
                </div>
                <span className={`text-2xl font-black tracking-tight ${
                  theme === 'dark' ? 'text-amber-400' : 'text-zinc-900'
                }`}>
                  {formatPrice(getTotalPrice() + (getTotalPrice() * gstRate / 100))}
                </span>
              </div>
            </div>
            </>
            )}
          </div>

          {/* Footer Action */}
          {cart.length > 0 && (
            <div className={`p-4 sm:p-5 border-t sticky bottom-0 z-20 flex flex-col gap-2 ${
              theme === 'dark' 
                ? 'bg-zinc-950/95 border-zinc-800 shadow-[0_-10px_35px_rgba(0,0,0,0.7)]' 
                : 'bg-white border-zinc-200/80 shadow-[0_-10px_25px_rgba(0,0,0,0.05)]'
            }`}>
              <Button 
                className={`w-full h-14 rounded-2xl active:scale-[0.99] font-black text-sm uppercase tracking-wider shadow-xl transition-all flex items-center justify-between px-6 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                    : 'bg-zinc-900 hover:bg-black text-white'
                }`} 
                onClick={placeOrder} 
                disabled={isSaving || cart.length === 0}
              >
                <span>{isSaving ? 'Transmitting to Kitchen...' : 'Send Order to Kitchen'}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-black text-base ${theme === 'dark' ? 'text-slate-950' : 'text-emerald-400'}`}>
                    {formatPrice(getTotalPrice() + (getTotalPrice() * gstRate / 100))}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-3" />
                </div>
              </Button>
              
              <p className="text-center text-[10px] text-zinc-400 font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Direct Kitchen Transmission • Freshly prepared on order</span>
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ⏱️ NO ACTIVE ORDERS SHEET MODAL */}
      <Sheet open={showNoOrdersModal} onOpenChange={setShowNoOrdersModal}>
        <SheetContent side="bottom" className={`h-auto max-h-[85vh] max-w-lg mx-auto rounded-t-[2.5rem] p-6 pb-8 border flex flex-col items-center text-center shadow-[0_-20px_50px_rgba(0,0,0,0.4)] ${
          theme === 'dark' ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200/80'
        }`}>
          <div className={`w-12 h-1.5 rounded-full mx-auto mb-6 ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border ${
            theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-500'
          }`}>
            <Clock className="w-8 h-8" />
          </div>
          <SheetTitle className={`text-lg font-black tracking-tight mb-1 ${
            theme === 'dark' ? 'text-white' : 'text-zinc-900'
          }`}>
            No Active Orders Yet
          </SheetTitle>
          <p className={`text-xs max-w-xs mb-6 leading-relaxed ${
            theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            You haven't placed an order for <span className={`font-bold ${theme === 'dark' ? 'text-amber-300' : 'text-zinc-800'}`}>Table {tableNumber && tableNumber !== 'N/A' ? tableNumber : '1'}</span> yet. Add dishes to your cart and place an order to track live kitchen preparation!
          </p>
          <Button 
            onClick={() => setShowNoOrdersModal(false)}
            className={`w-full h-13 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer ${
              theme === 'dark' 
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' 
                : 'bg-zinc-900 hover:bg-black text-white'
            }`}
          >
            Browse Menu & Order
          </Button>
        </SheetContent>
      </Sheet>

      {/* 🌟 SWIGGY & ZOMATO COMPACT LUXURY FOOTER (DAY & NIGHT THEME AWARE) 🌟 */}
      <footer className={`border-t pt-10 pb-28 lg:pb-14 mt-12 relative overflow-hidden transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-linear-to-b from-zinc-950 via-[#07080c] to-[#030406] border-zinc-800/90 text-white' 
          : 'bg-linear-to-b from-amber-50/30 via-white to-amber-50/50 border-amber-100/70 text-zinc-900'
      }`}>
        {/* Ambient Footer Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[140px] pointer-events-none ${
            theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-400/15'
          }`} />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-6 relative z-10 text-center">
          
          {/* 1. Compact FSSAI & Hygiene Bar */}
          <div className={`w-full rounded-2xl p-3.5 px-4.5 border transition-all duration-300 flex flex-wrap items-center justify-between gap-3 ${
            theme === 'dark' 
              ? 'bg-zinc-900/90 border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:border-zinc-700' 
              : 'bg-white/95 border-zinc-200/70 shadow-[0_6px_20px_rgba(0,0,0,0.04)] hover:border-amber-200 hover:shadow-md'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm shrink-0 shadow-xs ${
                theme === 'dark' 
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                  : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}>
                🛡️
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className={`text-[11px] font-black uppercase tracking-wider ${
                    theme === 'dark' ? 'text-white' : 'text-zinc-900'
                  }`}>FSSAI Certified Kitchen</span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase border ${
                    theme === 'dark' 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>Verified</span>
                </div>
                <p className={`text-[10px] font-medium mt-0.5 ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                }`}>Lic. No. 10021022000451 • Quality & Hygiene Assured</p>
              </div>
            </div>

            <button 
              onClick={handleCallWaiter}
              disabled={isSaving}
              className={`px-4 py-2 text-[11px] font-black rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 hover:scale-105 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-white shadow-zinc-900/20'
              }`}
            >
              <BellRing className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-slate-950' : 'text-amber-400 animate-pulse'}`} />
              <span>Call Waiter</span>
            </button>
          </div>

          {/* 2. Restaurant Brand & Table Pill */}
          <div className="flex flex-col items-center gap-2">
            <Logo showText={true} iconSize={26} />
            <p className={`text-[11px] max-w-md leading-snug ${
              theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              Freshly prepared with authentic ingredients for a memorable dining experience.
            </p>
            {tableNumber && tableNumber !== 'N/A' && (
              <div className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold border shadow-xs ${
                theme === 'dark' 
                  ? 'bg-zinc-900/90 border-zinc-700 text-amber-300' 
                  : 'bg-white text-zinc-700 border-zinc-200'
              }`}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Serving Table #{tableNumber} • Dine-In Mode</span>
              </div>
            )}
          </div>

          {/* 3. Compact Operational Info Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold">
            <span className={`px-3 py-1 rounded-xl border shadow-xs transition-colors ${
              theme === 'dark' 
                ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700' 
                : 'bg-white/90 border-zinc-200/70 text-zinc-600 hover:border-zinc-300'
            }`}>
              🕒 11:00 AM - 11:30 PM
            </span>
            <span className={`px-3 py-1 rounded-xl border shadow-xs transition-colors ${
              theme === 'dark' 
                ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700' 
                : 'bg-white/90 border-zinc-200/70 text-zinc-600 hover:border-zinc-300'
            }`}>
              ⚡ Instant Dine-In POS
            </span>
            <span className={`px-3 py-1 rounded-xl border shadow-xs flex items-center gap-1.5 transition-colors ${
              theme === 'dark' 
                ? 'bg-zinc-900/90 border-zinc-800 text-emerald-400 hover:border-zinc-700' 
                : 'bg-white/90 border-zinc-200/70 text-emerald-600 hover:border-zinc-300'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Staff Active
            </span>
          </div>

          <Separator className={theme === 'dark' ? 'bg-zinc-800/80 max-w-md' : 'bg-zinc-200/70 max-w-md'} />

          {/* 4. Bottom Copyright & Powered By */}
          <div className="space-y-1.5">
            <p className={`text-[10px] font-medium ${
              theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              &copy; {new Date().getFullYear()} {restaurantData.name || 'Servora'}. All rights reserved.
            </p>
            <div className={`flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-widest ${
              theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              <span>Powered by</span>
              <span className={`font-black ${theme === 'dark' ? 'text-amber-400' : 'text-indigo-600'}`}>Servora Cloud POS</span>
              <span>•</span>
              <span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>Contactless QR</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 📱 MOBILE FLOATING DOCK NAVBAR */}
      <MenuBottomNavbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        cartCount={cart.reduce((total, item) => total + (item.quantity || 1), 0)}
        hasActiveOrder={Boolean(currentOrder || activeOrderId)}
        onCartClick={() => setShowConfirmModal(true)}
        onSearchClick={() => {
          window.scrollTo({ top: 380, behavior: 'smooth' })
          setTimeout(() => searchInputRef.current?.focus(), 300)
        }}
        onTrackClick={handleTrackOrders}
        onCallWaiter={handleCallWaiter}
        theme={theme}
      />



      {/* Waiter Call Popup */}
      <AnimatePresence>
        {showWaiterPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
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
                className="w-full h-14 rounded-4xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl hover:shadow-2xl relative z-10"
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