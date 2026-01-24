import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const tableData = [
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
  const stats = {
    occupied: tableData.filter(t => t.status === 'occupied').length,
    available: tableData.filter(t => t.status === 'available').length,
    'needs-cleaning': tableData.filter(t => t.status === 'needs-cleaning').length,
    reserved: tableData.filter(t => t.status === 'reserved').length
  }

  return (
    <div className="space-y-6">
      {/* Table Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tableData.map((table) => {
              const status = statusConfig[table.status]
              
              return (
                <div
                  key={table.id}
                  className={`p-4 rounded-lg border-2 ${status.bgColor} hover:shadow-md transition-shadow cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{table.name}</h4>
                    <Badge className={status.color}>
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
                        <span className="text-gray-700">{table.time}</span>
                      </div>
                      {table.order && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-blue-500" />
                          <span className="text-blue-600 font-medium">{table.order}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {table.status === 'reserved' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{table.time}</span>
                    </div>
                  )}
                  
                  {table.status === 'needs-cleaning' && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-700">Free {table.time}</span>
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
