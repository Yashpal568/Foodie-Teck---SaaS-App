import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import OverviewCards from '../components/dashboard/OverviewCards'
import RecentOrders from '../components/dashboard/RecentOrders'
import TableStatus from '../components/dashboard/TableStatus'
import TableSessions from '../components/dashboard/TableSessions'
import MenuManagement from '../components/menu/MenuManagement'
import QRCodeManagement from '../components/dashboard/QRCodeManagement'
import OrderManagement from '../components/dashboard/OrderManagement'
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard'
import CustomerManagement from '../components/dashboard/CustomerManagement'
import { useRestaurantProfile } from '../hooks/useRestaurantProfile'
import { ChefHat, QrCode, ShoppingCart, Users, BarChart3, Settings } from 'lucide-react'

function Dashboard() {
  const navigate = useNavigate()
  const [activeItem, setActiveItem] = useState('dashboard')
  const [currency, setCurrency] = useState('INR') // Default to Indian Rupee
  const { profile } = useRestaurantProfile('restaurant-123')

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return (
          <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 line-clamp-1">Dashboard Overview</h1>
                <p className="text-sm md:text-base text-gray-600 mt-1">Welcome back! Here&apos;s what&apos;s happening at your restaurant today.</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all active:scale-95">
                  Quick Order
                </button>
                <button className="flex-1 md:flex-none px-4 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 shadow-sm transition-all active:scale-95">
                  View Reports
                </button>
              </div>
            </div>

            <OverviewCards />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TableStatus />
              </div>
              <div>
                <RecentOrders />
              </div>
            </div>
          </div>
        )
      
      case 'qr-codes':
        return <QRCodeManagement />
      
      case 'menu':
        return <MenuManagement currency={currency} onCurrencyChange={setCurrency} />
      
      case 'orders':
        return <OrderManagement 
          restaurantId="restaurant-123" 
          activeItem={activeItem} 
          setActiveItem={setActiveItem} 
          navigate={navigate}
        />
      
      case 'tables':
        return (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Table Sessions</h1>
                <p className="text-gray-600">Monitor table occupancy and customer sessions in real-time</p>
              </div>
            </div>
            <TableSessions />
          </div>
        )
      
      case 'analytics':
        return <AnalyticsDashboard />
      
      case 'customers':
        return <CustomerManagement plan={profile.plan} />
      
      case 'settings':
        return (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-8 h-8 text-gray-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Configure your restaurant settings</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Settings</h3>
              <p className="text-gray-600">Manage restaurant configuration and preferences</p>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900">{activeItem}</h1>
            <p className="text-gray-600">Page content coming soon...</p>
          </div>
        )
    }
  }

  return (
    <Layout activeItem={activeItem} setActiveItem={setActiveItem} currency={currency} onCurrencyChange={setCurrency}>
      {renderContent()}
    </Layout>
  )
}

export default Dashboard
