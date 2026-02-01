import { useState, useEffect } from 'react'
import { Clock, Receipt, CheckCircle, X, AlertCircle, RefreshCw, Filter, Users, DollarSign, TrendingUp, Calendar, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrderManagement, ORDER_STATUS, ORDER_STATUS_CONFIG } from '@/hooks/useOrderManagement'

const OrderManagement = ({ restaurantId }) => {
  const { orders, loading, refreshOrders, updateStatus } = useOrderManagement(restaurantId)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [activeTab, setActiveTab] = useState('active')

  // Filter orders by status
  const filteredOrders = statusFilter === 'ALL' 
    ? orders 
    : orders.filter(order => order.status === statusFilter)

  // Sort orders by creation time (newest first)
  const sortedOrders = [...filteredOrders].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  )

  // Active orders (not finished or cancelled)
  const activeOrders = orders.filter(order => 
    order.status !== ORDER_STATUS.FINISHED && order.status !== ORDER_STATUS.CANCELLED
  )

  // Bill requested orders
  const billRequestedOrders = orders.filter(order => 
    order.status === ORDER_STATUS.BILL_REQUESTED
  )

  // Update order status
  const handleStatusUpdate = (orderId, newStatus) => {
    const updatedOrder = updateStatus(orderId, newStatus)
    if (updatedOrder) {
      console.log('Order status updated:', updatedOrder)
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    return ORDER_STATUS_CONFIG[status]?.color || 'bg-gray-100 text-gray-800'
  }

  // Get status icon
  const getStatusIcon = (status) => {
    return ORDER_STATUS_CONFIG[status]?.icon || '📝'
  }

  // Get status label
  const getStatusLabel = (status) => {
    return ORDER_STATUS_CONFIG[status]?.label || status
  }

  // Calculate statistics
  const stats = {
    total: orders.length,
    active: activeOrders.length,
    billRequested: billRequestedOrders.length,
    finished: orders.filter(o => o.status === ORDER_STATUS.FINISHED).length,
    cancelled: orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length
  }

  // Calculate total revenue
  const totalRevenue = orders
    .filter(o => o.status === ORDER_STATUS.FINISHED)
    .reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">Track and manage customer orders in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={refreshOrders} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
                <p className="text-blue-100 text-xs mt-2">All time</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Active Orders</p>
                <p className="text-3xl font-bold mt-1">{stats.active}</p>
                <p className="text-green-100 text-xs mt-2">Currently processing</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Bill Requested</p>
                <p className="text-3xl font-bold mt-1">{stats.billRequested}</p>
                <p className="text-yellow-100 text-xs mt-2">Awaiting payment</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Revenue</p>
                <p className="text-3xl font-bold mt-1">₹{totalRevenue.toFixed(0)}</p>
                <p className="text-emerald-100 text-xs mt-2">Total earnings</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Finished</p>
                <p className="text-3xl font-bold mt-1">{stats.finished}</p>
                <p className="text-purple-100 text-xs mt-2">Completed today</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Orders</CardTitle>
              <p className="text-gray-600 text-sm">Manage customer orders and status updates</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Orders</SelectItem>
                  <SelectItem value={ORDER_STATUS.ORDERED}>Ordered</SelectItem>
                  <SelectItem value={ORDER_STATUS.BILL_REQUESTED}>Bill Requested</SelectItem>
                  <SelectItem value={ORDER_STATUS.FINISHED}>Finished</SelectItem>
                  <SelectItem value={ORDER_STATUS.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                {sortedOrders.length} orders
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading orders...</p>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">
                {statusFilter === 'ALL' 
                  ? "No orders yet" 
                  : `No orders with status "${getStatusLabel(statusFilter)}"`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedOrders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                              T{order.tableNumber}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">Table {order.tableNumber}</h3>
                              <Badge className={getStatusColor(order.status)}>
                                <span className="mr-1">{getStatusIcon(order.status)}</span>
                                {getStatusLabel(order.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Order #{order.id} • {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">₹{order.total.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">{order.items.length} items</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">×{item.quantity}</span>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                                  <p className="text-sm text-gray-500">{item.type}</p>
                                </div>
                              </div>
                              <span className="font-semibold text-gray-900">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>Est. time: {order.estimatedTime || '15-20'} mins</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Subtotal:</span>
                            <span className="font-medium">₹{order.subtotal.toFixed(2)}</span>
                            <span className="text-sm text-gray-500">Tax:</span>
                            <span className="font-medium">₹{order.tax.toFixed(2)}</span>
                            <span className="font-bold text-gray-900">Total:</span>
                            <span className="font-bold text-blue-600">₹{order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-4">
                        {order.status === ORDER_STATUS.ORDERED && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.BILL_REQUESTED)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Request Bill
                          </Button>
                        )}
                        
                        {order.status === ORDER_STATUS.BILL_REQUESTED && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.FINISHED)}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Finished
                          </Button>
                        )}
                        
                        {(order.status === ORDER_STATUS.ORDERED || order.status === ORDER_STATUS.BILL_REQUESTED) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.CANCELLED)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default OrderManagement
