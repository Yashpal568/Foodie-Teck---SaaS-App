import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import PageLoader from './components/ui/PageLoader'
import SubscriptionLockOverlay from './components/dashboard/SubscriptionLockOverlay'
import MarketingLayout from './layouts/MarketingLayout'
import AdminLayout from './layouts/AdminLayout'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute'
import MerchantProtectedRoute from './components/auth/MerchantProtectedRoute'

// Lazy-loaded Pages for Optimal Code-Splitting & Bundle Performance
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CustomerMenu = lazy(() => import('./pages/CustomerMenu'))
const DocumentationPage = lazy(() => import('./pages/DocumentationPage'))
const ReleaseNotesPage = lazy(() => import('./pages/ReleaseNotesPage'))
const VideoTutorialsPage = lazy(() => import('./pages/VideoTutorialsPage'))

// Marketing & Auth Pages
const LandingPage = lazy(() => import('./pages/marketing/LandingPage'))
const PricingPage = lazy(() => import('./pages/marketing/PricingPage'))
const AboutPage = lazy(() => import('./pages/marketing/AboutPage'))
const ContactPage = lazy(() => import('./pages/marketing/ContactPage'))
const PublicDocsPage = lazy(() => import('./pages/marketing/PublicDocsPage'))
const RegisterPage = lazy(() => import('./pages/marketing/RegisterPage'))
const LoginPage = lazy(() => import('./pages/marketing/LoginPage'))

// Admin Panel Routes
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage'))
const AdminPlansPage = lazy(() => import('./pages/admin/AdminPlansPage'))
const AdminRevenuePage = lazy(() => import('./pages/admin/AdminRevenuePage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage'))
const AdminSupportPage = lazy(() => import('./pages/admin/AdminSupportPage'))
const MaintenanceNode = lazy(() => import('./pages/MaintenanceNode'))

import { Toaster, toast } from 'sonner'
if (typeof window !== 'undefined') {
  window['toast'] = toast
}
import { supabase } from './lib/supabase'

function MaintenanceGuard({ children }) {
  const [isMaintenance, setIsMaintenance] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const checkMaintenance = async () => {
      if (location.pathname.startsWith('/admin')) {
        setIsMaintenance(false)
        return
      }

      const stored = localStorage.getItem('servora_maintenance_mode')
      if (stored !== null) {
        setIsMaintenance(stored === 'true')
      } else {
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

function DashboardRedirect() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    async function resolveTarget() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const storedEmail = localStorage.getItem('servora_merchant_email');
        if (session?.user?.email) {
          setTarget(`/console/${session.user.email}`);
        } else if (storedEmail) {
          setTarget(`/console/${storedEmail}`);
        } else {
          setTarget('/login');
        }
      } catch (e) {
        setTarget('/login');
      }
    }
    resolveTarget();
  }, []);

  if (!target) return null;
  return <Navigate to={target} replace />;
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" richColors closeButton duration={4000} className="z-99999" toastOptions={{ style: { zIndex: 999999 } }} />
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
            <Route path="/select-plan" element={<PricingPage />} />

            {/* Console / Dashboard Routes (Multi-Tenant Isolated) */}
            <Route path="/console/:restaurantId" element={
              <MerchantProtectedRoute>
                <Dashboard />
              </MerchantProtectedRoute>
            } />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/menu" element={<CustomerMenu />} />
            <Route path="/docs/articles" element={<DocumentationPage />} />
            <Route path="/internal-docs" element={<DocumentationPage />} />
            <Route path="/releases" element={<ReleaseNotesPage />} />
            <Route path="/tutorials" element={<VideoTutorialsPage />} />
            <Route path="/preview/lock" element={<SubscriptionLockOverlay pendingApproval={true} utrNumber="789789789789" planName="Professional" restaurantId="preview-node" merchantName="The Royal Bistro" merchantEmail="preview@tigerbistro.com" onCheckStatus={() => {}} />} />

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