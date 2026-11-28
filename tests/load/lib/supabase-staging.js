import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { REPO_ROOT, MANIFESTS_ROOT } from '../config.js'
import { assertNotProductionValue } from '../safety-guard.js'

const require = createRequire(import.meta.url)
const { createClient } = require(
  require.resolve('@supabase/supabase-js', {
    paths: [path.join(REPO_ROOT, 'server'), path.join(REPO_ROOT, 'client')],
  })
)

export function createStagingAnonClient(stagingEnv) {
  assertNotProductionValue(stagingEnv?.supabaseUrl, 'createStagingAnonClient.url')
  return createClient(stagingEnv.supabaseUrl, stagingEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  })
}

export function createStagingAdminClient(stagingEnv) {
  assertNotProductionValue(stagingEnv?.supabaseUrl, 'createStagingAdminClient.url')
  if (!stagingEnv?.serviceRoleKey) {
    throw new Error('[SAFETY ABORT] Service role key missing for admin client creation.')
  }
  return createClient(stagingEnv.supabaseUrl, stagingEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function signInStagingMerchant(stagingEnv, email, password) {
  let lastErr = null
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const client = createStagingAnonClient(stagingEnv)
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (!error && data?.session?.access_token) {
      client.realtime.setAuth(data.session.access_token)
      return { client, user: data.user, session: data.session }
    }
    lastErr = error
    const msg = String(error?.message || '')
    if (/rate limit/i.test(msg) && attempt < 5) {
      await sleep(attempt * 12000)
      continue
    }
    break
  }
  throw new Error(`Merchant login failed for ${email}: ${lastErr?.message || 'no session'}`)
}

export function loadManifest(manifestPathOrRunId) {
  if (!manifestPathOrRunId) {
    if (!fs.existsSync(MANIFESTS_ROOT)) {
      throw new Error(`Manifests directory not found: ${MANIFESTS_ROOT}`)
    }
    const files = fs
      .readdirSync(MANIFESTS_ROOT)
      .filter((f) => f.startsWith('manifest-') && f.endsWith('.json'))
      .sort()
      .reverse()
    if (files.length === 0) {
      throw new Error('No staging seed manifest found. Run seed-restaurants.js first.')
    }
    return JSON.parse(fs.readFileSync(path.join(MANIFESTS_ROOT, files[0]), 'utf8'))
  }

  const candidate = fs.existsSync(manifestPathOrRunId)
    ? manifestPathOrRunId
    : path.join(MANIFESTS_ROOT, `manifest-${manifestPathOrRunId}.json`)

  if (!fs.existsSync(candidate)) {
    throw new Error(`Manifest file not found: ${candidate}`)
  }
  return JSON.parse(fs.readFileSync(candidate, 'utf8'))
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createSeededRng(seed = 20261127) {
  let s = Number(seed) >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

export function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min
}
