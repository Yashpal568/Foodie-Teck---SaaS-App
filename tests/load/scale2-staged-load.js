import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import {
  REPORTS_ROOT,
  PAUSE_CONTROL_FILE,
  ABORT_CONTROL_FILE,
  CIRCUIT_BREAKER_DEFAULTS,
  parseCliArgs,
} from './config.js'
import { validateStagingEnvironment } from './safety-guard.js'
import { createHttpRateLimiter } from './lib/rate-limiter.js'
import {
  createStagingAnonClient,
  createStagingAdminClient,
  createSeededRng,
  loadManifest,
  randomInt,
  sleep,
} from './lib/supabase-staging.js'
import { LoadMetricsCollector, computePercentile } from './lib/metrics.js'
import { runVirtualCustomerSession } from './generate-customers.js'

export const SCALE2_STAGES = Object.freeze([
  { name: 'Baseline', targetVUs: 500, durationSec: 25, maxRps: 250 },
  { name: 'Stage 1', targetVUs: 1000, durationSec: 25, maxRps: 350 },
  { name: 'Stage 2', targetVUs: 5000, durationSec: 30, maxRps: 750 },
  { name: 'Stage 3', targetVUs: 10000, durationSec: 30, maxRps: 1500 },
  { name: 'Stage 4', targetVUs: 25000, durationSec: 30, maxRps: 3000 },
  { name: 'Stage 5', targetVUs: 50000, durationSec: 30, maxRps: 6000 },
  { name: 'Stage 6', targetVUs: 75000, durationSec: 30, maxRps: 9000 },
  { name: 'Stage 7', targetVUs: 100000, durationSec: 30, maxRps: 12000 },
])

