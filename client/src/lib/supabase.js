import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY; falling back to local configuration check.')
}

const resolvedUrl = SUPABASE_URL || 'https://oliuhzkbnxjiwkrdlcfv.supabase.co'
const resolvedAnonKey = SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saXVoemtibnhqaXdrcmRsY2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODEzNDIsImV4cCI6MjEwMjM1NzM0Mn0.CvsYo0-g8nAo26VNMoFEd6okUZhbSynKdk0al8UcV3U'

export const supabase = createClient(resolvedUrl, resolvedAnonKey, {
  auth: {
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
