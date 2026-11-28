import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { REPORTS_ROOT, LOADTEST_PREFIX, parseCliArgs } from './config.js'
import { validateStagingEnvironment, DENYLISTED_PRODUCTION_REFS } from './safety-guard.js'
import { createStagingAdminClient, loadManifest } from './lib/supabase-staging.js'

export async function runCleanup(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: !flags.dryRun,
    allowUnconfiguredDryRun: flags.dryRun,
  })

  if (!flags.dryRun && !flags.confirm) {
    throw new Error(
      '[SAFETY ABORT] Cleanup refused without explicit confirmation flag (--confirm). Run with --dry-run first to inspect deletion targets.'
    )
  }

  let manifest = null
  try {
    manifest = loadManifest(flags.manifest || flags.runId)
  } catch (err) {
    if (flags.dryRun) {
      const drySummary = {
        mode: 'DRY_RUN',
        status: 'NO_MANIFEST_FOUND',
        reason: err.message,
        deletedCount: 0,
      }
      console.log(JSON.stringify(drySummary, null, 2))
      return drySummary
    }
    throw err
  }

  if (DENYLISTED_PRODUCTION_REFS.includes(String(manifest.projectRef || '').toLowerCase())) {
    throw new Error('[SAFETY ABORT] Manifest belongs to denylisted production project! Cleanup permanently blocked.')
  }

  if (stagingEnv.configured && manifest.projectRef !== stagingEnv.projectRef) {
    throw new Error(
      `[SAFETY ABORT] Manifest projectRef ("${manifest.projectRef}") does not match active staging ref ("${stagingEnv.projectRef}").`
    )
  }

  const invalidNames = (manifest.restaurants || []).filter(
    (r) => !String(r.code || '').startsWith(LOADTEST_PREFIX)
  )
  if (invalidNames.length > 0) {
    throw new Error('[SAFETY ABORT] Manifest contains records without synthetic LOADTEST_RESTAURANT_ prefix.')
  }

  const restaurantIds = (manifest.restaurants || []).map((r) => r.restaurantId)
  const ownerUserIds = (manifest.restaurants || []).map((r) => r.ownerUserId)

  if (flags.dryRun) {
    const preview = {
      mode: 'DRY_RUN',
      runId: manifest.runId,
      projectRef: manifest.projectRef,
      restaurantsToDelete: restaurantIds.length,
      ownerAuthUsersToDelete: ownerUserIds.length,
      trackedOrdersToDelete: manifest.createdOrderIds?.length || 0,
      actualDeletesExecuted: 0,
    }
    console.log(JSON.stringify(preview, null, 2))
    return preview
  }

  const adminClient = createStagingAdminClient(stagingEnv)
  const report = {
    runId: manifest.runId,
    projectRef: stagingEnv.projectRef,
    startedAt: new Date().toISOString(),
    deleted: {
      paymentVerifications: 0,
      subscriptions: 0,
      orders: 0,
      customers: 0,
      qrCodes: 0,
      tableSessions: 0,
      menuItems: 0,
      menuCategories: 0,
      gstSettings: 0,
      restaurants: 0,
      authUsers: 0,
    },
    errors: [],
  }

  if (restaurantIds.length > 0) {
    const chunkedDelete = async (table, column = 'restaurant_id') => {
      const { error, count } = await adminClient
        .from(table)
        .delete({ count: 'exact' })
        .in(column, restaurantIds)
      if (error) report.errors.push(`${table}: ${error.message}`)
      return count || 0
    }

    report.deleted.paymentVerifications = await chunkedDelete('payment_verifications')
    report.deleted.subscriptions = await chunkedDelete('subscriptions')
    report.deleted.orders = await chunkedDelete('orders') // cascades order_items
    report.deleted.customers = await chunkedDelete('customers')
    report.deleted.qrCodes = await chunkedDelete('qr_codes')
    report.deleted.tableSessions = await chunkedDelete('table_sessions')
    report.deleted.menuItems = await chunkedDelete('menu_items')
    report.deleted.menuCategories = await chunkedDelete('menu_categories')
    report.deleted.gstSettings = await chunkedDelete('gst_settings')
    report.deleted.restaurants = await chunkedDelete('restaurants', 'id')
  }

  for (const uid of ownerUserIds) {
    const { error } = await adminClient.auth.admin.deleteUser(uid)
    if (error) report.errors.push(`auth.users(${uid}): ${error.message}`)
    else report.deleted.authUsers += 1
  }

  report.finishedAt = new Date().toISOString()
  fs.mkdirSync(REPORTS_ROOT, { recursive: true })
  const reportPath = path.join(REPORTS_ROOT, `cleanup-${manifest.runId}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(JSON.stringify({ ...report, reportPath }, null, 2))
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCleanup().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
