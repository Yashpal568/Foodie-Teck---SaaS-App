import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function AdminProtectedRoute() {
  const token = localStorage.getItem('servora_admin_token')
  const adminUser = localStorage.getItem('servora_admin_user')
  const location = useLocation()

  if (!token || !adminUser) {
    // Missing credentials, strictly block and bounce to login
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // Identity verified, allow child route rendering
  return <Outlet />
}
