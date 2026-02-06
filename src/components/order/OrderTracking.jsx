import { useState, useEffect } from 'react'
import { Clock, ChefHat, CheckCircle, X, AlertCircle, DollarSign, Receipt, ArrowLeft, Home, Phone, Star, MapPin, Calendar, CreditCard, RefreshCw, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Navbar, 
  NavbarContent, 
  NavbarBrand, 
  NavbarItem, 
  NavbarMenuToggle, 
  NavbarMenu, 
  NavbarMenuItem 
} from '@/components/ui/navbar'
import { ORDER_STATUS, ORDER_STATUS_CONFIG } from '@/hooks/useOrderManagement'
import { cn } from '@/lib/utils'

const OrderTracking = ({ orderId, onClose }) => {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [restaurantInfo, setRestaurantInfo] = useState({ restaurantId: '', tableNumber: '' })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Load order details
  useEffect(() => {
    const loadOrder = () => {
      try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]')
        const foundOrder = orders.find(o => o.id === orderId)
        setOrder(foundOrder)
        
        // Store restaurant and table info separately
        if (foundOrder) {
          setRestaurantInfo({
            restaurantId: foundOrder.restaurantId,
            tableNumber: foundOrder.tableNumber
          })
        }
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-zinc-900 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-zinc-900">Loading order details...</h2>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-zinc-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-10 h-10 text-zinc-600" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Order Not Found</h2>
            <p className="text-zinc-600 mb-6">We couldn't find your order details.</p>
            <Button
              onClick={onClose}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
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
    <div className="min-h-screen bg-zinc-50">
      {/* Shadcn Studio Navbar */}
      <Navbar>
        <NavbarContent className="max-w-4xl mx-auto px-4">
          {/* Mobile Menu Toggle */}
          <NavbarMenuToggle 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </NavbarMenuToggle>

          {/* Brand */}
          <NavbarBrand className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <Receipt className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-900 hidden md:block">Order Tracking</h1>
                <h1 className="text-base font-bold text-zinc-900 md:hidden">Order Tracking</h1>
                <p className="text-xs text-zinc-600 hidden md:block">Order #{order.id}</p>
              </div>
            </div>
          </NavbarBrand>

          {/* Spacer for better spacing */}
          <div className="flex-1 lg:hidden"></div>

          {/* Desktop Items */}
          <div className="hidden lg:flex items-center gap-4 flex-1 justify-end">
            <Badge variant="outline" className="border-zinc-300 text-zinc-700 px-3 py-1">
              Table {order.tableNumber}
            </Badge>
            <Avatar className="h-10 w-10 border-2 border-zinc-200">
              <AvatarFallback className="bg-zinc-100 text-zinc-900 font-bold">
                T{order.tableNumber}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </div>

          {/* Mobile Items */}
          <div className="lg:hidden flex items-center gap-3">
            <Badge variant="outline" className="border-zinc-300 text-zinc-700 text-xs px-2 py-1">
              Table {order.tableNumber}
            </Badge>
            <Avatar className="h-8 w-8 border border-zinc-200">
              <AvatarFallback className="bg-zinc-100 text-zinc-900 font-bold text-sm">
                T{order.tableNumber}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors duration-200 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </NavbarContent>

        {/* Mobile Menu */}
        <NavbarMenu isOpen={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <NavbarMenuItem onClick={() => setMobileMenuOpen(false)}>
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-zinc-600" />
              <div>
                <div className="font-medium">Order Tracking</div>
                <div className="text-sm text-zinc-500">Order #{order.id}</div>
              </div>
            </div>
          </NavbarMenuItem>
          
          <NavbarMenuItem onClick={() => {
            onClose()
            setMobileMenuOpen(false)
          }}>
            <div className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 text-zinc-600" />
              <div>
                <div className="font-medium">Back to Menu</div>
                <div className="text-sm text-zinc-500">Return to restaurant menu</div>
              </div>
            </div>
          </NavbarMenuItem>
        </NavbarMenu>
      </Navbar>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Tracking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="border-zinc-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center text-3xl">
                      {currentStatusConfig.icon}
                    </div>
                    <div className="text-white">
                      <h2 className="text-2xl font-bold">{currentStatusConfig.label}</h2>
                      <p className="text-zinc-200">{currentStatusConfig.description}</p>
                    </div>
                  </div>
                  <div className="text-white text-right">
                    <p className="text-sm text-zinc-200">Order Time</p>
                    <p className="font-semibold">{new Date(order.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-zinc-600 mb-2">
                    <span>Order Progress</span>
                    <span>{statusProgress[order.status]}%</span>
                  </div>
                  <Progress value={statusProgress[order.status]} className="h-3" />
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-zinc-900 mb-4">Order Timeline</h3>
                  {order.statusHistory.map((history, index) => {
                    const statusConfig = ORDER_STATUS_CONFIG[history.status]
                    const isLast = index === order.statusHistory.length - 1
                    const isCurrent = history.status === order.status
                    
                    return (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-lg border-2 transition-colors duration-200",
                            isCurrent ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"
                          )}>
                            {statusConfig.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={cn(
                              "font-medium transition-colors duration-200",
                              isCurrent ? "text-zinc-900" : "text-zinc-700"
                            )}>
                              {statusConfig.label}
                            </h3>
                            <span className="text-sm text-zinc-500">
                              {new Date(history.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 mt-1">{history.note}</p>
                          {index < order.statusHistory.length - 1 && (
                            <div className={cn(
                              "w-0.5 h-8 mt-2 transition-colors duration-200",
                              isCurrent ? "bg-zinc-400" : "bg-zinc-200"
                            )}></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Action Buttons */}
                {isServed && (
                  <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                    <div className="flex items-center gap-3 text-zinc-800 mb-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Enjoy Your Meal!</span>
                    </div>
                    <p className="text-sm text-zinc-600 mb-4">
                      Your order has been served. Enjoy your delicious meal!
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => {
                          // Go back to menu to order more
                          window.location.href = `/menu?restaurant=${restaurantInfo.restaurantId}&table=${restaurantInfo.tableNumber}`
                        }}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-3 transition-colors duration-200"
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Order More
                      </Button>
                      <Button 
                        onClick={() => updateOrderStatus(ORDER_STATUS.BILL_REQUESTED)}
                        className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 transition-colors duration-200"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Request Bill
                      </Button>
                    </div>
                  </div>
                )}

                {isBillRequested && (
                  <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                    <div className="flex items-center gap-3 text-zinc-800 mb-3">
                      <DollarSign className="w-5 h-5" />
                      <span className="font-semibold">Bill Requested!</span>
                    </div>
                    <p className="text-sm text-zinc-600 mb-4">
                      Your bill has been requested. Please wait for the staff to bring your bill.
                    </p>
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-zinc-600 border-t-transparent animate-spin rounded-full"></div>
                      <p className="text-sm text-zinc-600 ml-3">Processing your payment...</p>
                    </div>
                    <div className="mt-4 p-3 bg-zinc-100 rounded-lg">
                      <p className="text-xs text-zinc-700 text-center">
                        Staff is preparing your bill. This usually takes a few minutes.
                      </p>
                    </div>
                  </div>
                )}

                {isFinished && (
                  <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                    <div className="flex items-center gap-3 text-zinc-800 mb-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Thank you for your visit!</span>
                    </div>
                    <p className="text-sm text-zinc-600 mb-4">
                      Payment completed and table closed. We hope to see you again soon!
                    </p>
                    <div className="mb-4 p-3 bg-zinc-100 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <div className="w-6 h-6 bg-zinc-900 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-bold">QR</span>
                        </div>
                        <p className="text-sm text-zinc-600 ml-3">
                          Table is ready for new customers
                        </p>
                      </div>
                      <p className="text-xs text-zinc-700 text-center">
                        New customers can scan the QR code to start a fresh session
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        onClick={onClose}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-3 transition-colors duration-200"
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Back to Menu
                      </Button>
                      <Button 
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="flex-1 border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-semibold py-3 transition-colors duration-200"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card className="border-zinc-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Calendar className="w-4 h-4" />
                      <span>Order Date</span>
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Clock className="w-4 h-4" />
                      <span>Order Time</span>
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <MapPin className="w-4 h-4" />
                      <span>Table</span>
                    </div>
                    <div className="text-sm font-medium">Table {order.tableNumber}</div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <CreditCard className="w-4 h-4" />
                      <span>Payment</span>
                    </div>
                    <div className="text-sm font-medium">
                      {order.status === ORDER_STATUS.FINISHED ? 'Paid' : 'Pending'}
                    </div>
                  </div>
                </div>

                <Separator className="bg-zinc-200" />

                <div className="space-y-3">
                  <h4 className="font-semibold text-zinc-900">Order Items</h4>
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-semibold text-zinc-600">
                          ×{item.quantity}
                        </div>
                        <div>
                          <h4 className="font-medium text-zinc-900">{item.name}</h4>
                          <p className="text-sm text-zinc-500">{item.type}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-zinc-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="bg-zinc-200" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Subtotal</span>
                    <span className="font-medium">₹{order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Tax (5%)</span>
                    <span className="font-medium">₹{order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-zinc-900">₹{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Restaurant Info */}
            <Card className="border-zinc-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Restaurant Info
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-xl">FT</span>
                    </div>
                    <h3 className="font-bold text-zinc-900">FoodieTech Restaurant</h3>
                    <p className="text-sm text-zinc-600">Delicious food delivered with love</p>
                  </div>
                  <Separator className="bg-zinc-200" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-600">Restaurant Location</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-600">+91 98765 43210</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estimated Time */}
            <Card className="border-zinc-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Estimated Time
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-zinc-900 mb-2">
                    {order.estimatedTime || '15-20'}
                  </div>
                  <p className="text-zinc-600">minutes</p>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <div className="w-2 h-2 bg-zinc-900 rounded-full"></div>
                    <span>Order Received</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <div className="w-2 h-2 bg-zinc-700 rounded-full"></div>
                    <span>Preparing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <div className="w-2 h-2 bg-zinc-600 rounded-full"></div>
                    <span>Ready to Serve</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-zinc-50 rounded-lg">
                  <h4 className="font-medium text-zinc-900 mb-2">Need Help?</h4>
                  <p className="text-sm text-zinc-600 mb-3">
                    Contact restaurant staff for any assistance
                  </p>
                  <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white transition-colors duration-200 mb-2">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Restaurant
                  </Button>
                  
                  {/* Complete Order Button */}
                  {order && (order.status === ORDER_STATUS.SERVED || order.status === ORDER_STATUS.READY) && (
                    <Button 
                      onClick={() => {
                        console.log('Completing order:', order.id)
                        
                        // Update order status to FINISHED
                        const orders = JSON.parse(localStorage.getItem('orders') || '[]')
                        const updatedOrders = orders.map(o => {
                          if (o.id === order.id) {
                            return {
                              ...o,
                              status: ORDER_STATUS.FINISHED,
                              updatedAt: new Date().toISOString()
                            }
                          }
                          return o
                        })
                        localStorage.setItem('orders', JSON.stringify(updatedOrders))
                        
                        // Update table status to available
                        const tableSessions = JSON.parse(localStorage.getItem('tableSessions') || '[]')
                        const updatedTables = tableSessions.map(table => {
                          if (table.tableNumber === parseInt(order.tableNumber)) {
                            return {
                              ...table,
                              status: 'available',
                              customers: 0,
                              currentOrder: null,
                              sessionStart: null,
                              sessionDuration: null,
                              revenue: 0,
                              needsCleaning: false,
                              lastActivity: new Date().toISOString()
                            }
                          }
                          return table
                        })
                        localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
                        
                        // Emit event for table sessions
                        window.dispatchEvent(new CustomEvent('orderUpdated', {
                          detail: {
                            tableNumber: parseInt(order.tableNumber),
                            orderStatus: 'finished',
                            customers: 0,
                            orderId: null,
                            revenue: 0
                          }
                        }))
                        
                        console.log('Order completed and table marked as available')
                        
                        // Update local order state
                        setOrder({
                          ...order,
                          status: ORDER_STATUS.FINISHED
                        })
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Order
                    </Button>
                  )}
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
