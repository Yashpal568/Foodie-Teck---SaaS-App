import React, { useMemo, useState, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle, Users, ChefHat } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ORDER_STATUS_CONFIG, ORDER_STATUS } from '@/hooks/useOrderManagement'

const statusConfig = {
  [ORDER_STATUS.ORDERED]: {
    label: 'Placed',
    color: 'bg-blue-100 text-blue-800',
    icon: Clock
  },
  [ORDER_STATUS.PREPARING]: {
    label: 'Preparing',
    color: 'bg-orange-100 text-orange-800',
    icon: ChefHat
  },
  [ORDER_STATUS.READY]: {
    label: 'Ready',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  [ORDER_STATUS.SERVED]: {
    label: 'Served',
    color: 'bg-purple-100 text-purple-800',
    icon: CheckCircle
  },
  [ORDER_STATUS.BILL_REQUESTED]: {
    label: 'Bill Req',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertCircle
  },
  [ORDER_STATUS.FINISHED]: {
    label: 'Finished',
    color: 'bg-gray-100 text-gray-800',
    icon: CheckCircle
  },
  [ORDER_STATUS.CANCELLED]: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle
  }
}

export default function RecentOrders() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Listen for storage changes to update in real-time
  useEffect(() => {
    const handleStorage = () => setRefreshTrigger(prev => prev + 1)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('orderUpdated', handleStorage)
    window.addEventListener('orderHistoryUpdated', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('orderUpdated', handleStorage)
      window.removeEventListener('orderHistoryUpdated', handleStorage)
    }
  }, [])

  const orders = useMemo(() => {
    try {
      const currentOrders = JSON.parse(localStorage.getItem('orders') || '[]')
      const orderHistory = JSON.parse(localStorage.getItem('orderHistory') || '[]')
      
      // Filter out FINISHED and CANCELLED from currentOrders to avoid double-counting with orderHistory
      const activeOrdersOnly = currentOrders.filter(o => !['FINISHED', 'CANCELLED'].includes(o.status))
      
      // Merge and sort by time
      return [...activeOrdersOnly, ...orderHistory]
        .sort((a, b) => new Date(b.createdAt || b.completedAt || 0).getTime() - new Date(a.createdAt || a.completedAt || 0).getTime())
        .slice(0, 5) // Show latest 5
    } catch (e) {
      console.error('Error loading orders:', e)
      return []
    }
  }, [refreshTrigger])

  return (
    <Card className="border-gray-100 shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Users className="w-5 h-5 text-blue-600" />
          Recent Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.length > 0 ? orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig[ORDER_STATUS.ORDERED]
            const StatusIcon = status.icon
            
            // Basic relative time calculation
            const orderDate = new Date(order.createdAt)
            const diffInMins = Math.floor((new Date().getTime() - orderDate.getTime()) / 60000)
            const timeDisplay = diffInMins < 1 ? 'Just now' : `${diffInMins} min ago`

            return (
              <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-50 rounded-2xl hover:bg-gray-50 transition-all gap-3 overflow-hidden group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <span className="text-[10px] font-black text-blue-600 uppercase">{order.tableId || order.tableNumber || 'TA'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{order.customerName || 'Guest'}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight truncate">
                      {(order.items?.length || 0)} items • ₹{(order.total || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="text-[10px] text-gray-400 font-bold tabular-nums">{order.time || timeDisplay}</span>
                  <Badge className={`${status.color} shadow-sm border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </div>
            )
          }) : (
            <div className="py-12 text-center bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No recent orders yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
