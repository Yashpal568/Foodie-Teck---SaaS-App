/**
 * Servora Admin Supabase Client Helper
 * Automatically signs in as the platform admin to bypass RLS restrictions.
 */
import { supabase } from './supabase'

let _adminAuthPromise = null

/**
 * Ensures Supabase is authenticated as admin to allow full data reads.
 * Caches the auth promise so it only runs once per page session.
 */
export const ensureAdminSession = async () => {
  if (_adminAuthPromise) return _adminAuthPromise

  _adminAuthPromise = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        console.log('[PlatformSession] Active session detected:', session.user.email)
        return session
      }
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@servora.com'
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
      const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
      if (error) {
        console.warn('[AdminAuth] Supabase admin sign-in skipped:', error.message)
        _adminAuthPromise = null
        return null
      }
      console.log('[AdminAuth] Signed into Supabase as admin - full data access granted')
      return data.session
    } catch (err) {
      console.warn('[AdminAuth] Error:', err)
      _adminAuthPromise = null
      return null
    }
  })()
  return _adminAuthPromise
}

export const resetAdminSession = () => { _adminAuthPromise = null }
export { supabase }
