import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, ChefHat } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const overviewData = [
  {
    title: 'Total Revenue',
    value: '$15,847.50',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    title: 'Active Tables',
    value: '8',
    change: '+2',
    trend: 'up',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    title: 'Today\'s Orders',
    value: '47',
    change: '+8.3%',
    trend: 'up',
    icon: ShoppingCart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    title: 'Menu Items',
    value: '24',
    change: '+2',
    trend: 'up',
    icon: ChefHat,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }
]

export default function OverviewCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {overviewData.map((item, index) => {
        const Icon = item.icon
        const TrendIcon = item.trend === 'up' ? TrendingUp : TrendingDown
        
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {item.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon className={`w-4 h-4 ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {item.change}
                </span>
                <span className="text-sm text-gray-500">from yesterday</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
