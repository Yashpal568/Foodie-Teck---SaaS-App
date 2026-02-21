import { useState, useEffect, useMemo } from 'react'
import { 
  Users, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Plus, 
  X, 
  Search, 
  Filter, 
  RefreshCw, 
  Grid, 
  List,
  Save,
  CreditCard,
  Sparkles,
  Home,
  Eye,
  Edit,
  UserCheck,
  Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  Navbar, 
  NavbarContent, 
  NavbarBrand, 
  NavbarItem, 
  NavbarMenuToggle, 
  NavbarMenu, 
  NavbarMenuItem 
} from '@/components/ui/navbar'
import { useOrderManagement, ORDER_STATUS } from '@/hooks/useOrderManagement'

const TableSessions = () => {
  const { updateStatus } = useOrderManagement()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState(null)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [reserveData, setReserveData] = useState({ customerName: '', notes: '', reservationTime: '' })
  const [showAddTableModal, setShowAddTableModal] = useState(false)
  const [newTableData, setNewTableData] = useState({ tableNumber: '', capacity: 4, location: '' })
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 3,
    autoCompleteOrders: true,
    autoCompleteMinutes: 60,
    notifications: true,
    theme: 'light'
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Load tables from localStorage and sync with QR codes on mount
  useEffect(() => {
    console.log('TableSessions component mounting...')
    
    const loadTables = () => {
      try {
        // Get QR codes to determine table count - use restaurant-specific key
        const restaurantId = 'restaurant-123' // Default restaurant ID
        const savedQRCodes = localStorage.getItem(`qrCodes_${restaurantId}`)
        
        let qrCodes = []
        if (savedQRCodes) {
          const parsed = JSON.parse(savedQRCodes)
          // Handle nested structure { qrCodes: [...] }
          qrCodes = parsed.qrCodes || parsed || []
        }
        
        console.log('Loading QR codes for table sessions:', qrCodes.length, 'QR codes found')
        console.log('QR codes data:', qrCodes)
        
        // Get existing table sessions
        const savedTables = localStorage.getItem('tableSessions')
        let existingTables = savedTables ? JSON.parse(savedTables) : []
        
        console.log('Existing tables:', existingTables.length, 'tables found')
        
        // Create tables based on QR codes
        if (qrCodes.length > 0) {
          const newTables = qrCodes.map((qr, index) => {
            // Find existing table for this table number
            const existingTable = existingTables.find(t => t.tableNumber === qr.tableNumber)
            
            if (existingTable) {
              // Update existing table with current QR info
              console.log('Updating existing table:', qr.tableNumber)
              return {
                ...existingTable,
                id: qr.tableNumber,
                name: `Table ${qr.tableNumber}`,
                tableNumber: qr.tableNumber,
                restaurantId: qr.restaurantId,
                qrUrl: qr.url,
                lastUpdated: new Date().toISOString()
              }
            } else {
              // Create new table
              console.log('Creating new table:', qr.tableNumber)
              return {
                id: qr.tableNumber,
                name: `Table ${qr.tableNumber}`,
                tableNumber: qr.tableNumber,
                restaurantId: qr.restaurantId,
                qrUrl: qr.url,
                status: 'available',
                customers: 0,
                currentOrder: null,
                sessionStart: null,
                sessionDuration: null,
                lastActivity: null,
                revenue: 0,
                reservedBy: null,
                reservedTime: null,
                needsCleaning: false,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              }
            }
          })
          
          console.log('Final tables to save:', newTables.length, 'tables')
          setTables(newTables)
          localStorage.setItem('tableSessions', JSON.stringify(newTables))
        } else {
          // No QR codes, no tables
          console.log('No QR codes found, creating empty table list')
          setTables([])
          localStorage.setItem('tableSessions', JSON.stringify([]))
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error loading table sessions:', error)
        setLoading(false)
      }
    }

    loadTables()
    
    // Listen for QR code changes
    const handleQRCodeChange = () => {
      console.log('QR code change detected, reloading tables')
      loadTables()
    }
    
    // Listen for order updates to change table status
    const handleOrderUpdate = (event) => {
      console.log('ORDER UPDATE EVENT RECEIVED!')
      const { tableNumber, orderStatus, customers, orderId, revenue } = event.detail
      
      console.log('Order update received:', { tableNumber, orderStatus, customers, orderId, revenue })
      console.log('Current tables:', tables.map(t => ({ id: t.id, tableNumber: t.tableNumber, status: t.status })))
      
      setTables(prev => {
        const updatedTables = prev.map(table => {
          console.log('Checking table:', table.tableNumber, 'against order table:', tableNumber)
          if (table.tableNumber === tableNumber) {
            console.log('Found matching table, updating status...')
            let newStatus = table.status
            let sessionStart = table.sessionStart
            let sessionDuration = table.sessionDuration
            
            switch (orderStatus) {
              case 'created':
                newStatus = 'occupied'
                sessionStart = new Date().toISOString()
                break
              case 'preparing':
                newStatus = 'occupied'
                break
              case 'ready':
                newStatus = 'occupied'
                break
              case 'served':
                newStatus = 'occupied'
                break
              case 'billing':
                newStatus = 'billing'
                break
              case 'paid':
                newStatus = 'needs-cleaning'
                break
              case 'finished':
                newStatus = 'available'
                break
            }
            
            const updatedTable = {
              ...table,
              status: newStatus,
              customers: customers || table.customers,
              currentOrder: orderId,
              sessionStart,
              sessionDuration: sessionStart ? 
                Math.floor((new Date().getTime() - new Date(sessionStart).getTime()) / 60000) + ' min' : null,
              lastActivity: new Date().toISOString(),
              revenue: revenue || table.revenue
            }
            
            console.log('Updated table:', updatedTable)
            return updatedTable
          }
          return table
        })
        
        console.log('Final updated tables:', updatedTables.map(t => ({ id: t.id, tableNumber: t.tableNumber, status: t.status })))
        
        // Save to localStorage immediately
        localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
        return updatedTables
      })
    }
    
    console.log('Setting up event listeners...')
    window.addEventListener('qrCodesUpdated', handleQRCodeChange)
    window.addEventListener('orderUpdated', handleOrderUpdate)
    
    console.log('Event listeners set up successfully')
    
    return () => {
      console.log('Cleaning up event listeners...')
      window.removeEventListener('qrCodesUpdated', handleQRCodeChange)
      window.removeEventListener('orderUpdated', handleOrderUpdate)
    }
  }, [])

  // Add global event listener test
  useEffect(() => {
    const globalTestListener = (event) => {
      console.log('GLOBAL EVENT LISTENER - Event received:', event.type, event.detail)
      
      // Direct table update - bypass event system issues
      if (event.type === 'orderUpdated') {
        const { tableNumber, orderStatus, customers, orderId, revenue } = event.detail
        console.log('Directly updating table:', tableNumber, 'to status:', orderStatus)
        
        // Update tables directly
        setTables(prev => {
          const updatedTables = prev.map(table => {
            if (table.tableNumber === tableNumber) {
              let newStatus = table.status
              let sessionStart = table.sessionStart
              let sessionDuration = table.sessionDuration
              
              switch (orderStatus) {
                case 'created':
                  newStatus = 'occupied'
                  sessionStart = new Date().toISOString()
                  break
                case 'preparing':
                  newStatus = 'occupied'
                  break
                case 'ready':
                  newStatus = 'occupied'
                  break
                case 'served':
                  newStatus = 'occupied'
                  break
                case 'billing':
                  newStatus = 'billing'
                  break
                case 'paid':
                  newStatus = 'needs-cleaning'
                  break
                case 'finished':
                  newStatus = 'available'
                  break
              }
              
              const updatedTable = {
                ...table,
                status: newStatus,
                customers: customers || table.customers,
                currentOrder: orderId,
                sessionStart,
                sessionDuration: sessionStart ? 
                  Math.floor((new Date().getTime() - new Date(sessionStart).getTime()) / 60000) + ' min' : null,
                lastActivity: new Date().toISOString(),
                revenue: revenue || table.revenue
              }
              
              console.log('Table updated directly:', updatedTable)
              return updatedTable
            }
            return table
          })
          
          // Save to localStorage immediately
          localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
          console.log('Tables saved to localStorage')
          return updatedTables
        })
      }
    }
    
    window.addEventListener('orderUpdated', globalTestListener)
    
    return () => {
      window.removeEventListener('orderUpdated', globalTestListener)
    }
  }, [])

  // Also listen for order completion events
  useEffect(() => {
    const handleOrderCompleted = (event) => {
      console.log('Order completion event received:', event.detail)
      const { tableNumber, orderId } = event.detail
      
      // Update table to available
      setTables(prev => {
        const updatedTables = prev.map(table => {
          if (table.tableNumber === tableNumber) {
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
        return updatedTables
      })
    }
    
    window.addEventListener('orderCompleted', handleOrderCompleted)
    
    return () => {
      window.removeEventListener('orderCompleted', handleOrderCompleted)
    }
  }, [])

  // Check for recent orders every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing tables...')
      
      // Force reload from localStorage
      const savedTables = localStorage.getItem('tableSessions')
      if (savedTables) {
        const tables = JSON.parse(savedTables)
        setTables(tables)
        console.log('Tables refreshed from localStorage')
      }
      
      // Check for completed orders and update tables
      checkForCompletedOrders()
      
      // Also check for any orders that should be auto-completed
      autoCompleteOldOrders()
    }, 2000) // Check every 2 seconds for faster response
    
    return () => clearInterval(interval)
  }, [])

  const autoCompleteOldOrders = () => {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]')
    const currentTables = JSON.parse(localStorage.getItem('tableSessions') || '[]')
    
    let ordersUpdated = false
    let tablesUpdated = false
    
    const updatedOrders = orders.map(order => {
      // Auto-complete orders that are more than 1 hour old
      const orderTime = new Date(order.createdAt)
      const now = new Date()
      const timeDiff = (now.getTime() - orderTime.getTime()) / (1000 * 60) // minutes
      
      if (timeDiff > 60 && order.status !== 'FINISHED' && order.status !== 'CANCELLED') {
        console.log(`Auto-completing old order ${order.id} after ${timeDiff.toFixed(0)} minutes`)
        order.status = 'FINISHED'
        order.updatedAt = new Date().toISOString()
        ordersUpdated = true
        
        // Update corresponding table
        const tableIndex = currentTables.findIndex(t => t.tableNumber === parseInt(order.tableNumber))
        if (tableIndex !== -1) {
          currentTables[tableIndex] = {
            ...currentTables[tableIndex],
            status: 'available',
            customers: 0,
            currentOrder: null,
            sessionStart: null,
            sessionDuration: null,
            revenue: 0,
            needsCleaning: false,
            lastActivity: new Date().toISOString()
          }
          tablesUpdated = true
        }
      }
      
      return order
    })
    
    if (ordersUpdated) {
      localStorage.setItem('orders', JSON.stringify(updatedOrders))
      console.log('Old orders auto-completed')
    }
    
    if (tablesUpdated) {
      localStorage.setItem('tableSessions', JSON.stringify(currentTables))
      setTables(currentTables)
      console.log('Tables updated for auto-completed orders')
    }
  }

  const checkForCompletedOrders = () => {
    // Get all orders
    const orders = JSON.parse(localStorage.getItem('orders') || '[]')
    
    // Get current tables
    let currentTables = JSON.parse(localStorage.getItem('tableSessions') || '[]')
    
    let tablesUpdated = false
    
    // Check each table for completed orders
    const updatedTables = currentTables.map(table => {
      if (table.status === 'occupied' && table.currentOrder) {
        const order = orders.find(o => o.id === table.currentOrder)
        
        // If order is finished, cancelled, or doesn't exist, mark table as available
        if (!order || order.status === 'FINISHED' || order.status === 'CANCELLED') {
          console.log(`Table ${table.tableNumber} order is completed, marking table as available`)
          
          tablesUpdated = true
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
      }
      return table
    })
    
    // Save if any tables were updated
    if (tablesUpdated) {
      localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
      setTables(updatedTables)
      console.log('Tables updated based on completed orders')
    }
  }

  const statusConfig = {
    available: {
      label: 'Available',
      color: 'bg-green-100 text-green-800 border-green-200',
      bgColor: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="w-4 h-4" />,
      description: 'Ready for customers'
    },
    occupied: {
      label: 'Occupied',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      bgColor: 'bg-blue-50 border-blue-200',
      icon: <Users className="w-4 h-4" />,
      description: 'Currently serving customers'
    },
    billing: {
      label: 'Billing',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      bgColor: 'bg-yellow-50 border-yellow-200',
      icon: <CreditCard className="w-4 h-4" />,
      description: 'Payment in progress'
    },
    'needs-cleaning': {
      label: 'Needs Cleaning',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      bgColor: 'bg-orange-50 border-orange-200',
      icon: <Sparkles className="w-4 h-4" />,
      description: 'Table needs cleaning'
    },
    reserved: {
      label: 'Reserved',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      bgColor: 'bg-purple-50 border-purple-200',
      icon: <Calendar className="w-4 h-4" />,
      description: 'Reserved for customer'
    }
  }

  const stats = useMemo(() => {
    return {
      totalTables: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      needsCleaning: tables.filter(t => t.status === 'needs-cleaning').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      activeCustomers: tables.reduce((sum, t) => sum + (t.customers || 0), 0),
      totalRevenue: tables.reduce((sum, t) => sum + (t.revenue || 0), 0)
    }
  }, [tables])

  const formatDuration = (duration) => {
    if (!duration) return '-'
    return duration
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || table.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Debug logging
  console.log('Debug - Total tables:', tables.length)
  console.log('Debug - Filtered tables:', filteredTables.length)
  console.log('Debug - Search term:', searchTerm)
  console.log('Debug - Filter status:', filterStatus)
  console.log('Debug - Tables data:', tables)

  const handleReserveTable = (table) => {
    setSelectedTable(table)
    setShowReserveModal(true)
  }

  const handleEditTable = (table) => {
    setSelectedTable(table)
    setShowEditModal(true)
  }

  const handleQuickAction = (table, action) => {
    switch (action) {
      case 'clean':
        // Update table to available
        setTables(prev => prev.map(t => 
          t.id === table.id 
            ? { ...t, status: 'available', customers: 0, currentOrder: null, sessionStart: null, sessionDuration: null, revenue: 0, needsCleaning: false }
            : t
        ))
        localStorage.setItem('tableSessions', JSON.stringify(tables))
        break
      case 'reserve':
        handleReserveTable(table)
        break
      case 'edit':
        handleEditTable(table)
        break
    }
  }

  const handleSaveSettings = () => {
    localStorage.setItem('tableSessionsSettings', JSON.stringify(settings))
    setSettingsModalOpen(false)
  }

  const handleAddTable = () => {
    setShowAddTableModal(true)
  }

  const handleConfirmAddTable = () => {
    if (newTableData.tableNumber) {
      const newTable = {
        id: Date.now().toString(),
        tableNumber: parseInt(newTableData.tableNumber),
        name: `Table ${newTableData.tableNumber}`,
        status: 'available',
        capacity: newTableData.capacity,
        location: newTableData.location,
        customers: 0,
        currentOrder: null,
        sessionStart: null,
        sessionDuration: null,
        revenue: 0,
        needsCleaning: false,
        reservedFor: null,
        reservedAt: null,
        reservationNotes: null,
        lastActivity: new Date().toISOString()
      }
      
      const updatedTables = [...tables, newTable]
      setTables(updatedTables)
      localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
      setShowAddTableModal(false)
      setNewTableData({ tableNumber: '', capacity: 4, location: '' })
    }
  }

  const handleRefreshTables = () => {
    console.log('Manually refreshing tables...')
    
    // Force reload from localStorage
    const savedTables = localStorage.getItem('tableSessions')
    if (savedTables) {
      const tables = JSON.parse(savedTables)
      setTables(tables)
      console.log('Tables refreshed from localStorage')
    }
    
    // Also check for completed orders
    checkForCompletedOrders()
  }

  const handleMarkTableAvailable = (table) => {
    console.log('Manually marking table as available:', table.tableNumber)
    
    // If table has a current order, mark it as finished so analytics update
    if (table.currentOrder) {
      updateStatus(table.currentOrder, ORDER_STATUS.FINISHED)
    }

    // Update table status to available
    const updatedTables = tables.map(t => {
      if (t.tableNumber === table.tableNumber) {
        return {
          ...t,
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
      return t
    })
    
    setTables(updatedTables)
    localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
    console.log('Table manually marked as available')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading table sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Professional Navbar */}
      <Navbar className="bg-card border-border">
        <NavbarContent>
          <NavbarBrand className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-foreground">Table Sessions</span>
          </NavbarBrand>
          
          <div className="flex items-center gap-4 ml-auto">
            <NavbarItem>
              <Button variant="outline" size="sm" onClick={() => {
                // Test: Force complete all orders
                const orders = JSON.parse(localStorage.getItem('orders') || '[]')
                const updatedOrders = orders.map(order => ({
                  ...order,
                  status: 'FINISHED',
                  updatedAt: new Date().toISOString()
                }))
                localStorage.setItem('orders', JSON.stringify(updatedOrders))
                console.log('All orders marked as FINISHED for testing')
                
                // Emit completion events
                updatedOrders.forEach(order => {
                  window.dispatchEvent(new CustomEvent('orderCompleted', {
                    detail: {
                      tableNumber: parseInt(order.tableNumber),
                      orderId: order.id
                    }
                  }))
                })
              }}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete All Orders
              </Button>
            </NavbarItem>
            
            <NavbarItem>
              <Button variant="outline" size="sm" onClick={() => {
                // Mark all tables as available
                const updatedTables = tables.map(table => ({
                  ...table,
                  status: 'available',
                  customers: 0,
                  currentOrder: null,
                  sessionStart: null,
                  sessionDuration: null,
                  revenue: 0,
                  needsCleaning: false,
                  lastActivity: new Date().toISOString()
                }))
                setTables(updatedTables)
                localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
                console.log('All tables marked as available')
              }}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Reset All Tables
              </Button>
            </NavbarItem>
            
            <NavbarItem>
              <Button variant="outline" size="sm" onClick={() => setSettingsModalOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </NavbarItem>
            
            <NavbarItem>
              <Button size="sm" onClick={handleAddTable}>
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>
            </NavbarItem>
          </div>
        </NavbarContent>
      </Navbar>

      <div className="p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tables</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.totalTables}</p>
                  <p className="text-xs text-muted-foreground mt-1">All tables</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Home className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Tables</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.available}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ready for customers</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Occupied Tables</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.occupied}</p>
                  <p className="text-xs text-muted-foreground mt-1">Currently in use</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Customers</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{stats.activeCustomers}</p>
                  <p className="text-xs text-muted-foreground mt-1">Across all tables</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalRevenue)}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+12% from yesterday</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <Input
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="needs-cleaning">Needs Cleaning</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
          {tables.length > 0 && (
            <Button variant="outline" onClick={() => {
              setSearchTerm('')
              setFilterStatus('all')
            }}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Home className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="grid" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Grid className="w-4 h-4 mr-2" />
              Grid View
            </TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Filter className="w-4 h-4 mr-2" />
              Detailed List
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {filteredTables.length === 0 ? (
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Home className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Tables Found</h3>
                  <p className="text-gray-600 mb-6">
                    {tables.length === 0 
                      ? "Generate QR codes to create tables for your restaurant."
                      : "No tables match your current filters."
                    }
                  </p>
                  {tables.length === 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500">
                        Go to QR Codes section and generate QR codes for your tables.
                      </p>
                      <Button onClick={handleAddTable} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Table Manually
                      </Button>
                    </div>
                  )}
                  {tables.length > 0 && (
                    <Button variant="outline" onClick={() => {
                      setSearchTerm('')
                      setFilterStatus('all')
                    }}>
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTables.map((table) => {
                  const status = statusConfig[table.status]
                  const occupancyRate = table.status === 'occupied' || table.status === 'billing' ? 100 : 0
                  
                  return (
                    <Card 
                      key={table.id} 
                      className={`border-2 ${status.bgColor} hover:shadow-md transition-all cursor-pointer relative overflow-hidden`}
                      onClick={() => setSelectedTable(table)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900">{table.name}</h4>
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {status.icon}
                            <span className="text-sm text-gray-600">{status.description}</span>
                          </div>
                          
                          {table.customers > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">{table.customers} customers</span>
                            </div>
                          )}
                          
                          {table.currentOrder && (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-blue-600 font-medium">
                                #{table.currentOrder.slice(-6)}
                              </span>
                            </div>
                          )}
                          
                          {table.sessionDuration && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                {formatDuration(table.sessionDuration)}
                              </span>
                            </div>
                          )}
                          
                          {table.reservedBy && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-purple-500" />
                              <span className="text-sm text-purple-700">
                                {table.reservedBy}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress indicator for occupancy */}
                        <div className="mt-3">
                          <Progress 
                            value={occupancyRate} 
                            className="h-2"
                          />
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            {table.status === 'needs-cleaning' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleQuickAction(table, 'clean')
                                }}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Mark Clean
                              </Button>
                            )}
                            
                            {table.status === 'occupied' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkTableAvailable(table)
                                }}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Mark Available
                              </Button>
                            )}
                            
                            {table.status === 'available' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleQuickAction(table, 'reserve')
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                <Calendar className="w-3 h-3 mr-1" />
                                Reserve
                              </Button>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickAction(table, 'edit')
                            }}
                            className="border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Grid Tab */}
          <TabsContent value="grid" className="space-y-4">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid className="w-5 h-5" />
                  Table Grid View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredTables.map((table) => {
                    const status = statusConfig[table.status]
                    return (
                      <div
                        key={table.id}
                        className={`p-4 rounded-lg border-2 ${status.bgColor} hover:shadow-md transition-all cursor-pointer`}
                        onClick={() => setSelectedTable(table)}
                      >
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-lg flex items-center justify-center">
                            {status.icon}
                          </div>
                          <h4 className="font-bold text-gray-900 mb-1">{table.name}</h4>
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                          {table.customers > 0 && (
                            <p className="text-sm text-gray-600 mt-1">
                              {table.customers} customers
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* List Tab */}
          <TabsContent value="list" className="space-y-4">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Detailed Table List
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredTables.map((table) => {
                    const status = statusConfig[table.status]
                    return (
                      <div
                        key={table.id}
                        className={`p-4 rounded-lg border ${status.bgColor} hover:shadow-md transition-all cursor-pointer`}
                        onClick={() => setSelectedTable(table)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                              {status.icon}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{table.name}</h4>
                              <p className="text-sm text-gray-600">{status.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                            {table.customers > 0 && (
                              <p className="text-sm text-gray-600 mt-1">
                                {table.customers} customers
                              </p>
                            )}
                            {table.revenue > 0 && (
                              <p className="text-sm font-medium text-green-600 mt-1">
                                {formatCurrency(table.revenue)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Table Details Modal */}
      {selectedTable && !showReserveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-0">
                <h3 className="text-lg font-bold text-gray-900">Table Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTable(null)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Table Number</span>
                  <span className="font-bold text-gray-900">{selectedTable.name}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Status</span>
                  <Badge className={statusConfig[selectedTable.status].color}>
                    {statusConfig[selectedTable.status].label}
                  </Badge>
                </div>
                
                {selectedTable.customers > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Customers</span>
                    <span className="font-bold text-gray-900">{selectedTable.customers}</span>
                  </div>
                )}
                
                {selectedTable.currentOrder && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Current Order</span>
                    <span className="font-bold text-blue-600">#{selectedTable.currentOrder.slice(-6)}</span>
                  </div>
                )}
                
                {selectedTable.sessionDuration && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Session Duration</span>
                    <span className="font-bold text-gray-900">{formatDuration(selectedTable.sessionDuration)}</span>
                  </div>
                )}
                
                {selectedTable.revenue > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Revenue</span>
                    <span className="font-bold text-green-600">{formatCurrency(selectedTable.revenue)}</span>
                  </div>
                )}
              </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex items-center gap-3">
                {selectedTable.status === 'needs-cleaning' && (
                  <Button
                    onClick={() => {
                      setTables(prev => prev.map(t => 
                        t.id === selectedTable.id 
                          ? { ...t, status: 'available', customers: 0, currentOrder: null, sessionStart: null, sessionDuration: null, revenue: 0, needsCleaning: false }
                          : t
                      ))
                      localStorage.setItem('tableSessions', JSON.stringify(tables))
                      setSelectedTable(null)
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10 font-medium"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Cleaned
                  </Button>
                )}
                
                {selectedTable.status === 'available' && (
                  <Button
                    onClick={() => setShowReserveModal(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10 font-medium"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Reserve Table
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setSelectedTable(null)}
                  className="flex-1 h-10 font-medium border-gray-300 hover:bg-gray-100"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reserve Modal */}
      {showReserveModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 relative">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Reserve {selectedTable.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter reservation details</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReserveModal(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                <Input
                  placeholder="Enter customer name"
                  className="w-full"
                  value={reserveData.customerName}
                  onChange={(e) => setReserveData(prev => ({ ...prev, customerName: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reservation Time</label>
                <Input
                  type="datetime-local"
                  className="w-full"
                  value={reserveData.reservationTime}
                  onChange={(e) => setReserveData(prev => ({ ...prev, reservationTime: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  placeholder="Add any special notes..."
                  className="w-full h-20 p-2 border border-gray-300 rounded-md"
                  value={reserveData.notes}
                  onChange={(e) => setReserveData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex items-center gap-3 mt-6">
                <Button
                  onClick={() => {
                    if (reserveData.customerName.trim()) {
                      const updatedTables = tables.map(t => {
                        if (t.tableNumber === selectedTable.tableNumber) {
                          return {
                            ...t,
                            status: 'reserved',
                            reservedBy: reserveData.customerName,
                            reservedTime: reserveData.reservationTime || new Date().toISOString(),
                            reservationNotes: reserveData.notes,
                            lastActivity: new Date().toISOString()
                          }
                        }
                        return t
                      })
                      
                      setTables(updatedTables)
                      localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
                      setShowReserveModal(false)
                      setReserveData({ customerName: '', notes: '', reservationTime: '' })
                      setSelectedTable(null)
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10 font-medium"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Confirm Reservation
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowReserveModal(false)}
                  className="flex-1 h-10 font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Modal */}
      {settingsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Table Sessions Settings</h3>
                  <p className="text-sm text-gray-500 mt-1">Configure table management preferences</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsModalOpen(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Auto Refresh</label>
                    <p className="text-xs text-gray-500">Automatically refresh table status</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoRefresh}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Refresh Interval (seconds)</label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.refreshInterval}
                    onChange={(e) => setSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Auto Complete Orders</label>
                    <p className="text-xs text-gray-500">Automatically complete old orders</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoCompleteOrders}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoCompleteOrders: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Auto Complete After (minutes)</label>
                  <Input
                    type="number"
                    min="15"
                    max="240"
                    value={settings.autoCompleteMinutes}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoCompleteMinutes: parseInt(e.target.value) }))}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Notifications</label>
                    <p className="text-xs text-gray-500">Show table status notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveSettings}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 font-medium"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setSettingsModalOpen(false)}
                  className="flex-1 h-11 font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Add New Table</h3>
                  <p className="text-sm text-gray-500 mt-1">Create a new table for your restaurant</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddTableModal(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Table Number</label>
                <Input
                  type="number"
                  placeholder="Enter table number"
                  value={newTableData.tableNumber}
                  onChange={(e) => setNewTableData(prev => ({ ...prev, tableNumber: e.target.value }))}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Capacity</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={newTableData.capacity}
                  onChange={(e) => setNewTableData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Location (Optional)</label>
                <Input
                  placeholder="e.g., Main Hall, Outdoor"
                  value={newTableData.location}
                  onChange={(e) => setNewTableData(prev => ({ ...prev, location: e.target.value }))}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleConfirmAddTable}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 font-medium"
                  disabled={!newTableData.tableNumber}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Table
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowAddTableModal(false)}
                  className="flex-1 h-11 font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Table Modal */}
      {showEditModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Edit Table</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedTable.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Table Number</label>
                <Input
                  type="number"
                  value={selectedTable.tableNumber}
                  disabled
                  className="h-11 border-gray-300 bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Capacity</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={selectedTable.capacity || 4}
                  onChange={(e) => {
                    const updatedTables = tables.map(t => {
                      if (t.tableNumber === selectedTable.tableNumber) {
                        return { ...t, capacity: parseInt(e.target.value) }
                      }
                      return t
                    })
                    setTables(updatedTables)
                    setSelectedTable(updatedTables.find(t => t.id === selectedTable.id))
                    localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
                  }}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Location</label>
                <Input
                  placeholder="e.g., Main Hall, Outdoor"
                  value={selectedTable.location || ''}
                  onChange={(e) => {
                    const updatedTables = tables.map(t => {
                      if (t.tableNumber === selectedTable.tableNumber) {
                        return { ...t, location: e.target.value }
                      }
                      return t
                    })
                    setTables(updatedTables)
                    setSelectedTable(updatedTables.find(t => t.id === selectedTable.id))
                    localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
                  }}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 font-medium"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 h-11 font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TableSessions