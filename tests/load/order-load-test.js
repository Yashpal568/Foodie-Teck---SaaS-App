import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  REPORTS_ROOT,
  PAUSE_CONTROL_FILE,
  ABORT_CONTROL_FILE,
  CIRCUIT_BREAKER_DEFAULTS,
  parseCliArgs,
  getProfileConfig,
} from './config.js'
import { validateStagingEnvironment } from './safety-guard.js'
import { createStagingAnonClient, createSeededRng, loadManifest, randomInt, sleep } from './lib/supabase-staging.js'
import { LoadMetricsCollector } from './lib/metrics.js'
import { createHttpRateLimiter } from './lib/rate-limiter.js'
import { runVirtualCustomerSession } from './generate-customers.js'
import { buildSyntheticRestaurantPlan } from './seed-restaurants.js'

export async function runOrderLoadTest(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: false,
    allowUnconfiguredDryRun: flags.dryRun,
  })

  const profile = getProfileConfig(flags.profile, flags, stagingEnv.overrides || {})

  if (flags.dryRun) {
    const dryPlan = buildSyntheticRestaurantPlan({ runId: flags.runId || 'dryrun', restaurantCount: Math.min(profile.restaurants, 100) })
    const summary = {
      mode: 'DRY_RUN',
      profile: profile.name,
      description: profile.description,
      activeRestaurantsPlanned: dryPlan.length,
      rampStagesVUs: profile.stages,
      stageDurationSec: profile.stageDurationSec,
      maxRps: profile.maxRps,
      pauseControlFile: PAUSE_CONTROL_FILE,
      abortControlFile: ABORT_CONTROL_FILE,
      circuitBreaker: CIRCUIT_BREAKER_DEFAULTS,
      requestsExecuted: 0,
    }
    console.log(JSON.stringify(summary, null, 2))
    return summary
  }

  const manifest = loadManifest(flags.manifest || flags.runId)
  const restaurants = manifest.restaurants.slice(0, profile.restaurants)
  const metrics = new LoadMetricsCollector(`order-load-${profile.name}`, manifest.runId)
  const rng = createSeededRng(Date.now())
  const createdOrderIds = []

  let aborted = false
  let abortReason = null
  const onSig = () => {
    aborted = true
    abortReason = 'Manual SIGINT/SIGTERM abort requested'
  }
  process.on('SIGINT', onSig)
  process.on('SIGTERM', onSig)

  const anonPool = Array.from({ length: 8 }, () => createStagingAnonClient(stagingEnv))
  let poolCursor = 0
  const acquireRateSlot = createHttpRateLimiter(profile.maxRps)

  try {
    for (const targetVUs of profile.stages) {
      if (aborted) break
      console.log(`\n[STAGE] Ramping to ${targetVUs} global virtual users for ${profile.stageDurationSec}s (maxRps=${profile.maxRps})...`)
      const stageEndMs = Date.now() + profile.stageDurationSec * 1000

      const worker = async (workerIdx) => {
        // Stagger ramp-up gently across initial stage window
        await sleep(Math.round((workerIdx / Math.max(1, targetVUs)) * Math.min(profile.rampIntervalMs, 4000)))
        while (!aborted && Date.now() < stageEndMs) {
          if (fs.existsSync(ABORT_CONTROL_FILE)) {
            aborted = true
            abortReason = 'Abort control file detected'
            break
          }
          while (fs.existsSync(PAUSE_CONTROL_FILE) && !aborted) {
            await sleep(500)
          }
          if (aborted) break

          const restaurant = restaurants[randomInt(rng, 0, restaurants.length - 1)]
          const table = restaurant.tables[randomInt(rng, 0, restaurant.tables.length - 1)]
          const client = anonPool[poolCursor++ % anonPool.length]

          await runVirtualCustomerSession({
            anonClient: client,
            restaurant,
            table,
            rng,
            metrics,
            acquireRateSlot,
            onOrderCreated: (ord) => createdOrderIds.push(ord.id),
          })

          const tripReason = metrics.shouldTripCircuitBreaker({
            ...CIRCUIT_BREAKER_DEFAULTS,
            maxErrorRate: profile.abortErrorRate,
          })
          if (tripReason) {
            aborted = true
            abortReason = tripReason
            metrics.abortedReason = tripReason
            break
          }
          await sleep(randomInt(rng, 100, 350))
        }
      }

      await Promise.all(Array.from({ length: targetVUs }, (_, idx) => worker(idx)))
      const snap = metrics.summarize()
      metrics.recordStageSnapshot({
        targetVUs,
        totalRequests: snap.requests.total,
        p95Ms: snap.latencyMs.p95,
        errorRatePct: Number((100 - snap.requests.successRatePct).toFixed(2)),
      })
    }
  } finally {
    process.off('SIGINT', onSig)
    process.off('SIGTERM', onSig)
    for (const c of anonPool) {
      c.realtime?.disconnect?.()
    }
  }

  if (abortReason) metrics.abortedReason = abortReason

  // Append newly created order IDs to manifest without overwriting restaurant entries
  manifest.createdOrderIds = Array.from(new Set([...(manifest.createdOrderIds || []), ...createdOrderIds]))
  const manifestPath = path.join(path.dirname(REPORTS_ROOT), 'manifests', `manifest-${manifest.runId}.json`)
  if (fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  }

  const outDir = path.join(REPORTS_ROOT, manifest.runId)
  const written = metrics.writeReports(outDir)
  console.log(JSON.stringify({ ...written.summary, jsonPath: written.jsonPath, csvPath: written.csvPath, svgPath: written.svgPath }, null, 2))
  return written.summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runOrderLoadTest().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
