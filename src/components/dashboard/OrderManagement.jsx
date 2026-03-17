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
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import OrderNavbar from './OrderNavbar'
import OrderMobileNavbar from './OrderMobileNavbar'

const OrderManagement = ({ restaurantId, activeItem, setActiveItem, navigate }) => {
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
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
    <div className="min-h-screen bg-[#f8fafc]/50">
      <div className="hidden lg:block">
        <OrderNavbar 
          onRefresh={refreshOrders} 
          onShowHistory={() => setShowOrderHistory(true)} 
        />
      </div>
      <OrderMobileNavbar 
        onRefresh={refreshOrders} 
        onShowHistory={() => setShowOrderHistory(true)} 
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        navigate={navigate}
      />

      <div className="p-4 md:p-6 lg:p-8 space-y-6">

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-gray-900 tracking-tight">Orders</CardTitle>
              <p className="text-gray-500 text-xs sm:text-sm font-medium leading-relaxed max-w-sm">
                Manage customer orders and status updates in real-time.
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-white border-gray-200 rounded-xl h-10 font-medium">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-xl">
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
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-100/50 h-10 px-4 rounded-xl font-bold whitespace-nowrap">
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
              {sortedOrders.map((order) => (                <div key={order.id} className="p-4 sm:p-6 hover:bg-gray-50/50 transition-all border-b border-gray-100 last:border-0">
                  <div className="flex flex-col gap-4">
                    {/* Compact Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-blue-100 text-blue-600 font-bold border border-blue-200">
                            T{order.tableNumber}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-gray-900">Table {order.tableNumber}</h3>
                            <Badge className={`${getStatusColor(order.status)} border-none shadow-sm h-6 text-[10px] font-bold uppercase tracking-wider`}>
                              <span className="mr-1">{getStatusIcon(order.status)}</span>
                              {getStatusLabel(order.status)}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 font-medium truncate max-w-[200px] xs:max-w-xs">
                            <span className="text-blue-500 font-bold">#{order.id.slice(0, 8)}</span> • {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded-xl">
                        <p className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">₹{order.total.toFixed(2)}</p>
                        <Badge variant="outline" className="text-[10px] font-bold border-gray-200 bg-white sm:bg-transparent px-2 h-5">
                          {order.items.length} items
                        </Badge>
                      </div>
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
                        
                        <Separator className="my-4" />
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg w-fit">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>EST. TIME: {order.estimatedTime || '15-20'} MINS</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-bold text-gray-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400 uppercase tracking-tighter text-[10px]">Sub</span>
                              <span className="text-gray-900 underline decoration-blue-200 underline-offset-4 decoration-2">₹{order.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400 uppercase tracking-tighter text-[10px]">Tax</span>
                              <span className="text-gray-900">₹{order.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                              <span className="text-blue-600 uppercase tracking-tighter text-[10px]">Total</span>
                              <span className="text-lg font-black text-blue-600">₹{order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                        {order.status === ORDER_STATUS.ORDERED && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.PREPARING)}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 px-4"
                          >
                            <ChefHat className="w-4 h-4 mr-2" />
                            Start Preparing
                          </Button>
                        )}
                        
                        {order.status === ORDER_STATUS.PREPARING && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.READY)}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 px-4"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Ready
                          </Button>
                        )}
                        
                        {order.status === ORDER_STATUS.READY && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.SERVED)}
                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 px-4"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Served
                          </Button>
                        )}
                        
                        {order.status === ORDER_STATUS.SERVED && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.BILL_REQUESTED)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-500/20 px-4"
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Request Bill
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.FINISHED)}
                              className="bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl shadow-lg shadow-gray-600/20 px-4"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark Finished
                            </Button>
                          </>
                        )}
                        
                        {order.status === ORDER_STATUS.BILL_REQUESTED && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.FINISHED)}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl shadow-lg shadow-gray-600/20 px-4"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Finished
                          </Button>
                        )}
                        
                        {(order.status === ORDER_STATUS.ORDERED || order.status === ORDER_STATUS.PREPARING) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.CANCELLED)}
                            className="border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedOrder(order)}
                          className="text-purple-600 hover:bg-purple-50 font-bold rounded-xl ml-auto"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          History
                        </Button>
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
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
