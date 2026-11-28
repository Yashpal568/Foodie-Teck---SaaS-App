import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY; falling back to local configuration check.')
}

const resolvedUrl = SUPABASE_URL || 'https://oliuhzkbnxjiwkrdlcfv.supabase.co'
const resolvedAnonKey = SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saXVoemtibnhqaXdrcmRsY2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODEzNDIsImV4cCI6MjEwMjM1NzM0Mn0.CvsYo0-g8nAo26VNMoFEd6okUZhbSynKdk0al8UcV3U'

const STAGING_SUPABASE_REF = 'mhkxdidwmycsibdjflxz'
if (
  import.meta.env.PROD &&
  import.meta.env.MODE !== 'staging' &&
  (String(resolvedUrl).toLowerCase().includes(STAGING_SUPABASE_REF) ||
    String(resolvedAnonKey).toLowerCase().includes(STAGING_SUPABASE_REF))
) {
  throw new Error(
    `[ENV BOUNDARY ABORT] Production bundle is configured with staging Supabase (${STAGING_SUPABASE_REF}). Aborting client initialization.`
  )
}

const GLOBAL_CLIENT_KEY = '__servoraSupabaseClient'

let inMemoryLockChain = Promise.resolve()
const safeAuthLock = async (_name, _acquireTimeout, fn) => {
  const run = inMemoryLockChain.then(() => fn(), () => fn())
  inMemoryLockChain = run.catch(() => {})
  return run
}

export const supabase =
  globalThis[GLOBAL_CLIENT_KEY] ||
  (globalThis[GLOBAL_CLIENT_KEY] = createClient(resolvedUrl, resolvedAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: safeAuthLock,
    },
  }))

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
