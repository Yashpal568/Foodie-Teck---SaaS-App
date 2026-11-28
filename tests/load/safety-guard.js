import fs from 'node:fs'
import path from 'node:path'

/**
 * HARD PRODUCTION SAFETY GUARD FOR SERVORA LOAD & STRESS TESTS
 *
 * Production Supabase project ref `oliuhzkbnxjiwkrdlcfv` is permanently denylisted.
 * Every write, seed, load, realtime, cancellation, isolation, and cleanup entry point
 * MUST pass `validateStagingEnvironment()` before touching any remote endpoint.
 */

export const DENYLISTED_PRODUCTION_REFS = Object.freeze(['oliuhzkbnxjiwkrdlcfv'])

export const FORBIDDEN_PRODUCTION_HOSTS = Object.freeze([
  'oliuhzkbnxjiwkrdlcfv.supabase.co',
  'servora.quantumesh.in',
])

const FORBIDDEN_ENV_FILENAMES = new Set([
  '.env',
  '.env.production',
  '.env.production.local',
  '.env.cloudflare',
])

export function extractSupabaseProjectRef(supabaseUrl = '') {
  const raw = String(supabaseUrl || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    const match = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.(co|in|net)$/i)
    if (match) return match[1].toLowerCase()
    const firstLabel = parsed.hostname.split('.')[0]
    return firstLabel ? firstLabel.toLowerCase() : ''
  } catch {
    return ''
  }
}

export function assertNotProductionValue(value, label = 'configuration value') {
  const text = String(value || '').toLowerCase()
  for (const prodRef of DENYLISTED_PRODUCTION_REFS) {
    if (text.includes(prodRef)) {
      throw new Error(
        `[SAFETY ABORT] ${label} references denylisted production Supabase project "${prodRef}". All load/seed/cleanup operations are permanently blocked against production.`
      )
    }
  }
  for (const prodHost of FORBIDDEN_PRODUCTION_HOSTS) {
    if (text.includes(prodHost)) {
      throw new Error(
        `[SAFETY ABORT] ${label} references forbidden production host "${prodHost}".`
      )
    }
  }
}

export function assertSafeStagingEnvFile(envFilePath, repoRoot = process.cwd()) {
  if (!envFilePath) {
    throw new Error(
      '[SAFETY ABORT] No dedicated staging environment file specified. Expected tests/load/.env.staging or --env-file=<staging-env-path>.'
    )
  }

  const resolved = path.resolve(repoRoot, envFilePath)
  const normalized = resolved.replace(/\\/g, '/').toLowerCase()
  const baseName = path.basename(normalized)

  if (
    normalized.endsWith('/client/.env') ||
    normalized.endsWith('/server/.env') ||
    normalized === path.resolve(repoRoot, '.env').replace(/\\/g, '/').toLowerCase() ||
    FORBIDDEN_ENV_FILENAMES.has(baseName)
  ) {
    throw new Error(
      `[SAFETY ABORT] Refusing to read forbidden production/root env file "${envFilePath}". Only dedicated staging env files (e.g. tests/load/.env.staging) are permitted.`
    )
  }

  if (!baseName.includes('staging')) {
    throw new Error(
      `[SAFETY ABORT] Staging env filename "${baseName}" must explicitly contain "staging" (for example tests/load/.env.staging).`
    )
  }

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `[SAFETY ABORT] Staging env file not found at "${resolved}". Create it from tests/load/.env.staging.example with isolated staging project credentials.`
    )
  }

  return resolved
}

export function parseEnvContent(rawText = '') {
  const parsed = {}
  for (const line of String(rawText).split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    let val = match[2].trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    parsed[match[1]] = val
  }
  return parsed
}

export function resolveStagingEnvFile(explicitPath = null, repoRoot = process.cwd()) {
  if (explicitPath) {
    return assertSafeStagingEnvFile(explicitPath, repoRoot)
  }

  const candidates = [
    process.env.SERVORA_STAGING_ENV_FILE,
    'tests/load/.env.staging',
    '.env.staging',
    'client/.env.staging',
    'server/.env.staging',
  ].filter(Boolean)

  for (const candidate of candidates) {
    const abs = path.resolve(repoRoot, candidate)
    if (fs.existsSync(abs)) {
      return assertSafeStagingEnvFile(candidate, repoRoot)
    }
  }

  throw new Error(
    '[SAFETY ABORT] Isolated staging env file not found. Provide --env-file=tests/load/.env.staging (never falls back to client/.env or server/.env).'
  )
}

/**
 * Validate staging configuration positively.
 * Throws immediately if any production marker exists, placeholders remain, or service keys are missing (unless allowDryRunPlaceholder).
 */
