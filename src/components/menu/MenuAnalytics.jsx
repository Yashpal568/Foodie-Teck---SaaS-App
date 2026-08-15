import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Eye, ShoppingCart, DollarSign, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'

// Real-time Visit & View Tracker with Deduplication Guard
const recentVisits = new Set()

export const trackMenuVisit = async (restaurantId, tableNumber) => {
  if (!restaurantId || restaurantId === 'default') return
  
  // Deduplicate rapid / StrictMode double-triggers within 5 seconds for the same tab
  const dedupeKey = `${restaurantId}_${tableNumber || 1}`
  if (recentVisits.has(dedupeKey)) {
    return
  }
  recentVisits.add(dedupeKey)
  setTimeout(() => recentVisits.delete(dedupeKey), 5000)

  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId)
    let uuid = isUUID ? restaurantId : null
    
    if (!uuid && restaurantId.includes('@')) {
      const { data } = await supabase.from('restaurants').select('id').eq('email', restaurantId.toLowerCase()).maybeSingle()
      if (data?.id) uuid = data.id
    }

    if (uuid && tableNumber) {
      await supabase
        .from('table_sessions')
        .upsert({
          restaurant_id: uuid,
          table_number: parseInt(tableNumber) || 1,
          last_activity: new Date().toISOString()
        }, { onConflict: 'restaurant_id, table_number' })
    }

    const key = `servora_real_views_${uuid || restaurantId}`
    const cur = Number(localStorage.getItem(key) || 0) + 1
    localStorage.setItem(key, String(cur))

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('servora_menu_visit', { detail: { restaurantId: uuid || restaurantId, tableNumber } }))
    }
  } catch (e) {
    console.warn('trackMenuVisit notice:', e)
  }
}

export const trackItemView = (itemId) => {
  if (!itemId) return
  try {
    const key = `servora_item_view_${itemId}`
    const cur = Number(localStorage.getItem(key) || 0) + 1
    localStorage.setItem(key, String(cur))
  } catch (e) {}
}

export const trackItemOrder = (itemId) => {
  if (!itemId) return
  try {
    const key = `servora_item_order_${itemId}`
    const cur = Number(localStorage.getItem(key) || 0) + 1
    localStorage.setItem(key, String(cur))
  } catch (e) {}
}

export default function MenuAnalytics({ menuItems, restaurantId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [analytics, setAnalytics] = useState({ itemOrders: {}, totalOrders: 0 })

  useEffect(() => {
    async function loadCloudAnalytics() {
      if (!restaurantId || !isOpen) return;
      try {
        const { data: dbOrders, error } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurantId)
        
        if (error) throw error

        let tOrders = 0;
        let itemFrequency = {};

        if (dbOrders) {
           dbOrders.forEach(order => {
              if (order.status === 'FINISHED') {
                 tOrders += 1;
                 const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                 orderItems.forEach(item => {
                    const id = item.id || item._id;
                    if (id) {
                       itemFrequency[id] = (itemFrequency[id] || 0) + (item.quantity || 1);
                    }
                 })
              }
           })
        }

        setAnalytics({
           itemOrders: itemFrequency,
           totalOrders: tOrders
        })
      } catch (err) {
        console.error('Error fetching menu cloud analytics', err)
      }
    }
    
    // Only load when dialog opens to save requests
    loadCloudAnalytics()
  }, [restaurantId, isOpen])

  const getTopItems = (limit = 5) => {
    const data = analytics.itemOrders || {}
    return Object.entries(data)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, limit)
      .map(([itemId, count]) => {
        const item = menuItems.find(i => i._id === itemId || i.id === itemId)
        return {
          item,
          count,
          percentage: analytics.totalOrders > 0 ? ((count / analytics.totalOrders) * 100).toFixed(1) : 0
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
          orders: 0,
          avgPrice: 0,
          totalPrice: 0
        }
      }
      
      categoryStats[item.category].items++
      categoryStats[item.category].orders += (analytics.itemOrders[item._id] || analytics.itemOrders[item.id] || 0)
      categoryStats[item.category].totalPrice += Number(item.price) || 0
    })
    
    return categoryStats
  }

  const topOrdered = getTopItems(5)
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
          <DialogDescription className="sr-only">Detailed analysis of menu item views, orders, and category performance.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{analytics.totalOrders * 2 || 0}</p>
                    <p className="text-sm text-gray-600">Estimated Views</p>
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
                  <Star className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{Object.keys(categoryStats).length}</p>
                    <p className="text-sm text-gray-600">Categories</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
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
                    <div key={entry.item._id || entry.item.id} className="flex items-center justify-between">
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
                        <span className="text-green-600 font-medium">{stats.orders} orders</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Orders</span>
                        <span>{analytics.totalOrders > 0 ? ((stats.orders / analytics.totalOrders) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <Progress 
                        value={analytics.totalOrders > 0 ? (stats.orders / analytics.totalOrders) * 100 : 0} 
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
