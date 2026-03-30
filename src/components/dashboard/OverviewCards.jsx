import React, { useMemo, useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, ChefHat } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useOrderManagement } from '@/hooks/useOrderManagement'
import { useTableSessions } from '@/hooks/useTableSessions'
import { getMenuItems, supabase } from '@/lib/api'

export default function OverviewCards({ restaurantId = 'default' }) {
  const { stats: orderStats, orders: activeOrders, orderHistory } = useOrderManagement(restaurantId)
  const { stats: tableStats } = useTableSessions(restaurantId)
  const [menuCount, setMenuCount] = useState(0)

  // Fetch Menu Items Count
  useEffect(() => {
    if (restaurantId && !restaurantId.includes('@')) {
      getMenuItems(restaurantId)
        .then(items => setMenuCount(items?.length || 0))
        .catch(err => console.error('Error fetching menu items count:', err))
    }
  }, [restaurantId])

  // Dynamic Data Calculation
  const stats = useMemo(() => {
    // 1. Revenue Calculations
    const totalRevenue = orderStats.totalRevenue || 0
    
    // Today vs Yesterday
    const today = new Date().toLocaleDateString('en-CA')
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = yesterdayDate.toLocaleDateString('en-CA')

    const allOrders = [...activeOrders, ...orderHistory]
    const todayRevenue = allOrders
      .filter(o => new Date(o.createdAt).toLocaleDateString('en-CA') === today)
      .reduce((sum, o) => sum + (o.total || 0), 0)
    
    const yesterdayRevenue = orderHistory
      .filter(o => new Date(o.createdAt).toLocaleDateString('en-CA') === yesterday)
      .reduce((sum, o) => sum + (o.total || 0), 0)

    const revenueDiff = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 100
    
    // Order Counts
    const todayOrdersCount = allOrders.filter(o => new Date(o.createdAt).toLocaleDateString('en-CA') === today).length
    const yesterdayOrdersCount = orderHistory.filter(o => new Date(o.createdAt).toLocaleDateString('en-CA') === yesterday).length
    const ordersDiff = yesterdayOrdersCount > 0 ? ((todayOrdersCount - yesterdayOrdersCount) / yesterdayOrdersCount) * 100 : 100

    // Compute active vs total tables for better UI transparency
    const activeTables = (tableStats.occupied || 0) + (tableStats.billing || 0)
    const totalTables = tableStats.total || 0

    return [
      {
        title: 'Total Revenue',
        value: `₹${totalRevenue.toLocaleString()}`,
        change: `${revenueDiff >= 0 ? '+' : ''}${revenueDiff.toFixed(1)}%`,
        trend: todayRevenue >= yesterdayRevenue ? 'up' : 'down',
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Active Tables',
        value: activeTables.toString(),
        change: `of ${totalTables} tables`,
        trend: activeTables > 0 ? 'up' : 'down',
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Today\'s Orders',
        value: todayOrdersCount.toString(),
        change: `${ordersDiff >= 0 ? '+' : ''}${ordersDiff.toFixed(1)}%`,
        trend: todayOrdersCount >= yesterdayOrdersCount ? 'up' : 'down',
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
  }, [orderStats, activeOrders, orderHistory, tableStats, menuCount])

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