export function validateStagingEnvironment({
  envFile = null,
  repoRoot = process.cwd(),
  requireServiceRole = true,
  allowUnconfiguredDryRun = false,
  processEnv = process.env,
} = {}) {
  // Block accidental production process env injection
  assertNotProductionValue(processEnv.VITE_SUPABASE_URL, 'process.env.VITE_SUPABASE_URL')
  assertNotProductionValue(processEnv.SUPABASE_URL, 'process.env.SUPABASE_URL')
  assertNotProductionValue(processEnv.STAGING_SUPABASE_URL, 'process.env.STAGING_SUPABASE_URL')
  assertNotProductionValue(processEnv.STAGING_SUPABASE_PROJECT_REF, 'process.env.STAGING_SUPABASE_PROJECT_REF')

  let resolvedEnvPath = null
  let envMap = {}

  try {
    resolvedEnvPath = resolveStagingEnvFile(envFile, repoRoot)
    const raw = fs.readFileSync(resolvedEnvPath, 'utf8')
    assertNotProductionValue(raw, resolvedEnvPath)
    envMap = parseEnvContent(raw)
  } catch (err) {
    if (allowUnconfiguredDryRun && String(err.message || '').includes('not found')) {
      return {
        isolated: false,
        configured: false,
        dryRunFallback: true,
        reason: err.message,
        denylistedProductionRefs: [...DENYLISTED_PRODUCTION_REFS],
      }
    }
    throw err
  }

  const url = envMap.STAGING_SUPABASE_URL || envMap.VITE_STAGING_SUPABASE_URL || ''
  const declaredRef = (envMap.STAGING_SUPABASE_PROJECT_REF || '').trim().toLowerCase()
  const extractedRef = extractSupabaseProjectRef(url)
  const anonKey = envMap.STAGING_SUPABASE_ANON_KEY || envMap.VITE_STAGING_SUPABASE_ANON_KEY || ''
  const serviceRoleKey = envMap.STAGING_SUPABASE_SERVICE_ROLE_KEY || ''
  const publicOrigin = (envMap.STAGING_PUBLIC_ORIGIN || 'https://staging-menu.servora.invalid').trim().replace(/\/+$/, '')

  assertNotProductionValue(url, 'STAGING_SUPABASE_URL')
  assertNotProductionValue(declaredRef, 'STAGING_SUPABASE_PROJECT_REF')
  assertNotProductionValue(anonKey, 'STAGING_SUPABASE_ANON_KEY')
  assertNotProductionValue(serviceRoleKey, 'STAGING_SUPABASE_SERVICE_ROLE_KEY')
  assertNotProductionValue(publicOrigin, 'STAGING_PUBLIC_ORIGIN')

  const isPlaceholder =
    !url ||
    !declaredRef ||
    !extractedRef ||
    url.includes('your-staging-project-ref') ||
    declaredRef === 'your-staging-project-ref' ||
    anonKey.startsWith('your-staging-')

  if (isPlaceholder) {
    if (allowUnconfiguredDryRun) {
      return {
        isolated: false,
        configured: false,
        dryRunFallback: true,
        envFile: resolvedEnvPath,
        reason: 'Staging env file still contains placeholder values.',
        denylistedProductionRefs: [...DENYLISTED_PRODUCTION_REFS],
      }
    }
    throw new Error(
      '[SAFETY ABORT] Staging env file is incomplete or still contains placeholder values.'
    )
  }

  if (declaredRef !== extractedRef) {
    throw new Error(
      `[SAFETY ABORT] STAGING_SUPABASE_PROJECT_REF ("${declaredRef}") does not match STAGING_SUPABASE_URL host ref ("${extractedRef}").`
    )
  }

  if (!anonKey || anonKey.length < 20) {
    throw new Error('[SAFETY ABORT] STAGING_SUPABASE_ANON_KEY is missing or malformed.')
  }

  if (requireServiceRole && (!serviceRoleKey || serviceRoleKey.length < 20 || serviceRoleKey.startsWith('your-staging-'))) {
    throw new Error(
      '[SAFETY ABORT] STAGING_SUPABASE_SERVICE_ROLE_KEY is required in staging env for seeding/auth-admin/cleanup.'
    )
  }

  return {
    isolated: true,
    configured: true,
    dryRunFallback: false,
    envFile: resolvedEnvPath,
    projectRef: extractedRef,
    supabaseUrl: url,
    anonKey,
    serviceRoleKey,
    publicOrigin,
    overrides: {
      restaurantCount: Number(envMap.LOADTEST_RESTAURANT_COUNT || 0) || null,
      maxRps: Number(envMap.LOADTEST_MAX_RPS || 0) || null,
      abortErrorRate: Number(envMap.LOADTEST_ABORT_ERROR_RATE || 0) || null,
    },
    denylistedProductionRefs: [...DENYLISTED_PRODUCTION_REFS],
  }
}
