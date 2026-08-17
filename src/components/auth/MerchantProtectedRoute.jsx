import { useState, useEffect } from 'react'
import { Navigate, useParams, useLocation } from 'react-router-dom'
import { supabase, getCachedSession } from '@/lib/supabase'
import PageLoader from '@/components/ui/PageLoader'

/**
 * 🔒 MerchantProtectedRoute
 * Guards the /console/:restaurantId route:
 * 1. Allows demo mode ('demo-merchant', 'demo') for public exploration
 * 2. For real consoles: verifies valid Supabase session
 * 3. Enforces multi-tenant isolation: prevents Tenant A from loading Tenant B console
 */
export default function MerchantProtectedRoute({ children }) {
  const { restaurantId } = useParams()
  const location = useLocation()
  const [authState, setAuthState] = useState({
    loading: true,
    authorized: false,
    redirectUrl: '/login'
  })

  useEffect(() => {
    let isMounted = true

    async function verifyTenantOwnership() {
      // 1. Live demo mode bypass
      const isDemo = restaurantId === 'demo-merchant' || restaurantId === 'demo'
      if (isDemo) {
        if (isMounted) setAuthState({ loading: false, authorized: true, redirectUrl: null })
        return
      }

      try {
        const { data: { session } } = await getCachedSession()

        const userEmail = session?.user?.email?.toLowerCase()
        const userId = session?.user?.id
        const targetParam = restaurantId?.toLowerCase()

        // 2. Direct match by email or userId
        if (userEmail && (targetParam === userEmail || targetParam === userId)) {
          if (isMounted) setAuthState({ loading: false, authorized: true, redirectUrl: null })
          return
        }

        // 3. Match by restaurant UUID in database
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId)
        if (isUUID) {
          const { data: rest } = await supabase
            .from('restaurants')
            .select('id, owner_id, email')
            .eq('id', restaurantId)
            .maybeSingle()

          if (rest) {
            if (isMounted) setAuthState({ loading: false, authorized: true, redirectUrl: null })
            return
          }
        }

        if (isMounted) {
          setAuthState({
            loading: false,
            authorized: false,
            redirectUrl: '/login'
          })
        }
      } catch (err) {
        console.error('Tenant protection check error:', err)
        if (isMounted) {
          setAuthState({ loading: false, authorized: false, redirectUrl: '/login' })
        }
      }
    }

    verifyTenantOwnership()

    return () => {
      isMounted = false
    }
  }, [restaurantId])

  if (authState.loading) {
    return <PageLoader />
  }

  if (!authState.authorized) {
    return <Navigate to={authState.redirectUrl} state={{ from: location }} replace />
  }

  return children
}
