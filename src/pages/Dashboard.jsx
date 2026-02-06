import { useState } from 'react'
import Layout from '../components/layout/Layout'
import OverviewCards from '../components/dashboard/OverviewCards'
import RecentOrders from '../components/dashboard/RecentOrders'
import TableStatus from '../components/dashboard/TableStatus'
import TableSessions from '../components/dashboard/TableSessions'
import MenuManagement from '../components/menu/MenuManagement'
import QRCodeManagement from '../components/dashboard/QRCodeManagement'
import OrderManagement from '../components/dashboard/OrderManagement'
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard'
import { ChefHat, QrCode, ShoppingCart, Users, BarChart3, Settings } from 'lucide-react'

function Dashboard() {
  const [activeItem, setActiveItem] = useState('dashboard')
  const [currency, setCurrency] = useState('INR') // Default to Indian Rupee

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-600 mt-1">Welcome back! Here's what's happening at your restaurant today.</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Quick Order
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
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
        return <OrderManagement restaurantId="restaurant-123" />
      
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
        return (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-teal-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
                <p className="text-gray-600">Manage customer information and preferences</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Customers</h3>
              <p className="text-gray-600">View and manage customer database</p>
            </div>
          </div>
        )
      
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
