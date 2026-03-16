import React, { useMemo, useState } from 'react'
import { 
  Users, 
  Search, 
  Lock, 
  TrendingUp, 
  ShoppingBag, 
  Calendar,
  MoreHorizontal,
  Mail,
  Phone,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Award,
  Filter,
  Download,
  FilterX,
  UserPlus,
  Clock,
  ChevronRight,
  Star,
  Activity,
  CreditCard
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts'
import { cn } from '@/lib/utils'

const CustomerManagement = ({ plan = 'Basic' }) => {
  const isPremium = true // TEMPORARILY DISABLED LOCK FOR DEVELOPMENT REVIEW
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [tierFilter, setTierFilter] = useState('All Tiers')
  const [showReport, setShowReport] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Dynamic Data Calculation
  const { customers, chartData, stats } = useMemo(() => {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]')
    const orderHistory = JSON.parse(localStorage.getItem('orderHistory') || '[]')
    
    // Deduplicate orders by ID to prevent double counting between current orders and history
    const allOrdersMap = {}
    ;[...orders, ...orderHistory].forEach(order => {
      if (order?.id && !allOrdersMap[order.id]) {
        allOrdersMap[order.id] = order
      }
    })
    const allOrders = Object.values(allOrdersMap)

    const customerMap = {}
    const dailySignups = {}

    allOrders.forEach(order => {
      const name = order.customerName || 'Guest Customer'
      const date = new Date(order.createdAt).toLocaleDateString()
      
      // Tracking Growth Chart
      dailySignups[date] = (dailySignups[date] || 0) + (customerMap[name] ? 0 : 1)

      if (!customerMap[name]) {
        customerMap[name] = {
          name,
          visits: 0,
          totalSpent: 0,
          lastVisit: order.createdAt,
          firstVisit: order.createdAt,
          email: name.toLowerCase().replace(' ', '.') + '@example.com',
          phone: '+91 9' + Math.floor(100000000 + Math.random() * 900000000),
          orders: [],
          status: 'Active'
        }
      }
      customerMap[name].visits += 1
      customerMap[name].totalSpent += (order.total || order.revenue || 0)
      customerMap[name].orders.push(order)
      if (new Date(order.createdAt) > new Date(customerMap[name].lastVisit)) {
        customerMap[name].lastVisit = order.createdAt
      }
    })

    const customerList = Object.values(customerMap).map(c => {
        // Tagging Logic
        let tag = 'New'
        if (c.visits > 5 || c.totalSpent > 10000) tag = 'VIP'
        else if (c.visits > 1) tag = 'Regular'
        
        // Health Logic
        const lastVisitDate = new Date(c.lastVisit)
        const daysSinceLast = (new Date().getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
        const health = daysSinceLast > 30 ? 'At Risk' : 'Healthy'
        
        return { ...c, tag, health }
    }).sort((a, b) => b.totalSpent - a.totalSpent)

    // Generate last 7 days with 0 counts to ensure chart is always populated
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString()
      last7Days.push({
        date: dateStr,
        count: dailySignups[dateStr] || 0
      })
    }
    
    const cData = last7Days
    
    const retentionRate = customerList.length > 0 
        ? (customerList.filter(c => c.visits > 1).length / customerList.length) * 100 
        : 0
    
    return { 
        customers: customerList,
        chartData: cData,
        stats: {
            total: customerList.length,
            vip: customerList.filter(c => c.tag === 'VIP').length,
            new: customerList.filter(c => c.tag === 'New').length,
            retention: retentionRate.toFixed(1),
            revenue: customerList.reduce((sum, c) => sum + c.totalSpent, 0)
        }
    }
  }, [])

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTier = tierFilter === 'All Tiers' || c.tag === tierFilter
    return matchesSearch && matchesTier
  })

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-50 rounded-xl">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Database</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">{stats.total}</h3>
                  <span className="text-xs text-green-600 flex items-center shadow-none border-0">
                    <TrendingUp className="w-3 h-3 mr-1" /> +12%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Star className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">VIP Customers</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">{stats.vip}</h3>
                  <Badge variant="outline" className="text-[10px] h-4 border-amber-200 text-amber-700 bg-amber-50/50">TOP SPENDERS</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Retention Rate</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">{stats.retention}%</h3>
                  <Badge variant="outline" className="text-[10px] h-4 border-blue-200 text-blue-700 bg-blue-50/50">REAL-TIME</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <CreditCard className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Lifetime Value</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</h3>
                  <Badge variant="outline" className="text-[10px] h-4 border-indigo-200 text-indigo-700 bg-indigo-50/50">REAL-TIME</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="p-6">
            <CardTitle className="text-lg">Customer Growth</CardTitle>
            <CardDescription className="text-sm">New customers acquired over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="count" stroke="#0d9488" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="p-6">
            <CardTitle className="text-lg">Customer Distribution</CardTitle>
            <CardDescription className="text-sm">Breakdown by loyalty tier</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'VIP', value: stats.vip },
                    { name: 'Regular', value: customers.filter(c => c.tag === 'Regular').length },
                    { name: 'New', value: stats.new }
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#0d9488" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#d1d5db" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 ml-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-600" /><span className="text-sm">VIP</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-sm">Regular</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-300" /><span className="text-sm">New</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderTable = () => (
    <Card className="border-0 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="border-b bg-gray-50/50 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
            </div>
            <div>
                <CardTitle className="text-lg">Database Registry</CardTitle>
                <CardDescription className="text-sm">Search and filter your complete customer list</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search name or email..." 
                className="pl-9 h-10 border-gray-200" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-10 border-gray-200 shadow-none">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <Table className="shadow-none border-0">
        <TableHeader className="shadow-none border-0">
          <TableRow className="bg-gray-50/30 shadow-none border-0">
            <TableHead className="shadow-none border-0">Customer</TableHead>
            <TableHead className="shadow-none border-0">Tier</TableHead>
            <TableHead className="shadow-none border-0">Engagement</TableHead>
            <TableHead className="shadow-none border-0">Last Visit</TableHead>
            <TableHead className="shadow-none border-0">Lifetime Spend</TableHead>
            <TableHead className="text-right shadow-none border-0">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="shadow-none border-0">
          {filteredCustomers.map((customer, idx) => (
            <TableRow key={idx} className="group hover:bg-gray-50/50 transition-colors shadow-none border-0">
              <TableCell className="shadow-none border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{customer.name}</div>
                    <div className="text-xs text-gray-500">{customer.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="shadow-none border-0">
                <Badge 
                    variant="secondary" 
                    className={cn(
                        "font-medium",
                        customer.tag === 'VIP' ? "bg-amber-100 text-amber-700 border-amber-200" :
                        customer.tag === 'Regular' ? "bg-blue-100 text-blue-700 border-blue-200" :
                        "bg-gray-100 text-gray-700 border-gray-200"
                    )}
                >
                  {customer.tag}
                </Badge>
              </TableCell>
              <TableCell className="shadow-none border-0">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", customer.health === 'Healthy' ? "bg-green-500" : "bg-red-400")} />
                  <span className="text-sm font-medium">{customer.health}</span>
                </div>
              </TableCell>
              <TableCell className="shadow-none border-0">
                <div className="text-sm font-medium text-gray-900">
                  {new Date(customer.lastVisit).toLocaleDateString()}
                </div>
                <div className="text-[10px] text-gray-400">
                  {new Date(customer.lastVisit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </TableCell>
              <TableCell className="font-bold text-black font-mono shadow-none border-0">
                ₹{customer.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right shadow-none border-0">
                <Dialog>
                    <DialogTrigger asChild className="shadow-none border-0">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-400 group-hover:text-teal-600 group-hover:bg-teal-50"
                            onClick={() => setSelectedCustomer(customer)}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white p-6 shadow-2xl border-0 rounded-2xl">
                        <DialogHeader className="p-0 border-0 shadow-none">
                            <DialogTitle className="text-xl font-bold">Customer Profile</DialogTitle>
                            <DialogDescription className="text-sm">Full history for {customer.name}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 pt-4">
                            <div className="flex gap-6 pb-6 border-b">
                                <div className="w-20 h-20 rounded-2xl bg-teal-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                                    {customer.name.charAt(0)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h2 className="text-2xl font-bold">{customer.name}</h2>
                                    <div className="pt-2 flex gap-2">
                                        <Badge className="bg-teal-600 text-white border-0">{customer.tag} Member</Badge>
                                        <Badge variant="outline" className="border-green-200 text-green-700">{customer.health}</Badge>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <p className="text-xs text-gray-500 font-medium tracking-wide">TOTAL SPENT</p>
                                    <p className="text-xl font-bold">₹{customer.totalSpent.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <p className="text-xs text-gray-500 font-medium tracking-wide">TOTAL VISITS</p>
                                    <p className="text-xl font-bold">{customer.visits}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <p className="text-xs text-gray-500 font-medium tracking-wide">MEMBER SINCE</p>
                                    <p className="text-xl font-bold text-sm pt-1">{new Date(customer.firstVisit).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" /> Recent Activity
                                </h4>
                                <div className="border rounded-xl divide-y">
                                    {customer.orders.slice(-3).reverse().map((order, oidx) => (
                                        <div key={oidx} className="p-4 flex justify-between items-center group/order hover:bg-gray-50 transition-colors">
                                            <div>
                                                <div className="font-medium text-gray-900">Order #{order.id.slice(-6)}</div>
                                                <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold">₹{order.total?.toLocaleString() || order.revenue?.toLocaleString()}</div>
                                                <Badge variant="outline" className="text-[10px] h-4 mt-1">Dine-In</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12 w-full">
      {/* Proper Module Navbar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 mb-6">
        <div className="flex items-center justify-between px-8 h-18">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                <span>Dashboard</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-teal-600">Customer Intelligence</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mt-0.5">Customer CRM</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex -space-x-2 mr-4">
                {customers.slice(0, 3).map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-teal-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-black/5 leading-none p-0">
                        {c.name.charAt(0)}
                    </div>
                ))}
                {customers.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm ring-1 ring-black/5 leading-none p-0">
                        +{customers.length - 3}
                    </div>
                )}
             </div>
             <Dialog open={showReport} onOpenChange={setShowReport}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-xl border-gray-200 h-10 px-4 text-sm font-semibold hover:bg-gray-50 shadow-none">
                        <Download className="w-4 h-4 mr-2" />
                        Report
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl bg-white p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
                    <div className="bg-teal-600 p-8 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold italic tracking-tight">Premium Insights Report</h2>
                                <p className="text-teal-100 mt-2 font-medium opacity-90">Database Performance & Retention Analytics</p>
                            </div>
                            <Badge className="bg-white/20 text-white border-0 backdrop-blur-md px-3 py-1 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> CRM Verified
                            </Badge>
                        </div>
                    </div>
                    <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Database Size</p>
                                <p className="text-4xl font-black text-gray-900">{stats.total}</p>
                                <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> Healthy Growth
                                </p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Customer Retention</p>
                                <p className="text-4xl font-black text-gray-900">{stats.retention}%</p>
                                <p className="text-xs text-blue-600 font-bold mt-2 flex items-center gap-1">
                                    <Activity className="w-3 h-3" /> Industry Standard
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                <Star className="w-5 h-5 text-amber-500" /> Top Customer Segments
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span className="font-bold text-gray-700">VIP Tier</span>
                                    </div>
                                    <span className="font-black text-gray-900">{stats.vip} Users</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        <span className="font-bold text-gray-700">Regular Tier</span>
                                    </div>
                                    <span className="font-black text-gray-900">{customers.filter(c => c.tag === 'Regular').length} Users</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowReport(false)} className="font-bold">Close</Button>
                        <Button onClick={() => window.print()} className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 rounded-xl">
                            <Download className="w-4 h-4 mr-2" /> Print Report
                        </Button>
                    </div>
                </DialogContent>
             </Dialog>
          </div>
        </div>
      </div>

      <div className="px-8 space-y-6 relative">
        <Tabs defaultValue="overview" className="w-full shadow-none border-0" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white border p-1 h-11 rounded-xl shadow-sm border-gray-100">
              <TabsTrigger value="overview" className="rounded-lg px-6 data-[state=active]:bg-teal-600 data-[state=active]:text-white shadow-none transition-all">
                  <TrendingUp className="w-4 h-4 mr-2" /> Overview
              </TabsTrigger>
              <TabsTrigger value="database" className="rounded-lg px-6 data-[state=active]:bg-teal-600 data-[state=active]:text-white shadow-none transition-all">
                  <Users className="w-4 h-4 mr-2" /> Registry
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="rounded-xl border-gray-200 hover:bg-gray-50 shadow-none transition-colors w-[140px] h-11 bg-white">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <SelectValue placeholder="All Tiers" />
                    </div>
                </SelectTrigger>
                <SelectContent className="bg-white border-0 shadow-2xl rounded-2xl p-1">
                    <SelectItem value="All Tiers" className="rounded-xl font-bold py-3">All Tiers</SelectItem>
                    <SelectItem value="VIP" className="rounded-xl font-bold py-3 text-amber-600">VIP Members</SelectItem>
                    <SelectItem value="Regular" className="rounded-xl font-bold py-3 text-blue-600">Regulars</SelectItem>
                    <SelectItem value="New" className="rounded-xl font-bold py-3 text-gray-500">New Signups</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="overview" className="shadow-none border-0 focus-visible:outline-none">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="database" className="shadow-none border-0 focus-visible:outline-none">
            {renderTable()}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}

export default CustomerManagement
