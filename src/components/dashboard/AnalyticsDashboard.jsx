import { useState, useEffect, useMemo } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  ShoppingCart, 
  DollarSign, 
  Star, 
  BarChart3, 
  PieChart, 
  Calendar, 
  Filter, 
  Users, 
  Clock, 
  CreditCard, 
  Activity,
  ArrowUpRight,
  TrendingUp as TrendingUpIcon,
  ChevronRight
} from 'lucide-react'
import AnalyticsMobileNavbar from './AnalyticsMobileNavbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useOrderManagement } from '@/hooks/useOrderManagement'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'

// Load analytics data from localStorage
const loadAnalytics = () => {
  try {
    const saved = localStorage.getItem('menuAnalytics')
    const savedRevenue = localStorage.getItem('totalRevenue')
    const savedOrderHistory = localStorage.getItem('orderHistory')
    
    const parsedMenuAnalytics = saved ? JSON.parse(saved) : {}
    const today = new Date().toLocaleDateString('en-CA')
    const lastDate = parsedMenuAnalytics.lastUpdated ? new Date(parsedMenuAnalytics.lastUpdated).toLocaleDateString('en-CA') : today
    
    if (today !== lastDate) {
      parsedMenuAnalytics.itemViews = {}
      parsedMenuAnalytics.itemOrders = {}
      parsedMenuAnalytics.totalViews = 0
      parsedMenuAnalytics.totalOrders = 0
      parsedMenuAnalytics.lastUpdated = new Date().toISOString()
      localStorage.setItem('menuAnalytics', JSON.stringify(parsedMenuAnalytics))
      window.dispatchEvent(new Event('storage'))
    }
    
    return {
      itemViews: {},
      itemOrders: {},
      totalViews: 0,
      totalOrders: 0,
      totalRevenue: parseFloat(savedRevenue) || 0,
      orderHistory: savedOrderHistory ? JSON.parse(savedOrderHistory) : [],
      lastUpdated: new Date().toISOString(),
      ...parsedMenuAnalytics
    }
  } catch (error) {
    console.error('Error loading analytics:', error)
    return {
      itemViews: {},
      itemOrders: {},
      totalViews: 0,
      totalOrders: 0,
      totalRevenue: 0,
      orderHistory: [],
      lastUpdated: new Date().toISOString()
    }
  }
}

// Format currency for Indian Rupees
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Generate revenue trend data
const generateRevenueTrend = (orderHistory, timeRange) => {
  const now = new Date()
  
  if (!orderHistory || orderHistory.length === 0) return []
  
  if (timeRange === 'all') {
    // Monthly aggregation for long-term view
    const monthlyStats = {}
    orderHistory.forEach(order => {
      const orderDate = order.createdAt || order.created_at;
      if (orderDate) {
        const date = new Date(orderDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { 
            name: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            revenue: 0, 
            orders: 0,
            fullDate: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            timestamp: date.getTime()
          }
        }
        monthlyStats[monthKey].revenue += (order.total || 0)
        monthlyStats[monthKey].orders += 1
      }
    })
    
    return Object.values(monthlyStats).sort((a, b) => a.timestamp - b.timestamp)
  }

  const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90
  const trend = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toLocaleDateString('en-CA') // YYYY-MM-DD
    
    // Aggregate revenue for this specific local day
    const dayRevenue = orderHistory
      .filter(order => {
        const orderDate = order.createdAt || order.created_at;
        return orderDate && orderDate.split('T')[0] === dateStr;
      })
      .reduce((sum, order) => sum + (order.total || 0), 0)
    
    const dayOrders = orderHistory.filter(order => {
      const orderDate = order.createdAt || order.created_at;
      return orderDate && orderDate.split('T')[0] === dateStr;
    }).length

    trend.push({
      name: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      revenue: dayRevenue,
      orders: dayOrders,
      fullDate: date.toLocaleDateString('en-IN', { dateStyle: 'long' })
    })
  }
  
  return trend
}

