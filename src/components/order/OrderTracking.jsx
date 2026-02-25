import { useState, useEffect } from 'react'
import { Clock, ChefHat, CheckCircle, X, AlertCircle, DollarSign, Receipt, ArrowLeft, Home, Phone, Star, MapPin, Calendar, CreditCard, RefreshCw, Menu, Timer, Utensils } from 'lucide-react'
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
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile'
import { cn } from '@/lib/utils'

const OrderTracking = ({ orderId, onClose }) => {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [restaurantInfo, setRestaurantInfo] = useState({ restaurantId: 'restaurant-123', tableNumber: '' })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const { profile } = useRestaurantProfile(restaurantInfo.restaurantId)

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
        <NavbarContent className="max-w-6xl mx-auto px-4">
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
              <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center">
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

      <div className="max-w-6xl mx-auto px-4 py-8 relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-full max-w-4xl h-96 bg-zinc-200/20 blur-[120px] -z-10 rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-full max-w-4xl h-96 bg-zinc-200/20 blur-[120px] -z-10 rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Tracking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="border-zinc-200 shadow-xl overflow-hidden rounded-[2rem] bg-white/70 backdrop-blur-xl transition-all duration-300">
              <div className={cn(
                "p-6 transition-all duration-500",
                order.status === ORDER_STATUS.ORDERED && "bg-gradient-to-br from-blue-600 to-blue-800",
                order.status === ORDER_STATUS.PREPARING && "bg-gradient-to-br from-orange-500 to-red-600",
                order.status === ORDER_STATUS.READY && "bg-gradient-to-br from-emerald-500 to-teal-700",
                order.status === ORDER_STATUS.SERVED && "bg-gradient-to-br from-purple-600 to-indigo-800",
                order.status === ORDER_STATUS.FINISHED && "bg-gradient-to-br from-zinc-700 to-zinc-900",
                order.status === ORDER_STATUS.CANCELLED && "bg-gradient-to-br from-red-600 to-rose-800"
              )}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/30 animate-in fade-in zoom-in duration-500",
                      order.status !== ORDER_STATUS.FINISHED && order.status !== ORDER_STATUS.CANCELLED && "animate-pulse"
                    )}>
                      {currentStatusConfig.icon}
                    </div>
                    <div className="text-white">
                      <h2 className="text-2xl font-black tracking-tight">{currentStatusConfig.label}</h2>
                      <p className="text-white/80 font-medium">{currentStatusConfig.description}</p>
                    </div>
                  </div>
                  <div className="text-white/90 bg-black/10 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/10 self-start md:self-center">
                    <p className="text-xs uppercase tracking-wider font-bold opacity-70">Order Time</p>
                    <p className="text-lg font-mono font-bold">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                    <span>Progress</span>
                    <span className="text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">{statusProgress[order.status]}%</span>
                  </div>
                  <div className="relative">
                    <Progress value={statusProgress[order.status]} className="h-4 rounded-full bg-zinc-100" />
                    <div 
                      className="absolute top-0 left-0 h-full bg-white/20 blur-sm rounded-full transition-all duration-500" 
                      style={{ width: `${statusProgress[order.status]}%` }}
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4 relative">
                  <h3 className="font-black text-zinc-900 mb-4 uppercase tracking-tighter flex items-center gap-2 text-sm">
                    <Timer className="w-4 h-4" />
                    Journey
                  </h3>
                  
                  {/* Vertical Line Connector */}
                  <div className="absolute left-[19px] top-[40px] bottom-8 w-0.5 bg-zinc-100 rounded-full" />

                  {order.statusHistory.map((history, index) => {
                    const statusConfig = ORDER_STATUS_CONFIG[history.status]
                    const isCurrent = history.status === order.status
                    
                    return (
                      <div key={index} className="flex items-start gap-4 relative group">
                        <div className="flex-shrink-0 z-10 transition-transform duration-300 group-hover:scale-105">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-300 shadow-sm",
                            isCurrent 
                              ? "bg-zinc-900 border-[3px] border-white ring-1 ring-zinc-900 text-white" 
                              : "bg-white border border-zinc-100 text-zinc-400"
                          )}>
                            {statusConfig.icon}
                          </div>
                        </div>
                        <div className={cn(
                          "flex-1 p-3 rounded-xl transition-all duration-300",
                          isCurrent ? "bg-zinc-50 border border-zinc-200" : "bg-transparent"
                        )}>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className={cn(
                              "font-bold transition-colors duration-200",
                              isCurrent ? "text-zinc-900 text-lg" : "text-zinc-500"
                            )}>
                              {statusConfig.label}
                            </h3>
                            <span className="text-xs font-mono font-bold text-zinc-400 bg-white px-2 py-1 rounded-lg border border-zinc-100">
                              {new Date(history.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <p className={cn(
                            "text-sm mt-1 leading-relaxed",
                            isCurrent ? "text-zinc-600 font-medium" : "text-zinc-400"
                          )}>
                            {history.note}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Action Buttons */}
                {isServed && (
                  <div className="mt-8 p-6 bg-gradient-to-br from-zinc-50 to-white rounded-[2rem] border border-zinc-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-4 text-zinc-900 mb-4">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <span className="font-black text-xl tracking-tight">Enjoy Your Meal!</span>
                    </div>
                    <p className="text-zinc-600 font-medium mb-6 leading-relaxed">
                      Your order has been served with care. We hope you have a delightful dining experience!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={() => {
                          window.location.href = `/menu?restaurant=${restaurantInfo.restaurantId}&table=${restaurantInfo.tableNumber}`
                        }}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-12 rounded-2xl shadow-lg transition-all"
                      >
                        <Utensils className="w-4 h-4 mr-2" />
                        Order More
                      </Button>
                      <Button 
                        onClick={() => updateOrderStatus(ORDER_STATUS.BILL_REQUESTED)}
                        className="flex-1 bg-white hover:bg-zinc-50 text-zinc-900 border-2 border-zinc-100 font-bold h-12 rounded-2xl transition-all"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Request Bill
                      </Button>
                    </div>
                  </div>
                )}

                {isBillRequested && (
                  <div className="mt-8 p-6 bg-amber-50 rounded-[2rem] border border-amber-100/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-4 text-amber-900 mb-4">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <DollarSign className="w-6 h-6 text-amber-500" />
                      </div>
                      <span className="font-black text-xl tracking-tight">Bill Requested!</span>
                    </div>
                    <p className="text-amber-800/80 font-medium mb-6 leading-relaxed">
                      Our staff is preparing your bill. Please wait a moment while we process your request.
                    </p>
                    <div className="flex items-center justify-center p-4 bg-white/50 rounded-2xl border border-white/50">
                      <div className="w-6 h-6 border-4 border-amber-500 border-t-transparent animate-spin rounded-full"></div>
                      <p className="text-sm font-bold text-amber-900 ml-3">Processing your payment...</p>
                    </div>
                  </div>
                )}

                {isFinished && (
                  <div className="mt-6 p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
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
            <Card className="border-zinc-200 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-[2rem]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-y-6">
                  <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                    <Calendar className="w-4 h-4" />
                    <span>Order Date</span>
                  </div>
                  <div className="text-sm font-bold text-right md:text-left">{new Date(order.createdAt).toLocaleDateString()}</div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                    <Clock className="w-4 h-4" />
                    <span>Order Time</span>
                  </div>
                  <div className="text-sm font-bold text-right md:text-left">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                    <MapPin className="w-4 h-4" />
                    <span>Table</span>
                  </div>
                  <div className="text-sm font-bold text-right md:text-left">Table {order.tableNumber}</div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                    <CreditCard className="w-4 h-4" />
                    <span>Payment</span>
                  </div>
                  <div className="text-sm font-bold flex items-center justify-end md:justify-start gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      order.status === ORDER_STATUS.FINISHED ? "bg-emerald-500" : "bg-amber-500"
                    )} />
                    {order.status === ORDER_STATUS.FINISHED ? 'Paid' : 'Pending'}
                  </div>
                </div>
                </div>

                <div className="my-6 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

                <div className="space-y-4">
                  <h4 className="font-black text-zinc-900 uppercase tracking-tighter flex items-center gap-2 mb-2">
                    <Utensils className="w-4 h-4" />
                    Items Ordered
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-zinc-50/50 border border-zinc-100 rounded-2xl hover:bg-white hover:shadow-md transition-all duration-300 group">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-zinc-100 flex items-center justify-center font-black text-zinc-900 overflow-hidden group-hover:scale-105 transition-transform">
                              <span className="text-sm">×{item.quantity}</span>
                            </div>
                            {item.type === 'VEG' && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 leading-tight">{item.name}</h4>
                            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{item.type}</p>
                          </div>
                        </div>
                        <span className="font-black text-zinc-900">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="my-6 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

                <div className="p-6 bg-zinc-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                  <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-sm opacity-60 font-bold uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span>₹{order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm opacity-60 font-bold uppercase tracking-widest">
                      <span>Tax (5%)</span>
                      <span>₹{order.tax.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-white/10 flex justify-between items-end">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] opacity-50 mb-1">Total Bill</p>
                        <h4 className="text-3xl font-black tracking-tighter">₹{order.total.toFixed(2)}</h4>
                      </div>
                      <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 py-1 px-3 backdrop-blur-md rounded-lg font-bold">
                        {order.items.length} Items
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-0 shadow-xl rounded-[2rem] bg-zinc-900 text-white overflow-hidden group">
              <CardHeader className="p-0">
                <div className="h-24 bg-gradient-to-br from-zinc-700 to-zinc-900 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                    <Star className="w-24 h-24 rotate-12" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 -mt-12 relative z-10 text-center">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-zinc-900 group-hover:scale-105 transition-transform duration-300">
                  <div className="w-16 h-16 bg-gradient-to-br from-zinc-100 to-zinc-300 rounded-2xl flex items-center justify-center">
                    <span className="text-zinc-900 font-black text-2xl tracking-tighter">
                      {profile.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>
                <h3 className="font-black text-2xl tracking-tight">{profile.name}</h3>
                <p className="text-zinc-400 text-sm font-medium mt-1">{profile.description}</p>
                
                <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center gap-2 group/status">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover/status:text-emerald-400 transition-colors">Restaurant is Open</span>
                </div>
              </CardContent>
            </Card>

            {/* Premium Delivery Estimate */}
            <Card className="border-0 shadow-2xl rounded-[2rem] bg-white overflow-hidden group hover:shadow-zinc-200 transition-all duration-500">
              <div className="bg-gradient-to-br from-zinc-900 to-black p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-zinc-400/10 blur-3xl -ml-16 -mb-16" />
                
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 mb-4">
                    <Timer className="w-3 h-3 text-white/70" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Estimated Delivery</span>
                  </div>
                  
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-7xl font-black text-white tracking-tighter animate-in fade-in slide-in-from-bottom-2 duration-700">
                      {order.estimatedTime || '15-20'}
                    </span>
                    <span className="text-xl font-black text-white/50 tracking-tight">MIN</span>
                  </div>
                  <p className="text-white/40 font-black uppercase tracking-widest text-[10px] mt-2">Arriving at your table</p>
                </div>
              </div>

              <CardContent className="p-8">
                <div className="space-y-6 relative">
                  {/* Vertical line connector for stepper */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-zinc-100" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all duration-500",
                      ["ORDERED", "PREPARING", "READY", "SERVED", "BILL_REQUESTED", "FINISHED"].includes(order.status) 
                        ? "bg-zinc-900 border-zinc-900 scale-110 shadow-lg shadow-zinc-200" 
                        : "bg-white border-zinc-200"
                    )} />
                    <span className={cn(
                      "text-sm font-black tracking-tight transition-colors",
                      ["ORDERED", "PREPARING", "READY", "SERVED", "BILL_REQUESTED", "FINISHED"].includes(order.status) ? "text-zinc-900" : "text-zinc-300"
                    )}>Order Confirmed</span>
                  </div>

                  <div className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all duration-500",
                      ["PREPARING", "READY", "SERVED", "BILL_REQUESTED", "FINISHED"].includes(order.status) 
                        ? "bg-zinc-900 border-zinc-900 scale-110 shadow-lg shadow-zinc-200" 
                        : "bg-white border-zinc-200"
                    )} />
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-sm font-black tracking-tight transition-colors",
                        ["PREPARING", "READY", "SERVED", "BILL_REQUESTED", "FINISHED"].includes(order.status) ? "text-zinc-900" : "text-zinc-300"
                      )}>Preparing Meal</span>
                      {order.status === ORDER_STATUS.PREPARING && (
                        <span className="text-[10px] font-bold text-amber-600 animate-pulse">Chef is working on it</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all duration-500",
                      ["READY", "SERVED", "BILL_REQUESTED", "FINISHED"].includes(order.status) 
                        ? "bg-emerald-500 border-emerald-500 scale-110 shadow-lg shadow-emerald-100" 
                        : "bg-white border-zinc-200"
                    )} />
                    <span className={cn(
                      "text-sm font-black tracking-tight transition-colors",
                      ["READY", "SERVED", "BILL_REQUESTED", "FINISHED"].includes(order.status) ? "text-emerald-600" : "text-zinc-300"
                    )}>Ready for Service</span>
                  </div>
                </div>

                <div className="mt-10 space-y-3">
                  <Button className="w-full bg-white hover:bg-zinc-50 text-zinc-900 border-2 border-zinc-100 h-14 rounded-2xl transition-all font-black uppercase tracking-tight text-xs">
                    <Phone className="w-4 h-4 mr-2" />
                    Help & Support
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
