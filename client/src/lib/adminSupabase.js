import { supabase } from './supabase'
import { verifyAdminSession } from './adminAuth'

let _adminAuthPromise = null

export const ensureAdminSession = async () => {
  if (_adminAuthPromise) return _adminAuthPromise

  _adminAuthPromise = (async () => {
    try {
      const res = await verifyAdminSession()
      return res.authenticated ? res.user : null
    } catch {
      return null
    }
  })()
  return _adminAuthPromise
}

export const resetAdminSession = () => {
  _adminAuthPromise = null
}

export { supabase }
