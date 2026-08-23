import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useOrderManagement, ORDER_STATUS, ORDER_STATUS_CONFIG } from '@/hooks/useOrderManagement'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import OrderNavbar from './OrderNavbar'

const OrderManagement = ({ restaurantId, activeItem, setActiveItem, navigate }) => {
  const { orders, orderHistory, loading, refreshOrders, updateStatus } = useOrderManagement(restaurantId)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderHistory, setShowOrderHistory] = useState(false)

  // Merge active orders and history for the main view (Deduplicated by ID)
  const allAvailableOrders = useMemo(() => {
    const map = new Map()
    orderHistory.forEach(o => { if (o && o.id) map.set(o.id, o) })
    orders.forEach(o => { if (o && o.id) map.set(o.id, o) })
    return Array.from(map.values()).sort((a, b) => 
      new Date(b.createdAt || b.completedAt || 0).getTime() - new Date(a.createdAt || a.completedAt || 0).getTime()
    )
  }, [orders, orderHistory])

  // Filter orders by status
  const filteredOrders = statusFilter === 'ALL' 
    ? allAvailableOrders 
    : allAvailableOrders.filter(order => order.status === statusFilter)

  // Final sorted list for display
  const sortedOrders = filteredOrders


  // Update order status
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const updatedOrder = await updateStatus(orderId, newStatus)
      if (updatedOrder) {
        console.log('Order status updated:', updatedOrder)
      }
    } catch (e) {
      console.error('Failed to update status:', e)
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

  // Get status border color for cards
  const getStatusBorderColor = (status) => {
    const colors = {
      [ORDER_STATUS.ORDERED]: 'border-t-blue-500',
      [ORDER_STATUS.PENDING]: 'border-t-blue-500',
      [ORDER_STATUS.PREPARING]: 'border-t-orange-500',
      [ORDER_STATUS.READY]: 'border-t-green-500',
      [ORDER_STATUS.SERVED]: 'border-t-purple-500',
      [ORDER_STATUS.BILL_REQUESTED]: 'border-t-yellow-500',
      [ORDER_STATUS.FINISHED]: 'border-t-gray-800',
      [ORDER_STATUS.CANCELLED]: 'border-t-red-500',
    }
    return colors[status] || 'border-t-gray-200'
  }

  // Get status label
  const getStatusLabel = (status) => {
    return ORDER_STATUS_CONFIG[status]?.label || status
  }

  // Calculate statistics
  const stats = {
    total: allAvailableOrders.length,
    ordered: orders.filter(o => [ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING].includes(o.status)).length,
    preparing: orders.filter(o => o.status === ORDER_STATUS.PREPARING).length,
    ready: orders.filter(o => o.status === ORDER_STATUS.READY).length,
    served: orders.filter(o => o.status === ORDER_STATUS.SERVED).length,
    billRequested: orders.filter(o => o.status === ORDER_STATUS.BILL_REQUESTED).length,
    finished: orderHistory.filter(o => o.status === ORDER_STATUS.FINISHED).length,
    cancelled: orderHistory.filter(o => o.status === ORDER_STATUS.CANCELLED).length
  }


  // Calculate total revenue from all history and active finished orders
  const totalRevenue = allAvailableOrders
    .filter(o => o.status === ORDER_STATUS.FINISHED)
    .reduce((sum, order) => sum + (order.total || 0), 0)

  return (
    <div className="min-h-screen bg-[#f8fafc]/50">
      <div className="hidden lg:block">
        <OrderNavbar 
          onRefresh={refreshOrders} 
          onShowHistory={() => setShowOrderHistory(true)} 
        />
      </div>

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
          {loading && sortedOrders.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Synchronizing orders...</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4 bg-gray-50/50">
              {sortedOrders.map((order) => (
                <Card key={order.id} className={`overflow-hidden border border-gray-200 border-t-2 shadow-xs hover:shadow-md transition-all flex flex-col ${getStatusBorderColor(order.status)}`}>
                  {/* Header */}
                  <div className="p-2.5 border-b border-gray-100 bg-white flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-gray-900">
                        Table {order.tableNumber || order.table_number}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-400">#{order.id.slice(0, 5).toUpperCase()}</span>
                        <span className="text-[10px] font-medium text-gray-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`${getStatusColor(order.status)} border-none shadow-none text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 leading-none`}>
                        <span className="mr-0.5 scale-75">{getStatusIcon(order.status)}</span>
                        {getStatusLabel(order.status)}
                      </Badge>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                        <Clock className="w-2.5 h-2.5 text-blue-500" />
                        <span>{order.estimatedTime || '15-20'}M</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items KOT Style */}
                  <div className="bg-white p-2.5 flex-1">
                    <div className="bg-[#f8fafc] border border-gray-100 rounded-md p-2 h-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-1.5 mb-1.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Order Details</span>
                        <span className="text-[9px] font-bold text-gray-400">{order.items.length} Items</span>
                      </div>
                      <div className="space-y-2 max-h-30 overflow-y-auto pr-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="min-w-5 h-5 bg-white border border-gray-200 rounded flex items-center justify-center shadow-xs shrink-0">
                              <span className="text-[10px] font-black text-gray-700">{item.quantity}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[11px] text-gray-900 leading-tight truncate">{item.name}</h4>
                              {item.variant && item.variant !== 'full' && (
                                <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded-sm inline-block mt-0.5 border border-amber-100/50 leading-none">Half Plate</span>
                              )}
                              {item.notes && <p className="text-[8px] text-red-500 italic mt-0.5 truncate">Note: {item.notes}</p>}
                            </div>
                            <span className="font-bold text-[11px] text-gray-900 shrink-0">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Totals & Actions */}
                  <div className="bg-white border-t border-gray-100 p-2.5 mt-auto">
                    <div className="flex items-end justify-between mb-2.5">
                      <div className="space-y-0.5">
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total</div>
                        <div className="text-lg font-black text-gray-900 leading-none tracking-tight">
                          ₹{Number(order.total || 0).toFixed(2)}
                        </div>
                      </div>
                      
                      {/* Secondary Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-6 w-6 border-gray-200 text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-gray-100 text-xs">
                          <DropdownMenuItem onClick={() => setSelectedOrder(order)} className="font-medium cursor-pointer">
                            <Calendar className="w-3.5 h-3.5 mr-2 text-blue-500" /> View History
                          </DropdownMenuItem>
                          
                          {[ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING].includes(order.status) && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.CANCELLED)} 
                              className="font-medium text-red-600 focus:text-red-700 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5 mr-2" /> Cancel Order
                            </DropdownMenuItem>
                          )}
                          
                          {order.status === ORDER_STATUS.SERVED && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.FINISHED)} 
                              className="font-medium text-gray-600 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-2" /> Mark Finished
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Primary Action Button */}
                    <div className="w-full">
                      {[ORDER_STATUS.ORDERED, ORDER_STATUS.PENDING].includes(order.status) && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.PREPARING)}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-8 rounded-md shadow-sm shadow-orange-500/20 text-[10px] uppercase tracking-wider transition-transform active:scale-95"
                        >
                          <ChefHat className="w-3 h-3 mr-1.5" /> Start Preparing
                        </Button>
                      )}
                      
                      {order.status === ORDER_STATUS.PREPARING && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.READY)}
                          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-8 rounded-md shadow-sm shadow-green-500/20 text-[10px] uppercase tracking-wider transition-transform active:scale-95"
                        >
                          <CheckCircle className="w-3 h-3 mr-1.5" /> Mark Ready
                        </Button>
                      )}
                      
                      {order.status === ORDER_STATUS.READY && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.SERVED)}
                          className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold h-8 rounded-md shadow-sm shadow-purple-500/20 text-[10px] uppercase tracking-wider transition-transform active:scale-95"
                        >
                          <Utensils className="w-3 h-3 mr-1.5" /> Mark Served
                        </Button>
                      )}
                      
                      {order.status === ORDER_STATUS.SERVED && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.BILL_REQUESTED)}
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold h-8 rounded-md shadow-sm shadow-yellow-500/20 text-[10px] uppercase tracking-wider transition-transform active:scale-95"
                        >
                          <DollarSign className="w-3 h-3 mr-1.5" /> Request Bill
                        </Button>
                      )}
                      
                      {order.status === ORDER_STATUS.BILL_REQUESTED && (
                        <Button
                          onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.FINISHED)}
                          className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold h-8 rounded-md shadow-sm shadow-gray-900/20 text-[10px] uppercase tracking-wider transition-transform active:scale-95"
                        >
                          <CheckCircle className="w-3 h-3 mr-1.5" /> Complete Order
                        </Button>
                      )}
                      
                      {order.status === ORDER_STATUS.FINISHED && (
                        <Button
                          disabled
                          className="w-full bg-gray-100 text-gray-400 font-bold h-8 rounded-md text-[10px] uppercase tracking-wider opacity-80"
                        >
                          <CheckCircle className="w-3 h-3 mr-1.5" /> Completed
                        </Button>
                      )}
                      
                      {order.status === ORDER_STATUS.CANCELLED && (
                        <Button
                          disabled
                          className="w-full bg-red-50 text-red-500 font-bold h-8 rounded-md text-[10px] uppercase tracking-wider border border-red-200/50"
                        >
                          <X className="w-3 h-3 mr-1.5" /> Cancelled
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
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
              {orderHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderHistory
                    .sort((a, b) => new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime())
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

                          <div className="border-t pt-3 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">Subtotal:</span>
                              <span className="font-semibold text-gray-700">
                                ₹{(order.subtotal || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toFixed(2)}
                              </span>
                            </div>
                            {Number(order.tax || 0) > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">{order.gst_label || order.gstLabel || 'Tax'} ({order.gst_rate || order.gstRate || 0}%):</span>
                                <span className="font-semibold text-gray-700">
                                  ₹{Number(order.tax).toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                              <span className="text-sm font-bold text-gray-900">Total Amount:</span>
                              <span className="font-black text-gray-900">
                                ₹{(order.total || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toFixed(2)}
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
                  <div className="border-t mt-3 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold text-gray-800">
                        ₹{(selectedOrder.subtotal || selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toFixed(2)}
                      </span>
                    </div>
                    {Number(selectedOrder.tax || 0) > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{selectedOrder.gst_label || selectedOrder.gstLabel || 'Tax'} ({selectedOrder.gst_rate || selectedOrder.gstRate || 0}%):</span>
                        <span className="font-semibold text-gray-700">
                          ₹{Number(selectedOrder.tax).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="font-bold text-gray-900 text-lg">Total:</span>
                      <span className="font-black text-2xl text-gray-900">
                        ₹{(selectedOrder.total || selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toFixed(2)}
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
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">
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
