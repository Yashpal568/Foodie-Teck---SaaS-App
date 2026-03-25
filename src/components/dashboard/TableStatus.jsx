import React, { useMemo, useState, useEffect } from 'react'
import { Users, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  },
  billing: {
    label: 'Billing',
    color: 'bg-purple-100 text-purple-800',
    bgColor: 'bg-purple-50 border-purple-200'
  }
}

const TableStatus = ({ restaurantId = 'default' }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Listen for storage changes to update table status in real-time
  useEffect(() => {
    const handleStorage = () => setRefreshTrigger(prev => prev + 1)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('orderUpdated', handleStorage)
    window.addEventListener('orderHistoryUpdated', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('orderUpdated', handleStorage)
      window.removeEventListener('orderHistoryUpdated', handleStorage)
    }
  }, [])

  const { tables, stats } = useMemo(() => {
    try {
      const rawSessions = JSON.parse(localStorage.getItem('tableSessions') || '[]')
      
      // ISO-LEVEL FILTERING: Ensure only this merchant's tables surface
      const normalizedId = restaurantId.toString().toLowerCase().trim()
      const sessions = rawSessions.filter(t => (t.restaurantId || 'default').toString().toLowerCase().trim() === normalizedId)
      
      const tablesStats = {
        occupied: sessions.filter(t => t.status === 'occupied').length,
        available: sessions.filter(t => t.status === 'available').length,
        'needs-cleaning': sessions.filter(t => t.status === 'needs-cleaning' || t.needsCleaning).length,
        reserved: sessions.filter(t => t.status === 'reserved').length,
        billing: sessions.filter(t => t.status === 'billing').length
      }

      return { tables: sessions, stats: tablesStats }
    } catch (e) {
      console.error('Error loading table sessions:', e)
      return { 
        tables: [], 
        stats: { occupied: 0, available: 0, 'needs-cleaning': 0, reserved: 0, billing: 0 } 
      }
    }
  }, [refreshTrigger, restaurantId])

  return (
    <div className="space-y-6">
      {/* Table Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['available', 'occupied', 'billing', 'needs-cleaning'].map((status) => (
          <div key={status} className={statusConfig[status].bgColor + " p-4 rounded-2xl border flex flex-col items-center justify-center text-center"}>
             <p className="text-xl font-black text-slate-900 leading-none">{stats[status] || 0}</p>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{statusConfig[status].label}</p>
          </div>
        ))}
      </div>

      {/* Table Grid Card */}
      <Card className="border-gray-100 shadow-sm overflow-hidden rounded-[2rem]">
        <CardHeader className="pb-3 px-6">
          <CardTitle className="flex items-center gap-2 text-lg font-black text-gray-800">
            <Users className="w-5 h-5 text-blue-600" />
            Live Floor Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2">
          {tables.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
              {tables.map((table) => {
                const status = statusConfig[table.status] || statusConfig.available
                
                return (
                  <div
                    key={table.id || table.tableNumber}
                    className={`p-4 rounded-3xl border-2 ${status.bgColor} hover:shadow-md transition-all group`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-black text-gray-900 text-sm">T-{table.tableNumber}</h4>
                      <Badge className={`${status.color} shadow-sm border-none rounded-lg px-2 py-0.5 text-[8px] font-black uppercase`}>
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1.5 mt-3">
                       <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-600">{table.customers || 0} Guests</span>
                       </div>
                       {table.revenue > 0 && (
                          <div className="flex items-center gap-2">
                             <Clock className="w-3.5 h-3.5 text-slate-400" />
                             <span className="text-[11px] font-bold text-slate-600">₹{table.revenue}</span>
                          </div>
                       )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
               <Users className="w-8 h-8 text-slate-200 mx-auto mb-3" />
               <p className="text-xs text-slate-400 font-black uppercase tracking-widest">No Tables Configured</p>
               <p className="text-[10px] text-slate-400 font-medium px-4 mt-1">Generate QR codes to initialize your restaurant floor plan.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TableStatus
