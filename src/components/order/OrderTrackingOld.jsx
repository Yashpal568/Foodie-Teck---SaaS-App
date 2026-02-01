import { useState, useEffect } from 'react'
import { Clock, ChefHat, CheckCircle, X, AlertCircle, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ORDER_STATUS, ORDER_STATUS_CONFIG } from '@/hooks/useOrderManagement'
import { cn } from '@/lib/utils'

const OrderTracking = ({ orderId, onClose }) => {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load order details
  useEffect(() => {
    const loadOrder = () => {
      try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]')
        const foundOrder = orders.find(o => o.id === orderId)
        setOrder(foundOrder)
      } catch (error) {
        console.error('Error loading order:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOrder()

    // Listen for order updates
    const handleStorageChange = (e) => {
      if (e.key === 'orders') {
        loadOrder()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading order details...</h2>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">We couldn't find your order details.</p>
            <button
              onClick={onClose}
              className="w-full bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Go Back to Menu
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStatusConfig = ORDER_STATUS_CONFIG[order.status]
  const isCompleted = order.status === ORDER_STATUS.SERVED
  const isCancelled = order.status === ORDER_STATUS.CANCELLED

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order Tracking</h1>
              <p className="text-sm text-gray-600">Order ID: {order.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Status */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="text-2xl">{currentStatusConfig.icon}</div>
                  <span>{currentStatusConfig.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6">{currentStatusConfig.description}</p>
                
                {/* Progress Timeline */}
                <div className="space-y-4">
                  {order.statusHistory.map((history, index) => {
                    const statusConfig = ORDER_STATUS_CONFIG[history.status]
                    const isLast = index === order.statusHistory.length - 1
                    
                    return (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                            statusConfig.color
                          )}>
                            {statusConfig.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">{statusConfig.label}</h3>
                            <span className="text-sm text-gray-500">
                              {new Date(history.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                          {index < order.statusHistory.length - 1 && (
                            <div className="w-0.5 h-8 bg-gray-200 mt-2 ml-5"></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {order.status === ORDER_STATUS.SERVED && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Enjoy Your Meal!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Your order has been served. Enjoy your delicious meal!
                    </p>
                    <Button 
                      onClick={() => {
                        // Update order status to BILL_REQUESTED
                        const orders = JSON.parse(localStorage.getItem('orders') || '[]')
                        const updatedOrders = orders.map(o => 
                          o.id === order.id 
                            ? { ...o, status: ORDER_STATUS.BILL_REQUESTED, updatedAt: new Date().toISOString() }
                            : o
                        )
                        localStorage.setItem('orders', JSON.stringify(updatedOrders))
                        setOrder({ ...order, status: ORDER_STATUS.BILL_REQUESTED })
                      }}
                      className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Request Bill
                    </Button>
                  </div>
                )}

                {order.status === ORDER_STATUS.BILL_REQUESTED && (
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <DollarSign className="w-5 h-5" />
                      <span className="font-medium">Bill Requested!</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your bill has been requested. Please wait for the staff to bring your bill.
                    </p>
                    <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent animate-spin rounded-full mx-auto mt-4"></div>
                    <p className="text-xs text-yellow-600 mt-2">Processing your payment...</p>
                  </div>
                )}

                {order.status === ORDER_STATUS.FINISHED && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Thank you for your visit!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Payment completed and table closed. We hope to see you again soon!
                    </p>
                    <Button 
                      onClick={() => window.location.reload()}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Start New Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Table</span>
                    <span className="font-medium">Table {order.tableNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Order Time</span>
                    <span className="font-medium">
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Items</span>
                    <span className="font-medium">{order.items.length} items</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">× {item.quantity}</p>
                      </div>
                      <span className="font-medium">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="font-medium">₹{order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax (5%)</span>
                    <span className="font-medium">₹{order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-orange-600">₹{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estimated Time */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Estimated Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {order.estimatedTime || '15-20'}
                  </div>
                  <p className="text-gray-600">minutes</p>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Order Received</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Preparing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Ready to Serve</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">Need Help?</h4>
                  <p className="text-sm text-orange-700 mb-3">
                    Contact restaurant staff for any assistance
                  </p>
                  <button className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm">
                    Call Restaurant
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderTracking
