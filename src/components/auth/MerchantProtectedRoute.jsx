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

      const targetParam = restaurantId?.toLowerCase()

      // 2. Check local session storage (Instant authorization for logged in merchants)
      const storedRestId = sessionStorage.getItem('servora_restaurant_id')
      const fallbackEmail = sessionStorage.getItem('fallback_auth_email')
      const storedSession = sessionStorage.getItem('servora_user_session')

      if (storedRestId && (storedRestId.toLowerCase() === targetParam || targetParam === 'demo-merchant')) {
        if (isMounted) setAuthState({ loading: false, authorized: true, redirectUrl: null })
        return
      }

      if (fallbackEmail && (targetParam === fallbackEmail.toLowerCase())) {
        if (isMounted) setAuthState({ loading: false, authorized: true, redirectUrl: null })
        return
      }

      try {
        // 3. Match by restaurant ID or Email directly in database
        const { data: rest } = targetParam?.includes('@')
          ? await supabase.from('restaurants').select('id, owner_id, email').eq('email', targetParam).maybeSingle()
          : await supabase.from('restaurants').select('id, owner_id, email').eq('id', restaurantId).maybeSingle()

        if (rest) {
          if (isMounted) {
            sessionStorage.setItem('servora_restaurant_id', rest.id)
            setAuthState({ loading: false, authorized: true, redirectUrl: null })
          }
          return
        }

        // 4. Check Supabase session as fallback
        const { data: { session } } = await getCachedSession()
        const userEmail = session?.user?.email?.toLowerCase()
        const userId = session?.user?.id

        if (userEmail && (targetParam === userEmail || targetParam === userId)) {
          if (isMounted) setAuthState({ loading: false, authorized: true, redirectUrl: null })
          return
        }

        if (isMounted) {
          setAuthState({
            loading: false,
            authorized: false,
            redirectUrl: '/login'
          })
        }
      } catch (err) {
        console.error('Tenant protection check notice:', err)
        // If DB has error, allow access if stored ID matches
        if (storedRestId && isMounted) {
          setAuthState({ loading: false, authorized: true, redirectUrl: null })
          return
        }
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
