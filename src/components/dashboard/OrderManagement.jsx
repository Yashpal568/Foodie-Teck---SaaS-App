import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  Clock, 
  ChefHat, 
  CheckCircle, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Filter, 
  Users, 
  User, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Bell, 
  Receipt, 
  Search, 
  MoreVertical, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Package, 
  Utensils, 
  Coffee, 
  Pizza,
  Printer,
  Plus,
  Volume2,
  VolumeX,
  LayoutGrid,
  Kanban,
  List,
  Sparkles,
  Flame,
  Check,
  Eye,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Tag,
  Download,
  CalendarDays,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useOrderManagement, ORDER_STATUS, ORDER_STATUS_CONFIG } from '@/hooks/useOrderManagement'
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile'
import { fetchMenuItems } from '@/lib/api'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export default function OrderManagement({ restaurantId, activeItem, setActiveItem, navigate }) {
  const { orders, orderHistory, loading, refreshOrders, updateStatus, createOrder } = useOrderManagement(restaurantId)
  const { profile } = useRestaurantProfile(restaurantId)
  
  // Main Navigation Mode: 'kitchen' (Live KDS Queue) | 'history' (Date & Day Wise Journal)
  const [mainTab, setMainTab] = useState('kitchen')

  // View states for Live Kitchen
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'kanban' | 'list'
  const [statusFilter, setStatusFilter] = useState('ACTIVE') // 'ACTIVE' | 'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'BILL_REQUESTED' | 'FINISHED' | 'CANCELLED'
  const [searchQuery, setSearchQuery] = useState('')
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL') // 'ALL' | 'DINE_IN' | 'TAKEAWAY'
  const [sortBy, setSortBy] = useState('NEWEST') // 'NEWEST' | 'URGENT' | 'AMOUNT_DESC'
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Horizontal Scroll slider state for status pills
  const pillsScrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Checklist for kitchen items (orderId-itemIndex -> boolean)
  const [checkedItems, setCheckedItems] = useState({})

  // History date filters & accordion expanded states
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const [historyDateFilter, setHistoryDateFilter] = useState('ALL') // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH'
  const [expandedDates, setExpandedDates] = useState({}) // dateKey -> boolean

  // Modals state
  const [receiptOrder, setReceiptOrder] = useState(null)
  const [timelineOrder, setTimelineOrder] = useState(null)
  const [showManualOrderModal, setShowManualOrderModal] = useState(false)

  // Menu catalog for manual order punching
  const [catalogItems, setCatalogItems] = useState([])
  const [manualTableNumber, setManualTableNumber] = useState('1')
  const [manualCustomerName, setManualCustomerName] = useState('')
  const [manualCart, setManualCart] = useState([])

  // Load menu items for manual punch
  useEffect(() => {
    if (restaurantId && restaurantId !== 'guest') {
      fetchMenuItems(restaurantId)
        .then(items => setCatalogItems(Array.isArray(items) ? items : []))
        .catch(() => {})
    }
  }, [restaurantId])

  // Merge active orders and history (Deduplicated by ID)
  const allAvailableOrders = useMemo(() => {
    const map = new Map()
    orderHistory.forEach(o => { if (o && o.id) map.set(o.id, o) })
    orders.forEach(o => { if (o && o.id) map.set(o.id, o) })
    return Array.from(map.values())
  }, [orders, orderHistory])

  // Check scroll position of pill slider
  const checkScrollPills = useCallback(() => {
    if (!pillsScrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = pillsScrollRef.current
    setCanScrollLeft(scrollLeft > 8)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8)
  }, [])

  const scrollPills = (direction) => {
    if (!pillsScrollRef.current) return
    const scrollAmount = direction === 'left' ? -220 : 220
    pillsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    setTimeout(checkScrollPills, 350)
  }

  useEffect(() => {
    checkScrollPills()
    window.addEventListener('resize', checkScrollPills)
    return () => window.removeEventListener('resize', checkScrollPills)
  }, [allAvailableOrders, checkScrollPills])

  // Filter and sort active queue orders
  const processedOrders = useMemo(() => {
    return allAvailableOrders.filter(order => {
      // 1. Status Filter
      if (statusFilter === 'ACTIVE') {
        if ([ORDER_STATUS.FINISHED, ORDER_STATUS.CANCELLED].includes(order.status)) return false
      } else if (statusFilter !== 'ALL') {
        if (order.status !== statusFilter) return false
      }

      // 2. Order Type Filter
      if (orderTypeFilter === 'DINE_IN') {
        if (order.order_type === 'TAKEAWAY' || order.orderType === 'takeaway') return false
      } else if (orderTypeFilter === 'TAKEAWAY') {
        if (order.order_type !== 'TAKEAWAY' && order.orderType !== 'takeaway') return false
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const tableStr = String(order.tableNumber || order.table_number || '').toLowerCase()
        const orderIdStr = String(order.id || '').toLowerCase()
        const customerStr = String(order.customerName || order.customer_name || '').toLowerCase()
        const itemsStr = (order.items || []).map(i => i.name?.toLowerCase() || '').join(' ')

        const matches = tableStr.includes(q) || 
                        `table ${tableStr}`.includes(q) || 
                        `t${tableStr}`.includes(q) ||
                        orderIdStr.includes(q) || 
                        customerStr.includes(q) || 
                        itemsStr.includes(q)
        if (!matches) return false
      }

      return true
    }).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || a.completedAt || 0).getTime()
      const timeB = new Date(b.createdAt || b.created_at || b.completedAt || 0).getTime()
      const totalA = Number(a.total || a.total_amount || 0)
      const totalB = Number(b.total || b.total_amount || 0)

      if (sortBy === 'URGENT') {
        const isAActive = ![ORDER_STATUS.FINISHED, ORDER_STATUS.CANCELLED].includes(a.status)
        const isBActive = ![ORDER_STATUS.FINISHED, ORDER_STATUS.CANCELLED].includes(b.status)
        if (isAActive && !isBActive) return -1
        if (!isAActive && isBActive) return 1
        return timeA - timeB
      } else if (sortBy === 'NEWEST') {
        return timeB - timeA
      } else if (sortBy === 'AMOUNT_DESC') {
        return totalB - totalA
      }
      return timeB - timeA
    })
  }, [allAvailableOrders, statusFilter, orderTypeFilter, searchQuery, sortBy])

  // Check if an order was settled/paid in advance
  const isOrderPrepaid = useCallback((order) => {
    if (!order) return false
    return order.payment_status === 'PAID' || 
           order.is_prepaid === true || 
           order.paymentStatus === 'PAID' || 
           order.isPrepaid === true ||
           (typeof order.notes === 'string' && order.notes.includes('BILLING DONE')) ||
           (typeof order.specialInstructions === 'string' && order.specialInstructions.includes('BILLING DONE'))
  }, [])

  // ── Date & Day-Wise Grouping for History ──
  const ordersByDate = useMemo(() => {
    const groups = {}
    const todayStr = new Date().toLocaleDateString('en-CA')
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA')

    const sorted = [...allAvailableOrders].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || a.completedAt || 0).getTime()
      const timeB = new Date(b.createdAt || b.created_at || b.completedAt || 0).getTime()
      return timeB - timeA
    })

    sorted.forEach(order => {
      const raw = order.createdAt || order.created_at || order.completedAt || order.date
      let dateKey = 'Earlier Orders'
      let dateObj = null
      
      if (raw) {
        try {
          const d = new Date(raw)
          if (!isNaN(d.getTime())) {
            dateKey = d.toLocaleDateString('en-CA')
            dateObj = d
          }
        } catch (e) {}
      }

      // Filter by historyDateFilter
      if (historyDateFilter === 'TODAY' && dateKey !== todayStr) return
      if (historyDateFilter === 'YESTERDAY' && dateKey !== yesterdayStr) return
      if (historyDateFilter === 'WEEK') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        if (dateObj && dateObj < weekAgo) return
      }
      if (historyDateFilter === 'MONTH') {
        const monthAgo = new Date()
        monthAgo.setDate(monthAgo.getDate() - 30)
        if (dateObj && dateObj < monthAgo) return
      }

      // Filter by historySearchQuery
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim()
        const tableStr = String(order.tableNumber || order.table_number || '').toLowerCase()
        const orderIdStr = String(order.id || '').toLowerCase()
        const customerStr = String(order.customerName || order.customer_name || '').toLowerCase()
        const itemsStr = (order.items || []).map(i => i.name?.toLowerCase() || '').join(' ')
        const matches = tableStr.includes(q) || `table ${tableStr}`.includes(q) || orderIdStr.includes(q) || customerStr.includes(q) || itemsStr.includes(q)
        if (!matches) return
      }

      if (!groups[dateKey]) {
        let displayTitle = dateObj 
          ? dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          : 'Historical Archive'
        
        let relativeLabel = ''
        if (dateKey === todayStr) relativeLabel = 'Today'
        else if (dateKey === yesterdayStr) relativeLabel = 'Yesterday'

        groups[dateKey] = {
          dateKey,
          displayTitle,
          relativeLabel,
          timestamp: dateObj ? dateObj.getTime() : 0,
          orders: [],
          totalRevenue: 0,
          totalItems: 0,
          completedCount: 0,
          cancelledCount: 0
        }
      }

      const total = Number(order.total || order.total_amount || 0)
      const itemsCount = (order.items || order.order_items || []).length

      groups[dateKey].orders.push(order)
      if (order.status !== ORDER_STATUS.CANCELLED) {
        groups[dateKey].totalRevenue += total
      }
      groups[dateKey].totalItems += itemsCount
      if (order.status === ORDER_STATUS.FINISHED) groups[dateKey].completedCount++
      if (order.status === ORDER_STATUS.CANCELLED) groups[dateKey].cancelledCount++
    })

    return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp)
  }, [allAvailableOrders, historyDateFilter, historySearchQuery])

  // Total History Metrics
  const historyMetrics = useMemo(() => {
    let totalSales = 0
    let totalOrders = 0
    ordersByDate.forEach(g => {
      totalSales += g.totalRevenue
      totalOrders += g.orders.length
    })
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0
    return { totalSales, totalOrders, avgOrderValue }
  }, [ordersByDate])

  // Toggle Day Group Accordion
  const toggleDateGroup = (dateKey) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: prev[dateKey] === undefined ? false : !prev[dateKey] // Default open if undefined
    }))
  }

  const isDateExpanded = (dateKey) => {
    return expandedDates[dateKey] !== false // Default open
  }

  // Real-time counts
  const activeCount = useMemo(() => {
    return allAvailableOrders.filter(o => ![ORDER_STATUS.FINISHED, ORDER_STATUS.CANCELLED].includes(o.status)).length
  }, [allAvailableOrders])

  const prepCount = useMemo(() => {
    return allAvailableOrders.filter(o => o.status === ORDER_STATUS.PREPARING).length
  }, [allAvailableOrders])

  const readyCount = useMemo(() => {
    return allAvailableOrders.filter(o => o.status === ORDER_STATUS.READY).length
  }, [allAvailableOrders])

  const billCount = useMemo(() => {
    return allAvailableOrders.filter(o => o.status === ORDER_STATUS.BILL_REQUESTED).length
  }, [allAvailableOrders])

  const completedTodayCount = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA')
    return allAvailableOrders.filter(o => {
      if (o.status !== ORDER_STATUS.FINISHED) return false
      const raw = o.completedAt || o.created_at || o.createdAt
      if (!raw) return false
      try {
        return new Date(raw).toLocaleDateString('en-CA') === today
      } catch {
        return false
      }
    }).length
  }, [allAvailableOrders])

  // Handle Order Status Transition
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateStatus(orderId, newStatus)
      const label = ORDER_STATUS_CONFIG[newStatus]?.label || newStatus
      toast.success(`Order status updated to "${label}"`, {
        description: `Order #${String(orderId).slice(-5).toUpperCase()}`
      })
    } catch (e) {
      console.error('Failed to update status:', e)
      toast.error('Failed to update order status')
    }
  }

  // Handle Manual Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshOrders()
      toast.success('Orders synchronized with live cloud')
    } catch (e) {
      toast.error('Failed to refresh orders')
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  // Toggle item strike-through for chefs
  const toggleItemChecked = (orderId, itemIndex) => {
    const key = `${orderId}-${itemIndex}`
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Calculate elapsed time & urgency
  const getElapsedInfo = (createdAt) => {
    if (!createdAt) return { text: 'Just now', urgency: 'normal' }
    const now = Date.now()
    const created = new Date(createdAt).getTime()
    if (isNaN(created)) return { text: 'Just now', urgency: 'normal' }

    const diffSec = Math.max(0, Math.floor((now - created) / 1000))
    const diffMins = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return { text: 'Just now', urgency: 'fresh' }
    if (diffMins < 10) return { text: `${diffMins}m ago`, urgency: 'fresh' }
    if (diffMins < 20) return { text: `${diffMins}m ago`, urgency: 'normal' }
    if (diffMins < 60) return { text: `${diffMins}m ago`, urgency: 'warning' }
    if (diffHours < 24) return { text: `${diffHours}h ${diffMins % 60}m ago`, urgency: 'delayed' }
    return { text: `${diffDays}d ago`, urgency: 'delayed' }
  }

  // Handle Manual Order Submission
  const handleCreateManualOrder = async () => {
    if (manualCart.length === 0) {
      toast.error('Please add at least one dish to the order')
      return
    }

    const total = manualCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const newOrderData = {
      table_number: parseInt(manualTableNumber) || 1,
      customer_name: manualCustomerName.trim() || `Table ${manualTableNumber} Guest`,
      items: manualCart.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        variant: item.variant || 'full',
        notes: item.notes || ''
      })),
      total: total,
      status: ORDER_STATUS.ORDERED,
      order_type: 'DINE_IN'
    }

    try {
      await createOrder(newOrderData)
      toast.success(`🎉 Order created for Table ${manualTableNumber}!`)
      setShowManualOrderModal(false)
      setManualCart([])
      setManualCustomerName('')
      refreshOrders()
    } catch (err) {
      toast.error('Failed to create order')
    }
  }

  // Add item to manual order cart
  const addItemToManualCart = (item, variant = 'full') => {
    const price = variant === 'half' && item.halfPrice ? item.halfPrice : item.price
    const name = variant === 'half' ? `${item.name} (Half)` : item.name
    const cartId = `${item.id || item._id}-${variant}`

    setManualCart(prev => {
      const existing = prev.find(i => i.cartId === cartId)
      if (existing) {
        return prev.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...item, cartId, name, price, variant, quantity: 1, notes: '' }]
    })
  }

  const updateManualItemQuantity = (cartId, delta) => {
    setManualCart(prev => {
      return prev.map(item => {
        if (item.cartId === cartId) {
          const newQty = item.quantity + delta
          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      }).filter(Boolean)
    })
  }

  // Print Receipt directly via isolated printable iframe
  const handlePrintReceipt = (order) => {
    if (!order) return
    setReceiptOrder(order)

    try {
      const printFrame = document.createElement('iframe')
      printFrame.style.position = 'fixed'
      printFrame.style.right = '0'
      printFrame.style.bottom = '0'
      printFrame.style.width = '0'
      printFrame.style.height = '0'
      printFrame.style.border = '0'
      document.body.appendChild(printFrame)

      const frameDoc = printFrame.contentWindow || printFrame.contentDocument.document || printFrame.contentDocument
      const doc = frameDoc.document || frameDoc

      const restName = profile?.business_name || profile?.name || 'Tiger Bistro'
      const restAddress = profile?.address || 'Main Square Mall, Floor 2'
      const restPhone = profile?.phone || '+91 98765 43210'
      const restGstin = profile?.gstin || '07AAAAA0000A1Z5'

      const items = order.items || order.order_items || []
      const itemsHtml = items.map(item => `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; align-items:flex-start;">
          <div style="max-width:260px; word-break:break-word;">
            <span style="font-weight:bold; color:#0f172a;">${item.name || item.item_name || 'Dish'}</span>
            ${item.variant && item.variant !== 'full' ? `<span style="font-size:11px; color:#d97706; display:block;">(${item.variant})</span>` : ''}
          </div>
          <span style="white-space:nowrap; margin:0 8px; color:#475569;">${item.quantity || 1} x ₹${Number(item.price || 0).toFixed(2)}</span>
          <span style="font-weight:bold; color:#0f172a; white-space:nowrap; text-align:right;">₹${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</span>
        </div>
      `).join('')

      const grandTotal = Number(order.total || order.total_amount || 0)
      const subtotal = grandTotal * 0.95238
      const cgst = grandTotal * 0.02381
      const sgst = grandTotal * 0.02381

      const createdAt = new Date(order.createdAt || order.created_at || Date.now())
      const formattedDate = createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const formattedTime = createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      const tableNo = order.tableNumber || order.table_number || '1'
      const orderRef = `#${String(order.id).slice(-6).toUpperCase()}`

      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${restName} - Receipt ${orderRef}</title>
            <style>
              @page {
                size: auto;
                margin: 6mm auto;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              html, body {
                width: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff;
                color: #1e293b;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 13px;
                line-height: 1.45;
              }
              .receipt-box {
                width: 100%;
                max-width: 480px;
                margin: 0 auto;
                padding: 16px 20px;
                background: #fffdfa;
                border: 1.5px dashed #cbd5e1;
                border-radius: 8px;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .uppercase { text-transform: uppercase; }
              .dashed-border {
                border-bottom: 1.5px dashed #cbd5e1;
                padding-bottom: 12px;
                margin-bottom: 12px;
              }
              .grid-2 {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-size: 12.5px;
              }
              .items-header {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                border-bottom: 1.5px solid #0f172a;
                padding-bottom: 5px;
                margin-bottom: 10px;
                font-size: 12.5px;
                color: #0f172a;
              }
              .totals-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
                font-size: 12.5px;
                color: #475569;
              }
              .grand-total-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 17px;
                font-weight: 900;
                color: #0f172a;
                border-top: 2px solid #0f172a;
                border-bottom: 2px solid #0f172a;
                padding: 8px 0;
                margin: 10px 0;
              }
            </style>
          </head>
          <body>
            <div class="receipt-box">
              
              <!-- Brand Header -->
              <div class="text-center dashed-border">
                <h2 style="margin:0; font-size:20px; font-weight:900;" class="uppercase">${restName}</h2>
                <p style="margin:4px 0 2px; font-size:12px; color:#475569;">${restAddress}</p>
                <p style="margin:0; font-size:12px; color:#475569;">Ph: <strong>${restPhone}</strong></p>
                <div style="margin-top:6px;">
                  <span style="display:inline-block; padding:2px 8px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:4px; font-size:11px; font-weight:bold; color:#1e293b;">
                    GSTIN: ${restGstin}
                  </span>
                </div>
              </div>

              <!-- Metadata -->
              <div class="dashed-border">
                <div class="grid-2">
                  <div><span style="color:#64748b;">Table No:</span> <strong style="color:#0f172a; font-size:14px;">Table ${tableNo}</strong></div>
                  <div class="text-right"><span style="color:#64748b;">Order Ref:</span> <strong style="color:#0f172a;">${orderRef}</strong></div>
                </div>
                <div class="grid-2">
                  <div><span style="color:#64748b;">Date & Time:</span> <span>${formattedDate}, ${formattedTime}</span></div>
                  <div class="text-right"><span style="color:#64748b;">Server / Mode:</span> <span>POS Dine-In</span></div>
                </div>
              </div>

              <!-- Items Table -->
              <div class="dashed-border" style="padding-bottom:8px;">
                <div class="items-header">
                  <span>Item</span>
                  <span>Qty x Price</span>
                  <span>Total</span>
                </div>
                ${itemsHtml}
              </div>

              <!-- Totals Breakdown -->
              <div class="dashed-border" style="padding-bottom:10px;">
                <div class="totals-row">
                  <span>Subtotal:</span>
                  <span style="font-weight:bold; color:#0f172a;">₹${subtotal.toFixed(2)}</span>
                </div>
                <div class="totals-row">
                  <span>CGST (2.5%):</span>
                  <span>₹${cgst.toFixed(2)}</span>
                </div>
                <div class="totals-row">
                  <span>SGST (2.5%):</span>
                  <span>₹${sgst.toFixed(2)}</span>
                </div>
                <div class="grand-total-row">
                  <span>Grand Total:</span>
                  <span>₹${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <!-- Footer -->
              <div class="text-center" style="font-size:11.5px; color:#64748b; line-height:1.5; padding-top:2px;">
                <p style="margin:0; font-weight:bold; color:#0f172a;">Thank you for dining with us!</p>
                <p style="margin:0;">Please visit again soon.</p>
                <p style="margin:4px 0 0; font-size:9.5px; color:#94a3b8;">Powered by Servora POS OS</p>
              </div>

            </div>
          </body>
        </html>
      `)
      doc.close()

      setTimeout(() => {
        printFrame.contentWindow.focus()
        printFrame.contentWindow.print()
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame)
          }
        }, 3000)
      }, 300)

      toast.success('Receipt sent to printer!')
    } catch (err) {
      console.error('Print error:', err)
      window.print()
    }
  }

  // Export Day Orders to CSV
  const exportDayOrdersCSV = (dayGroup) => {
    const headers = ['Order ID', 'Table', 'Time', 'Customer Name', 'Status', 'Items', 'Total (INR)']
    const rows = dayGroup.orders.map(o => [
      `"${o.id}"`,
      `"Table ${o.tableNumber || o.table_number || 1}"`,
      `"${new Date(o.createdAt || o.created_at).toLocaleTimeString()}"`,
      `"${o.customerName || o.customer_name || 'Guest'}"`,
      `"${o.status}"`,
      `"${(o.items || []).map(i => `${i.quantity}x ${i.name}`).join('; ')}"`,
      Number(o.total || 0).toFixed(2)
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Orders_${dayGroup.dateKey}_${profile?.name || 'Restaurant'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`📥 Exported orders for ${dayGroup.displayTitle}`)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16">
      
      {/* ── 1. Top Hero & Control Center ── */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Title & Live Status */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {mainTab === 'kitchen' ? 'Live Kitchen & Orders' : 'Date & Day-Wise Order History'}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Cloud Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {mainTab === 'kitchen' 
                    ? 'Real-time ticket display, KOT kitchen management & customer bill settlement.' 
                    : 'Historical sales journal grouped chronologically with day-by-day revenue breakdowns.'}
                </p>
              </div>
            </div>

            {/* Main Tabs (Live Kitchen vs Order History) & Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              
              {/* Primary Tab Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                <button
                  onClick={() => setMainTab('kitchen')}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    mainTab === 'kitchen' 
                      ? 'bg-white text-indigo-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ChefHat className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Live Queue ({activeCount})</span>
                </button>

                <button
                  onClick={() => setMainTab('history')}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    mainTab === 'history' 
                      ? 'bg-white text-indigo-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                  <span>Day & Date History</span>
                </button>
              </div>

              {/* Sound Toggle Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSoundEnabled(!soundEnabled)
                  toast.info(soundEnabled ? '🔇 Order chime muted' : '🔊 Order chime enabled')
                }}
                className={`h-9 px-3 rounded-xl font-bold text-xs border-slate-200 transition-all ${
                  soundEnabled ? 'text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50' : 'text-slate-500 bg-white'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 mr-1.5 text-indigo-600" /> : <VolumeX className="w-4 h-4 mr-1.5" />}
                <span className="hidden md:inline">{soundEnabled ? 'Chimes' : 'Muted'}</span>
              </Button>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 px-3 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {/* + Quick POS Order Button */}
              <Button
                size="sm"
                onClick={() => setShowManualOrderModal(true)}
                className="h-9 px-4 rounded-xl bg-linear-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Punch POS Order</span>
              </Button>
            </div>

          </div>

          {/* ── 2. View-Specific Toolbars ── */}
          {mainTab === 'kitchen' ? (
            
            /* Live Kitchen Toolbar with Working Left/Right Slider */
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              
              {/* Working Pill Slider with Left/Right Buttons */}
              <div className="relative flex items-center min-w-0 flex-1">
                
                {/* Left Scroll Chevron */}
                {canScrollLeft && (
                  <button
                    onClick={() => scrollPills('left')}
                    className="absolute left-0 z-10 w-7 h-7 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                {/* Sliding Pills Container */}
                <div 
                  ref={pillsScrollRef}
                  onScroll={checkScrollPills}
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full px-1 py-1"
                >
                  {[
                    { id: 'ACTIVE', label: 'Active Queue', count: activeCount, dot: 'bg-indigo-500' },
                    { id: 'ORDERED', label: 'New / Placed', count: allAvailableOrders.filter(o => [ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING].includes(o.status)).length, dot: 'bg-blue-500' },
                    { id: 'PREPARING', label: 'In Kitchen', count: prepCount, dot: 'bg-orange-500' },
                    { id: 'READY', label: 'Ready to Serve', count: readyCount, dot: 'bg-emerald-500' },
                    { id: 'BILL_REQUESTED', label: 'Bill Requested', count: billCount, dot: 'bg-amber-500' },
                    { id: 'FINISHED', label: 'Completed', count: completedTodayCount, dot: 'bg-slate-400' },
                    { id: 'ALL', label: 'All Records', count: allAvailableOrders.length, dot: 'bg-slate-300' }
                  ].map(tab => {
                    const isActive = statusFilter === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 select-none ${
                          isActive 
                            ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-800' 
                            : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-600'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${tab.dot} ${isActive ? 'ring-2 ring-white/50' : ''}`}></span>
                        <span>{tab.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Right Scroll Chevron */}
                {canScrollRight && (
                  <button
                    onClick={() => scrollPills('right')}
                    className="absolute right-0 z-10 w-7 h-7 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

              </div>

              {/* Search, Sort & View Switcher */}
              <div className="flex items-center gap-2 shrink-0">
                
                {/* Search input */}
                <div className="relative w-full sm:w-52">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search table, item, #ID..."
                    className="pl-8.5 h-9 bg-slate-50/80 border-slate-200 rounded-xl text-xs font-medium focus-visible:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Sort selector */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 min-w-[155px] bg-white border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 text-xs font-medium shadow-xl">
                    <SelectItem value="NEWEST" className="cursor-pointer font-semibold">⏱️ Newest First</SelectItem>
                    <SelectItem value="URGENT" className="cursor-pointer font-semibold">⚡ Oldest (Urgent)</SelectItem>
                    <SelectItem value="AMOUNT_DESC" className="cursor-pointer font-semibold">💰 Highest Amount</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Switcher Tabs */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Kitchen Grid View (KDS)"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Kanban Pipeline Board"
                  >
                    <Kanban className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'list' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Table Data List View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>

          ) : (

            /* History Explorer Filters Bar */
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* History Date Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {[
                  { id: 'ALL', label: 'All Dates' },
                  { id: 'TODAY', label: 'Today' },
                  { id: 'YESTERDAY', label: 'Yesterday' },
                  { id: 'WEEK', label: 'Last 7 Days' },
                  { id: 'MONTH', label: 'Last 30 Days' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setHistoryDateFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                      historyDateFilter === f.id 
                        ? 'bg-purple-600 text-white shadow-xs' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search within history */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Filter history by table, dish, #ID..."
                  className="pl-8.5 h-9 bg-slate-50 border-slate-200 rounded-xl text-xs font-medium"
                />
                {historySearchQuery && (
                  <button onClick={() => setHistorySearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

            </div>

          )}

        </div>
      </div>

      {/* ── 3. Main Content Area ── */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {mainTab === 'history' ? (

          /* ═══════════════════════════════════════════════════════════════
             ORDER HISTORY VIEW (DATE & DAY WISE CHRONOLOGICAL JOURNAL)
             ═══════════════════════════════════════════════════════════════ */
          <div className="space-y-6">
            
            {/* Top Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sales In Filter</span>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5">
                      ₹{historyMetrics.totalSales.toLocaleString('en-IN')}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Orders Logged</span>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5">
                      {historyMetrics.totalOrders} Orders
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Receipt className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Ticket Size (AOV)</span>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5">
                      ₹{historyMetrics.avgOrderValue.toLocaleString('en-IN')}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Date Group Accordions */}
            {ordersByDate.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-black text-slate-900">No History Records Found</h3>
                <p className="text-xs text-slate-500 mt-1">Try expanding your date filter or search query.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ordersByDate.map((dayGroup) => {
                  const isExpanded = isDateExpanded(dayGroup.dateKey)
                  return (
                    <Card key={dayGroup.dateKey} className="overflow-hidden border border-slate-200/90 rounded-3xl bg-white shadow-xs">
                      
                      {/* Day Group Header Bar */}
                      <div 
                        onClick={() => toggleDateGroup(dayGroup.dateKey)}
                        className="p-4 bg-slate-50/80 hover:bg-slate-100/60 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm shadow-indigo-500/20 shrink-0">
                            <CalendarDays className="w-5 h-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                                {dayGroup.displayTitle}
                              </h3>
                              {dayGroup.relativeLabel && (
                                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-extrabold text-[10px] px-2 py-0.5">
                                  {dayGroup.relativeLabel}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              {dayGroup.orders.length} orders recorded • {dayGroup.totalItems} total dishes served
                            </p>
                          </div>
                        </div>

                        {/* Day Aggregate Stats & Action Tools */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Day Revenue</span>
                            <span className="text-base font-black text-slate-900 tracking-tight">
                              ₹{dayGroup.totalRevenue.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 pl-2 border-l border-slate-200" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => exportDayOrdersCSV(dayGroup)}
                              className="h-8 px-2.5 rounded-xl border-slate-200 font-bold text-xs bg-white text-slate-700 hover:bg-slate-50"
                              title="Download Day CSV Spreadsheet"
                            >
                              <Download className="w-3.5 h-3.5 mr-1 text-slate-500" /> Export CSV
                            </Button>

                            <button 
                              onClick={() => toggleDateGroup(dayGroup.dateKey)}
                              className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Day Orders Table / List */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100">
                          {dayGroup.orders.map((order) => {
                            const items = order.items || order.order_items || []
                            return (
                              <div key={order.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                
                                {/* Order Metadata & Items */}
                                <div className="flex items-start gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                                    T{order.tableNumber || order.table_number || '1'}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-slate-900">
                                        Table {order.tableNumber || order.table_number || '1'}
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-slate-400">
                                        #{String(order.id).slice(-6).toUpperCase()}
                                      </span>
                                      <span className="text-[11px] font-medium text-slate-500">
                                        • {new Date(order.createdAt || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      <Badge className={`${ORDER_STATUS_CONFIG[order.status]?.color} border-none text-[9px] font-bold uppercase py-0 px-1.5`}>
                                        {ORDER_STATUS_CONFIG[order.status]?.label || order.status}
                                      </Badge>
                                    </div>

                                    {/* Items Chips */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                      {items.map((item, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200/60">
                                          <span className="font-bold text-slate-900">{item.quantity}x</span>
                                          <span>{item.name}</span>
                                          {item.variant && item.variant !== 'full' && (
                                            <span className="text-[9px] text-amber-600 font-bold">(Half)</span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Amount & Action Button */}
                                <div className="flex items-center justify-between lg:justify-end gap-4 self-end lg:self-center w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-none border-slate-100">
                                  <div className="text-left lg:text-right">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed</span>
                                    <span className="text-base font-black text-slate-900">
                                      ₹{Number(order.total || order.total_amount || 0).toFixed(2)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setReceiptOrder(order)}
                                      className="h-8 px-3 rounded-xl border-slate-200 text-xs font-bold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
                                    >
                                      <Receipt className="w-3.5 h-3.5 mr-1 text-indigo-600" /> View Receipt
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handlePrintReceipt(order)}
                                      className="w-8 h-8 rounded-xl text-slate-500 hover:text-slate-900"
                                      title="Print Receipt"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>

                              </div>
                            )
                          })}
                        </div>
                      )}

                    </Card>
                  )
                })}
              </div>
            )}

          </div>

        ) : (

          /* ═══════════════════════════════════════════════════════════════
             LIVE KITCHEN QUEUE VIEWS (GRID, KANBAN, POS LIST)
             ═══════════════════════════════════════════════════════════════ */
          <div>
            {loading && processedOrders.length === 0 ? (
              <div className="py-24 text-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
                <h3 className="text-base font-bold text-slate-800">Synchronizing Kitchen Tickets...</h3>
                <p className="text-xs text-slate-500 mt-1">Connecting to live dining floor</p>
              </div>
            ) : processedOrders.length === 0 ? (
              
              /* Empty State */
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-sm mt-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-inner">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">No Orders In Queue</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {searchQuery 
                    ? `No orders matching "${searchQuery}". Try searching for another table or item.`
                    : statusFilter === 'ACTIVE' 
                      ? 'All kitchen tickets have been cleared! Great job, chef.' 
                      : `No orders found in "${statusFilter}" category.`}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  {searchQuery && (
                    <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="rounded-xl font-bold text-xs">
                      Clear Search
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setShowManualOrderModal(true)} className="rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Create POS Order
                  </Button>
                </div>
              </div>

            ) : viewMode === 'grid' ? (

              /* KDS Grid View Mode - Balanced 5-Column Professional Ticket Sizing */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3">
                <AnimatePresence>
                  {processedOrders.map((order) => {
                    const elapsed = getElapsedInfo(order.createdAt || order.created_at)
                    const items = order.items || order.order_items || []
                    const isFinished = [ORDER_STATUS.FINISHED, ORDER_STATUS.CANCELLED].includes(order.status)
                    const checkedCount = items.filter((_, idx) => checkedItems[`${order.id}-${idx}`]).length
                    const progressPct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0

                    // Top status accent color
                    const statusAccentClass = 
                      order.status === ORDER_STATUS.PREPARING ? 'border-t-3 border-t-orange-500' :
                      order.status === ORDER_STATUS.READY ? 'border-t-3 border-t-emerald-500' :
                      order.status === ORDER_STATUS.SERVED ? 'border-t-3 border-t-purple-600' :
                      order.status === ORDER_STATUS.BILL_REQUESTED ? 'border-t-3 border-t-amber-500' :
                      order.status === ORDER_STATUS.FINISHED ? 'border-t-3 border-t-slate-300 opacity-80' :
                      order.status === ORDER_STATUS.CANCELLED ? 'border-t-3 border-t-rose-500 opacity-75' :
                      'border-t-3 border-t-indigo-600'

                    return (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="h-full"
                      >
                        <Card className={`h-full overflow-hidden border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between bg-white ${statusAccentClass}`}>
                          
                          {/* Ticket Header Banner */}
                          <div>
                            <div className="p-2 px-3 border-b border-slate-100 flex items-start justify-between gap-1.5 bg-slate-50/70">
                              
                              {/* Table Badge & Identity */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-black text-[11px] tracking-tight shadow-xs shrink-0">
                                    Table {order.tableNumber || order.table_number || '1'}
                                  </span>
                                  {isOrderPrepaid(order) && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black text-[8px] uppercase tracking-wider shadow-2xs shrink-0 flex items-center gap-0.5">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" /> PAID
                                    </span>
                                  )}
                                  <span className="text-[9.5px] font-bold text-slate-400 font-mono">
                                    #{String(order.id).slice(-4).toUpperCase()}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-slate-600">
                                  <Users className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{order.customerName || order.customer_name || 'Guest'}</span>
                                </div>

                                {order.notes && order.notes.includes('BILLING DONE') && (
                                  <div className="mt-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[8px] font-bold border border-emerald-200 truncate">
                                    ✅ {order.notes}
                                  </div>
                                )}
                              </div>

                              {/* Status & Timer Column */}
                              <div className="flex flex-col items-end gap-0.5 shrink-0">
                                <Badge className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.2 border-none shadow-xs rounded-md ${
                                  order.status === ORDER_STATUS.PREPARING ? 'bg-orange-500 text-white' :
                                  order.status === ORDER_STATUS.READY ? 'bg-emerald-500 text-white' :
                                  order.status === ORDER_STATUS.SERVED ? 'bg-purple-600 text-white' :
                                  order.status === ORDER_STATUS.BILL_REQUESTED ? 'bg-amber-500 text-white' :
                                  order.status === ORDER_STATUS.FINISHED ? 'bg-slate-200 text-slate-700' :
                                  order.status === ORDER_STATUS.CANCELLED ? 'bg-rose-500 text-white' :
                                  'bg-indigo-600 text-white'
                                }`}>
                                  {ORDER_STATUS_CONFIG[order.status]?.label || order.status}
                                </Badge>

                                <div className={`flex items-center gap-1 text-[8.5px] font-bold px-1.5 py-0.2 rounded-md ${
                                  elapsed.urgency === 'delayed' ? 'bg-rose-100 text-rose-700 font-extrabold' :
                                  elapsed.urgency === 'warning' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  <Clock className="w-2 h-2" />
                                  <span>{elapsed.text}</span>
                                </div>
                              </div>

                            </div>

                            {/* Items Checklist (KOT Chef View) */}
                            <div className="p-2 px-3 bg-white">
                              <div className="flex items-center justify-between pb-1 mb-1 border-b border-dashed border-slate-200 text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>KOT Items ({items.length})</span>
                                {items.length > 0 && !isFinished && (
                                  <span className="text-indigo-600 font-extrabold">{checkedCount}/{items.length} Ready</span>
                                )}
                              </div>

                              <div className="space-y-1 min-h-[40px] max-h-[85px] overflow-y-auto pr-0.5">
                                {items.length === 0 ? (
                                  <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 italic">
                                    No items recorded
                                  </div>
                                ) : (
                                  items.map((item, idx) => {
                                    const isChecked = checkedItems[`${order.id}-${idx}`]
                                    return (
                                      <div 
                                        key={idx} 
                                        onClick={() => !isFinished && toggleItemChecked(order.id, idx)}
                                        className={`flex items-start gap-1.5 p-0.5 rounded transition-all select-none ${
                                          isFinished 
                                            ? 'opacity-80' 
                                            : 'cursor-pointer hover:bg-slate-50 active:scale-[0.99]'
                                        } ${isChecked ? 'bg-emerald-50/60' : ''}`}
                                      >
                                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 font-black text-[9px] transition-colors shadow-2xs ${
                                          isChecked 
                                            ? 'bg-emerald-600 text-white' 
                                            : 'bg-slate-900 text-white'
                                        }`}>
                                          {isChecked ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : `${item.quantity || 1}x`}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1">
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                              item.type === 'NON_VEG' ? 'bg-rose-500' : 'bg-emerald-500'
                                            }`}></span>
                                            
                                            <h4 className={`text-[11px] font-semibold text-slate-900 leading-tight truncate ${
                                              isChecked ? 'line-through text-slate-400' : ''
                                            }`}>
                                              {item.name}
                                            </h4>
                                          </div>

                                          <div className="flex flex-wrap items-center gap-1 mt-0.2">
                                            {item.variant && item.variant !== 'full' && (
                                              <span className="text-[7.5px] font-bold text-amber-700 bg-amber-100/80 px-1 py-0.2 rounded">
                                                Half
                                              </span>
                                            )}
                                            {item.notes && (
                                              <span className="text-[7.5px] font-medium text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100">
                                                {item.notes}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <span className="text-[11px] font-bold text-slate-700 shrink-0">
                                          ₹{Number((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                        </span>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer Actions (Always Anchored at Bottom) */}
                          <div className="p-2 px-3 border-t border-slate-100 bg-slate-50/70 mt-auto">
                            <div className="flex items-center justify-between mb-1.5">
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">Grand Total</span>
                                <span className="text-xs font-black text-slate-900 tracking-tight">
                                  ₹{Number(order.total || order.total_amount || 0).toFixed(2)}
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePrintReceipt(order)}
                                  className="w-6 h-6 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Print Thermal Receipt"
                                >
                                  <Printer className="w-3 h-3" />
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-6 h-6 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors">
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-[175px] rounded-xl shadow-xl border border-slate-200/90 bg-white p-1 text-xs font-semibold z-50">
                                    <DropdownMenuItem onClick={() => setReceiptOrder(order)} className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 whitespace-nowrap">
                                      <Receipt className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span>View Bill Receipt</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTimelineOrder(order)} className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 whitespace-nowrap">
                                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span>Order Timeline</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                    {!isFinished && (
                                      <DropdownMenuItem 
                                        onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.CANCELLED)}
                                        className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-rose-600 hover:bg-rose-50/70 focus:text-rose-700 whitespace-nowrap"
                                      >
                                        <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                        <span>Cancel Order</span>
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {/* Primary Stage Transition Button */}
                            <div>
                              {[ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING].includes(order.status) && (
                                <Button
                                  onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.PREPARING)}
                                  className="w-full h-7 rounded-lg bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-[10.5px] uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <ChefHat className="w-3 h-3" />
                                  <span>Start Preparing</span>
                                </Button>
                              )}

                              {order.status === ORDER_STATUS.PREPARING && (
                                <Button
                                  onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.READY)}
                                  className="w-full h-7 rounded-lg bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-[10.5px] uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Mark Ready</span>
                                </Button>
                              )}

                              {order.status === ORDER_STATUS.READY && (
                                <Button
                                  onClick={() => handleStatusUpdate(order.id, isOrderPrepaid(order) ? ORDER_STATUS.FINISHED : ORDER_STATUS.SERVED)}
                                  className={`w-full h-7 rounded-lg bg-linear-to-r ${isOrderPrepaid(order) ? 'from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800' : 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'} text-white font-bold text-[10.5px] uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1`}
                                >
                                  {isOrderPrepaid(order) ? <CheckCircle className="w-3 h-3" /> : <Utensils className="w-3 h-3" />}
                                  <span>{isOrderPrepaid(order) ? 'Serve & Handover (Paid ✅)' : 'Serve to Table'}</span>
                                </Button>
                              )}

                              {order.status === ORDER_STATUS.SERVED && (
                                <Button
                                  onClick={() => handleStatusUpdate(order.id, isOrderPrepaid(order) ? ORDER_STATUS.FINISHED : ORDER_STATUS.BILL_REQUESTED)}
                                  className={`w-full h-7 rounded-lg bg-linear-to-r ${isOrderPrepaid(order) ? 'from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800' : 'from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700'} text-white font-bold text-[10.5px] uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1`}
                                >
                                  {isOrderPrepaid(order) ? <CheckCircle className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                  <span>{isOrderPrepaid(order) ? 'Handover & Clear (Paid ✅)' : 'Generate Bill'}</span>
                                </Button>
                              )}

                              {order.status === ORDER_STATUS.BILL_REQUESTED && (
                                <Button
                                  onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.FINISHED)}
                                  className="w-full h-7 rounded-lg bg-linear-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white font-bold text-[10.5px] uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Mark Paid & Clear</span>
                                </Button>
                              )}

                              {order.status === ORDER_STATUS.FINISHED && (
                                <Button
                                  variant="outline"
                                  onClick={() => setReceiptOrder(order)}
                                  className="w-full h-7 rounded-lg bg-white border-slate-200 text-slate-600 font-bold text-[10.5px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Receipt className="w-3 h-3 text-indigo-600" />
                                  <span>Completed</span>
                                </Button>
                              )}

                              {order.status === ORDER_STATUS.CANCELLED && (
                                <Button
                                  disabled
                                  className="w-full h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/60 font-bold text-[10.5px] uppercase tracking-wider opacity-90 flex items-center justify-center gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Cancelled</span>
                                </Button>
                              )}
                            </div>

                          </div>

                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

            ) : viewMode === 'kanban' ? (

              /* Executive Kanban Pipeline Board Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
                {[
                  { 
                    statusKey: ORDER_STATUS.ORDERED, 
                    title: 'New Incoming', 
                    subtitle: 'Awaiting Kitchen',
                    dotColor: 'bg-blue-500',
                    topBorder: 'border-t-blue-500',
                    accentBg: 'bg-blue-50/50',
                    orders: processedOrders.filter(o => [ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING].includes(o.status)),
                    nextStatus: ORDER_STATUS.PREPARING,
                    nextLabel: 'Start Cooking',
                    nextIcon: ChefHat,
                    btnGradient: 'from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700'
                  },
                  { 
                    statusKey: ORDER_STATUS.PREPARING, 
                    title: 'Kitchen Cooking', 
                    subtitle: 'Chef on the Pass',
                    dotColor: 'bg-orange-500',
                    topBorder: 'border-t-orange-500',
                    accentBg: 'bg-orange-50/50',
                    orders: processedOrders.filter(o => o.status === ORDER_STATUS.PREPARING),
                    nextStatus: ORDER_STATUS.READY,
                    nextLabel: 'Plated & Ready',
                    nextIcon: Check,
                    btnGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                  },
                  { 
                    statusKey: ORDER_STATUS.READY, 
                    title: 'Ready for Service', 
                    subtitle: 'Hot & Plated',
                    dotColor: 'bg-emerald-500',
                    topBorder: 'border-t-emerald-500',
                    accentBg: 'bg-emerald-50/50',
                    orders: processedOrders.filter(o => o.status === ORDER_STATUS.READY),
                    nextStatus: ORDER_STATUS.SERVED,
                    nextLabel: 'Serve to Table',
                    nextIcon: Utensils,
                    btnGradient: 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  },
                  { 
                    statusKey: ORDER_STATUS.SERVED, 
                    title: 'Active / Billing', 
                    subtitle: 'Served & Settle',
                    dotColor: 'bg-amber-500',
                    topBorder: 'border-t-amber-500',
                    accentBg: 'bg-amber-50/50',
                    orders: processedOrders.filter(o => [ORDER_STATUS.SERVED, ORDER_STATUS.BILL_REQUESTED].includes(o.status)),
                    nextStatus: ORDER_STATUS.FINISHED,
                    nextLabel: 'Settle & Clear',
                    nextIcon: DollarSign,
                    btnGradient: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                  }
                ].map(col => {
                  const NextIcon = col.nextIcon
                  return (
                    <div key={col.title} className="bg-slate-100/70 rounded-3xl p-3 sm:p-4 border border-slate-200/80 flex flex-col h-[calc(100vh-250px)] min-h-[520px]">
                      
                      {/* Column Header */}
                      <div className="p-3 rounded-2xl bg-white border border-slate-200/80 mb-3 flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} ring-4 ring-slate-100 animate-pulse`} />
                          <div>
                            <h3 className="font-black text-xs sm:text-sm text-slate-900 tracking-tight leading-none">{col.title}</h3>
                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{col.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-slate-800 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                          {col.orders.length}
                        </span>
                      </div>

                      {/* Card Column Body */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {col.orders.length === 0 ? (
                          <div className="h-44 rounded-2xl border border-dashed border-slate-300 bg-white/40 flex flex-col items-center justify-center text-center p-4">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-slate-700">No Tickets in Stage</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">Pipeline stage is currently clear</span>
                          </div>
                        ) : (
                          col.orders.map(order => {
                            const items = order.items || order.order_items || []
                            const elapsed = getElapsedInfo(order.createdAt || order.created_at)
                            const isBillReq = order.status === ORDER_STATUS.BILL_REQUESTED

                            return (
                              <Card key={order.id} className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden border-t-3 ${col.topBorder}`}>
                                
                                {/* Card Body */}
                                <div className="p-3 pb-2">
                                  
                                  {/* Top Row: Table + Order ID + Elapsed Time */}
                                  <div className="flex items-center justify-between gap-1 mb-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="bg-slate-900 text-white font-black text-[11px] px-2 py-0.5 rounded-md shadow-2xs">
                                        Table {order.tableNumber || order.table_number || '1'}
                                      </span>
                                      {isOrderPrepaid(order) && (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black text-[8px] uppercase tracking-wider shadow-2xs shrink-0 flex items-center gap-0.5">
                                          <Check className="w-2.5 h-2.5 stroke-[3]" /> PAID
                                        </span>
                                      )}
                                      <span className="text-[10px] font-mono font-bold text-slate-400">
                                        #{String(order.id).slice(-4).toUpperCase()}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span className={`text-[10px] font-bold ${
                                        elapsed.urgency === 'delayed' ? 'text-rose-600 font-extrabold' : 
                                        elapsed.urgency === 'warning' ? 'text-amber-600' : 'text-slate-500'
                                      }`}>
                                        {elapsed.text}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Customer Info */}
                                  <div className="flex flex-col gap-1 mb-2.5 pb-2 border-b border-slate-100">
                                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="font-bold text-slate-800 truncate">
                                          {order.customerName || order.customer_name || 'Guest Customer'}
                                        </span>
                                      </div>
                                      <Badge variant="outline" className="text-[9px] font-extrabold text-slate-500 px-1.5 py-0 uppercase">
                                        {order.order_type || order.orderType || 'DINE-IN'}
                                      </Badge>
                                    </div>

                                    {order.notes && order.notes.includes('BILLING DONE') && (
                                      <div className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[8px] font-bold border border-emerald-200 truncate">
                                        ✅ {order.notes}
                                      </div>
                                    )}
                                  </div>

                                  {/* KOT Items List */}
                                  <div className="space-y-1.5 mb-2">
                                    {items.slice(0, 3).map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="w-4 h-4 rounded bg-slate-900 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                            {item.quantity}x
                                          </span>
                                          <span className="text-[11.5px] font-bold text-slate-800 truncate">
                                            {item.name}
                                          </span>
                                          {item.variant && item.variant !== 'full' && (
                                            <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded">
                                              {item.variant}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-700 shrink-0">
                                          ₹{Number(item.price || 0) * Number(item.quantity || 1)}
                                        </span>
                                      </div>
                                    ))}
                                    {items.length > 3 && (
                                      <span className="text-[10px] font-bold text-indigo-600 block pt-0.5">
                                        +{items.length - 3} more items in ticket
                                      </span>
                                    )}
                                  </div>

                                </div>

                                {/* Card Footer Actions */}
                                <div className="p-2.5 px-3 border-t border-slate-100 bg-slate-50/70 mt-auto">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                                      <span className="text-xs font-black text-slate-900 tracking-tight">
                                        ₹{Number(order.total || order.total_amount || 0).toFixed(2)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handlePrintReceipt(order)}
                                        className="w-6.5 h-6.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                        title="Print Thermal Receipt"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </Button>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="w-6.5 h-6.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors">
                                            <MoreVertical className="w-3.5 h-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="min-w-[175px] rounded-xl shadow-xl border border-slate-200/90 bg-white p-1 text-xs font-semibold z-50">
                                          <DropdownMenuItem onClick={() => setReceiptOrder(order)} className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 whitespace-nowrap">
                                            <Receipt className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                            <span>View Bill Receipt</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setTimelineOrder(order)} className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 whitespace-nowrap">
                                            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                            <span>Order Timeline</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                          <DropdownMenuItem 
                                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.CANCELLED)}
                                            className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-rose-600 hover:bg-rose-50/70 focus:text-rose-700 whitespace-nowrap"
                                          >
                                            <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                            <span>Cancel Order</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>

                                  {/* Primary Stage Transition Button */}
                                  <Button
                                    onClick={() => handleStatusUpdate(
                                      order.id, 
                                      (isBillReq || (isOrderPrepaid(order) && [ORDER_STATUS.READY, ORDER_STATUS.SERVED].includes(order.status))) 
                                        ? ORDER_STATUS.FINISHED 
                                        : col.nextStatus
                                    )}
                                    className={`w-full h-7.5 rounded-xl bg-linear-to-r ${
                                      (isOrderPrepaid(order) && [ORDER_STATUS.READY, ORDER_STATUS.SERVED].includes(order.status))
                                        ? 'from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800'
                                        : col.btnGradient
                                    } text-white font-bold text-[11px] uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5`}
                                  >
                                    <NextIcon className="w-3.5 h-3.5" />
                                    <span>
                                      {isBillReq 
                                        ? 'Mark Paid & Clear' 
                                        : (isOrderPrepaid(order) && [ORDER_STATUS.READY, ORDER_STATUS.SERVED].includes(order.status))
                                        ? 'Serve & Handover (Paid ✅)'
                                        : col.nextLabel}
                                    </span>
                                  </Button>
                                </div>

                              </Card>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

            ) : (

              /* High-End POS Table List Mode */
              <Card className="rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/90 border-b border-slate-200/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider py-3.5 pl-4">Table / Mode</TableHead>
                        <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">Order ID</TableHead>
                        <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">Time & Age</TableHead>
                        <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">Customer</TableHead>
                        <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">Ordered Items</TableHead>
                        <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">Amount</TableHead>
                        <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider">Status</TableHead>
                        <TableHead className="font-black text-[10.5px] text-slate-500 uppercase tracking-wider text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedOrders.map((order) => {
                        const items = order.items || order.order_items || []
                        const elapsed = getElapsedInfo(order.createdAt || order.created_at)
                        const totalItemsCount = items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)

                        return (
                          <TableRow key={order.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 group">
                            
                            {/* Table & Type */}
                            <TableCell className="py-3 pl-4">
                              <div className="flex flex-col items-start gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="bg-slate-900 text-white font-black text-xs px-2.5 py-0.5 rounded-lg shadow-2xs whitespace-nowrap">
                                    Table {order.tableNumber || order.table_number || '1'}
                                  </span>
                                  {isOrderPrepaid(order) && (
                                    <span className="bg-emerald-600 text-white font-black text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-2xs">
                                      PAID ✅
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                                  {order.order_type || order.orderType || 'DINE-IN'}
                                </span>
                              </div>
                            </TableCell>

                            {/* Order ID */}
                            <TableCell className="py-3">
                              <span className="font-mono text-xs text-slate-600 font-bold bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md">
                                #{String(order.id).slice(-6).toUpperCase()}
                              </span>
                            </TableCell>

                            {/* Time & Elapsed */}
                            <TableCell className="py-3">
                              <div className="flex flex-col">
                                <span className="text-xs text-slate-800 font-bold">
                                  {new Date(order.createdAt || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                                  <span className={`text-[10px] font-bold ${
                                    elapsed.urgency === 'delayed' ? 'text-rose-600 font-black' : 
                                    elapsed.urgency === 'warning' ? 'text-amber-600 font-bold' : 'text-slate-400 font-medium'
                                  }`}>
                                    {elapsed.text}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Customer */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6.5 h-6.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200">
                                  <User className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-bold text-slate-800 truncate max-w-32">
                                  {order.customerName || order.customer_name || 'Guest Customer'}
                                </span>
                              </div>
                            </TableCell>

                            {/* Ordered Items Breakdown */}
                            <TableCell className="py-3 max-w-xs">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-100 shrink-0">
                                    {totalItemsCount} {totalItemsCount === 1 ? 'Dish' : 'Dishes'}
                                  </span>
                                  <span className="text-xs text-slate-700 font-medium truncate max-w-56">
                                    {items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Amount */}
                            <TableCell className="py-3">
                              <span className="font-black text-sm text-slate-900 tracking-tight">
                                ₹{Number(order.total || order.total_amount || 0).toFixed(2)}
                              </span>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-3">
                              <Badge className={`border-none font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit ${
                                [ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING].includes(order.status)
                                  ? 'bg-blue-100/90 text-blue-700'
                                  : order.status === ORDER_STATUS.PREPARING
                                  ? 'bg-orange-100/90 text-orange-700'
                                  : order.status === ORDER_STATUS.READY
                                  ? 'bg-emerald-100/90 text-emerald-700'
                                  : order.status === ORDER_STATUS.SERVED
                                  ? 'bg-indigo-100/90 text-indigo-700'
                                  : order.status === ORDER_STATUS.BILL_REQUESTED
                                  ? 'bg-amber-100/90 text-amber-700 ring-1 ring-amber-300 animate-pulse'
                                  : order.status === ORDER_STATUS.FINISHED
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-rose-100/90 text-rose-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  [ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING].includes(order.status)
                                    ? 'bg-blue-500'
                                    : order.status === ORDER_STATUS.PREPARING
                                    ? 'bg-orange-500'
                                    : order.status === ORDER_STATUS.READY
                                    ? 'bg-emerald-500'
                                    : order.status === ORDER_STATUS.SERVED
                                    ? 'bg-indigo-500'
                                    : order.status === ORDER_STATUS.BILL_REQUESTED
                                    ? 'bg-amber-500'
                                    : order.status === ORDER_STATUS.FINISHED
                                    ? 'bg-slate-400'
                                    : 'bg-rose-500'
                                }`} />
                                <span>{ORDER_STATUS_CONFIG[order.status]?.label || order.status}</span>
                              </Badge>
                            </TableCell>

                            {/* Action Buttons */}
                            <TableCell className="py-3 pr-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                
                                {/* Thermal Print Button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePrintReceipt(order)}
                                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Print Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>

                                {/* Stage Action Button */}
                                {[ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING].includes(order.status) && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.PREPARING)}
                                    className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <ChefHat className="w-3 h-3" />
                                    <span>Cook</span>
                                  </Button>
                                )}

                                {order.status === ORDER_STATUS.PREPARING && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.READY)}
                                    className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Ready</span>
                                  </Button>
                                )}

                                {order.status === ORDER_STATUS.READY && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(order.id, isOrderPrepaid(order) ? ORDER_STATUS.FINISHED : ORDER_STATUS.SERVED)}
                                    className={`h-7 px-2.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider bg-linear-to-r ${isOrderPrepaid(order) ? 'from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800' : 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1`}
                                  >
                                    {isOrderPrepaid(order) ? <CheckCircle className="w-3 h-3" /> : <Utensils className="w-3 h-3" />}
                                    <span>{isOrderPrepaid(order) ? 'Handover (Paid)' : 'Serve'}</span>
                                  </Button>
                                )}

                                {order.status === ORDER_STATUS.SERVED && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(order.id, isOrderPrepaid(order) ? ORDER_STATUS.FINISHED : ORDER_STATUS.BILL_REQUESTED)}
                                    className={`h-7 px-2.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider bg-linear-to-r ${isOrderPrepaid(order) ? 'from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800' : 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'} text-white shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1`}
                                  >
                                    {isOrderPrepaid(order) ? <CheckCircle className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                    <span>{isOrderPrepaid(order) ? 'Clear (Paid)' : 'Bill'}</span>
                                  </Button>
                                )}

                                {order.status === ORDER_STATUS.BILL_REQUESTED && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.FINISHED)}
                                    className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Settle</span>
                                  </Button>
                                )}

                                {/* 3-Dots Menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors">
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-[175px] rounded-xl shadow-xl border border-slate-200/90 bg-white p-1 text-xs font-semibold z-50">
                                    <DropdownMenuItem onClick={() => setReceiptOrder(order)} className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 whitespace-nowrap">
                                      <Receipt className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span>View Bill Receipt</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTimelineOrder(order)} className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 whitespace-nowrap">
                                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span>Order Timeline</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                    {order.status !== ORDER_STATUS.FINISHED && order.status !== ORDER_STATUS.CANCELLED && (
                                      <DropdownMenuItem 
                                        onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.CANCELLED)}
                                        className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-rose-600 hover:bg-rose-50/70 focus:text-rose-700 whitespace-nowrap"
                                      >
                                        <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                        <span>Cancel Order</span>
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>

                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>

            )}

          </div>

        )}

      </div>

      {/* ── 4. Thermal Receipt Modal (Print Ready) ── */}
      <Dialog open={!!receiptOrder} onOpenChange={(open) => !open && setReceiptOrder(null)}>
        <DialogContent showCloseButton={false} className="max-w-md p-0 overflow-hidden rounded-3xl border-slate-200 shadow-2xl">
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Receipt className="w-5 h-5 text-indigo-400" />
              <DialogTitle className="text-base font-black tracking-tight text-white">
                Customer Bill Receipt
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handlePrintReceipt(receiptOrder)}
                className="h-8 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReceiptOrder(null)}
                className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center justify-center transition-colors"
                title="Close receipt"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {receiptOrder && (
            <div className="p-6 bg-[#fffdfa] font-mono text-xs text-slate-800 space-y-4">
              
              {/* Receipt Brand Header */}
              <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
                <h2 className="font-black text-lg text-slate-900 uppercase tracking-wider">{profile?.name || 'Tiger Bistro'}</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">{profile?.address || 'Main Square Mall, Floor 2'}</p>
                <p className="text-[11px] text-slate-500">Ph: {profile?.phone || '+91 98765 43210'}</p>
                <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                  GSTIN: 07AAAAA0000A1Z5
                </span>
              </div>

              {/* Order Metadata */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b-2 border-dashed border-slate-300">
                <div>
                  <span className="text-slate-400 block">Table No:</span>
                  <strong className="text-slate-900 text-sm">Table {receiptOrder.tableNumber || receiptOrder.table_number || '1'}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Order Ref:</span>
                  <strong className="text-slate-900">#{String(receiptOrder.id).slice(-6).toUpperCase()}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Date & Time:</span>
                  <span>{new Date(receiptOrder.createdAt || receiptOrder.created_at).toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Server / Mode:</span>
                  <span>POS Dine-In</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 py-2">
                <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-[11px]">
                  <span>Item</span>
                  <span>Qty x Price</span>
                  <span>Total</span>
                </div>
                {(receiptOrder.items || receiptOrder.order_items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <div className="max-w-[160px] truncate">
                      <span className="font-bold">{item.name}</span>
                      {item.variant && item.variant !== 'full' && <span className="text-[9px] text-amber-600 block">(Half Plate)</span>}
                    </div>
                    <span>{item.quantity} x ₹{Number(item.price).toFixed(2)}</span>
                    <span className="font-bold">₹{Number(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="pt-3 border-t-2 border-dashed border-slate-300 space-y-1.5 text-right">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Subtotal:</span>
                  <span>₹{(Number(receiptOrder.total || 0) * 0.95).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>CGST (2.5%):</span>
                  <span>₹{(Number(receiptOrder.total || 0) * 0.025).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>SGST (2.5%):</span>
                  <span>₹{(Number(receiptOrder.total || 0) * 0.025).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-300">
                  <span>Grand Total:</span>
                  <span>₹{Number(receiptOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
                <p className="font-bold text-slate-700">Thank you for dining with us!</p>
                <p className="mt-0.5">Please visit again soon.</p>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 5. Punch Quick POS Order Modal ── */}
      <Dialog open={showManualOrderModal} onOpenChange={setShowManualOrderModal}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-slate-200">
          <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">Punch Walk-In / POS Order</DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">Quickly send new orders directly to kitchen queue</DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Select Table Number</label>
                <Select value={manualTableNumber} onValueChange={setManualTableNumber}>
                  <SelectTrigger className="h-10 rounded-xl font-bold">
                    <SelectValue placeholder="Select Table" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-medium">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>Table {num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Guest Name (Optional)</label>
                <Input
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Menu Items Catalog Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">Add Dishes from Menu</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {catalogItems.map(item => (
                  <div key={item.id || item._id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors">
                    <div className="min-w-0 pr-2">
                      <h5 className="font-bold text-xs text-slate-900 truncate">{item.name}</h5>
                      <span className="text-[11px] font-bold text-indigo-600">₹{item.price}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.halfPrice && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => addItemToManualCart(item, 'half')}
                          className="h-7 px-2 text-[10px] font-bold text-amber-700 bg-amber-50"
                        >
                          + Half (₹{item.halfPrice})
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        onClick={() => addItemToManualCart(item, 'full')}
                        className="h-7 px-2.5 text-[11px] font-bold bg-slate-900 hover:bg-black text-white"
                      >
                        + Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Preview */}
            {manualCart.length > 0 && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider mb-2">Order Items ({manualCart.length})</h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {manualCart.map(item => (
                    <div key={item.cartId} className="flex items-center justify-between text-xs font-bold bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs">
                      <span>{item.name} (₹{item.price})</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateManualItemQuantity(item.cartId, -1)} className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer">-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateManualItemQuantity(item.cartId, 1)} className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer">+</button>
                        <span className="w-16 text-right font-black">₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-indigo-200/60 font-black text-sm text-indigo-950">
                  <span>Grand Total:</span>
                  <span>₹{manualCart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}</span>
                </div>
              </div>
            )}

          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between">
            <Button variant="outline" onClick={() => setShowManualOrderModal(false)} className="rounded-xl font-bold text-xs">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateManualOrder}
              disabled={manualCart.length === 0}
              className="rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-5"
            >
              Send to Kitchen (KOT)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
