import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import MarketingLayout from './layouts/MarketingLayout'
import AdminLayout from './layouts/AdminLayout'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute'
import MaintenanceNode from './pages/MaintenanceNode'
import { supabase } from './lib/supabase'

// ─── Lazy Loaded Pages (Code Splitting) ────────────────────────────────────
const LandingPage = lazy(() => import('./pages/marketing/LandingPage'))
const PricingPage = lazy(() => import('./pages/marketing/PricingPage'))
const AboutPage = lazy(() => import('./pages/marketing/AboutPage'))
const ContactPage = lazy(() => import('./pages/marketing/ContactPage'))
const PublicDocsPage = lazy(() => import('./pages/marketing/PublicDocsPage'))
const RegisterPage = lazy(() => import('./pages/marketing/RegisterPage'))
const LoginPage = lazy(() => import('./pages/marketing/LoginPage'))

const Dashboard = lazy(() => import('./pages/Dashboard'))
const CustomerMenu = lazy(() => import('./pages/CustomerMenu'))
const DocumentationPage = lazy(() => import('./pages/DocumentationPage'))
const ReleaseNotesPage = lazy(() => import('./pages/ReleaseNotesPage'))
const VideoTutorialsPage = lazy(() => import('./pages/VideoTutorialsPage'))

const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage'))
const AdminPlansPage = lazy(() => import('./pages/admin/AdminPlansPage'))
const AdminRevenuePage = lazy(() => import('./pages/admin/AdminRevenuePage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage'))
const AdminSupportPage = lazy(() => import('./pages/admin/AdminSupportPage'))

// Page Loading Spinner Fallback
function PageLoader() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950/5 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Loading...</span>
      </div>
    </div>
  )
}

function MaintenanceGuard({ children }) {
  const [isMaintenance, setIsMaintenance] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const checkMaintenance = async () => {
      if (location.pathname.startsWith('/admin')) {
        setIsMaintenance(false)
        return
      }

      try {
        const { data } = await supabase.from('platform_config').select('maintenance_mode').single()
        if (data) {
          setIsMaintenance(data.maintenance_mode === true)
          return
        }
      } catch (err) {
        setIsMaintenance(false)
      }
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
        <Suspense fallback={<PageLoader />}>
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

            <Route path="*" element={
              <div className="flex min-h-svh flex-col items-center justify-center">
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
              </div>
            } />
          </Routes>
        </Suspense>
      </MaintenanceGuard>
    </Router>
  )
}

export default App