import { useState, useEffect } from 'react'
import { Navigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { verifyMerchantAccess } from '@/lib/merchantAuth'
import PageLoader from '@/components/ui/PageLoader'

/**
 * 🔒 MerchantProtectedRoute
 * Guards /console/:restaurantId:
 * 1. Allows isolated demo mode ('demo-merchant' / 'demo') only.
 * 2. Requires server-validated Supabase Auth user (`getUser()`).
 * 3. Verifies tenant ownership (`restaurant.owner_id === user.id`) or admin role.
 * 4. Fails closed on auth/DB error — never trusts sessionStorage alone.
 */
export default function MerchantProtectedRoute({ children }) {
  const { restaurantId } = useParams()
  const location = useLocation()
  const [authState, setAuthState] = useState({
    loading: true,
    authorized: false,
    redirectUrl: '/login',
  })

  useEffect(() => {
    let isMounted = true

    async function checkAccess() {
      const result = await verifyMerchantAccess(restaurantId)
      if (!isMounted) return

      if (result.authorized) {
        if (result.restaurant?.id) {
          try {
            sessionStorage.setItem('servora_restaurant_id', result.restaurant.id)
          } catch {
            // non-fatal storage failure
          }
        }
        setAuthState({ loading: false, authorized: true, redirectUrl: null })
      } else {
        setAuthState({ loading: false, authorized: false, redirectUrl: '/login' })
      }
    }

    checkAccess()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted && restaurantId !== 'demo-merchant' && restaurantId !== 'demo') {
          setAuthState({ loading: false, authorized: false, redirectUrl: '/login' })
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAccess()
      }
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
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
