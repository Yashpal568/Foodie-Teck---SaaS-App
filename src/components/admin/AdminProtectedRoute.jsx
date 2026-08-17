import { useState, useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase, getCachedSession } from '@/lib/supabase'

export default function AdminProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const location = useLocation()

  useEffect(() => {
    async function checkAuth() {
      try {
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@servora.com'
        const { data: { session } } = await getCachedSession()
        const adminAuthFlag = sessionStorage.getItem('servora_admin_auth')
        const adminToken = sessionStorage.getItem('servora_admin_token')

        const hasAdminSession = adminAuthFlag === 'true' && !!adminToken
        const isSuperAdminEmail = session?.user?.email?.toLowerCase() === adminEmail.toLowerCase()
        const hasAdminRole = session?.user?.app_metadata?.role === 'SUPER_ADMIN' || session?.user?.user_metadata?.role === 'SUPER_ADMIN'

        if (hasAdminSession || isSuperAdminEmail || hasAdminRole) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } catch (err) {
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) return null

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
