import { useState, useEffect } from 'react'
import { Clock, ChefHat, CheckCircle, X, AlertCircle, RefreshCw, Filter, Users, DollarSign, TrendingUp, Calendar, Bell, Receipt, Search, MoreVertical, ArrowUpRight, ArrowDownRight, Minus, Package, Utensils, Coffee, Pizza } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useOrderManagement, ORDER_STATUS, ORDER_STATUS_CONFIG } from '@/hooks/useOrderManagement'

const OrderManagement = ({ restaurantId }) => {
  const { orders, loading, refreshOrders, updateStatus } = useOrderManagement(restaurantId)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderHistory, setShowOrderHistory] = useState(false)

  // Filter orders by status
  const filteredOrders = statusFilter === 'ALL' 
    ? orders 
    : orders.filter(order => order.status === statusFilter)

  // Sort orders by creation time (newest first)
  const sortedOrders = [...filteredOrders].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
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
    ordered: orders.filter(o => o.status === ORDER_STATUS.ORDERED).length,
    preparing: orders.filter(o => o.status === ORDER_STATUS.PREPARING).length,
    ready: orders.filter(o => o.status === ORDER_STATUS.READY).length,
    served: orders.filter(o => o.status === ORDER_STATUS.SERVED).length,
    billRequested: orders.filter(o => o.status === ORDER_STATUS.BILL_REQUESTED).length,
    finished: orders.filter(o => o.status === ORDER_STATUS.FINISHED).length,
    cancelled: orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length
  }

  // Calculate total revenue
  const totalRevenue = orders
    .filter(o => o.status === ORDER_STATUS.FINISHED)
    .reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage and track restaurant orders in real-time</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={refreshOrders} variant="outline" size="sm" className="h-9">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" className="h-9">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
              <Button 
                size="sm"
                onClick={() => setShowOrderHistory(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white h-9"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Order History
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                  <div className="flex items-center mt-2">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+12% from yesterday</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Preparing</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.preparing}</p>
                  <div className="flex items-center mt-2">
                    <Minus className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500">No change</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ready</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.ready}</p>
                  <div className="flex items-center mt-2">
                    <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-xs text-red-600">-8% from yesterday</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Served</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.served}</p>
                  <div className="flex items-center mt-2">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+15% from yesterday</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Utensils className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bill Requested</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.billRequested}</p>
                  <div className="flex items-center mt-2">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+5% from yesterday</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
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
                  <SelectItem value={ORDER_STATUS.PREPARING}>Preparing</SelectItem>
                  <SelectItem value={ORDER_STATUS.READY}>Ready</SelectItem>
                  <SelectItem value={ORDER_STATUS.SERVED}>Served</SelectItem>
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
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.PREPARING)}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            <ChefHat className="w-4 h-4 mr-1" />
                            Start Preparing
                          </Button>
                        )}
                        
                        {order.status === ORDER_STATUS.PREPARING && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.READY)}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Ready
                          </Button>
                        )}
                        
                        {order.status === ORDER_STATUS.READY && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.SERVED)}
                            className="bg-purple-500 hover:bg-purple-600 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Served
                          </Button>
                        )}
                        
                        {order.status === ORDER_STATUS.SERVED && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.BILL_REQUESTED)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white"
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Request Bill
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.FINISHED)}
                              className="bg-gray-500 hover:bg-gray-600 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Finished
                            </Button>
                          </>
                        )}
                        
                        {order.status === ORDER_STATUS.BILL_REQUESTED && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.FINISHED)}
                            className="bg-gray-500 hover:bg-gray-600 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Finished
                          </Button>
                        )}
                        
                        {(order.status === ORDER_STATUS.ORDERED || order.status === ORDER_STATUS.PREPARING) && (
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
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrder(order)}
                          className="border-purple-200 text-purple-600 hover:bg-purple-50"
                        >
                          <Calendar className="w-4 h-4 mr-1" />
                          History
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order History Modal */}
      {showOrderHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
                <Button
                  onClick={() => setShowOrderHistory(false)}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No orders found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((order) => (
                      <Card key={order.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">Order #{order.id.slice(-6)}</h3>
                              <p className="text-sm text-gray-600">Table {order.tableNumber}</p>
                            </div>
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Order Date & Time:</p>
                            <p className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">Order Timeline:</p>
                            <div className="space-y-2">
                              {order.statusHistory.map((history, index) => {
                                const statusConfig = ORDER_STATUS_CONFIG[history.status]
                                return (
                                  <div key={index} className="flex items-start gap-3 text-sm">
                                    <span className="text-lg">{statusConfig.icon}</span>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">
                                          {statusConfig.label}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(history.timestamp).toLocaleString()}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-600 mt-1">{history.note}</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Total Amount:</span>
                              <span className="font-semibold text-gray-900">
                                ${order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Individual Order History Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
                  <p className="text-sm text-gray-600 mt-1">Order #{selectedOrder.id.slice(-6)} - Table {selectedOrder.tableNumber}</p>
                </div>
                <Button
                  onClick={() => setSelectedOrder(null)}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Order Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Order Date & Time:</p>
                      <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Current Status:</p>
                      <Badge className={getStatusColor(selectedOrder.status)}>
                        {getStatusLabel(selectedOrder.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">×{item.quantity}</p>
                        </div>
                        <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-3 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-lg">
                        ${selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Timeline */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Order Timeline</h3>
                  <div className="space-y-3">
                    {selectedOrder.statusHistory.map((history, index) => {
                      const statusConfig = ORDER_STATUS_CONFIG[history.status]
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                            {statusConfig.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">
                                {statusConfig.label}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(history.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default OrderManagement
