import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import CustomerMenu from './pages/CustomerMenu'
import DocumentationPage from './pages/DocumentationPage'
import ReleaseNotesPage from './pages/ReleaseNotesPage'
import VideoTutorialsPage from './pages/VideoTutorialsPage'

import MarketingLayout from './layouts/MarketingLayout'
import LandingPage from './pages/marketing/LandingPage'
import PricingPage from './pages/marketing/PricingPage'
import AboutPage from './pages/marketing/AboutPage'
import ContactPage from './pages/marketing/ContactPage'
import PublicDocsPage from './pages/marketing/PublicDocsPage'
import RegisterPage from './pages/marketing/RegisterPage'
import LoginPage from './pages/marketing/LoginPage'

// Admin Panel Routes
import AdminLayout from './layouts/AdminLayout'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminCustomersPage from './pages/admin/AdminCustomersPage'
import AdminPlansPage from './pages/admin/AdminPlansPage'
import AdminRevenuePage from './pages/admin/AdminRevenuePage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminAuditPage from './pages/admin/AdminAuditPage'
import AdminSupportPage from './pages/admin/AdminSupportPage'
import MaintenanceNode from './pages/MaintenanceNode'

function MaintenanceGuard({ children }) {
  const [isMaintenance, setIsMaintenance] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const checkMaintenance = () => {
      const config = JSON.parse(localStorage.getItem('servora_platform_config') || '{}')
      const adminSession = localStorage.getItem('servora_admin_session')
      
      // EXEMPT: Admins and Admin Login Page
      if (adminSession || location.pathname.startsWith('/admin')) {
        setIsMaintenance(false)
        return
      }
      
      setIsMaintenance(config.maintenanceMode === true)
    }

    checkMaintenance()
    window.addEventListener('platformConfigUpdated', checkMaintenance)
    return () => window.removeEventListener('platformConfigUpdated', checkMaintenance)
  }, [location])

  if (isMaintenance) return <MaintenanceNode />
  return children
}

function App() {
  return (
    <Router>
      <MaintenanceGuard>
      <Routes>
        {/* Marketing Routes */}
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/docs" element={<PublicDocsPage />} />
        </Route>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Console / Dashboard Routes (Multi-Tenant Isolated) */}
        <Route path="/console/:restaurantId" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/login" replace />} />
        <Route path="/menu" element={<CustomerMenu />} />
        <Route path="/docs/articles" element={<DocumentationPage />} />
        <Route path="/internal-docs" element={<DocumentationPage />} />
        <Route path="/releases" element={<ReleaseNotesPage />} />
        <Route path="/tutorials" element={<VideoTutorialsPage />} />

        {/* Protected System Administrator Area */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        
        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/plans" element={<AdminPlansPage />} />
            <Route path="/admin/revenue" element={<AdminRevenuePage />} />
            <Route path="/admin/audit" element={<AdminAuditPage />} />
            <Route path="/admin/support" element={<AdminSupportPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<div className="flex min-h-svh flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
            <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
            <div className="flex gap-4 justify-center">
              <a href="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                Go Home
              </a>
              <a href="/dashboard" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                Dashboard
              </a>
            </div>
          </div>
        </div>} />
      </Routes>
      </MaintenanceGuard>
    </Router>
  )
}
export default App