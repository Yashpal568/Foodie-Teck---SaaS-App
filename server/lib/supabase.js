const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const STAGING_SUPABASE_REF = 'mhkxdidwmycsibdjflxz'
if (
  process.env.NODE_ENV === 'production' &&
  process.env.ALLOW_STAGING_SUPABASE !== 'true' &&
  [SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY].some((v) =>
    String(v || '').toLowerCase().includes(STAGING_SUPABASE_REF)
  )
) {
  throw new Error(
    `[ENV BOUNDARY ABORT] Server in production mode cannot connect to staging Supabase (${STAGING_SUPABASE_REF}).`
  )
}

if (!SUPABASE_URL) {
  console.warn('[Servora Server] Missing SUPABASE_URL environment variable. Database-backed operations will fail closed.')
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Servora Server] Missing SUPABASE_SERVICE_ROLE_KEY. Privileged DB writes and RLS-protected lookups are restricted.')
}

const activeKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || ''
const isServiceRoleConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
const isSupabaseConfigured = Boolean(SUPABASE_URL && activeKey)

const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, activeKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

module.exports = {
  supabase,
  SUPABASE_URL,
  isSupabaseConfigured,
  isServiceRoleConfigured,
}
