import { useState, useEffect } from 'react'
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Home, 
  Calendar,
  UserCheck,
  Sparkles,
  CreditCard,
  TrendingUp,
  MoreVertical,
  RefreshCw,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const TableSessions = () => {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState(null)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
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
                Math.floor((new Date() - new Date(sessionStart)) / 60000) + ' min' : null,
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
                  Math.floor((new Date() - new Date(sessionStart)) / 60000) + ' min' : null,
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

  // Also add a manual refresh function that checks for recent orders
  const checkForRecentOrders = () => {
    console.log('Checking for recent orders...')
    
    // Get recent orders from localStorage
    const orders = JSON.parse(localStorage.getItem('orders') || '[]')
    const recentOrders = orders.filter(order => {
      const orderTime = new Date(order.createdAt)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      return orderTime > fiveMinutesAgo
    })
    
    console.log('Recent orders found:', recentOrders.length)
    
    // Update tables based on recent orders
    recentOrders.forEach(order => {
      console.log('Updating table for order:', order.tableNumber, order.status)
      
      setTables(prev => {
        const updatedTables = prev.map(table => {
          if (table.tableNumber === order.tableNumber) {
            let newStatus = 'available'
            
            switch (order.status) {
              case 'pending':
              case 'confirmed':
              case 'preparing':
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
            
            return {
              ...table,
              status: newStatus,
              customers: order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0,
              currentOrder: order.id,
              sessionStart: order.createdAt,
              revenue: order.total || 0,
              lastActivity: order.createdAt
            }
          }
          return table
        })
        
        localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
        return updatedTables
      })
    })
  }

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
      const timeDiff = (now - orderTime) / (1000 * 60) // minutes
      
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

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    billing: tables.filter(t => t.status === 'billing').length,
    needsCleaning: tables.filter(t => t.status === 'needs-cleaning').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    activeCustomers: tables.reduce((sum, t) => sum + (t.customers || 0), 0),
    totalRevenue: tables.reduce((sum, t) => sum + (t.revenue || 0), 0)
  }

  const formatDuration = (duration) => {
    if (!duration) return '-'
    return duration
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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

  const handleAddTable = () => {
    // Get current QR codes to find next table number
    const restaurantId = 'restaurant-123'
    const savedQRCodes = localStorage.getItem(`qrCodes_${restaurantId}`)
    const qrCodes = savedQRCodes ? JSON.parse(savedQRCodes) : []
    
    // Find the next available table number
    const existingTableNumbers = tables.map(t => t.tableNumber)
    const qrTableNumbers = qrCodes.map(qr => qr.tableNumber)
    const allTableNumbers = [...existingTableNumbers, ...qrTableNumbers]
    const nextTableNumber = allTableNumbers.length > 0 ? Math.max(...allTableNumbers) + 1 : 1
    
    const newTable = {
      id: nextTableNumber,
      name: `Table ${nextTableNumber}`,
      tableNumber: nextTableNumber,
      restaurantId: restaurantId,
      qrUrl: `http://localhost:5173/menu?restaurant=${restaurantId}&table=${nextTableNumber}`,
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
      lastUpdated: new Date().toISOString(),
      isManual: true // Flag to indicate this was manually added
    }
    
    const updatedTables = [...tables, newTable]
    setTables(updatedTables)
    localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
    console.log('Added new table manually:', newTable)
  }

  const handleRefreshTables = () => {
    console.log('Manually refreshing tables...')
    // Debug localStorage contents
    const qrCodes = localStorage.getItem('qrCodes_restaurant-123')
    const tableSessions = localStorage.getItem('tableSessions')
    
    console.log('Debug - QR Codes in localStorage:', qrCodes)
    console.log('Debug - Table Sessions in localStorage:', tableSessions)
    
    if (qrCodes) {
      const parsed = JSON.parse(qrCodes)
      console.log('Parsed QR codes:', parsed.length, 'codes')
      console.log('QR code details:', parsed)
    } else {
      console.log('No QR codes found in localStorage')
    }
    
    // Force check for recent orders
    checkForRecentOrders()
    
    // Trigger the QR code change event to reload tables
    window.dispatchEvent(new CustomEvent('qrCodesUpdated', { detail: { qrCodes: [] } }))
    setTimeout(() => {
      const currentQRCodes = JSON.parse(localStorage.getItem('qrCodes_restaurant-123') || '[]')
      window.dispatchEvent(new CustomEvent('qrCodesUpdated', { detail: { qrCodes: currentQRCodes } }))
    }, 100)
  }

  const handleMarkTableAvailable = (table) => {
    console.log('Manually marking table as available:', table.tableNumber)
    
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

  const handleDebugStorage = () => {
    console.log('=== DEBUGGING LOCAL STORAGE ===')
    
    // Check all possible QR code keys
    const keys = [
      'qrCodes',
      'qrCodes_restaurant-123',
      'qrCodes_restaurant123',
      'qrCodes_default'
    ]
    
    keys.forEach(key => {
      const value = localStorage.getItem(key)
      if (value) {
        const parsed = JSON.parse(value)
        const qrCount = parsed.qrCodes ? parsed.qrCodes.length : (Array.isArray(parsed) ? parsed.length : 0)
        console.log(`${key}:`, qrCount + ' items', parsed.qrCodes ? '(nested)' : '(direct)')
      } else {
        console.log(`${key}: not found`)
      }
    })
    
    // Check table sessions
    const tableSessions = localStorage.getItem('tableSessions')
    console.log('tableSessions:', tableSessions ? JSON.parse(tableSessions).length + ' tables' : 'not found')
    
    // Force reload with specific key
    const restaurantId = 'restaurant-123'
    const savedQRCodes = localStorage.getItem(`qrCodes_${restaurantId}`)
    
    if (savedQRCodes) {
      const parsed = JSON.parse(savedQRCodes)
      const qrCodes = parsed.qrCodes || parsed || []
      
      console.log('Found QR codes, forcing table creation...')
      console.log('QR codes to process:', qrCodes)
      
      // Create tables directly
      const newTables = qrCodes.map((qr, index) => ({
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
      }))
      
      console.log('Creating tables:', newTables)
      setTables(newTables)
      localStorage.setItem('tableSessions', JSON.stringify(newTables))
    } else {
      console.log('Still no QR codes found!')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading table sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Table Sessions</h1>
              <p className="text-sm text-gray-500 mt-1">Manage restaurant table status and reservations</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleDebugStorage}>
                <Settings className="w-4 h-4 mr-2" />
                Debug
              </Button>
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
                Test Complete Orders
              </Button>
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
                Mark All Available
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddTable}>
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Debug Info */}
        <Card className="border-0 shadow-sm bg-blue-50 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">Debug Info:</span>
                <span className="ml-2">Total Tables: {tables.length}</span>
                <span className="ml-4">Filtered Tables: {filteredTables.length}</span>
                <span className="ml-4">Loading: {loading ? 'Yes' : 'No'}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleDebugStorage}>
                <Settings className="w-4 h-4 mr-2" />
                Debug Storage
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tables</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                  <p className="text-xs text-gray-500 mt-1">All tables</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Home className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.available}</p>
                  <p className="text-xs text-green-600 mt-1">Ready for service</p>
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
                  <p className="text-sm font-medium text-gray-600">Occupied</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.occupied + stats.billing}</p>
                  <p className="text-xs text-blue-600 mt-1">Currently serving</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Customers</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{stats.activeCustomers}</p>
                  <p className="text-xs text-purple-600 mt-1">Total customers</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
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

        {/* Filters and Search */}
        <Card className="border-0 shadow-sm bg-white mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  placeholder="Search tables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue />
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
              <Button variant="outline" size="sm" onClick={handleRefreshTables}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table Management */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="bg-gray-100/60 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Eye className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="grid" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Home className="w-4 h-4 mr-2" />
                Grid View
              </TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Filter className="w-4 h-4 mr-2" />
                Detailed List
              </TabsTrigger>
            </TabsList>
          </div>

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

          <TabsContent value="grid" className="space-y-4">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
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
                          <Badge className={status.color} size="sm">
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
                            <Badge className={status.color} size="sm">
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
      {selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Table Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTable(null)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
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
              
              <div className="flex items-center gap-3 mt-6">
                {selectedTable.status === 'needs-cleaning' && (
                  <Button
                    onClick={() => {
                      setTables(prev => prev.map(t => 
                        t.id === selectedTable.id 
                          ? { ...t, status: 'available', customers: 0, currentOrder: null, sessionStart: null, sessionDuration: null, revenue: 0, needsCleaning: false }
                          : t
                      ))
                      localStorage.setItem('tableSessions', JSON.stringify(tables))
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Cleaned
                  </Button>
                )}
                
                {selectedTable.status === 'available' && (
                  <Button
                    onClick={() => setShowReserveModal(true)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Reserve Table
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setSelectedTable(null)}
                  className="flex-1"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Reserve {selectedTable.name}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                  <Input
                    placeholder="Enter customer name"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reservation Time</label>
                  <Input
                    type="datetime-local"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    placeholder="Add any special notes..."
                    className="w-full h-20 p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-6">
                <Button
                  onClick={() => {
                    setTables(prev => prev.map(t => 
                      t.id === selectedTable.id 
                        ? { ...t, reservedBy: 'Customer Name', reservedTime: new Date().toISOString() }
                        : t
                    ))
                    localStorage.setItem('tableSessions', JSON.stringify(tables))
                    setShowReserveModal(false)
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Confirm Reservation
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowReserveModal(false)}
                  className="flex-1"
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
