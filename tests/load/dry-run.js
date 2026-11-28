import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { REPORTS_ROOT, parseCliArgs, generateRunId } from './config.js'
import { runVerifyEnv } from './verify-env.js'
import { runSeedRestaurants } from './seed-restaurants.js'
import { runGenerateQRCodes } from './generate-qr-codes.js'
import { runCustomerPreviewCli } from './generate-customers.js'
import { runOrderLoadTest } from './order-load-test.js'
import { runRealtimeLoadTest } from './realtime-load-test.js'
import { runCancellationTests } from './cancellation-test.js'
import { runTenantIsolationTests } from './tenant-isolation-test.js'
import { runInventoryVerification } from './inventory-verification.js'
import { runCleanup } from './cleanup.js'
import { LoadMetricsCollector } from './lib/metrics.js'

export async function runDryRunSuite(argv = process.argv.slice(2)) {
  const flags = parseCliArgs([...argv, '--dry-run'])
  const runId = flags.runId || generateRunId('dryrun')
  const commonArgs = ['--dry-run', `--run-id=${runId}`]
  if (flags.envFile) commonArgs.push(`--env-file=${flags.envFile}`)

  const envCheck = runVerifyEnv(commonArgs)
  const seedDry = await runSeedRestaurants(commonArgs)
  const qrDry = await runGenerateQRCodes(commonArgs)
  const customerDry = await runCustomerPreviewCli(commonArgs)
  const normalDry = await runOrderLoadTest([...commonArgs, '--profile=normal'])
  const busyDry = await runOrderLoadTest([...commonArgs, '--profile=busy'])
  const peakDry = await runOrderLoadTest([...commonArgs, '--profile=peak'])
  const rtDry = await runRealtimeLoadTest(commonArgs)
  const cancelDry = await runCancellationTests(commonArgs)
  const isoDry = await runTenantIsolationTests(commonArgs)
  const invDry = await runInventoryVerification(commonArgs)
  const cleanDry = await runCleanup(commonArgs)

  const collector = new LoadMetricsCollector('dry-run-validation', runId)
  collector.recordRequest({ ok: true, status: 200, latencyMs: 1 })
  const outDir = path.join(REPORTS_ROOT, runId)
  const artifacts = collector.writeReports(outDir)

  const report = {
    status: 'DRY_RUN_VALIDATED',
    runId,
    dbWritesExecuted: 0,
    envCheck: { configured: envCheck.configured, denylistedProductionRefs: envCheck.denylistedProductionRefs },
    seedDry,
    qrDry,
    customerSamplesCount: customerDry.length,
    profiles: { normal: normalDry.rampStagesVUs, busy: busyDry.rampStagesVUs, peak: peakDry.rampStagesVUs },
    realtimeDry: rtDry,
    cancellationDry: cancelDry,
    isolationDry: isoDry,
    inventoryDry: invDry,
    cleanupDry: cleanDry,
    dryRunArtifacts: {
      jsonPath: artifacts.jsonPath,
      csvPath: artifacts.csvPath,
      svgPath: artifacts.svgPath,
    },
  }

  console.log('\n=== SERVORA LOAD TEST DRY-RUN COMPLETE ===')
  console.log(JSON.stringify(report, null, 2))
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDryRunSuite().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
