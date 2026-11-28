import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { REPORTS_ROOT, parseCliArgs } from './config.js'
import { validateStagingEnvironment } from './safety-guard.js'
import { createStagingAdminClient, loadManifest } from './lib/supabase-staging.js'
import { LoadMetricsCollector } from './lib/metrics.js'

export async function runInventoryVerification(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: !flags.dryRun,
    allowUnconfiguredDryRun: flags.dryRun,
  })

  if (flags.dryRun) {
    const summary = {
      mode: 'DRY_RUN',
      verificationFormula: 'initialQuantity - sum(nonCancelledOrderItemQty) === currentDbQuantity; unlimited remains NULL; no negative stock',
      restaurantsChecked: 0,
    }
    console.log(JSON.stringify(summary, null, 2))
    return summary
  }

  const manifest = loadManifest(flags.manifest || flags.runId)
  const adminClient = createStagingAdminClient(stagingEnv)
  const metrics = new LoadMetricsCollector('inventory-reconciliation', manifest.runId)

  for (const r of manifest.restaurants) {
    const t0 = performance.now()
    const [{ data: dbItems, error: itemErr }, { data: dbOrders, error: ordErr }] = await Promise.all([
      adminClient.from('menu_items').select('id,name,quantity,is_in_stock').eq('restaurant_id', r.restaurantId),
      adminClient
        .from('orders')
        .select('id,status,order_items(menu_item_id,quantity)')
        .eq('restaurant_id', r.restaurantId),
    ])

    if (itemErr || ordErr) {
      metrics.recordRequest({ ok: false, status: 500, latencyMs: performance.now() - t0, error: itemErr || ordErr })
      continue
    }

    const activeDeductions = new Map()
    for (const o of dbOrders || []) {
      if (String(o.status || '').toUpperCase() === 'CANCELLED') continue
      for (const li of o.order_items || []) {
        if (!li.menu_item_id) continue
        activeDeductions.set(li.menu_item_id, (activeDeductions.get(li.menu_item_id) || 0) + Number(li.quantity || 0))
      }
    }

    const dbById = new Map((dbItems || []).map((i) => [i.id, i]))
    for (const seeded of r.menuItems) {
      const live = dbById.get(seeded.id)
      if (!live) {
        metrics.inventoryFailures.push(`${r.code}: Missing menu_item ${seeded.id}`)
        continue
      }
      if (seeded.initialQuantity === null) {
        if (live.quantity !== null) {
          metrics.inventoryFailures.push(`${r.code}: Unlimited item ${seeded.name} mutated to quantity=${live.quantity}`)
        }
      } else {
        const expected = Math.max(0, seeded.initialQuantity - (activeDeductions.get(seeded.id) || 0))
        if (Number(live.quantity) < 0 || Number(live.quantity) !== expected) {
          metrics.inventoryFailures.push(
            `${r.code}: Finite item ${seeded.name} expected qty=${expected}, found=${live.quantity}`
          )
        }
      }
    }

    metrics.recordRequest({ ok: true, status: 200, latencyMs: performance.now() - t0 })
  }

  const outDir = path.join(REPORTS_ROOT, manifest.runId)
  const written = metrics.writeReports(outDir)
  console.log(JSON.stringify({ ...written.summary, jsonPath: written.jsonPath }, null, 2))
  if (metrics.inventoryFailures.length > 0) {
    throw new Error(`Inventory reconciliation detected ${metrics.inventoryFailures.length} mismatches.`)
  }
  return written.summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runInventoryVerification().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