export default function AnalyticsDashboard({ activeItem, setActiveItem, navigate, restaurantId }) {
  const { orders, orderHistory, loading, stats } = useOrderManagement(restaurantId)
  
  const [menuItems, setMenuItems] = useState([])
  const [timeRange, setTimeRange] = useState('7days')
  const [activeTab, setActiveTab] = useState('overview')
  const [isChartReady, setIsChartReady] = useState(false)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  
  // Custom Date Range State
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  const [realtimeData, setRealtimeData] = useState({
    totalViews: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    avgOrderValue: 0
  })

  // Update: Calculate itemOrders and itemViews from real order history
  const analytics = useMemo(() => {
    const orders = orderHistory || []
    const itemOrdersMap = {}
    const itemViewsMap = {} // Views would come from a separate 'item_views' table, using orders as proxy for now
    
    orders.forEach(order => {
      const items = order.items || []
      items.forEach(item => {
        const id = item.menu_item_id || item.id
        if (id) {
          itemOrdersMap[id] = (itemOrdersMap[id] || 0) + (item.quantity || 1)
          // We can use orders as a proxy for views if views table isn't ready
          itemViewsMap[id] = (itemViewsMap[id] || 0) + ((item.quantity || 1) * 1.5) 
        }
      })
    })

    return {
      orderHistory: orders,
      totalRevenue: stats.totalRevenue,
      totalOrders: orders.length,
      totalViews: Object.values(itemViewsMap).reduce((a, b) => a + b, 0),
      itemViews: itemViewsMap,
      itemOrders: itemOrdersMap,
    }
  }, [orderHistory, stats.totalRevenue, realtimeData.totalViews])

  // Real-time data updates (now deriving from hook)
  useEffect(() => {
    if (loading) return
    
    const todayStr = new Date().toLocaleDateString('en-CA')
    const combinedOrders = [...orders, ...orderHistory]

    // Calculate today's orders and revenue
    const todayOrdersArr = combinedOrders.filter(order => 
      new Date(order.created_at || order.createdAt).toLocaleDateString('en-CA') === todayStr
    )
    
    const totalRevenueToday = todayOrdersArr.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalOrdersToday = todayOrdersArr.length
    
    const activeUsersCount = orders.length // Simply active orders as proxy for users
    const avgOrderValueToday = totalOrdersToday > 0 ? totalRevenueToday / totalOrdersToday : 0
    
    setRealtimeData({
      totalViews: 0, // Placeholder for Phase 2 supastats
      totalOrders: totalOrdersToday,
      totalRevenue: totalRevenueToday,
      activeUsers: activeUsersCount,
      avgOrderValue: avgOrderValueToday
    })
  }, [orders, orderHistory, loading])

  useEffect(() => {
    // Load menu items from Supabase
    const loadMenu = async () => {
      if (!restaurantId) return
      try {
        const { getMenuItems } = await import('@/lib/api')
        const items = await getMenuItems(restaurantId)
        setMenuItems(items || [])
      } catch (err) {
        console.error('Failed to load menu items for analytics:', err)
      }
    }
    
    loadMenu()

    // Small delay to ensure parent dimensions are calculated for Recharts
    const timer = setTimeout(() => setIsChartReady(true), 100)
    return () => clearTimeout(timer)
  }, [restaurantId])

  // Memoized calculations for performance
  const revenueTrend = useMemo(() => {
    return generateRevenueTrend(analytics.orderHistory || [], timeRange)
  }, [analytics.orderHistory, timeRange])

  const categoryDistribution = useMemo(() => {
    const distribution = {}
    const orderHistory = analytics.orderHistory || []
    
    orderHistory.forEach(order => {
      // This would need to be enhanced based on your order structure
      const category = 'Dine-in' // Default category
      distribution[category] = (distribution[category] || 0) + (order.total || 0)
    })
    
    return Object.entries(distribution).map(([category, revenue]) => ({
      category,
      revenue,
      percentage: realtimeData.totalRevenue > 0 ? (revenue / realtimeData.totalRevenue * 100).toFixed(1) : 0
    }))
  }, [analytics.orderHistory, realtimeData.totalRevenue])

  const getTopItems = (type, limit = 5) => {
    const data = type === 'views' ? (analytics.itemViews || {}) : (analytics.itemOrders || {})
    return Object.entries(data)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, limit)
      .map(([itemId, count]) => {
        const item = menuItems.find(i => i.id === itemId || i._id === itemId)
        return {
          item,
          count,
          percentage: analytics.totalOrders > 0 ? (count / (type === 'views' ? (analytics.totalViews || 1) : (analytics.totalOrders || 1)) * 100).toFixed(1) : 0
        }
      })
      .filter(entry => entry.item)
  }

  const getCategoryStats = () => {
    const categoryStats = {}
    
    menuItems.forEach(item => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = {
          items: 0,
          views: 0,
          orders: 0,
          avgPrice: 0,
          totalPrice: 0
        }
      }
      
      categoryStats[item.category].items++
      const itemId = item.id || item._id
      categoryStats[item.category].views += (analytics && analytics.itemViews && itemId && analytics.itemViews[itemId]) ? analytics.itemViews[itemId] : 0
      categoryStats[item.category].orders += (analytics && analytics.itemOrders && itemId && analytics.itemOrders[itemId]) ? analytics.itemOrders[itemId] : 0
      categoryStats[item.category].totalPrice += item.price
    })
    
    // Calculate average price
    Object.keys(categoryStats).forEach(category => {
      if (categoryStats[category].items > 0) {
        categoryStats[category].avgPrice = categoryStats[category].totalPrice / categoryStats[category].items
      }
    })
    
    return categoryStats
  }

  // Custom Date Range Calculation
  const customRangeStats = useMemo(() => {
    if (!customDateRange.startDate && !customDateRange.endDate) {
      return { revenue: 0, orders: 0, avgValue: 0 }
    }

    const orderHistory = analytics.orderHistory || []
    
    // Convert inputs to local start/end of day for accurate comparison
    const startObj = customDateRange.startDate ? new Date(customDateRange.startDate) : new Date(0)
    if (customDateRange.startDate) startObj.setHours(0, 0, 0, 0)
    
    const endObj = customDateRange.endDate ? new Date(customDateRange.endDate) : new Date()
    if (customDateRange.endDate) endObj.setHours(23, 59, 59, 999)

    const filteredOrders = orderHistory.filter(order => {
      const orderDateRaw = order.createdAt || order.created_at;
      if (!orderDateRaw) return false
      const orderDate = new Date(orderDateRaw)
      return orderDate >= startObj && orderDate <= endObj
    })

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalOrders = filteredOrders.length

    return {
      revenue: totalRevenue,
      orders: totalOrders,
      avgValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
    }
  }, [analytics.orderHistory, customDateRange])

  const topViewed = getTopItems('views')
  const topOrdered = getTopItems('orders')
  const categoryStats = getCategoryStats()

  return (
    <div className="bg-[#f8fafc]/50 min-h-screen">
      <AnalyticsMobileNavbar 
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        navigate={navigate}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
      />

      <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-24 lg:pb-8">
        {/* Header (Desktop Only) */}
        <div className="hidden lg:flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h1>
              <p className="text-gray-500 font-medium">Track your restaurant's performance across all metrics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex bg-white p-1 rounded-xl ring-1 ring-gray-200 shadow-sm">
                {['7days', '30days', '90days', 'all'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize",
                      timeRange === range 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                        : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    {range.replace('days', ' Days')}
                  </button>
                ))}
             </div>
          </div>
        </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto no-scrollbar justify-start lg:grid lg:grid-cols-4 h-auto lg:h-12 p-1 bg-white ring-1 ring-gray-200 shadow-sm rounded-xl mb-8">
          <TabsTrigger value="overview" className="py-2.5">Overview</TabsTrigger>
          <TabsTrigger value="menu" className="py-2.5">Menu Performance</TabsTrigger>
          <TabsTrigger value="sales" className="py-2.5">Sales Analytics</TabsTrigger>
          <TabsTrigger value="customers" className="py-2.5">Customer Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 mt-4 outline-none">
          {/* Real-time Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center ring-1 ring-blue-100/50">
                    <Eye className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-blue-600 border-blue-100 bg-blue-50/50">Views</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Views</p>
                  <p className="text-xl md:text-2xl font-black text-gray-900 mt-0.5">{realtimeData.totalViews.toLocaleString()}</p>
                  <div className="flex items-center mt-2 group">
                    <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg ring-1 ring-emerald-100/50">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <span>12.5%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center ring-1 ring-green-100/50">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-green-600 border-green-100 bg-green-50/50">Sales</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Orders</p>
                  <p className="text-xl md:text-2xl font-black text-gray-900 mt-0.5">{realtimeData.totalOrders.toLocaleString()}</p>
                  <div className="flex items-center mt-2 group">
                    <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg ring-1 ring-emerald-100/50">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <span>8.3%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center ring-1 ring-purple-100/50">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-purple-600 border-purple-100 bg-purple-50/50">Revenue</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
                  <p className="text-xl md:text-2xl font-black text-gray-900 mt-0.5">{formatCurrency(realtimeData.totalRevenue)}</p>
                  <div className="flex items-center mt-2 group">
                    <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg ring-1 ring-emerald-100/50">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <span>15.7%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center ring-1 ring-orange-100/50">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-orange-600 border-orange-100 bg-orange-50/50">Users</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Users</p>
                  <p className="text-xl md:text-2xl font-black text-gray-900 mt-0.5">{realtimeData.activeUsers}</p>
                  <div className="flex items-center mt-2 group">
                    <div className="flex items-center text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-lg ring-1 ring-orange-100/50 animate-pulse">
                      <Activity className="w-3 h-3 mr-1" />
                      <span>Live</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-4 md:p-6 md:col-span-1 lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center ring-1 ring-pink-100/50">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-pink-600 border-pink-100 bg-pink-50/50">Values</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avg Order Value</p>
                  <p className="text-xl md:text-2xl font-black text-gray-900 mt-0.5">{formatCurrency(realtimeData.avgOrderValue)}</p>
                  <div className="flex items-center mt-2 group">
                    <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg ring-1 ring-emerald-100/50">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <span>5.2%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-1 lg:col-span-2 border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-white/50 backdrop-blur-sm border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Revenue Analytics
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                      Live
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[350px] w-full min-h-[350px] relative">
                  {isChartReady ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={350} minWidth={0} debounce={50}>
                      <AreaChart data={revenueTrend}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(value) => `₹${value}`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            backgroundColor: '#fff'
                          }}
                          formatter={(value) => [formatCurrency(value), 'Revenue']}
                          labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorRevenue)" 
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50/50 rounded-lg animate-pulse">
                      <TrendingUp className="w-8 h-8 text-gray-200" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold text-slate-800">Growth Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className={cn("divide-y overflow-y-auto", isHistoryExpanded ? "max-h-[600px]" : "")}>
                  {revenueTrend.slice(isHistoryExpanded ? 0 : -5).reverse().map((day, index) => (
                    <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-700">{day.name}</p>
                        <p className="text-xs text-slate-500">{day.orders} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(day.revenue)}</p>
                        <div className="flex items-center justify-end">
                          <TrendingUp className="w-3 h-3 text-emerald-500 mr-1" />
                          <span className="text-[10px] font-medium text-emerald-600">+12%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4">
                  <Button 
                    variant="ghost" 
                    className="w-full text-slate-600 font-bold text-xs py-2 h-auto hover:bg-slate-100 flex items-center justify-center gap-2" 
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  >
                    {isHistoryExpanded ? (
                      <>
                        <Filter className="w-3 h-3" />
                        SHOW LESS
                      </>
                    ) : (
                      <>
                        <Activity className="w-3 h-3" />
                        VIEW FULL HISTORY
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Distribution */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <PieChart className="w-5 h-5 text-purple-600" />
                Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {categoryDistribution.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        index % 4 === 0 ? "bg-blue-500" :
                        index % 4 === 1 ? "bg-emerald-500" :
                        index % 4 === 2 ? "bg-purple-500" : "bg-orange-500"
                      )} />
                      <span className="text-sm font-semibold text-slate-700">{category.category}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-1 justify-end max-w-[200px]">
                      <div className="flex-1">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              index % 4 === 0 ? "bg-blue-500" :
                              index % 4 === 1 ? "bg-emerald-500" :
                              index % 4 === 2 ? "bg-purple-500" : "bg-orange-500"
                            )}
                            style={{ width: `${category.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right min-w-[70px]">
                        <div className="text-sm font-bold text-slate-900">
                          {formatCurrency(category.revenue)}
                        </div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">{category.percentage}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Menu Performance Tab */}
        <TabsContent value="menu" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Top Viewed Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {topViewed.map((item, index) => (
                    <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{item.item?.name}</p>
                          <p className="text-xs text-slate-500">{item.item?.category}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="font-bold text-slate-800">{item.count} <span className="text-xs font-normal text-slate-500">views</span></p>
                          <p className="text-[10px] font-medium text-slate-400 capitalize">{item.percentage}% of total</p>
                        </div>
                        <Progress value={Number(item.percentage)} className="w-16 h-1.5 [&>div]:bg-blue-500" />
                      </div>
                    </div>
                  ))}
                  {topViewed.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium">No menu items viewed yet</p>
                      <p className="text-xs text-slate-400 mt-1">Data will appear here when customers browse the menu</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                  Top Ordered Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {topOrdered.map((item, index) => (
                    <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{item.item?.name}</p>
                          <p className="text-xs text-slate-500">{item.item?.category}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="font-bold text-slate-800">{item.count} <span className="text-xs font-normal text-slate-500">orders</span></p>
                          <p className="text-[10px] font-medium text-slate-400 capitalize">{item.percentage}% of total</p>
                        </div>
                        <Progress value={Number(item.percentage)} className="w-16 h-1.5 [&>div]:bg-green-500" />
                      </div>
                    </div>
                  ))}
                  {topOrdered.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium">No orders recorded yet</p>
                      <p className="text-xs text-slate-400 mt-1">Data will appear here once items are ordered</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Performance Detail */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <Star className="w-5 h-5 text-orange-500" />
                Category Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {Object.entries(categoryStats).map(([category, stats], index) => {
                  const viewsPercentage = analytics.totalViews > 0 ? (stats.views / analytics.totalViews) * 100 : 0;
                  const ordersPercentage = analytics.totalOrders > 0 ? (stats.orders / analytics.totalOrders) * 100 : 0;
                  
                  return (
                    <div key={index} className="p-6 md:p-8 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        
                        {/* Category Info */}
                        <div className="md:w-1/4">
                          <h4 className="text-lg font-bold text-slate-800 mb-1">{category}</h4>
                          <p className="text-sm font-medium text-slate-500">{stats.items} Items</p>
                          <div className="mt-4">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Average Price</p>
                            <p className="text-xl font-bold text-slate-700">{formatCurrency(stats.avgPrice)}</p>
                          </div>
                        </div>

                        {/* Views Progress */}
                        <div className="md:w-1/3 space-y-3">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-0.5">Views</p>
                              <p className="text-2xl font-black text-slate-800 leading-none">{stats.views}</p>
                            </div>
                            <span className="text-sm font-bold text-blue-500">{viewsPercentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={viewsPercentage} className="h-2.5 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-600" />
                        </div>

                        {/* Orders Progress */}
                        <div className="md:w-1/3 space-y-3">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-0.5">Orders</p>
                              <p className="text-2xl font-black text-slate-800 leading-none">{stats.orders}</p>
                            </div>
                            <span className="text-sm font-bold text-green-500">{ordersPercentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={ordersPercentage} className="h-2.5 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-green-400 [&>div]:to-green-600" />
                        </div>

                      </div>
                    </div>
                  );
                })}

                {Object.keys(categoryStats).length === 0 && (
                  <div className="p-12 text-center text-slate-500">
                    <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-semibold">No category data available</p>
                    <p className="text-sm text-slate-400 mt-1">Categories will populate automatically based on your active menu</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Analytics Tab */}
        <TabsContent value="sales" className="space-y-6">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-800">Sales Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100/50 flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{formatCurrency(realtimeData.totalRevenue)}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">Total Revenue</div>
                </div>
                <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100/50 flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-700">{realtimeData.totalOrders}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-600/70">Total Orders</div>
                </div>
                <div className="p-6 rounded-2xl bg-purple-50 border border-purple-100/50 flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <TrendingUpIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-700">{formatCurrency(realtimeData.avgOrderValue)}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-600/70">Avg Order Value</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Date Range Earnings */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Custom Range Earnings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
                
                {/* Date Selectors */}
                <div className="lg:w-1/3 space-y-4">
                  <div>
                    <Label htmlFor="start-date" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Start Date</Label>
                    <Input 
                      id="start-date" 
                      type="date" 
                      className="bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                      value={customDateRange.startDate}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">End Date</Label>
                    <Input 
                      id="end-date" 
                      type="date" 
                      className="bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                      value={customDateRange.endDate}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      min={customDateRange.startDate}
                    />
                  </div>
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      className="w-full text-slate-600 border-slate-200 hover:bg-slate-100"
                      onClick={() => setCustomDateRange({ startDate: '', endDate: '' })}
                      disabled={!customDateRange.startDate && !customDateRange.endDate}
                    >
                      Clear Range
                    </Button>
                  </div>
                </div>

                {/* Results Display */}
                <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                  {/* Revenue Result */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <DollarSign className="w-16 h-16 text-indigo-600" />
                    </div>
                    <p className="text-sm font-semibold text-indigo-800/70 uppercase tracking-wider mb-2">Earnings</p>
                    <p className="text-3xl font-black text-indigo-700 relative z-10 break-words">
                      {formatCurrency(customRangeStats.revenue)}
                    </p>
                    {(customDateRange.startDate || customDateRange.endDate) ? (
                      <p className="text-xs text-indigo-600/70 font-medium mt-2">In selected period</p>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium mt-2">Select dates to calculate</p>
                    )}
                  </div>

                  {/* Orders Result */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Orders</p>
                    <p className="text-3xl font-black text-slate-800">
                      {customRangeStats.orders}
                    </p>
                  </div>

                  {/* Avg Value Result */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Avg Value</p>
                    <p className="text-3xl font-black text-slate-800 break-words">
                      {formatCurrency(customRangeStats.avgValue)}
                    </p>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Insights Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-800">Customer Analytics</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-orange-50 border border-orange-100/50 flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-2xl font-black text-orange-700">{realtimeData.activeUsers}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-orange-600/70">Active Users Now</div>
                </div>
                <div className="p-6 rounded-2xl bg-pink-50 border border-pink-100/50 flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-pink-600" />
                  </div>
                  <div className="text-2xl font-black text-pink-700">{realtimeData.totalViews}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-pink-600/70">Total Page Views</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>
)
}
                                              
