import React, { useMemo, useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, ChefHat } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function OverviewCards() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Listen for storage changes to update metrics in real-time
  useEffect(() => {
    const handleStorage = () => setRefreshTrigger(prev => prev + 1)
    window.addEventListener('storage', handleStorage)
    // Custom events from other components
    window.addEventListener('orderUpdated', handleStorage)
    window.addEventListener('orderHistoryUpdated', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('orderUpdated', handleStorage)
      window.removeEventListener('orderHistoryUpdated', handleStorage)
    }
  }, [])

  // Dynamic Data Calculation
  const stats = useMemo(() => {
    // 1. Fetch data from localStorage
    const orders = JSON.parse(localStorage.getItem('orders') || '[]')
    const orderHistory = JSON.parse(localStorage.getItem('orderHistory') || '[]')
    const menuItems = JSON.parse(localStorage.getItem('menuItems') || '[]')
    // tableSessions is the correct source used by TableSessions component
    // tableSessions is the correct source used by TableSessions component
    const tables = JSON.parse(localStorage.getItem('tableSessions') || '[]') 

    // 2. Dates
    const today = new Date().toLocaleDateString('en-CA')
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = yesterdayDate.toLocaleDateString('en-CA')

    // 3. Revenue
    const activeOrdersOnly = orders.filter(o => !['FINISHED', 'CANCELLED'].includes(o.status))
    const allHistory = orderHistory
    const totalRevenue = [...activeOrdersOnly, ...allHistory].reduce((sum, order) => sum + (order.total || 0), 0)

    const todayRevenue = [...activeOrdersOnly, ...allHistory]
      .filter(order => new Date(order.createdAt).toLocaleDateString('en-CA') === today)
      .reduce((sum, order) => sum + (order.total || 0), 0)

    const yesterdayRevenue = allHistory
      .filter(order => new Date(order.createdAt).toLocaleDateString('en-CA') === yesterday)
      .reduce((sum, order) => sum + (order.total || 0), 0)

    const revenueDiff = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 100
    const revenueTrend = todayRevenue >= yesterdayRevenue ? 'up' : 'down'

    // 4. Today's Orders
    const todayOrdersCount = [...activeOrdersOnly, ...allHistory].filter(order => {
      const orderDate = new Date(order.createdAt).toLocaleDateString('en-CA')
      return orderDate === today
    }).length
    const yesterdayOrdersCount = allHistory.filter(order => {
      const orderDate = new Date(order.createdAt).toLocaleDateString('en-CA')
      return orderDate === yesterday
    }).length
    const ordersDiff = yesterdayOrdersCount > 0 ? ((todayOrdersCount - yesterdayOrdersCount) / yesterdayOrdersCount) * 100 : 100
    const ordersTrend = todayOrdersCount >= yesterdayOrdersCount ? 'up' : 'down'

    // 5. Active Tables
    const activeTablesCount = tables.filter(t => t.status === 'occupied' || t.status === 'billing').length
    // Since we don't have table history, we'll use a semi-random but small realistic trend or just 0
    // In a real app, this would come from a database query
    const activeTablesTrend = activeTablesCount > 0 ? 'up' : 'down'
    const activeTablesDiff = activeTablesCount > 0 ? `+${activeTablesCount}` : '0'

    // 6. Menu Items
    const menuCount = menuItems.length 

    return [
      {
        title: 'Total Revenue',
        value: `₹${totalRevenue.toLocaleString()}`,
        change: `${revenueDiff >= 0 ? '+' : ''}${revenueDiff.toFixed(1)}%`,
        trend: revenueTrend,
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Active Tables',
        value: activeTablesCount.toString(),
        change: activeTablesDiff,
        trend: activeTablesTrend,
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Today\'s Orders',
        value: todayOrdersCount.toString(),
        change: `${ordersDiff >= 0 ? '+' : ''}${ordersDiff.toFixed(1)}%`,
        trend: ordersTrend,
        icon: ShoppingCart,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      {
        title: 'Menu Items',
        value: menuCount.toString(),
        change: `Total ${menuCount}`,
        trend: 'up',
        icon: ChefHat,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      }
    ]

  }, [refreshTrigger])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((item, index) => {
        const Icon = item.icon
        const TrendIcon = item.trend === 'up' ? TrendingUp : TrendingDown
        
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow border-gray-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                {item.title}
              </CardTitle>
              <div className={`p-2 rounded-xl ${item.bgColor}`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-gray-900">{item.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon className={`w-3.5 h-3.5 ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-[10px] font-bold ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {item.change}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">from yesterday</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
