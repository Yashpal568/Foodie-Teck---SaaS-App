/**
 * Servora Admin Supabase Client Helper
 * Provides a clean session helper without unnecessary auth spam.
 */
import { supabase, getCachedSession } from './supabase'

let _adminAuthPromise = null

export const ensureAdminSession = async () => {
  if (_adminAuthPromise) return _adminAuthPromise

  _adminAuthPromise = (async () => {
    try {
      const { data: { session } } = await getCachedSession()
      return session || null
    } catch (err) {
      return null
    }
  })()
  return _adminAuthPromise
}

export const resetAdminSession = () => { _adminAuthPromise = null }
export { supabase }
