import { useState, useEffect } from 'react'
import { Clock, ChefHat, CheckCircle, X, AlertCircle, RefreshCw, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOrderManagement, ORDER_STATUS, ORDER_STATUS_CONFIG } from '@/hooks/useOrderManagement'

const OrderManagement = ({ restaurantId }) => {
  const { orders, loading, refreshOrders, updateStatus } = useOrderManagement(restaurantId)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState(null)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
          <p className="text-gray-600">Manage and track customer orders</p>
        </div>
        <Button onClick={refreshOrders} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ordered</p>
                <p className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => o.status === ORDER_STATUS.ORDERED).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Preparing</p>
                <p className="text-2xl font-bold text-orange-600">
                  {orders.filter(o => o.status === ORDER_STATUS.PREPARING).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👨‍🍳</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ready</p>
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === ORDER_STATUS.READY).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-gray-500" />
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
                <SelectItem value={ORDER_STATUS.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1"></div>
            <span className="text-sm text-gray-500">
              {sortedOrders.length} orders found
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading orders...</p>
            </CardContent>
          </Card>
        ) : sortedOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">
                {statusFilter === 'ALL' 
                  ? "No orders yet" 
                  : `No orders with status "${getStatusLabel(statusFilter)}"`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getStatusColor(order.status)}>
                        <span className="mr-1">{getStatusIcon(order.status)}</span>
                        {getStatusLabel(order.status)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Table {order.tableNumber}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Order #{order.id}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{item.name} × {item.quantity}</span>
                            <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Total</span>
                        <span className="font-bold text-orange-600">₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 ml-4">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default OrderManagement
