import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Eye, ShoppingCart, DollarSign, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

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

// Save analytics data to localStorage
const saveAnalytics = (analytics) => {
  try {
    localStorage.setItem('menuAnalytics', JSON.stringify(analytics))
  } catch (error) {
    console.error('Error saving analytics:', error)
  }
}

// Track item view
export const trackItemView = (itemId) => {
  const analytics = loadAnalytics()
  analytics.itemViews[itemId] = (analytics.itemViews[itemId] || 0) + 1
  analytics.totalViews++
  analytics.lastUpdated = new Date().toISOString()
  saveAnalytics(analytics)
}

// Track item order
export const trackItemOrder = (itemId) => {
  const analytics = loadAnalytics()
  analytics.itemOrders[itemId] = (analytics.itemOrders[itemId] || 0) + 1
  analytics.totalOrders++
  analytics.lastUpdated = new Date().toISOString()
  saveAnalytics(analytics)
}

export default function MenuAnalytics({ menuItems }) {
  const [isOpen, setIsOpen] = useState(false)
  const [analytics, setAnalytics] = useState({})

  useEffect(() => {
    setAnalytics(loadAnalytics())
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
    
    return categoryStats
  }

  const topViewed = getTopItems('views')
  const topOrdered = getTopItems('orders')
  const categoryStats = getCategoryStats()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TrendingUp className="w-4 h-4 mr-2" />
          Analytics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Menu Analytics & Insights</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{analytics.totalViews || 0}</p>
                    <p className="text-sm text-gray-600">Total Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{analytics.totalOrders || 0}</p>
                    <p className="text-sm text-gray-600">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{menuItems.length}</p>
                    <p className="text-sm text-gray-600">Menu Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{Object.keys(categoryStats).length}</p>
                    <p className="text-sm text-gray-600">Categories</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
        </div>
      </DialogContent>
    </Dialog>
  )
}
