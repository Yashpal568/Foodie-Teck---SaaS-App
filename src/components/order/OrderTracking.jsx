import { useState, useEffect } from 'react'
import { Clock, ChefHat, CheckCircle, X, AlertCircle, DollarSign, Receipt, ArrowLeft, Home, Phone, Star, MapPin, Calendar, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

  // Update order status
  const updateOrderStatus = (newStatus) => {
    try {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      const updatedOrders = orders.map(o => 
        o.id === order.id 
          ? { 
              ...o, 
              status: newStatus, 
              updatedAt: new Date().toISOString(),
              statusHistory: [
                ...o.statusHistory,
                {
                  status: newStatus,
                  timestamp: new Date().toISOString(),
                  note: `Status changed to ${newStatus}`
                }
              ]
            }
          : o
      )
      localStorage.setItem('orders', JSON.stringify(updatedOrders))
      setOrder({ ...order, status: newStatus })
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading order details...</h2>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">We couldn't find your order details.</p>
            <Button
              onClick={onClose}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              Go Back to Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStatusConfig = ORDER_STATUS_CONFIG[order.status]
  const isFinished = order.status === ORDER_STATUS.FINISHED
  const isBillRequested = order.status === ORDER_STATUS.BILL_REQUESTED
  const isServed = order.status === ORDER_STATUS.SERVED

  // Calculate progress percentage
  const statusProgress = {
    [ORDER_STATUS.ORDERED]: 20,
    [ORDER_STATUS.PREPARING]: 40,
    [ORDER_STATUS.READY]: 60,
    [ORDER_STATUS.SERVED]: 80,
    [ORDER_STATUS.BILL_REQUESTED]: 90,
    [ORDER_STATUS.FINISHED]: 100
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order Tracking</h1>
                <p className="text-sm text-gray-600">Order #{order.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-orange-100 text-orange-600 font-bold">
                  T{order.tableNumber}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm text-gray-500">Table</p>
                <p className="font-semibold text-gray-900">{order.tableNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Tracking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                      {currentStatusConfig.icon}
                    </div>
                    <div className="text-white">
                      <h2 className="text-2xl font-bold">{currentStatusConfig.label}</h2>
                      <p className="text-orange-100">{currentStatusConfig.description}</p>
                    </div>
                  </div>
                  <div className="text-white text-right">
                    <p className="text-sm text-orange-100">Order Time</p>
                    <p className="font-semibold">{new Date(order.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Order Progress</span>
                    <span>{statusProgress[order.status]}%</span>
                  </div>
                  <Progress value={statusProgress[order.status]} className="h-3" />
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Order Timeline</h3>
                  {order.statusHistory.map((history, index) => {
                    const statusConfig = ORDER_STATUS_CONFIG[history.status]
                    const isLast = index === order.statusHistory.length - 1
                    const isCurrent = history.status === order.status
                    
                    return (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-lg border-2",
                            isCurrent ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white"
                          )}>
                            {statusConfig.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={cn(
                              "font-medium",
                              isCurrent ? "text-orange-600" : "text-gray-900"
                            )}>
                              {statusConfig.label}
                            </h3>
                            <span className="text-sm text-gray-500">
                              {new Date(history.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                          {index < order.statusHistory.length - 1 && (
                            <div className={cn(
                              "w-0.5 h-8 mt-2 ml-6",
                              isCurrent ? "bg-orange-200" : "bg-gray-200"
                            )}></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Action Buttons */}
                {isServed && (
                  <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-3 text-green-800 mb-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Enjoy Your Meal!</span>
                    </div>
                    <p className="text-sm text-green-700 mb-4">
                      Your order has been served. Enjoy your delicious meal!
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => {
                          // Go back to menu to order more
                          window.location.href = `/menu?restaurant=${order.restaurantId}&table=${order.tableNumber}`
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Order More
                      </Button>
                      <Button 
                        onClick={() => updateOrderStatus(ORDER_STATUS.BILL_REQUESTED)}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Request Bill
                      </Button>
                    </div>
                  </div>
                )}

                {isBillRequested && (
                  <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="flex items-center gap-3 text-yellow-800 mb-3">
                      <DollarSign className="w-5 h-5" />
                      <span className="font-semibold">Bill Requested!</span>
                    </div>
                    <p className="text-sm text-yellow-700 mb-4">
                      Your bill has been requested. Please wait for the staff to bring your bill.
                    </p>
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent animate-spin rounded-full"></div>
                      <p className="text-sm text-yellow-600 ml-3">Processing your payment...</p>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                      <p className="text-xs text-yellow-700 text-center">
                        Staff is preparing your bill. This usually takes a few minutes.
                      </p>
                    </div>
                  </div>
                )}

                {isFinished && (
                  <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-3 text-green-800 mb-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Thank you for your visit!</span>
                    </div>
                    <p className="text-sm text-green-700 mb-4">
                      Payment completed and table closed. We hope to see you again soon!
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => {
                          // Automatically start new session
                          window.location.href = `/menu?restaurant=${order.restaurantId}&table=${order.tableNumber}`
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Start New Session
                      </Button>
                      <Button 
                        onClick={onClose}
                        variant="outline"
                        className="flex-1 border-green-200 text-green-700 hover:bg-green-50 font-semibold py-3"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Menu
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Order Date</span>
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Order Time</span>
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>Table</span>
                    </div>
                    <div className="text-sm font-medium">Table {order.tableNumber}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CreditCard className="w-4 h-4" />
                      <span>Payment</span>
                    </div>
                    <div className="text-sm font-medium">
                      {order.status === ORDER_STATUS.FINISHED ? 'Paid' : 'Pending'}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Order Items</h4>
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-semibold text-gray-600">
                          ×{item.quantity}
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

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">₹{order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (5%)</span>
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

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Restaurant Info */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Restaurant Info
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-xl">FT</span>
                    </div>
                    <h3 className="font-bold text-gray-900">FoodieTech Restaurant</h3>
                    <p className="text-sm text-gray-600">Delicious food delivered with love</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Restaurant Location</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">+91 98765 43210</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estimated Time */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Estimated Time
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
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
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Restaurant
                  </Button>
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
