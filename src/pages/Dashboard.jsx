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
import DashboardMobileNavbar from '../components/dashboard/DashboardMobileNavbar'
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
          <div className="flex flex-col min-h-screen bg-gray-50/50 pb-20 lg:pb-0">
            <DashboardMobileNavbar 
              activeItem={activeItem}
              setActiveItem={setActiveItem}
              onRefresh={() => window.location.reload()}
            />
            
            <div className="p-4 md:p-8 space-y-6">
              <div className="hidden lg:flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Dashboard Overview</h1>
                  <p className="text-sm md:text-base text-gray-500 font-medium mt-1 uppercase tracking-widest text-[10px]">Welcome back! Monitoring your restaurant's performance.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => setActiveItem('orders')}
                    className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95 shadow-md"
                  >
                    Quick Order
                  </button>
                  <button 
                    onClick={() => setActiveItem('analytics')}
                    className="flex-1 md:flex-none px-6 py-3 bg-white text-gray-700 text-sm font-bold rounded-2xl border border-gray-100 hover:bg-gray-50 shadow-sm transition-all active:scale-95"
                  >
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
          </div>
        )
      
      case 'qr-codes':
        return <QRCodeManagement />
      
      case 'menu':
        return <MenuManagement 
          currency={currency} 
          onCurrencyChange={setCurrency} 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
        />
      
      case 'orders':
        return <OrderManagement 
          restaurantId="restaurant-123" 
          activeItem={activeItem} 
          setActiveItem={setActiveItem} 
          navigate={navigate}
        />
      
      case 'tables':
        return (
          <div className="h-full">
            <TableSessions 
              activeItem={activeItem}
              setActiveItem={setActiveItem}
              navigate={navigate}
            />
          </div>
        )
      
      case 'analytics':
        return <AnalyticsDashboard 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
        />
      
      case 'customers':
        return <CustomerManagement 
          plan={profile.plan} 
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          navigate={navigate}
        />
      
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
