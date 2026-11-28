import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { REPORTS_ROOT, parseCliArgs } from './config.js'
import { validateStagingEnvironment } from './safety-guard.js'
import {
  createStagingAnonClient,
  createStagingAdminClient,
  loadManifest,
  signInStagingMerchant,
  sleep,
} from './lib/supabase-staging.js'
import { LoadMetricsCollector } from './lib/metrics.js'

/**
 * Automated multi-tenant isolation test across seeded tenants.
 * NEVER uses service_role key for merchant authorization assertions.
 */
export async function runTenantIsolationTests(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: false,
    allowUnconfiguredDryRun: flags.dryRun,
  })

  if (flags.dryRun) {
    const summary = {
      mode: 'DRY_RUN',
      usesServiceRoleForMerchantChecks: false,
      checksPlanned: [
        'cross_tenant_orders_read_blocked',
        'cross_tenant_inventory_write_blocked',
        'cross_tenant_customers_read_blocked',
        'cross_tenant_table_sessions_read_blocked',
        'anon_restaurants_pii_blocked_only_public_rpc_allowed',
        'suspended_restaurant_operational_writes_blocked',
      ],
      isolationChecksExecuted: 0,
    }
    console.log(JSON.stringify(summary, null, 2))
    return summary
  }

  const manifest = loadManifest(flags.manifest || flags.runId)
  const metrics = new LoadMetricsCollector('tenant-isolation', manifest.runId)
  const anonClient = createStagingAnonClient(stagingEnv)
  const restaurants = manifest.restaurants

  // Sign in pairs covering all seeded restaurants in ring topology (i -> (i + 1) % N)
  const merchantClients = []
  try {
    for (const r of restaurants) {
      const signed = await signInStagingMerchant(stagingEnv, r.email, r.password)
      merchantClients.push({ ...signed, restaurant: r })
      await sleep(350)
    }

    for (let i = 0; i < merchantClients.length; i += 1) {
      const actor = merchantClients[i]
      const victim = merchantClients[(i + 1) % merchantClients.length]
      const vRest = victim.restaurant
      const vItem = vRest.menuItems[0]

      const check = async (name, fn) => {
        const t0 = performance.now()
        try {
          await fn()
          metrics.recordRequest({ ok: true, status: 200, latencyMs: performance.now() - t0 })
        } catch (err) {
          metrics.recordRequest({ ok: false, status: 403, latencyMs: performance.now() - t0, error: err })
          metrics.isolationFailures.push(`${actor.restaurant.code}->${vRest.code} (${name}): ${err.message}`)
        }
      }

      await check('orders_read', async () => {
        const { data } = await actor.client.from('orders').select('id').eq('restaurant_id', vRest.restaurantId)
        assert.equal(data?.length || 0, 0)
      })

      await check('inventory_update', async () => {
        const { data } = await actor.client.from('menu_items').update({ price: 1 }).eq('id', vItem.id).select('id')
        assert.equal(data?.length || 0, 0)
      })

      await check('customers_read', async () => {
        const { data } = await actor.client.from('customers').select('id,phone,email').eq('restaurant_id', vRest.restaurantId)
        assert.equal(data?.length || 0, 0)
      })

      await check('table_sessions_read', async () => {
        const { data } = await actor.client.from('table_sessions').select('id').eq('restaurant_id', vRest.restaurantId)
        assert.equal(data?.length || 0, 0)
      })
    }

    // Verify public anon only sees narrow profile RPC and never raw PII
    const target = restaurants[0]
    const t0 = performance.now()
    const { data: anonRaw } = await anonClient.from('restaurants').select('id,email,phone').eq('id', target.restaurantId)
    assert.equal(anonRaw?.length || 0, 0)
    const { data: pubProf } = await anonClient.rpc('get_public_restaurant_profile', { p_restaurant_id: target.restaurantId })
    assert.equal(pubProf?.[0]?.business_name, target.code)
    metrics.recordRequest({ ok: true, status: 200, latencyMs: performance.now() - t0 })

    // Suspended restaurant write-block check (only if serviceRoleKey available to toggle staging status and restore it)
    if (stagingEnv.serviceRoleKey) {
      const adminClient = createStagingAdminClient(stagingEnv)
      const suspendedTarget = merchantClients[0]
      await adminClient.from('restaurants').update({ status: 'Suspended' }).eq('id', suspendedTarget.restaurant.restaurantId)
      try {
        const { error: suspMenuErr } = await suspendedTarget.client.from('menu_items').insert({
          restaurant_id: suspendedTarget.restaurant.restaurantId,
          name: 'Blocked Suspended Item',
          price: 99,
          category: 'Starters',
        })
        assert.ok(suspMenuErr, 'Suspended tenant must be blocked from operational writes')
      } finally {
        await adminClient.from('restaurants').update({ status: 'Active' }).eq('id', suspendedTarget.restaurant.restaurantId)
      }
    }
  } finally {
    for (const m of merchantClients) {
      m.client.realtime.disconnect()
    }
    anonClient.realtime.disconnect()
  }

  const outDir = path.join(REPORTS_ROOT, manifest.runId)
  const written = metrics.writeReports(outDir)
  console.log(JSON.stringify({ ...written.summary, jsonPath: written.jsonPath }, null, 2))
  if (metrics.isolationFailures.length > 0) {
    throw new Error(`Tenant isolation failures detected: ${metrics.isolationFailures.length}`)
  }
  return written.summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runTenantIsolationTests().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
