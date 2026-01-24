import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Eye, ShoppingCart, DollarSign, Star, BarChart3, PieChart, Calendar, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Load analytics data from localStorage
const loadAnalytics = () => {
  try {
    const saved = localStorage.getItem('menuAnalytics')
    return saved ? JSON.parse(saved) : {
      itemViews: {},
      itemOrders: {},
      totalViews: 0,
      totalOrders: 0,
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error loading analytics:', error)
    return {
      itemViews: {},
      itemOrders: {},
      totalViews: 0,
      totalOrders: 0,
      lastUpdated: new Date().toISOString()
    }
  }
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState({})
  const [menuItems, setMenuItems] = useState([])
  const [timeRange, setTimeRange] = useState('7days')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    setAnalytics(loadAnalytics())
    // Load menu items
    const savedItems = localStorage.getItem('menuItems')
    if (savedItems) {
      setMenuItems(JSON.parse(savedItems))
    }
  }, [])

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
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalViews || 0}</p>
                    <p className="text-sm text-gray-600">Total Views</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      +12% from last week
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{analytics.totalOrders || 0}</p>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <Badge variant="secondary" className="text-xs mt-1 bg-green-100 text-green-800">
                      +8% from last week
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">₹{(analytics.totalOrders * 150).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Revenue</p>
                    <Badge variant="secondary" className="text-xs mt-1 bg-purple-100 text-purple-800">
                      +15% from last week
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{menuItems.length}</p>
                    <p className="text-sm text-gray-600">Menu Items</p>
                    <Badge variant="secondary" className="text-xs mt-1 bg-orange-100 text-orange-800">
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Revenue chart will appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-green-600" />
                  Category Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Category chart will appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Viewed Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Most Viewed Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topViewed.map((entry, index) => (
                    <div key={entry.item._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{entry.item.name}</p>
                          <p className="text-sm text-gray-500">{entry.item.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{entry.count} views</p>
                        <p className="text-sm text-gray-500">{entry.percentage}%</p>
                      </div>
                    </div>
                  ))}
                  {topViewed.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No view data available yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Ordered Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                  Most Ordered Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topOrdered.map((entry, index) => (
                    <div key={entry.item._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{entry.item.name}</p>
                          <p className="text-sm text-gray-500">{entry.item.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{entry.count} orders</p>
                        <p className="text-sm text-gray-500">{entry.percentage}%</p>
                      </div>
                    </div>
                  ))}
                  {topOrdered.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No order data available yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(categoryStats).map(([category, stats]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{category}</p>
                        <p className="text-sm text-gray-500">
                          {stats.items} items • Avg: ₹{stats.avgPrice.toFixed(0)}
                        </p>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-blue-600">{stats.views} views</span>
                        <span className="text-green-600">{stats.orders} orders</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Views</span>
                        <span>{analytics.totalViews > 0 ? ((stats.views / analytics.totalViews) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <Progress 
                        value={analytics.totalViews > 0 ? (stats.views / analytics.totalViews) * 100 : 0} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sales Analytics</h3>
              <p className="text-gray-600">Detailed sales analytics will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Insights</h3>
              <p className="text-gray-600">Customer behavior analytics will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
