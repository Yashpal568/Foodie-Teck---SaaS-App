import { Clock, CheckCircle, AlertCircle, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const recentOrders = [
  {
    id: 'ORD-001',
    table: 'Table 3',
    customer: 'John Smith',
    items: 3,
    total: '$45.99',
    status: 'ready',
    time: '2 min ago'
  },
  {
    id: 'ORD-002',
    table: 'Table 1',
    customer: 'Sarah Johnson',
    items: 5,
    total: '$78.50',
    status: 'preparing',
    time: '5 min ago'
  },
  {
    id: 'ORD-003',
    table: 'Table 5',
    customer: 'Mike Davis',
    items: 2,
    total: '$32.00',
    status: 'completed',
    time: '8 min ago'
  },
  {
    id: 'ORD-004',
    table: 'Table 2',
    customer: 'Emily Wilson',
    items: 4,
    total: '$56.75',
    status: 'preparing',
    time: '12 min ago'
  }
]

const statusConfig = {
  preparing: {
    label: 'Preparing',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  ready: {
    label: 'Ready',
    color: 'bg-blue-100 text-blue-800',
    icon: AlertCircle
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  }
}

export default function RecentOrders() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Recent Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentOrders.map((order) => {
            const status = statusConfig[order.status]
            const StatusIcon = status.icon
            
            return (
              <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-xl hover:bg-gray-50 transition-all gap-3 overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600">{order.table}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{order.customer}</p>
                    <p className="text-xs text-gray-500 truncate">{order.items} items • {order.total}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0">
                  <span className="text-[10px] md:text-sm text-gray-500 font-medium">{order.time}</span>
                  <Badge className={`${status.color} shadow-sm border-none`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
