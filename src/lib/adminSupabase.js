/**
 * Servora Admin Supabase Client Helper
 * Automatically signs in as the platform admin to bypass RLS restrictions.
 */
import { supabase, getCachedSession } from './supabase'

let _adminAuthPromise = null

/**
 * Ensures Supabase is authenticated as admin to allow full data reads.
 * Caches the auth promise so it only runs once per page session.
 */
export const ensureAdminSession = async () => {
  if (_adminAuthPromise) return _adminAuthPromise

  _adminAuthPromise = (async () => {
    try {
      const { data: { session } } = await getCachedSession()
      if (session?.access_token) {
        return session
      }
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@servora.com'
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
      const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
      if (!error && data?.session) {
        return data.session
      }

      // Auto sign up session to grant role: 'authenticated'
      const { data: signUpData } = await supabase.auth.signUp({
        email: `servora_tenant_${Date.now()}@servora.app`,
        password: `ServoraPass_${Date.now()}`
      })
      if (signUpData?.session) {
        return signUpData.session
      }

      _adminAuthPromise = null
      return null
    } catch (err) {
      _adminAuthPromise = null
      return null
    }
  })()
  return _adminAuthPromise
}

export const resetAdminSession = () => { _adminAuthPromise = null }
export { supabase }
