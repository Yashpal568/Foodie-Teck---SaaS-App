import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, afterEach } from 'vitest'
import {
  DENYLISTED_PRODUCTION_REFS,
  extractSupabaseProjectRef,
  assertNotProductionValue,
  assertSafeStagingEnvFile,
  validateStagingEnvironment,
} from '../../../tests/load/safety-guard.js'
import { buildSyntheticRestaurantPlan } from '../../../tests/load/seed-restaurants.js'
import { LoadMetricsCollector, computePercentile } from '../../../tests/load/lib/metrics.js'
import { CIRCUIT_BREAKER_DEFAULTS } from '../../../tests/load/config.js'
import { createHttpRateLimiter } from '../../../tests/load/lib/rate-limiter.js'
import { runVirtualCustomerSession } from '../../../tests/load/generate-customers.js'

const createdTempDirs = []

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'servora-loadtest-'))
  createdTempDirs.push(dir)
  return dir
}

describe('Servora 100-Restaurant Load & Stress Test Framework', () => {
  afterEach(() => {
    while (createdTempDirs.length > 0) {
      fs.rmSync(createdTempDirs.pop(), { recursive: true, force: true })
    }
  })

  it('permanently blocks the denylisted production Supabase project ref and production env files', () => {
    expect(DENYLISTED_PRODUCTION_REFS).toContain('oliuhzkbnxjiwkrdlcfv')
    expect(extractSupabaseProjectRef('https://oliuhzkbnxjiwkrdlcfv.supabase.co')).toBe('oliuhzkbnxjiwkrdlcfv')

    expect(() => assertNotProductionValue('https://oliuhzkbnxjiwkrdlcfv.supabase.co')).toThrow(/SAFETY ABORT/i)
    expect(() => assertSafeStagingEnvFile('client/.env')).toThrow(/SAFETY ABORT/i)
    expect(() => assertSafeStagingEnvFile('server/.env')).toThrow(/SAFETY ABORT/i)
    expect(() => assertSafeStagingEnvFile('.env.production')).toThrow(/SAFETY ABORT/i)

    const tmp = makeTempDir()
    const badStaging = path.join(tmp, '.env.staging')
    fs.writeFileSync(
      badStaging,
      [
        'STAGING_SUPABASE_PROJECT_REF=oliuhzkbnxjiwkrdlcfv',
        'STAGING_SUPABASE_URL=https://oliuhzkbnxjiwkrdlcfv.supabase.co',
        'STAGING_SUPABASE_ANON_KEY=anon_1234567890123456789012345',
        'STAGING_SUPABASE_SERVICE_ROLE_KEY=srv_1234567890123456789012345',
      ].join('\n')
    )
    expect(() =>
      validateStagingEnvironment({
        envFile: badStaging,
        repoRoot: tmp,
        processEnv: {},
      })
    ).toThrow(/oliuhzkbnxjiwkrdlcfv/)
  })

  it('accepts a cleanly isolated non-production staging env file and rejects mismatched project refs', () => {
    const tmp = makeTempDir()
    const goodStaging = path.join(tmp, 'load.env.staging')
    fs.writeFileSync(
      goodStaging,
      [
        'STAGING_SUPABASE_PROJECT_REF=stagingisolatedref99',
        'STAGING_SUPABASE_URL=https://stagingisolatedref99.supabase.co',
        'STAGING_SUPABASE_ANON_KEY=anon_mock_staging_key_123456789012345',
        'STAGING_SUPABASE_SERVICE_ROLE_KEY=srv_mock_staging_key_123456789012345',
        'STAGING_PUBLIC_ORIGIN=https://staging-menu.servora.invalid',
      ].join('\n')
    )
    const verified = validateStagingEnvironment({ envFile: goodStaging, repoRoot: tmp, processEnv: {} })
    expect(verified.isolated).toBe(true)
    expect(verified.projectRef).toBe('stagingisolatedref99')

    expect(() =>
      validateStagingEnvironment({
        envFile: goodStaging,
        repoRoot: tmp,
        processEnv: { VITE_SUPABASE_URL: 'https://oliuhzkbnxjiwkrdlcfv.supabase.co' },
      })
    ).toThrow(/oliuhzkbnxjiwkrdlcfv/)

    const mismatched = path.join(tmp, 'mismatch.env.staging')
    fs.writeFileSync(
      mismatched,
      [
        'STAGING_SUPABASE_PROJECT_REF=otherstagingref11',
        'STAGING_SUPABASE_URL=https://stagingisolatedref99.supabase.co',
        'STAGING_SUPABASE_ANON_KEY=anon_mock_staging_key_123456789012345',
        'STAGING_SUPABASE_SERVICE_ROLE_KEY=srv_mock_staging_key_123456789012345',
      ].join('\n')
    )
    expect(() => validateStagingEnvironment({ envFile: mismatched, repoRoot: tmp, processEnv: {} })).toThrow(/does not match/i)
  })

  it('generates 100 completely independent synthetic restaurants with 10-15 tables and 20-50 items each', () => {
    const plan = buildSyntheticRestaurantPlan({ runId: 'unitrun' })
    expect(plan).toHaveLength(100)
    expect(plan[0].business_name).toBe('LOADTEST_RESTAURANT_001')
    expect(plan[99].business_name).toBe('LOADTEST_RESTAURANT_100')

    const restIds = new Set()
    const itemIds = new Set()
    let totalTables = 0

    for (const r of plan) {
      expect(restIds.has(r.id)).toBe(false)
      restIds.add(r.id)
      expect(r.tables.length).toBeGreaterThanOrEqual(10)
      expect(r.tables.length).toBeLessThanOrEqual(15)
      totalTables += r.tables.length

      expect(r.items.length).toBeGreaterThanOrEqual(20)
      expect(r.items.length).toBeLessThanOrEqual(50)
      expect(r.items.some((i) => i.quantity !== null && i.is_in_stock)).toBe(true)
      expect(r.items.some((i) => i.quantity === null && i.is_in_stock)).toBe(true)
      expect(r.items.some((i) => i.half_price !== null)).toBe(true)
      expect(r.items.some((i) => i.is_in_stock === false)).toBe(true)

      for (const item of r.items) {
        expect(itemIds.has(item.id)).toBe(false)
        itemIds.add(item.id)
      }
    }

    expect(totalTables).toBeGreaterThanOrEqual(1000)
    expect(totalTables).toBeLessThanOrEqual(1500)
  })

  it('computes accurate latency percentiles, trips circuit breaker cleanly, and writes JSON/CSV/SVG reports', () => {
    expect(computePercentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 95)).toBe(100)
    expect(computePercentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 50)).toBe(50)

    const metrics = new LoadMetricsCollector('unit-metrics', 'run_unit')
    for (let i = 0; i < 30; i += 1) {
      metrics.recordRequest({ ok: i < 20, status: i < 20 ? 200 : 503, latencyMs: 120 + i, isOrderCreate: true })
    }
    const trip = metrics.shouldTripCircuitBreaker(CIRCUIT_BREAKER_DEFAULTS)
    expect(trip).toMatch(/Sustained error rate/i)

    const tmp = makeTempDir()
    const written = metrics.writeReports(tmp)
    expect(fs.existsSync(written.jsonPath)).toBe(true)
    expect(fs.existsSync(written.csvPath)).toBe(true)
    expect(fs.existsSync(written.svgPath)).toBe(true)
    expect(fs.readFileSync(written.svgPath, 'utf8')).toContain('<svg')

    const errMetrics = new LoadMetricsCollector('net-err-test', 'run_unit2')
    const fetchErr = new TypeError('fetch failed')
    fetchErr.cause = { code: 'ECONNRESET' }
    errMetrics.recordRequest({ ok: false, status: 'NETWORK_ERROR', latencyMs: 1200, error: fetchErr })
    const summary = errMetrics.summarize()
    expect(summary.requests.httpStatusDistribution.NETWORK_ERROR).toBe(1)
    expect(summary.errorsByType['TypeError: fetch failed [ECONNRESET]'] || summary.errorsByType['fetch failed [ECONNRESET]']).toBe(1)
  })

  it('paces individual HTTP requests via createHttpRateLimiter without concurrent bursts', async () => {
    let fakeNow = 1000
    const sleeps = []
    const limiter = createHttpRateLimiter(50, {
      nowFn: () => fakeNow,
      sleepFn: async (ms) => {
        sleeps.push(ms)
        fakeNow += ms
      },
    })

    // Fire 5 concurrent HTTP requests at t=1000 with 50 RPS (20ms interval)
    const scheduled = await Promise.all([limiter(), limiter(), limiter(), limiter(), limiter()])
    expect(scheduled).toEqual([1000, 1020, 1040, 1060, 1080])
    expect(sleeps).toEqual([20, 20, 20, 20])
  })

  it('invokes acquireRateSlot per HTTP call and skips claim_public_table_session when table is occupied', async () => {
    const rpcCalls = []
    const fromCalls = []
    let rateSlotCount = 0
    const fakeClient = {
      rpc: async (fn, params) => {
        rpcCalls.push({ fn, params })
        if (fn === 'get_public_menu_bootstrap') {
          return {
            status: 200,
            data: {
              profile: { id: params.p_restaurant_id, business_name: 'Test' },
              menu_items: [],
              gst: { enabled: false, rate: 0 },
              tables: [{ table_number: 2, status: 'occupied' }],
            },
            error: null,
          }
        }
        if (fn === 'create_validated_order') {
          return { status: 200, data: { order: { id: 'ord-1' } }, error: null }
        }
        if (fn === 'get_public_order_status') {
          return { status: 200, data: [{ id: 'ord-1', status: 'PENDING' }], error: null }
        }
        return { status: 200, data: {}, error: null }
      },
      from: (table) => {
        fromCalls.push(table)
        const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: null, error: null }) }
        return chain
      },
    }

    const res = await runVirtualCustomerSession({
      anonClient: fakeClient,
      restaurant: {
        restaurantId: '11111111-1111-4111-8111-111111111111',
        code: 'R1',
        menuItems: [{ id: 'item-1', isInStock: true, price: 120, halfPrice: null }],
      },
      table: { tableNumber: 2 },
      rng: () => 0.9, // > 0.2 so no follow-up add-on order
      metrics: new LoadMetricsCollector('rate-slot-unit', 'run_unit3'),
      acquireRateSlot: async () => {
        rateSlotCount += 1
      },
    })

    expect(res.ok).toBe(true)
    expect(rpcCalls.map((c) => c.fn)).toEqual([
      'get_public_menu_bootstrap',
      'create_validated_order',
      'get_public_order_status',
    ])
    expect(rpcCalls.some((c) => c.fn === 'claim_public_table_session')).toBe(false)
    expect(fromCalls).toHaveLength(0)
    expect(rateSlotCount).toBe(3)
  })

  it('divides k6 progressive stage targets accurately across SHARD_COUNT workers', () => {
    const k6Src = fs.readFileSync(path.resolve(process.cwd(), '../tests/load/k6/servora-scale2.js'), 'utf8')
    const fnMatch = k6Src.match(
      /export function perShardTarget[\s\S]*?return stages\s*\}/
    )
    expect(fnMatch).not.toBeNull()

    const execCode = fnMatch[0].replace(/export function /g, 'function ')
    const loader = new Function(`${execCode}; return { perShardTarget, buildDistributedRampingStages }`)
    const { buildDistributedRampingStages } = loader()

    const shard0 = buildDistributedRampingStages(100000, 4, 0)
    expect(shard0.map((s) => s.target)).toEqual([125, 250, 1250, 2500, 6250, 12500, 18750, 25000])

    const smallStages = buildDistributedRampingStages(500, 4, 0)
    expect(smallStages).toEqual([{ duration: '30s', target: 125 }])

    const composeSrc = fs.readFileSync(
      path.resolve(process.cwd(), '../tests/load/k6/docker-compose.distributed.yml'),
      'utf8'
    )
    expect(composeSrc).toContain('SHARD_COUNT=4')
    expect(composeSrc).toContain('TARGET_PEAK_VUS=100000')
  })

  it('enforces strict Primary vs Staging Supabase environment boundaries', () => {
    const rootDir = path.resolve(process.cwd(), '..')
    const prodFiles = [
      path.join(rootDir, 'client/.env'),
      path.join(rootDir, 'wrangler.json'),
      path.join(rootDir, 'client/wrangler.json'),
      path.join(rootDir, 'server/.env'),
    ]

    for (const filePath of prodFiles) {
      const content = fs.readFileSync(filePath, 'utf8')
      expect(content).toContain('oliuhzkbnxjiwkrdlcfv')
      expect(content).not.toContain('mhkxdidwmycsibdjflxz')
    }

    const stagingEnv = fs.readFileSync(path.join(rootDir, 'tests/load/.env.staging'), 'utf8')
    expect(stagingEnv).toContain('mhkxdidwmycsibdjflxz')
    expect(stagingEnv).not.toContain('oliuhzkbnxjiwkrdlcfv')

    const viteCfg = fs.readFileSync(path.join(rootDir, 'client/vite.config.js'), 'utf8')
    expect(viteCfg).toContain('servora-production-supabase-boundary')
    expect(viteCfg).toContain('mhkxdidwmycsibdjflxz')

    const clientSupabase = fs.readFileSync(path.join(rootDir, 'client/src/lib/supabase.js'), 'utf8')
    expect(clientSupabase).toContain('mhkxdidwmycsibdjflxz')
    expect(clientSupabase).toContain('oliuhzkbnxjiwkrdlcfv')

    const serverSupabase = fs.readFileSync(path.join(rootDir, 'server/lib/supabase.js'), 'utf8')
    expect(serverSupabase).toContain('mhkxdidwmycsibdjflxz')
  })
})
