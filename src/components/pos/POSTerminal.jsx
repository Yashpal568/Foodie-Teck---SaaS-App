import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Utensils, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Receipt, 
  ChefHat, 
  PauseCircle, 
  DollarSign, 
  Percent, 
  X, 
  Check, 
  Layers, 
  Users, 
  Clock, 
  RefreshCw, 
  Coffee, 
  Tag,
  CreditCard,
  Printer,
  ShoppingBag,
  ArrowRight,
  Edit2,
  Leaf,
  FileText,
  BadgePercent,
  PanelRightClose,
  PanelRightOpen,
  LayoutGrid,
  List,
  Sparkles,
  Flame,
  Star,
  Package,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { fetchMenuItems } from '@/lib/api'
import { useOrderManagement, ORDER_STATUS } from '@/hooks/useOrderManagement'
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile'
import { calculateServerBill } from '@/services/billing.service'
import SplitPaymentModal from './SplitPaymentModal'
import POSBillPreviewModal from './POSBillPreviewModal'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

// Curated food photography fallback map for popular dishes
const FOOD_IMAGES = {
  'paneer': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80',
  'butter chicken': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=80',
  'mutton': 'https://images.unsplash.com/photo-1545247181-516773cae754?w=500&auto=format&fit=crop&q=80',
  'chicken': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80',
  'biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80',
  'rice': 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=500&auto=format&fit=crop&q=80',
  'naan': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
  'paratha': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80',
  'potato': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80',
  'dal': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80',
  'chaap': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80',
  'dessert': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80',
  'brownie': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80',
  'drink': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
  'mojito': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=500&auto=format&fit=crop&q=80',
  'lassi': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500&auto=format&fit=crop&q=80',
  'momo': 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=500&auto=format&fit=crop&q=80',
  'starter': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
  'default': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80'
}

const getDishImage = (name, category, customImg) => {
  if (customImg && customImg.startsWith('http')) return customImg
  const str = `${name || ''} ${category || ''}`.toLowerCase()
  for (const [key, url] of Object.entries(FOOD_IMAGES)) {
    if (str.includes(key)) return url
  }
  return FOOD_IMAGES.default
}

// Category Emoji Map
const getCategoryEmoji = (category) => {
  const c = (category || '').toLowerCase()
  if (c === 'all') return '✨'
  if (c.includes('starter') || c.includes('snack') || c.includes('appetizer')) return '🥟'
  if (c.includes('main') || c.includes('curry') || c.includes('gravy')) return '🍛'
  if (c.includes('bread') || c.includes('roti') || c.includes('naan')) return '🫓'
  if (c.includes('rice') || c.includes('biryani') || c.includes('pulao')) return '🍚'
  if (c.includes('dessert') || c.includes('sweet') || c.includes('ice cream')) return '🍰'
  if (c.includes('drink') || c.includes('beverage') || c.includes('shake') || c.includes('juice')) return '🥤'
  if (c.includes('pizza') || c.includes('burger') || c.includes('fast food')) return '🍕'
  if (c.includes('soup') || c.includes('salad')) return '🥗'
  if (c.includes('chinese') || c.includes('noodle') || c.includes('momo')) return '🥢'
  return '🍽️'
}

// Robust Veg / Non-Veg helper
const isItemVeg = (item) => {
  if (!item) return true
  const type = (item.type || '').toUpperCase()
  if (type === 'NON_VEG' || type === 'NON-VEG' || type === 'NONVEG' || type === 'NON VEG') return false
  if (item.is_veg === false || item.isVeg === false) return false
  const name = (item.name || '').toLowerCase()
  if (
    name.includes('chicken') || 
    name.includes('mutton') || 
    name.includes('fish') || 
    name.includes('prawn') || 
    name.includes('egg') || 
    name.includes('meat') || 
    name.includes('lamb') || 
    name.includes('rogan josh')
  ) {
    return false
  }
  return true
}

