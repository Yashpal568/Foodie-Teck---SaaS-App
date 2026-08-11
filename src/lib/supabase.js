import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    lock: false, // Attempt to disable locks to mitigate contention
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Deduplicate session requests to prevent lock contention (NavigatorLockAcquireTimeoutError)
let sessionPromise = null

export const getCachedSession = () => {
  if (sessionPromise) return sessionPromise
  
  sessionPromise = supabase.auth.getSession().then(res => {
    // Clear cache after 1 second so subsequent legitimate checks aren't stale
    setTimeout(() => { sessionPromise = null }, 1000)
    return res
  }).catch(err => {
    sessionPromise = null
    throw err
  })
  
  return sessionPromise
}
