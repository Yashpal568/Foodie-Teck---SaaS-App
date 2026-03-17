import React, { useMemo, useState, useEffect } from 'react'
import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const defaultTables = [
  { id: 1, name: 'Table 1', status: 'occupied', customers: 4, time: '45 min', order: 'ORD-002' },
  { id: 2, name: 'Table 2', status: 'occupied', customers: 2, time: '30 min', order: 'ORD-004' },
  { id: 3, name: 'Table 3', status: 'available', customers: 0, time: '-', order: null },
  { id: 4, name: 'Table 4', status: 'occupied', customers: 6, time: '1h 15min', order: 'ORD-005' },
  { id: 5, name: 'Table 5', status: 'needs-cleaning', customers: 0, time: '10 min ago', order: null },
  { id: 6, name: 'Table 6', status: 'available', customers: 0, time: '-', order: null },
  { id: 7, name: 'Table 7', status: 'occupied', customers: 3, time: '20 min', order: 'ORD-006' },
  { id: 8, name: 'Table 8', status: 'reserved', customers: 2, time: '7:00 PM', order: null }
]

const statusConfig = {
  occupied: {
    label: 'Occupied',
    color: 'bg-red-100 text-red-800',
    bgColor: 'bg-red-50 border-red-200'
  },
  available: {
    label: 'Available',
    color: 'bg-green-100 text-green-800',
    bgColor: 'bg-green-50 border-green-200'
  },
  'needs-cleaning': {
    label: 'Needs Cleaning',
    color: 'bg-yellow-100 text-yellow-800',
    bgColor: 'bg-yellow-50 border-yellow-200'
  },
  reserved: {
    label: 'Reserved',
    color: 'bg-blue-100 text-blue-800',
    bgColor: 'bg-blue-50 border-blue-200'
  }
}

export default function TableStatus() {
  const [tableData, setTableData] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load and sync table data
  useEffect(() => {
    const syncTableStatuses = () => {
      try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]')
        const currentTables = JSON.parse(localStorage.getItem('tableSessions') || '[]')
        
        let tablesChanged = false
        const updatedTables = currentTables.map(table => {
          // If table is occupied and has a current order
          if ((table.status === 'occupied' || table.status === 'billing') && table.currentOrder) {
            const order = orders.find(o => o.id === table.currentOrder)
            // If order is finished or cancelled, table should be available
            if (!order || order.status === 'FINISHED' || order.status === 'CANCELLED') {
              tablesChanged = true
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

        if (tablesChanged) {
          localStorage.setItem('tableSessions', JSON.stringify(updatedTables))
          setTableData(updatedTables)
        } else if (JSON.stringify(currentTables) !== JSON.stringify(tableData)) {
          setTableData(currentTables)
        }
      } catch (err) {
        console.error('Error syncing table statuses:', err)
      }
    }

    const loadData = () => {
      const saved = localStorage.getItem('tableSessions')
      if (saved) {
        syncTableStatuses() // This also sets table data
      } else {
        setTableData(defaultTables)
      }
    }

    loadData()

    const handleStorage = () => {
      setRefreshTrigger(prev => prev + 1)
      syncTableStatuses()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('orderUpdated', handleStorage)
    window.addEventListener('orderHistoryUpdated', handleStorage)
    
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('orderUpdated', handleStorage)
      window.removeEventListener('orderHistoryUpdated', handleStorage)
    }
  }, [refreshTrigger, tableData])

  const stats = useMemo(() => ({
    occupied: tableData.filter(t => t.status === 'occupied' || t.status === 'billing').length,
    available: tableData.filter(t => t.status === 'available').length,
    'needs-cleaning': tableData.filter(t => t.status === 'needs-cleaning' || t.needsCleaning).length,
    reserved: tableData.filter(t => t.status === 'reserved').length
  }), [tableData])

  return (
    <div className="space-y-6">
      {/* Table Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => (
          <Card key={status} className={config.bgColor}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats[status]}</p>
                  <p className="text-sm text-gray-600">{config.label}</p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Table Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tableData.map((table) => {
              const status = statusConfig[table.status]
              
              return (
                <div
                  key={table.id}
                  className={`p-4 rounded-lg border-2 ${status.bgColor} hover:shadow-md transition-shadow cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                    <h4 className="font-bold text-gray-900">{table.name}</h4>
                    <Badge className={`${status.color} shadow-sm border-none`}>
                      {status.label}
                    </Badge>
                  </div>
                  
                  {table.customers > 0 && (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{table.customers} customers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{table.sessionDuration || table.time}</span>
                      </div>
                      {(table.currentOrder || table.order) && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-blue-500" />
                          <span className="text-blue-600 font-medium">{table.currentOrder || table.order}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {table.status === 'reserved' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{table.reservedTime || table.time}</span>
                    </div>
                  )}
                  
                  {(table.status === 'needs-cleaning' || table.needsCleaning) && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-700">Needs Cleaning</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