export default function POSTerminal({ restaurantId }) {
  const { profile } = useRestaurantProfile(restaurantId)
  const { createOrder, refreshOrders } = useOrderManagement(restaurantId)

  // Catalog items from restaurant menu
  const [menuItems, setMenuItems] = useState([])
  const [loadingMenu, setLoadingMenu] = useState(true)

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [dishSearch, setDishSearch] = useState('')
  const [orderType, setOrderType] = useState('DINE_IN') // 'DINE_IN' | 'TAKEAWAY'
  const [vegOnly, setVegOnly] = useState(false)
  const [menuViewMode, setMenuViewMode] = useState('visual') // 'visual' | 'compact'

  // Active POS Session (Table & Guest) - Completely Dynamic
  const [selectedTable, setSelectedTable] = useState('1')
  const [guestName, setGuestName] = useState('')
  const [takeawayToken, setTakeawayToken] = useState('T-101')

  // Open / Close Panel State & Register Open/Close State
  const [isPanelOpen, setIsPanelOpen] = useState(false) // default closed on mobile, open on desktop
  const [isRegisterOpen, setIsRegisterOpen] = useState(true)

  // Auto-open panel on desktop initially
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
      setIsPanelOpen(true)
    }
  }, [])

  // Cart State - 100% Dynamic (Empty by default)
  const [cart, setCart] = useState([])

  // Active note editing row
  const [activeNoteCartId, setActiveNoteCartId] = useState(null)

  // Discount State
  const [discount, setDiscount] = useState({ type: 'FLAT', value: 0, reason: '' })
  const [showDiscountModal, setShowDiscountModal] = useState(false)

  // Server-Calculated Bill State
  const [calculation, setCalculation] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showBillPreviewModal, setShowBillPreviewModal] = useState(false)

  // Held Tables Store
  const [heldOrders, setHeldOrders] = useState({})

  // Load Menu Items
  useEffect(() => {
    async function loadMenu() {
      try {
        setLoadingMenu(true)
        const items = await fetchMenuItems(restaurantId)
        if (Array.isArray(items) && items.length > 0) {
          setMenuItems(items)
        } else {
          setMenuItems([
            { id: 'm1', name: 'Crispy Kurkure Paneer Fingers', category: 'Starters', price: 240, halfPrice: 150, type: 'VEG', description: 'Crunchy battered cottage cheese coated in roasted flakes', isBestseller: true },
            { id: 'm2', name: 'Crispy Honey Chilli Potatoes', category: 'Starters', price: 210, halfPrice: null, type: 'VEG', description: 'Fried potato fingers tossed in sweet sesame chilli glaze' },
            { id: 'm3', name: 'Dahi Ke Sholay', category: 'Starters', price: 230, halfPrice: null, type: 'VEG', description: 'Hung curd & bell peppers stuffed in golden crisp bread rolls', isBestseller: true },
            { id: 'm4', name: 'Dal Makhani Bukhara', category: 'Main Course', price: 280, halfPrice: 170, type: 'VEG', description: 'Slow-cooked black lentils simmered overnight with butter & cream', isBestseller: true },
            { id: 'm5', name: 'Kadhai Soya Chaap Masala', category: 'Main Course', price: 270, halfPrice: null, type: 'VEG', description: 'Tender soya chaap cooked in spicy onion tomato kadhai gravy' },
            { id: 'm6', name: 'Kashmiri Mutton Rogan Josh', category: 'Main Course', price: 440, halfPrice: 260, type: 'NON_VEG', description: 'Slow-braised mutton shank with Kashmiri red chillies & saffron', isBestseller: true },
            { id: 'm7', name: 'Truffle Butter Garlic Naan', category: 'Bread', price: 95, halfPrice: null, type: 'VEG', description: 'Clay-oven baked flatbread brushed with garlic and truffle butter' },
            { id: 'm8', name: 'Amritsari Aloo Chur-Chur Naan', category: 'Bread', price: 120, halfPrice: null, type: 'VEG', description: 'Flaky layered naan stuffed with spiced potato and crushed with desi ghee' },
            { id: 'm9', name: 'Butter Laccha Paratha', category: 'Bread', price: 80, halfPrice: null, type: 'VEG', description: 'Crisp multi-layered tandoori paratha with butter glaze' },
            { id: 'm10', name: 'Hyderabadi Dum Chicken Biryani', category: 'Biryani & Rice', price: 360, halfPrice: 210, type: 'NON_VEG', description: 'Fragrant basmati rice layered with spiced chicken and sealed with dough', isBestseller: true },
            { id: 'm11', name: 'Subz Shahi Veg Biryani', category: 'Biryani & Rice', price: 290, halfPrice: 180, type: 'VEG', description: 'Seasonal vegetables & aromatic basmati rice cooked with saffron essence' },
            { id: 'm12', name: 'Jeera Rice with Desi Ghee', category: 'Biryani & Rice', price: 160, halfPrice: null, type: 'VEG', description: 'Steamed basmati rice tempered with roasted cumin seeds & ghee' },
            { id: 'm13', name: 'Gulab Jamun with Rabri', category: 'Desserts', price: 140, halfPrice: null, type: 'VEG', description: 'Hot khoya dumplings served with rich condensed saffron rabri', isBestseller: true },
            { id: 'm14', name: 'Sizzling Chocolate Brownie', category: 'Desserts', price: 190, halfPrice: null, type: 'VEG', description: 'Gooey walnut brownie on a hot plate topped with vanilla ice cream' },
            { id: 'm15', name: 'Royal Kesar Mango Lassi', category: 'Beverages', price: 120, halfPrice: null, type: 'VEG', description: 'Thick yogurt blend with Alphonso mango pulp and saffron strands' },
            { id: 'm16', name: 'Fresh Mint Virgin Mojito', category: 'Beverages', price: 140, halfPrice: null, type: 'VEG', description: 'Crushed garden mint, fresh lime juice and sparkling soda' }
          ])
        }
      } catch (e) {
        console.error('Menu load error:', e)
      } finally {
        setLoadingMenu(false)
      }
    }
    loadMenu()
  }, [restaurantId])

  // Recalculate bill
  const runServerCalculation = useCallback(async () => {
    if (cart.length === 0) {
      setCalculation(null)
      return
    }

    try {
      setIsCalculating(true)
      const result = await calculateServerBill({
        items: cart,
        discount: discount.value > 0 ? discount : null,
        restaurantId
      })
      setCalculation(result)
    } catch (err) {
      console.error('Calculation error:', err)
    } finally {
      setIsCalculating(false)
    }
  }, [cart, discount, restaurantId])

  useEffect(() => {
    runServerCalculation()
  }, [runServerCalculation])

  // Extract Categories
  const categories = useMemo(() => {
    const set = new Set(['ALL'])
    menuItems.forEach(i => {
      if (i.category) set.add(i.category)
    })
    return Array.from(set)
  }, [menuItems])

  // Filtered Dishes with Robust Veg/Non-Veg Check
  const filteredDishes = useMemo(() => {
    return menuItems.filter(item => {
      if (vegOnly && !isItemVeg(item)) return false
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false
      if (dishSearch.trim()) {
        const q = dishSearch.toLowerCase()
        const nameMatch = (item.name || '').toLowerCase().includes(q)
        const catMatch = (item.category || '').toLowerCase().includes(q)
        const descMatch = (item.description || '').toLowerCase().includes(q)
        if (!nameMatch && !catMatch && !descMatch) return false
      }
      return true
    })
  }, [menuItems, selectedCategory, dishSearch, vegOnly])

  // Add Item to Cart
  const addItemToCart = (item, variant = 'full') => {
    if (!isRegisterOpen) {
      toast.error('Register is currently closed. Please open the register to take orders.')
      return
    }

    const price = variant === 'half' && item.halfPrice ? Number(item.halfPrice) : Number(item.price)
    const cartId = `${item.id || item._id}-${variant}`
    const displayName = variant === 'half' ? `${item.name} (Half)` : item.name

    setCart(prev => {
      const existing = prev.find(i => i.cartId === cartId)
      if (existing) {
        return prev.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [
        ...prev,
        {
          id: item.id || item._id,
          cartId,
          name: displayName,
          price,
          halfPrice: item.halfPrice,
          variant,
          quantity: 1,
          category: item.category || 'Main Course',
          type: isItemVeg(item) ? 'VEG' : 'NON_VEG',
          notes: ''
        }
      ]
    })
  }

  // Update Quantity
  const updateQuantity = (cartId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.cartId === cartId) {
          const newQty = item.quantity + delta
          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      }).filter(Boolean)
    })
  }

  // Remove Item
  const removeItem = (cartId) => {
    setCart(prev => prev.filter(i => i.cartId !== cartId))
  }

  // Update Notes
  const updateItemNotes = (cartId, notes) => {
    setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, notes } : i))
  }

  // Clear Cart
  const clearCart = () => {
    setCart([])
    setDiscount({ type: 'FLAT', value: 0, reason: '' })
    toast.info('Check cleared')
  }

  // Toggle Dine-In vs Takeaway with active toast
  const handleOrderTypeSwitch = (type) => {
    setOrderType(type)
    if (type === 'TAKEAWAY') {
      toast.success('🥡 Switched to Takeaway / Parcel Order Mode')
    } else {
      toast.success('🍽️ Switched to Dine-In Table Mode')
    }
  }

  // Toggle Veg Only Filter
  const handleVegOnlyToggle = () => {
    const nextVal = !vegOnly
    setVegOnly(nextVal)
    if (nextVal) {
      toast.success('🌱 Showing 100% Vegetarian Dishes Only')
    } else {
      toast.info('🍽️ Showing All Menu Dishes')
    }
  }

  // Toggle POS Register Open / Closed
  const handleRegisterToggle = () => {
    const nextVal = !isRegisterOpen
    setIsRegisterOpen(nextVal)
    if (nextVal) {
      toast.success('🟢 POS Register is OPEN. Ready for live orders.')
    } else {
      toast.warning('🔴 POS Register is CLOSED.')
    }
  }

  // Hold Order
  const handleHoldOrder = () => {
    if (cart.length === 0) {
      toast.error('Cannot hold empty check')
      return
    }
    const key = orderType === 'TAKEAWAY' ? takeawayToken : selectedTable
    setHeldOrders(prev => ({
      ...prev,
      [key]: {
        table: selectedTable,
        orderType,
        token: takeawayToken,
        guestName,
        cart,
        discount,
        heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    }))
    toast.success(`Order for ${orderType === 'TAKEAWAY' ? takeawayToken : `Table ${selectedTable}`} held`)
    clearCart()
  }

  // Restore Held Order
  const restoreHeldOrder = (key) => {
    const held = heldOrders[key]
    if (!held) return
    if (held.orderType) setOrderType(held.orderType)
    if (held.table) setSelectedTable(held.table)
    if (held.token) setTakeawayToken(held.token)
    setGuestName(held.guestName)
    setCart(held.cart)
    setDiscount(held.discount)
    setHeldOrders(prev => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
    toast.info(`Restored check for ${key}`)
  }

  // Fire KOT
  const handleFireKOT = async () => {
    if (!isRegisterOpen) {
      toast.error('Register is closed. Please open the register first.')
      return
    }
    if (cart.length === 0) {
      toast.error('Please add items before sending to kitchen')
      return
    }

    try {
      const total = calculation?.pricing?.grandTotal || cart.reduce((s, i) => s + (i.price * i.quantity), 0)
      await createOrder({
        table_number: orderType === 'TAKEAWAY' ? 99 : (parseInt(selectedTable) || 1),
        customer_name: orderType === 'TAKEAWAY' ? `${takeawayToken} • ${guestName}` : (guestName || `Table ${selectedTable} Guest`),
        items: cart.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          variant: i.variant,
          notes: i.notes || ''
        })),
        total,
        status: ORDER_STATUS.PREPARING,
        order_type: orderType
      })

      toast.success(`👨‍🍳 KOT sent to kitchen for ${orderType === 'TAKEAWAY' ? takeawayToken : `Table ${selectedTable}`}!`)
      refreshOrders()
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsPanelOpen(false)
      }
    } catch (e) {
      toast.error('Failed to send KOT')
    }
  }

  // Settlement Success
  const handleSettlementSuccess = () => {
    clearCart()
    setShowPaymentModal(false)
    refreshOrders()
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsPanelOpen(false)
    }
  }

  const grandTotalValue = calculation?.pricing?.grandTotal || cart.reduce((s, i) => s + (i.price * i.quantity), 0)
  const totalItemCount = cart.reduce((s, i) => s + i.quantity, 0)

  // Common Order Drawer Contents for both Desktop Sidebar & Mobile Sheet
  const renderOrderDrawerContent = () => (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Header */}
      <div className="p-3.5 px-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">
              {orderType === 'TAKEAWAY' ? takeawayToken : `Table ${selectedTable}`} Order
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {guestName} • {orderType === 'DINE_IN' ? 'Dine-In' : 'Takeaway'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer rounded-lg font-semibold"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPanelOpen(false)}
            className="w-7 h-7 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white divide-y divide-slate-100">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
            <ShoppingBag className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-xs font-bold text-slate-700">No items in check</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Select dishes from food menu</p>
          </div>
        ) : (
          cart.map((item) => (
            <div 
              key={item.cartId}
              className="p-3 px-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                
                {/* Item Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'NON_VEG' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                    <h5 className="font-semibold text-xs text-slate-800 truncate leading-snug">
                      {item.name}
                    </h5>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 pl-3.5">
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">
                      ₹{item.price} each
                    </span>

                    <button
                      type="button"
                      onClick={() => setActiveNoteCartId(activeNoteCartId === item.cartId ? null : item.cartId)}
                      className="text-[10.5px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      <FileText className="w-2.5 h-2.5" />
                      <span>{item.notes ? 'Edit note' : '+ Note'}</span>
                    </button>
                  </div>

                  {/* Display Note */}
                  {item.notes && activeNoteCartId !== item.cartId && (
                    <p className="text-[10px] text-amber-800 bg-amber-50 rounded-md px-2 py-0.5 mt-1 ml-3.5 font-normal">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Stepper & Line Total */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/60">
                    <button
                      onClick={() => updateQuantity(item.cartId, -1)}
                      className="w-5.5 h-5.5 rounded-md hover:bg-white flex items-center justify-center text-slate-600 font-medium active:scale-95 cursor-pointer transition-colors"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-5.5 text-center font-bold text-xs text-slate-800 font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartId, 1)}
                      className="w-5.5 h-5.5 rounded-md hover:bg-white flex items-center justify-center text-slate-600 font-medium active:scale-95 cursor-pointer transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <span className="w-14 text-right font-bold text-xs text-slate-800 font-mono">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>

                  <button
                    onClick={() => removeItem(item.cartId)}
                    className="text-slate-300 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

              {/* Expandable Note Input */}
              {activeNoteCartId === item.cartId && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 pl-3.5">
                  <Input
                    placeholder="Kitchen note..."
                    value={item.notes || ''}
                    onChange={(e) => updateItemNotes(item.cartId, e.target.value)}
                    className="h-6.5 text-[11px] bg-slate-50 rounded-lg border-slate-200 px-2"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => setActiveNoteCartId(null)}
                    className="h-6.5 px-2.5 text-[10.5px] font-semibold bg-slate-900 text-white rounded-lg cursor-pointer"
                  >
                    Done
                  </Button>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {/* Financial Summary & Actions */}
      <div className="border-t border-slate-200 bg-slate-50/80 p-3.5 sm:p-4 space-y-3 shrink-0">
        
        {/* Financial Rows */}
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-800 font-mono">
              ₹{calculation?.pricing?.subtotal?.toFixed(2) || cart.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)}
            </span>
          </div>

          {/* Discount */}
          <div className="flex justify-between items-center text-emerald-600">
            <button 
              onClick={() => setShowDiscountModal(!showDiscountModal)}
              className="hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <Tag className="w-3 h-3" />
              <span>{discount.value > 0 ? `Discount` : '+ Add Discount'}</span>
            </button>
            <span className="font-mono font-semibold">{discount.value > 0 ? `-₹${calculation?.pricing?.discount?.amount?.toFixed(2) || discount.value}` : '₹0.00'}</span>
          </div>

          {/* Discount Box */}
          {showDiscountModal && (
            <div className="p-2 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <Select value={discount.type} onValueChange={(val) => setDiscount(d => ({ ...d, type: val }))}>
                  <SelectTrigger className="h-7 text-xs font-medium w-20 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="FLAT">Flat ₹</SelectItem>
                    <SelectItem value="PERCENT">Percent %</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  value={discount.value || ''}
                  onChange={(e) => setDiscount(d => ({ ...d, value: Number(e.target.value) || 0 }))}
                  placeholder="Amt"
                  className="h-7 text-xs font-medium w-20 rounded-lg"
                />

                <Button size="sm" onClick={() => setShowDiscountModal(false)} className="h-7 text-[11px] font-semibold bg-slate-900 text-white px-2.5 rounded-lg cursor-pointer">
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* Taxes */}
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Taxes & GST (5%)</span>
            <span className="font-mono text-slate-700">
              ₹{calculation?.pricing?.taxes?.totalTax?.toFixed(2) || (cart.reduce((s, i) => s + (i.price * i.quantity), 0) * 0.05).toFixed(2)}
            </span>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        {/* Total */}
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-bold text-slate-700">Total Amount</span>
          <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
            ₹{Number(grandTotalValue).toFixed(2)}
          </span>
        </div>

        {/* Main Action: Send to Kitchen */}
        <Button
          type="button"
          onClick={handleFireKOT}
          disabled={cart.length === 0}
          className="w-full h-10 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs tracking-wide shadow-xs cursor-pointer active:scale-98 transition-all"
        >
          <ChefHat className="w-4 h-4 mr-1.5" />
          Send Order to Kitchen (KOT)
        </Button>

        {/* Secondary Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleHoldOrder}
            disabled={cart.length === 0}
            className="h-8.5 rounded-xl border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer active:scale-95"
          >
            <PauseCircle className="w-3.5 h-3.5 mr-1 text-slate-500" /> Hold
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowBillPreviewModal(true)}
            disabled={cart.length === 0}
            className="h-8.5 rounded-xl border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" /> Print
          </Button>

          <Button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="h-8.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer active:scale-95 shadow-xs"
          >
            <Receipt className="w-3.5 h-3.5 mr-1" /> Settle
          </Button>
        </div>

      </div>
    </div>
  )

  return (
    <div className="h-[calc(100vh-68px)] max-h-[calc(100vh-68px)] flex flex-col bg-[#f8fafc] text-slate-900 overflow-hidden font-['Roboto',sans-serif] select-none">
      
      {/* ── 1. Top Enterprise POS Command Bar (Ultra-Responsive) ── */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-3 sm:px-5 py-2 sm:py-0 min-h-14 flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 z-20 shadow-2xs">
        
        {/* Left Row: Register Status + Dine-In / Takeaway + Table */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          
          {/* Register Status Toggle Button */}
          <button
            type="button"
            onClick={handleRegisterToggle}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
              isRegisterOpen 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100' 
                : 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
            }`}
            title="Click to toggle POS register open/close status"
          >
            <span className={`w-2 h-2 rounded-full ${isRegisterOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="hidden sm:inline">{isRegisterOpen ? 'Register Open' : 'Register Closed'}</span>
            <span className="sm:hidden">{isRegisterOpen ? 'Open' : 'Closed'}</span>
          </button>

          {/* Dine-In / Takeaway Switcher */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleOrderTypeSwitch('DINE_IN')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                orderType === 'DINE_IN' 
                  ? 'bg-white text-slate-900 shadow-2xs font-black' 
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <Utensils className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Dine-In</span>
            </button>

            <button
              type="button"
              onClick={() => handleOrderTypeSwitch('TAKEAWAY')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                orderType === 'TAKEAWAY' 
                  ? 'bg-white text-slate-900 shadow-2xs font-black' 
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Takeaway</span>
            </button>
          </div>

          {/* Table Selector / Takeaway Token Input */}
          {orderType === 'DINE_IN' ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Select 
                value={selectedTable} 
                onValueChange={(val) => {
                  setSelectedTable(val)
                  setGuestName(`Guest`)
                  if (heldOrders[val]) restoreHeldOrder(val)
                }}
              >
                <SelectTrigger className="h-8 sm:h-8.5 w-24 sm:w-28 rounded-xl text-xs font-bold text-slate-800 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl font-medium max-h-64 shadow-xl border-slate-200">
                  {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={String(num)} className="text-xs font-medium py-1.5 cursor-pointer">
                      Table {num} {heldOrders[String(num)] ? '⏸️ (Held)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest name..."
                className="h-8 sm:h-8.5 w-28 sm:w-36 rounded-xl text-xs bg-slate-50 border-slate-200 font-normal placeholder:text-slate-400 focus:bg-white"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Input
                value={takeawayToken}
                onChange={(e) => setTakeawayToken(e.target.value)}
                placeholder="Token..."
                className="h-8 sm:h-8.5 w-20 sm:w-24 rounded-xl text-xs bg-slate-50 border-slate-200 font-bold placeholder:text-slate-400 focus:bg-white text-center"
              />

              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Customer Name..."
                className="h-8 sm:h-8.5 w-28 sm:w-36 rounded-xl text-xs bg-slate-50 border-slate-200 font-normal placeholder:text-slate-400 focus:bg-white"
              />
            </div>
          )}

        </div>

        {/* Center: Held Orders Pills (Hidden on small mobile) */}
        {Object.keys(heldOrders).length > 0 && (
          <div className="hidden xl:flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Held:</span>
            {Object.keys(heldOrders).map(t => (
              <button
                key={t}
                onClick={() => restoreHeldOrder(t)}
                className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 font-bold text-xs hover:bg-amber-100 transition-colors border border-amber-200 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <span>{t}</span>
                <span className="text-[10px] text-amber-700 font-normal">({heldOrders[t].heldAt})</span>
              </button>
            ))}
          </div>
        )}

        {/* Right Row: View Mode + Veg Filter + Search + Check Trigger */}
        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
          
          {/* Menu View Mode Switcher */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMenuViewMode('visual')
                toast.info('🖼️ Visual Menu Mode')
              }}
              className={`p-1 sm:p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                menuViewMode === 'visual' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Visual Food Menu"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuViewMode('compact')
                toast.info('🍱 Compact Grid Mode')
              }}
              className={`p-1 sm:p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                menuViewMode === 'compact' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Compact Grid Mode"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Veg Only Toggle Pill */}
          <div
            onClick={handleVegOnlyToggle}
            role="button"
            tabIndex={0}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 select-none ${
              vegOnly 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
            title="Click to toggle Veg Only filter"
          >
            <span className={`w-2 h-2 rounded-full ${vegOnly ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            <span className="text-xs font-bold whitespace-nowrap">Veg</span>
            <Switch 
              checked={vegOnly} 
              onCheckedChange={setVegOnly} 
              className="data-[state=checked]:bg-emerald-600 scale-75 pointer-events-none hidden sm:inline-flex" 
            />
          </div>

          {/* Search Input */}
          <div className="relative w-32 sm:w-44 md:w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={dishSearch}
              onChange={(e) => setDishSearch(e.target.value)}
              placeholder="Search..."
              className="pl-7.5 pr-6 h-8 sm:h-8.5 bg-slate-50 border-slate-200 rounded-xl text-xs focus:bg-white"
            />
            {dishSearch && (
              <button 
                onClick={() => setDishSearch('')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Open / Close Order Panel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
            title={isPanelOpen ? 'Hide Check' : 'Open Check'}
          >
            {isPanelOpen ? (
              <>
                <PanelRightClose className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">Hide Check</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold text-indigo-600">Check ({totalItemCount})</span>
              </>
            )}
          </Button>

        </div>

      </header>

      {/* ── 2. Main Workspace: Responsive Food Menu (Left) + Drawer (Right) ── */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* ── LEFT: Category Tabs & Food Catalog ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/40">
          
          {/* Categories Tab Bar */}
          <div className="p-2.5 sm:p-3 px-3 sm:px-5 bg-white border-b border-slate-200 shrink-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shadow-2xs">
            {loadingMenu ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 sm:w-24 rounded-xl shrink-0" />
              ))
            ) : (
              categories.map(cat => {
                const isSelected = selectedCategory === cat
                const icon = getCategoryEmoji(cat)
                const count = cat === 'ALL' 
                  ? (vegOnly ? menuItems.filter(m => isItemVeg(m)).length : menuItems.length) 
                  : (vegOnly 
                      ? menuItems.filter(m => m.category === cat && isItemVeg(m)).length 
                      : menuItems.filter(m => m.category === cat).length)

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                      isSelected 
                        ? 'bg-slate-900 text-white font-bold shadow-xs scale-[1.02]' 
                        : 'bg-slate-100 hover:bg-slate-200/90 text-slate-700'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{cat === 'ALL' ? 'All Dishes' : cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {/* Dishes Catalog Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5">
            {loadingMenu ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <Card key={idx} className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between space-y-2">
                    <Skeleton className="h-32 w-full" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredDishes.length === 0 ? (
              <div className="py-24 text-center text-slate-400">
                <Utensils className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-bold text-slate-700">No dishes match your filter</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {vegOnly ? 'Try turning off Veg Only filter' : 'Try choosing another category or clearing search'}
                </p>
              </div>
            ) : menuViewMode === 'visual' ? (

              /* ── 🍽️ Visual Menu Mode (Ultra-Responsive) ── */
              <div className={`grid gap-3 sm:gap-4 transition-all ${
                isPanelOpen 
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5' 
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7'
              }`}>
                {filteredDishes.map((dish) => {
                  const inCartFull = cart.find(c => c.cartId === `${dish.id || dish._id}-full`)
                  const inCartHalf = cart.find(c => c.cartId === `${dish.id || dish._id}-half`)
                  const totalInCart = (inCartFull?.quantity || 0) + (inCartHalf?.quantity || 0)
                  const isAdded = totalInCart > 0
                  const isVeg = isItemVeg(dish)
                  const imgUrl = getDishImage(dish.name, dish.category, dish.image)

                  return (
                    <Card 
                      key={dish.id || dish._id}
                      className={`group rounded-2xl border bg-white overflow-hidden flex flex-col justify-between select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                        isAdded 
                          ? 'border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs' 
                          : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      {/* Food Photography Banner */}
                      <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-slate-100">
                        <img 
                          src={imgUrl} 
                          alt={dish.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

                        {/* Top Overlays: Veg/NonVeg Dot + Bestseller */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          {/* FSSAI Official Symbol */}
                          <div className={`w-4 h-4 rounded-xs border bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-xs ${
                            !isVeg ? 'border-rose-600' : 'border-emerald-600'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              !isVeg ? 'bg-rose-600' : 'bg-emerald-600'
                            }`}></div>
                          </div>

                          {dish.isBestseller && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[9.5px] uppercase tracking-wider shadow-xs flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-current" /> Bestseller
                            </span>
                          )}
                        </div>

                        {/* In-Cart Counter Pill on Image */}
                        {isAdded && (
                          <div className="absolute top-2.5 right-2.5">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] shadow-sm animate-in fade-in zoom-in-95">
                              {totalInCart} in cart
                            </span>
                          </div>
                        )}

                        {/* Price Tag Overlay at Bottom of Image */}
                        <div className="absolute bottom-2 left-3 right-3 flex items-baseline justify-between text-white">
                          <span className="text-base font-black font-mono tracking-tight drop-shadow-md">
                            ₹{dish.price}
                          </span>
                          {dish.halfPrice && (
                            <span className="text-[11px] font-medium text-slate-200 font-mono drop-shadow-md">
                              Half ₹{dish.halfPrice}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            {dish.category || 'Specialty'}
                          </div>
                          
                          <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-1 group-hover:text-indigo-950 transition-colors">
                            {dish.name}
                          </h4>

                          {dish.description && (
                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mt-1 font-normal">
                              {dish.description}
                            </p>
                          )}
                        </div>

                        {/* Interactive Restaurant Style Stepper / Add */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          {dish.halfPrice ? (
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => addItemToCart(dish, 'half')}
                                className="h-7.5 rounded-xl text-[11px] font-semibold border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 cursor-pointer shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1"
                              >
                                <span>+ Half</span>
                                {inCartHalf && <span className="font-bold text-amber-700">({inCartHalf.quantity})</span>}
                              </button>

                              <button
                                type="button"
                                onClick={() => addItemToCart(dish, 'full')}
                                className="h-7.5 rounded-xl text-[11px] font-semibold bg-slate-900 hover:bg-black text-white cursor-pointer shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1"
                              >
                                <span>+ Full</span>
                                {inCartFull && <span className="font-bold text-indigo-300">({inCartFull.quantity})</span>}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addItemToCart(dish, 'full')}
                              className="w-full h-7.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white cursor-pointer shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Check</span>
                              {inCartFull && <span className="font-bold text-indigo-300">({inCartFull.quantity})</span>}
                            </button>
                          )}
                        </div>

                      </div>

                    </Card>
                  )
                })}
              </div>

            ) : (

              /* ── 📋 Compact Grid Mode (Ultra-Responsive) ── */
              <div className={`grid gap-2.5 sm:gap-3 transition-all ${
                isPanelOpen 
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5' 
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7'
              }`}>
                {filteredDishes.map((dish) => {
                  const inCartFull = cart.find(c => c.cartId === `${dish.id || dish._id}-full`)
                  const inCartHalf = cart.find(c => c.cartId === `${dish.id || dish._id}-half`)
                  const totalInCart = (inCartFull?.quantity || 0) + (inCartHalf?.quantity || 0)
                  const isAdded = totalInCart > 0
                  const isVeg = isItemVeg(dish)

                  return (
                    <div 
                      key={dish.id || dish._id}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between select-none bg-white ${
                        isAdded 
                          ? 'border-indigo-400 bg-indigo-50/20 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Veg Dot + Category */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              !isVeg ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}></span>
                            <span className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wider truncate">
                              {dish.category || 'Dish'}
                            </span>
                          </div>

                          {isAdded && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                              {totalInCart} in order
                            </span>
                          )}
                        </div>

                        {/* Dish Title */}
                        <h4 className="font-semibold text-xs text-slate-800 leading-snug line-clamp-2 min-h-[32px]">
                          {dish.name}
                        </h4>

                        {/* Price */}
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-sm font-bold text-slate-900 font-mono">
                            ₹{dish.price}
                          </span>
                          {dish.halfPrice && (
                            <span className="text-[10.5px] text-slate-400 font-mono">
                              / Half ₹{dish.halfPrice}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Add Buttons */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100">
                        {dish.halfPrice ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addItemToCart(dish, 'half')}
                              className="h-7 rounded-lg text-[10.5px] font-medium border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <span>Half</span>
                              {inCartHalf && <span className="font-bold ml-0.5">({inCartHalf.quantity})</span>}
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addItemToCart(dish, 'full')}
                              className="h-7 rounded-lg text-[10.5px] font-medium bg-slate-900 hover:bg-black text-white cursor-pointer"
                            >
                              <span>Full</span>
                              {inCartFull && <span className="font-bold ml-0.5 text-indigo-300">({inCartFull.quantity})</span>}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addItemToCart(dish, 'full')}
                            className="w-full h-7 rounded-lg text-xs font-medium bg-slate-900 hover:bg-black text-white cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                            {inCartFull && <span className="font-bold ml-0.5 text-indigo-300">({inCartFull.quantity})</span>}
                          </Button>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* ── DESKTOP ONLY: Inline Collapsible Right Order Panel (>= 1024px) ── */}
        <div className="hidden lg:flex">
          <AnimatePresence>
            {isPanelOpen && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 370, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-[340px] xl:w-[370px] bg-white border-l border-slate-200 flex flex-col h-full shrink-0 shadow-sm overflow-hidden z-10"
              >
                {renderOrderDrawerContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── MOBILE & TABLET MODAL DRAWER (< 1024px) ── */}
        <AnimatePresence>
          {isPanelOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="w-full sm:w-[420px] bg-white h-full shadow-2xl flex flex-col"
              >
                {renderOrderDrawerContent()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Floating Quick Check Capsule (Shadcn Studio UI) */}
        {!isPanelOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-30"
          >
            <div 
              onClick={() => setIsPanelOpen(true)}
              className="group flex items-center gap-2.5 sm:gap-3 p-1.5 pl-3 sm:pl-3.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:border-indigo-400/80 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none"
            >
              {/* Left: Table Status Indicator */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                </span>
                <span className="text-xs font-bold text-slate-800 tracking-tight">
                  {orderType === 'TAKEAWAY' ? takeawayToken : `Table ${selectedTable}`}
                </span>
              </div>

              <div className="h-4 w-px bg-slate-200"></div>

              {/* Center: Total Items & Live Amount */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono tracking-tight">
                  ₹{Number(grandTotalValue).toFixed(2)}
                </span>
              </div>

              {/* Right: Action Trigger */}
              <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 group-hover:bg-indigo-600 text-white font-semibold text-xs transition-colors shadow-2xs">
                <span>View Check</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* ── 3. POS Bill Preview & Thermal Print Modal ── */}
      {showBillPreviewModal && (
        <POSBillPreviewModal
          isOpen={showBillPreviewModal}
          onClose={() => setShowBillPreviewModal(false)}
          restaurantProfile={profile}
          tableNumber={orderType === 'TAKEAWAY' ? takeawayToken : selectedTable}
          customerName={guestName}
          cartItems={cart}
          calculation={calculation}
          discount={discount}
          onProceedToSettle={() => {
            setShowBillPreviewModal(false)
            setShowPaymentModal(true)
          }}
        />
      )}

      {/* ── 4. Split Payment & Settlement Modal ── */}
      {showPaymentModal && (
        <SplitPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          restaurantId={restaurantId}
          restaurantProfile={profile}
          tableNumber={orderType === 'TAKEAWAY' ? takeawayToken : selectedTable}
          cartItems={cart}
          calculation={calculation}
          discount={discount}
          customerName={guestName}
          onSuccessSettlement={handleSettlementSuccess}
        />
      )}

    </div>
  )
}
