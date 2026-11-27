import { supabase } from './supabase'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'PLATFORM_ADMIN'])
const LEGACY_ADMIN_KEYS = ['servora_admin_token', 'servora_admin_auth', 'servora_admin_user']

/** Remove insecure legacy admin markers from browser storage */
export function clearLegacyAdminStorage() {
  if (typeof window === 'undefined') return
  try {
    LEGACY_ADMIN_KEYS.forEach((k) => {
      window.sessionStorage?.removeItem(k)
      window.localStorage?.removeItem(k)
    })
  } catch (err) {
    console.warn('Could not clear legacy admin storage keys:', err)
  }
}

/**
 * Inspect only server-controlled Supabase `app_metadata` (never `user_metadata` or storage).
 */
export function hasTrustedAdminClaim(user) {
  if (!user || !user.app_metadata) return false
  const role = String(user.app_metadata.role || '').toUpperCase()
  return ADMIN_ROLES.has(role)
}

/**
 * Verifies administrator authentication and authorization against Supabase Auth (`getUser()`)
 * and confirms role via trusted `app_metadata` or `public.is_platform_admin()` RPC.
 */
export async function verifyAdminSession() {
  clearLegacyAdminStorage()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return { authenticated: false, user: null, role: null, reason: 'unauthenticated' }
    }

    if (hasTrustedAdminClaim(user)) {
      return {
        authenticated: true,
        user,
        role: String(user.app_metadata.role).toUpperCase(),
        reason: null,
      }
    }

    // Secondary server-verified DB check via RPC (when deployed in Postgres)
    try {
      const { data: rpcIsAdmin, error: rpcErr } = await supabase.rpc('is_platform_admin')
      if (!rpcErr && rpcIsAdmin === true) {
        return { authenticated: true, user, role: 'PLATFORM_ADMIN', reason: null }
      }
    } catch {
      // RPC optional if SQL migration is pending; do NOT fall back to user_metadata or storage
    }

    return { authenticated: false, user, role: null, reason: 'forbidden' }
  } catch (err) {
    return { authenticated: false, user: null, role: null, reason: err?.message || 'verification_failed' }
  }
}

export async function signOutAdmin() {
  clearLegacyAdminStorage()
  try {
    await supabase.auth.signOut()
  } catch (err) {
    console.warn('Admin signOut error:', err)
  }
}
