import { supabase } from './supabase'
import { hasTrustedAdminClaim } from './adminAuth'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LEGACY_MERCHANT_BYPASS_KEYS = ['fallback_auth_email']

export const isDemoRestaurantSlug = (restaurantId) =>
  restaurantId === 'demo-merchant' || restaurantId === 'demo'

export function clearLegacyMerchantStorage() {
  if (typeof window === 'undefined') return
  try {
    LEGACY_MERCHANT_BYPASS_KEYS.forEach((k) => {
      window.sessionStorage?.removeItem(k)
      window.localStorage?.removeItem(k)
    })
  } catch {
    // ignore storage access issues
  }
}

/**
 * Authoritative verification for merchant console access.
 * - Demo mode ('demo-merchant' | 'demo') is isolated and does NOT touch real tenant routes.
 * - Any real restaurant console requires:
 *   1. Valid server-verified Supabase user (`supabase.auth.getUser()`), AND
 *   2. Proven ownership (`restaurant.owner_id === user.id`) or trusted admin claim.
 * Fails closed on any auth/DB error and never trusts sessionStorage alone.
 */
export async function verifyMerchantAccess(restaurantId) {
  clearLegacyMerchantStorage()

  if (!restaurantId) {
    return { authorized: false, isDemo: false, user: null, restaurant: null, reason: 'missing_tenant' }
  }

  if (isDemoRestaurantSlug(restaurantId)) {
    return { authorized: true, isDemo: true, user: null, restaurant: null, restaurantId: 'demo-merchant' }
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { authorized: false, isDemo: false, user: null, restaurant: null, reason: 'unauthenticated' }
    }

    const isAdmin = hasTrustedAdminClaim(user)
    const rawTarget = String(restaurantId).trim()

    let query = supabase.from('restaurants').select('id, owner_id, email, business_name')
    if (UUID_REGEX.test(rawTarget)) {
      query = query.eq('id', rawTarget)
    } else if (rawTarget.includes('@')) {
      query = query.eq('email', rawTarget.toLowerCase())
    } else {
      return { authorized: false, isDemo: false, user, restaurant: null, reason: 'invalid_tenant_identifier' }
    }

    const { data: rest, error: restError } = await query.maybeSingle()
    if (restError || !rest) {
      return { authorized: false, isDemo: false, user, restaurant: null, reason: 'tenant_not_found' }
    }

    if (isAdmin || (rest.owner_id && rest.owner_id === user.id)) {
      return {
        authorized: true,
        isDemo: false,
        isAdmin,
        user,
        restaurant: rest,
        restaurantId: rest.id,
      }
    }

    return { authorized: false, isDemo: false, user, restaurant: null, reason: 'forbidden_cross_tenant' }
  } catch (err) {
    return {
      authorized: false,
      isDemo: false,
      user: null,
      restaurant: null,
      reason: err?.message || 'verification_failed',
    }
  }
}
