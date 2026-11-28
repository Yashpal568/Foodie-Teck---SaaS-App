import path from 'node:path'

export const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..')
export const ARTIFACTS_ROOT = path.join(REPO_ROOT, 'artifacts', 'load-test')
export const QR_OUTPUT_ROOT = path.join(ARTIFACTS_ROOT, 'qr-codes')
export const MANIFESTS_ROOT = path.join(ARTIFACTS_ROOT, 'manifests')
export const REPORTS_ROOT = path.join(ARTIFACTS_ROOT, 'reports')

export const PAUSE_CONTROL_FILE = path.join(ARTIFACTS_ROOT, 'PAUSE')
export const ABORT_CONTROL_FILE = path.join(ARTIFACTS_ROOT, 'ABORT')

export const LOADTEST_PREFIX = 'LOADTEST_RESTAURANT_'

export const DEFAULT_RAMP_STAGES = Object.freeze([25, 100, 250, 500, 1000])

export const LOAD_PROFILES = Object.freeze({
  normal: {
    name: 'normal',
    description: '100 restaurants active, 1-3 concurrent customers per restaurant',
    restaurants: 100,
    customersPerRestaurantMin: 1,
    customersPerRestaurantMax: 3,
    stages: [25, 100, 200],
    stageDurationSec: 20,
    rampIntervalMs: 3000,
    maxRps: 150,
  },
  busy: {
    name: 'busy',
    description: '100 restaurants active, 10-20 concurrent customers per restaurant',
    restaurants: 100,
    customersPerRestaurantMin: 10,
    customersPerRestaurantMax: 20,
    stages: [25, 100, 250, 500, 1000],
    stageDurationSec: 30,
    rampIntervalMs: 5000,
    maxRps: 350,
  },
  peak: {
    name: 'peak',
    description: '100 restaurants active, 25-50 concurrent customers per restaurant (step-ramped with circuit breaker)',
    restaurants: 100,
    customersPerRestaurantMin: 25,
    customersPerRestaurantMax: 50,
    stages: [25, 100, 250, 500, 1000, 2500],
    stageDurationSec: 35,
    rampIntervalMs: 6000,
    maxRps: 600,
  },
})

export const CIRCUIT_BREAKER_DEFAULTS = Object.freeze({
  maxErrorRate: 0.15,
  minSamplesForErrorRate: 30,
  maxConsecutiveFailures: 25,
  maxP95LatencyMs: 8000,
  connectionErrorPatterns: [
    'too many connections',
    'connection pool',
    'remaining connection slots',
    'econnrefused',
    'econnreset',
    'etimedout',
    '503',
    '504',
  ],
})

export function parseCliArgs(argv = process.argv.slice(2)) {
  const flags = {
    dryRun: false,
    confirm: false,
    envFile: null,
    profile: 'normal',
    runId: null,
    manifest: null,
    restaurants: 100,
    minTables: 10,
    maxTables: 15,
    minItems: 20,
    maxItems: 50,
    durationSec: null,
    maxRps: null,
    stages: null,
    realtimeClients: 20,
    cancellationsPerMode: 5,
  }

  for (const arg of argv) {
    if (arg === '--dry-run') flags.dryRun = true
    else if (arg === '--confirm') flags.confirm = true
    else if (arg.startsWith('--env-file=')) flags.envFile = arg.slice('--env-file='.length)
    else if (arg.startsWith('--profile=')) flags.profile = arg.slice('--profile='.length).toLowerCase()
    else if (arg.startsWith('--run-id=')) flags.runId = arg.slice('--run-id='.length)
    else if (arg.startsWith('--manifest=')) flags.manifest = arg.slice('--manifest='.length)
    else if (arg.startsWith('--restaurants=')) flags.restaurants = Math.max(1, Number(arg.slice('--restaurants='.length)) || 100)
    else if (arg.startsWith('--min-tables=')) flags.minTables = Math.max(1, Number(arg.slice('--min-tables='.length)) || 10)
    else if (arg.startsWith('--max-tables=')) flags.maxTables = Math.max(flags.minTables, Number(arg.slice('--max-tables='.length)) || 15)
    else if (arg.startsWith('--min-items=')) flags.minItems = Math.max(5, Number(arg.slice('--min-items='.length)) || 20)
    else if (arg.startsWith('--max-items=')) flags.maxItems = Math.max(flags.minItems, Number(arg.slice('--max-items='.length)) || 50)
    else if (arg.startsWith('--duration=')) flags.durationSec = Math.max(5, Number(arg.slice('--duration='.length)) || 20)
    else if (arg.startsWith('--max-rps=')) flags.maxRps = Math.max(1, Number(arg.slice('--max-rps='.length)) || 150)
    else if (arg.startsWith('--realtime-clients=')) flags.realtimeClients = Math.max(1, Number(arg.slice('--realtime-clients='.length)) || 20)
    else if (arg.startsWith('--stages=')) {
      const parsed = arg
        .slice('--stages='.length)
        .split(',')
        .map((n) => Number(n.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
      if (parsed.length > 0) flags.stages = parsed
    }
  }

  return flags
}

export function getProfileConfig(profileName = 'normal', flags = {}, envOverrides = {}) {
  const base = LOAD_PROFILES[profileName] || LOAD_PROFILES.normal
  return {
    ...base,
    restaurants: flags.restaurants || envOverrides.restaurantCount || base.restaurants,
    stageDurationSec: flags.durationSec || base.stageDurationSec,
    maxRps: flags.maxRps || envOverrides.maxRps || base.maxRps,
    stages: flags.stages || base.stages,
    abortErrorRate: envOverrides.abortErrorRate || CIRCUIT_BREAKER_DEFAULTS.maxErrorRate,
  }
}

export function generateRunId(prefix = 'lt') {
  const ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${prefix}_${ts}_${rand}`
}

export function formatRestaurantCode(index) {
  return `${LOADTEST_PREFIX}${String(index).padStart(3, '0')}`
}
