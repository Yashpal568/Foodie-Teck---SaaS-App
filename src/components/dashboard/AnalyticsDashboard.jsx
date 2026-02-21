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
  TrendingUp as TrendingUpIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
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
    
    return {
      itemViews: {},
      itemOrders: {},
      totalViews: 0,
      totalOrders: 0,
      totalRevenue: parseFloat(savedRevenue) || 0,
      orderHistory: savedOrderHistory ? JSON.parse(savedOrderHistory) : [],
      lastUpdated: new Date().toISOString(),
      ...(saved ? JSON.parse(saved) : {})
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
      if (order.completedAt) {
        const date = new Date(order.completedAt)
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
        monthlyStats[monthKey].revenue += (order.revenue || 0)
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
      .filter(order => order.completedAt && order.completedAt.split('T')[0] === dateStr)
      .reduce((sum, order) => sum + (order.revenue || 0), 0)
    
    const dayOrders = orderHistory.filter(order => order.completedAt && order.completedAt.split('T')[0] === dateStr).length

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

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState({
    itemViews: {},
    itemOrders: {},
    totalViews: 0,
    totalOrders: 0,
    totalRevenue: 0,
    orderHistory: []
  })
  const [menuItems, setMenuItems] = useState([])
  const [timeRange, setTimeRange] = useState('7days')
  const [activeTab, setActiveTab] = useState('overview')
  const [realtimeData, setRealtimeData] = useState({
    totalViews: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    avgOrderValue: 0
  })

  // Real-time data updates
  useEffect(() => {
    const updateRealtimeData = () => {
      const currentAnalytics = loadAnalytics()
      const tables = JSON.parse(localStorage.getItem('tableSessions') || '[]')
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      
      const totalRevenue = currentAnalytics.totalRevenue || 0
      const totalOrders = currentAnalytics.orderHistory?.length || 0
      const totalViews = currentAnalytics.totalViews || 0
      const activeUsers = tables.filter(t => t.status === 'occupied').length
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      
      setRealtimeData({
        totalViews,
        totalOrders,
        totalRevenue,
        activeUsers,
        avgOrderValue
      })
    }

    updateRealtimeData()
    const interval = setInterval(updateRealtimeData, 5000) // Update every 5 seconds
    
    // Add storage listener for immediate updates
    window.addEventListener('storage', updateRealtimeData)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', updateRealtimeData)
    }
  }, [])

  useEffect(() => {
    setAnalytics(loadAnalytics())
    // Load menu items
    const savedItems = localStorage.getItem('menuItems')
    if (savedItems) {
      setMenuItems(JSON.parse(savedItems))
    }
  }, [])

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
      distribution[category] = (distribution[category] || 0) + (order.revenue || 0)
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
        const item = menuItems.find(i => i._id === itemId)
        return {
          item,
          count,
          percentage: analytics.totalViews > 0 ? (count / (type === 'views' ? analytics.totalViews : analytics.totalOrders) * 100).toFixed(1) : 0
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
      categoryStats[item.category].views += (analytics && analytics.itemViews && analytics.itemViews[item._id]) ? analytics.itemViews[item._id] : 0
      categoryStats[item.category].orders += (analytics && analytics.itemOrders && analytics.itemOrders[item._id]) ? analytics.itemOrders[item._id] : 0
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

  const topViewed = getTopItems('views')
  const topOrdered = getTopItems('orders')
  const categoryStats = getCategoryStats()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your restaurant's performance</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="all">All Time (Monthly)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="menu">Menu Performance</TabsTrigger>
          <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
          <TabsTrigger value="customers">Customer Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Real-time Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Views</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{realtimeData.totalViews.toLocaleString()}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">+12.5% from last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Orders</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{realtimeData.totalOrders.toLocaleString()}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">+8.3% from last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">{formatCurrency(realtimeData.totalRevenue)}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">+15.7% from last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Active Users</p>
                    <p className="text-2xl font-bold text-orange-900 mt-1">{realtimeData.activeUsers}</p>
                    <div className="flex items-center mt-2">
                      <Activity className="w-4 h-4 text-orange-500 mr-1" />
                      <span className="text-xs text-orange-600">Live now</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-pink-50 to-pink-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-pink-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-pink-900 mt-1">{formatCurrency(realtimeData.avgOrderValue)}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">+5.2% from last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
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
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
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
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold text-slate-800">Growth Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {revenueTrend.slice(-5).reverse().map((day, index) => (
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
                  <Button variant="ghost" className="w-full text-slate-600 text-xs py-2 h-auto" onClick={() => setTimeRange('all')}>
                    View Full History
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
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Top Viewed Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topViewed.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">{item.item?.name}</span>
                        <Badge variant="secondary">{item.count} views</Badge>
                      </div>
                      <span className="text-sm text-gray-500">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Top Ordered Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topOrdered.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">{item.item?.name}</span>
                        <Badge variant="secondary">{item.count} orders</Badge>
                      </div>
                      <span className="text-sm text-gray-500">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
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
  )
}
                                              