export async function runScale2StagedLoad(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: true,
  })

  const manifest = loadManifest(flags.manifest || flags.runId)
  const restaurants = manifest.restaurants
  const adminClient = createStagingAdminClient(stagingEnv)
  const anonPool = Array.from({ length: 16 }, () => createStagingAnonClient(stagingEnv))
  const rng = createSeededRng(Date.now())
  const maxStageCap = Number(process.env.SCALE2_MAX_VUS || 100000)

  const stageReports = []
  const createdOrderIdsAll = []
  let halted = false
  let haltReason = null

  const onSig = () => {
    halted = true
    haltReason = 'Manual SIGINT/SIGTERM abort requested'
  }
  process.on('SIGINT', onSig)
  process.on('SIGTERM', onSig)

  try {
    for (const stage of SCALE2_STAGES) {
      if (halted) {
        stageReports.push({
          stage: stage.name,
          targetVUs: stage.targetVUs,
          actualActiveVUs: 0,
          status: 'BLOCKED / NOT TESTED',
          reason: haltReason,
        })
        continue
      }

      if (stage.targetVUs > maxStageCap) {
        stageReports.push({
          stage: stage.name,
          targetVUs: stage.targetVUs,
          actualActiveVUs: 0,
          status: 'NOT TESTED',
          reason: `Capped by SCALE2_MAX_VUS=${maxStageCap}`,
        })
        continue
      }

      console.log(`\n[SCALE 2.0 - ${stage.name}] Ramping to ${stage.targetVUs} VUs for ${stage.durationSec}s (maxRps=${stage.maxRps}) across ${restaurants.length} tenants...`)
      const metrics = new LoadMetricsCollector(`scale2-${stage.name.toLowerCase().replace(/\s+/g, '-')}`, manifest.runId)
      const stageOrderIds = []
      const stageRestaurantHits = new Set()
      let stageAborted = false
      let stageAbortReason = null
      let activeWorkerPeak = 0
      let currentActiveWorkers = 0

      let poolCursor = 0
      const acquireRateSlot = createHttpRateLimiter(stage.maxRps)

      const stageEndMs = Date.now() + stage.durationSec * 1000
      const worker = async (workerIdx) => {
        await sleep(Math.round((workerIdx / Math.max(1, stage.targetVUs)) * 4000))
        currentActiveWorkers += 1
        if (currentActiveWorkers > activeWorkerPeak) activeWorkerPeak = currentActiveWorkers
        try {
          while (!halted && !stageAborted && Date.now() < stageEndMs) {
            if (fs.existsSync(ABORT_CONTROL_FILE)) {
              stageAborted = true
              stageAbortReason = 'Abort control file detected'
              break
            }
            while (fs.existsSync(PAUSE_CONTROL_FILE) && !halted && !stageAborted) {
              await sleep(500)
            }
            if (halted || stageAborted) break

            const r = restaurants[randomInt(rng, 0, restaurants.length - 1)]
            const t = r.tables[randomInt(rng, 0, r.tables.length - 1)]
            stageRestaurantHits.add(r.restaurantId)
            const client = anonPool[poolCursor++ % anonPool.length]

            await runVirtualCustomerSession({
              anonClient: client,
              restaurant: r,
              table: t,
              rng,
              metrics,
              acquireRateSlot,
              onOrderCreated: (ord) => stageOrderIds.push(ord.id),
            })

            const tripReason = metrics.shouldTripCircuitBreaker(CIRCUIT_BREAKER_DEFAULTS)
            if (tripReason) {
              stageAborted = true
              stageAbortReason = tripReason
              metrics.abortedReason = tripReason
              break
            }

            await sleep(randomInt(rng, 100, 350))
          }
        } finally {
          currentActiveWorkers -= 1
        }
      }

      await Promise.all(Array.from({ length: stage.targetVUs }, (_, idx) => worker(idx)))
      const summary = metrics.summarize()
      createdOrderIdsAll.push(...stageOrderIds)

      // Check lost orders in DB across sample/all stageOrderIds in chunks
      let confirmedInDb = 0
      const sampleVerifyIds = stageOrderIds.slice(0, 500)
      for (let i = 0; i < sampleVerifyIds.length; i += 100) {
        const { data: rows } = await adminClient
          .from('orders')
          .select('id')
          .in('id', sampleVerifyIds.slice(i, i + 100))
        confirmedInDb += rows?.length || 0
      }
      const lostOrdersSampled = Math.max(0, sampleVerifyIds.length - confirmedInDb)

      // Measure a quick stage-end RPC DB health & realtime-free latency probe
      const dbProbeStart = performance.now()
      const { error: dbProbeErr } = await adminClient
        .from('restaurants')
        .select('id', { count: 'exact', head: true })
        .eq('id', restaurants[0].restaurantId)
      const dbHealthProbeMs = Number((performance.now() - dbProbeStart).toFixed(2))

      const stageFailed = Boolean(stageAborted || halted || lostOrdersSampled > 0)
      stageReports.push({
        stage: stage.name,
        status: stageFailed ? 'HALTED_BY_CIRCUIT_BREAKER' : 'PASS',
        reason: stageAbortReason || haltReason || null,
        targetVUs: stage.targetVUs,
        actualActiveVUs: activeWorkerPeak,
        durationSec: summary.durationSec,
        distinctRestaurantsTouched: stageRestaurantHits.size,
        throughputRps: summary.requests.throughputRps,
        requests: summary.requests,
        orders: {
          ...summary.orders,
          sampledForDbPersistence: sampleVerifyIds.length,
          confirmedInDb,
          lostOrders: lostOrdersSampled,
        },
        latencyMs: summary.latencyMs,
        errorsByType: summary.errorsByType,
        dbHealthProbe: { latencyMs: dbHealthProbeMs, ok: !dbProbeErr, error: dbProbeErr?.message || null },
        processResourceUsage: summary.processResourceUsage,
      })

      if (stageFailed) {
        halted = true
        haltReason = `Halted at ${stage.name} (${stage.targetVUs} VUs): ${stageAbortReason || 'circuit breaker triggered'}`
        console.warn(`[CIRCUIT BREAKER] ${haltReason}`)
      }
    }
  } finally {
    process.off('SIGINT', onSig)
    process.off('SIGTERM', onSig)
    for (const c of anonPool) c.realtime?.disconnect?.()
  }

  manifest.createdOrderIds = Array.from(new Set([...(manifest.createdOrderIds || []), ...createdOrderIdsAll]))
  const manifestPath = path.join(path.dirname(REPORTS_ROOT), 'manifests', `manifest-${manifest.runId}.json`)
  if (fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  }

  const outDir = path.join(REPORTS_ROOT, manifest.runId)
  fs.mkdirSync(outDir, { recursive: true })
  const passedStages = stageReports.filter((s) => s.status === 'PASS')
  const maxAchievedVUs = passedStages.length > 0 ? Math.max(...passedStages.map((s) => s.actualActiveVUs)) : 0
  const maxSeenVUs = Math.max(0, ...stageReports.map((s) => s.actualActiveVUs || 0))
  const peakRps = Math.max(0, ...stageReports.map((s) => s.throughputRps || 0))

  const finalSummary = {
    testName: 'scale2-staged-concurrency',
    runId: manifest.runId,
    projectRef: stagingEnv.projectRef,
    finishedAt: new Date().toISOString(),
    halted,
    haltReason,
    maxPassedVUs: maxAchievedVUs,
    maxAttemptedVUs: maxSeenVUs,
    peakObservedRps: peakRps,
    stages: stageReports,
  }

  const outPath = path.join(outDir, `scale2-staged-concurrency-${manifest.runId}.json`)
  fs.writeFileSync(outPath, JSON.stringify(finalSummary, null, 2))
  console.log(JSON.stringify({ ...finalSummary, jsonPath: outPath }, null, 2))
  return finalSummary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runScale2StagedLoad().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
