import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, Eye, ShoppingCart, DollarSign, Star, BarChart3, PieChart, Calendar, Filter, Users, Clock, CreditCard, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

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
  const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90
  const trend = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayRevenue = orderHistory
      .filter(order => order.completedAt && order.completedAt.startsWith(dateStr))
      .reduce((sum, order) => sum + (order.revenue || 0), 0)
    
    trend.push({
      date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      revenue: dayRevenue,
      orders: orderHistory.filter(order => order.completedAt && order.completedAt.startsWith(dateStr)).length
    })
  }
  
  return trend
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState({})
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueTrend.slice(-7).map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{day.date}</span>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-xs">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((day.revenue / Math.max(...revenueTrend.map(d => d.revenue))) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-20 text-right">
                          {formatCurrency(day.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-600" />
                  Category Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryDistribution.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-${['blue', 'green', 'purple', 'orange'][index % 4]}-500`} />
                        <span className="text-sm font-medium text-gray-700">{category.category}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-xs">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-${['blue', 'green', 'purple', 'orange'][index % 4]}-500 rounded-full transition-all duration-300`}
                              style={{ width: `${category.percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(category.revenue)}
                          </div>
                          <div className="text-xs text-gray-500">{category.percentage}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
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
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(realtimeData.totalRevenue)}</div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{realtimeData.totalOrders}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(realtimeData.avgOrderValue)}</div>
                  <div className="text-sm text-gray-600">Average Order Value</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Insights Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Customer Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{realtimeData.activeUsers}</div>
                  <div className="text-sm text-gray-600">Active Users Now</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{realtimeData.totalViews}</div>
                  <div className="text-sm text-gray-600">Total Page Views</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
                                              
