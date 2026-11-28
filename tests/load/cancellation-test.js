import assert from 'node:assert/strict'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { REPORTS_ROOT, parseCliArgs } from './config.js'
import { validateStagingEnvironment } from './safety-guard.js'
import {
  createStagingAnonClient,
  createStagingAdminClient,
  loadManifest,
  signInStagingMerchant,
} from './lib/supabase-staging.js'
import { LoadMetricsCollector } from './lib/metrics.js'

export async function runCancellationTests(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: !flags.dryRun,
    allowUnconfiguredDryRun: flags.dryRun,
  })

  if (flags.dryRun) {
    const summary = {
      mode: 'DRY_RUN',
      scenariosPlanned: [
        'single_item_cancellation',
        'multi_item_cancellation',
        'multi_variant_same_menu_item_cancellation',
        'finite_stock_restoration',
        'unlimited_null_stock_preservation',
        'repeated_cancellation_idempotency',
        'concurrent_cancellation_race_check',
        'two_restaurants_simultaneous_cancellation',
        'multi_open_order_table_occupancy_preservation',
      ],
      dbOperationsExecuted: 0,
    }
    console.log(JSON.stringify(summary, null, 2))
    return summary
  }

  const manifest = loadManifest(flags.manifest || flags.runId)
  assert.ok(manifest.restaurants.length >= 2, 'Need at least 2 seeded restaurants for cancellation tests')

  const rA = manifest.restaurants[0]
  const rB = manifest.restaurants[1]
  const metrics = new LoadMetricsCollector('cancellation-and-inventory', manifest.runId)
  const anonClient = createStagingAnonClient(stagingEnv)
  const adminClient = createStagingAdminClient(stagingEnv)
  const merchA = await signInStagingMerchant(stagingEnv, rA.email, rA.password)
  const merchB = await signInStagingMerchant(stagingEnv, rB.email, rB.password)

  const recordCheck = async (label, fn) => {
    const t0 = performance.now()
    try {
      await fn()
      metrics.recordRequest({ ok: true, status: 200, latencyMs: performance.now() - t0 })
      console.log(`PASS: ${label}`)
    } catch (err) {
      metrics.recordRequest({ ok: false, status: 500, latencyMs: performance.now() - t0, error: err })
      metrics.inventoryFailures.push(`${label}: ${err.message}`)
      console.error(`FAIL: ${label} -> ${err.message}`)
    }
  }

  const finiteA = rA.menuItems.find((i) => i.initialQuantity != null && i.halfPrice != null) || rA.menuItems.find((i) => i.initialQuantity != null)
  const secondFiniteA = rA.menuItems.find((i) => i.initialQuantity != null && i.id !== finiteA.id)
  const unlimitedA = rA.menuItems.find((i) => i.initialQuantity === null && i.isInStock)
  const finiteB = rB.menuItems.find((i) => i.initialQuantity != null)

  const getStock = async (id) => {
    const { data, error } = await adminClient.from('menu_items').select('quantity,is_in_stock').eq('id', id).single()
    assert.ifError(error)
    return data
  }

  try {
    // 1. Single-item cancellation + finite restore
    await recordCheck('single_item_cancellation_and_restore', async () => {
      const before = await getStock(finiteA.id)
      const { data: ord, error: ordErr } = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: rA.restaurantId,
        p_table_number: '1',
        p_items: [{ menu_item_id: finiteA.id, quantity: 2, variant: 'full' }],
        p_idempotency_key: `lt-c1-${crypto.randomUUID()}`,
      })
      assert.ifError(ordErr)
      const { data: cRes, error: cErr } = await merchA.client.rpc('cancel_order_and_restore_inventory', { p_order_id: ord.order.id })
      assert.ifError(cErr)
      assert.equal(cRes.restored, true)
      const after = await getStock(finiteA.id)
      assert.equal(Number(after.quantity), Number(before.quantity))
    })

    // 2-5. Multi-item + Full+Half variants + unlimited NULL preservation
    await recordCheck('multi_item_variants_and_unlimited_preservation', async () => {
      const b1 = await getStock(finiteA.id)
      const b2 = await getStock(secondFiniteA.id)
      const { data: ord, error: ordErr } = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: rA.restaurantId,
        p_table_number: '2',
        p_items: [
          { menu_item_id: finiteA.id, quantity: 1, variant: 'full' },
          { menu_item_id: finiteA.id, quantity: 2, variant: 'half' },
          { menu_item_id: secondFiniteA.id, quantity: 1, variant: 'full' },
          { menu_item_id: unlimitedA.id, quantity: 3, variant: 'full' },
        ],
        p_idempotency_key: `lt-c2-${crypto.randomUUID()}`,
      })
      assert.ifError(ordErr)
      const { error: cErr } = await merchA.client.rpc('cancel_order_and_restore_inventory', { p_order_id: ord.order.id })
      assert.ifError(cErr)
      assert.equal(Number((await getStock(finiteA.id)).quantity), Number(b1.quantity))
      assert.equal(Number((await getStock(secondFiniteA.id)).quantity), Number(b2.quantity))
      assert.equal((await getStock(unlimitedA.id)).quantity, null)
    })

    // 6-7. Repeated & concurrent cancellation idempotency (Promise.all)
    await recordCheck('concurrent_cancellation_idempotency', async () => {
      const before = await getStock(finiteA.id)
      const { data: ord, error: ordErr } = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: rA.restaurantId,
        p_table_number: '3',
        p_items: [{ menu_item_id: finiteA.id, quantity: 4, variant: 'full' }],
        p_idempotency_key: `lt-c3-${crypto.randomUUID()}`,
      })
      assert.ifError(ordErr)
      const responses = await Promise.all([
        merchA.client.rpc('cancel_order_and_restore_inventory', { p_order_id: ord.order.id }),
        merchA.client.rpc('cancel_order_and_restore_inventory', { p_order_id: ord.order.id }),
        merchA.client.rpc('cancel_order_and_restore_inventory', { p_order_id: ord.order.id }),
      ])
      responses.forEach((r) => assert.ifError(r.error))
      assert.equal(responses.filter((r) => r.data?.restored === true).length, 1)
      assert.equal(responses.filter((r) => r.data?.already_cancelled === true).length, 2)
      const after = await getStock(finiteA.id)
      assert.equal(Number(after.quantity), Number(before.quantity))
    })

    // 8. Simultaneous cancellations across Restaurant A and Restaurant B
    await recordCheck('cross_restaurant_simultaneous_cancellation', async () => {
      const bA = await getStock(finiteA.id)
      const bB = await getStock(finiteB.id)
      const [ordA, ordB] = await Promise.all([
        anonClient.rpc('create_validated_order', {
          p_restaurant_id: rA.restaurantId,
          p_table_number: '4',
          p_items: [{ menu_item_id: finiteA.id, quantity: 2 }],
          p_idempotency_key: `lt-sim-a-${crypto.randomUUID()}`,
        }),
        anonClient.rpc('create_validated_order', {
          p_restaurant_id: rB.restaurantId,
          p_table_number: '1',
          p_items: [{ menu_item_id: finiteB.id, quantity: 3 }],
          p_idempotency_key: `lt-sim-b-${crypto.randomUUID()}`,
        }),
      ])
      assert.ifError(ordA.error)
      assert.ifError(ordB.error)
      const [canA, canB] = await Promise.all([
        merchA.client.rpc('cancel_order_and_restore_inventory', { p_order_id: ordA.data.order.id }),
        merchB.client.rpc('cancel_order_and_restore_inventory', { p_order_id: ordB.data.order.id }),
      ])
      assert.ifError(canA.error)
      assert.ifError(canB.error)
      assert.equal(Number((await getStock(finiteA.id)).quantity), Number(bA.quantity))
      assert.equal(Number((await getStock(finiteB.id)).quantity), Number(bB.quantity))
    })

    // 9. Table occupancy preserved while sibling open order exists
    await recordCheck('multi_order_table_occupancy_preservation', async () => {
      const o1 = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: rA.restaurantId,
        p_table_number: '5',
        p_items: [{ menu_item_id: unlimitedA.id, quantity: 1 }],
        p_idempotency_key: `lt-tbl1-${crypto.randomUUID()}`,
      })
      const o2 = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: rA.restaurantId,
        p_table_number: '5',
        p_items: [{ menu_item_id: unlimitedA.id, quantity: 1 }],
        p_idempotency_key: `lt-tbl2-${crypto.randomUUID()}`,
      })
      assert.ifError(o1.error)
      assert.ifError(o2.error)
      await merchA.client.rpc('cancel_order_and_restore_inventory', { p_order_id: o1.data.order.id })
      const { data: tMid } = await merchA.client.from('table_sessions').select('status').eq('restaurant_id', rA.restaurantId).eq('table_number', 5).single()
      assert.equal(tMid.status, 'occupied')
      await merchA.client.rpc('cancel_order_and_restore_inventory', { p_order_id: o2.data.order.id })
      const { data: tEnd } = await merchA.client.from('table_sessions').select('status').eq('restaurant_id', rA.restaurantId).eq('table_number', 5).single()
      assert.equal(tEnd.status, 'available')
    })
  } finally {
    merchA.client.realtime.disconnect()
    merchB.client.realtime.disconnect()
    anonClient.realtime.disconnect()
  }

  const outDir = path.join(REPORTS_ROOT, manifest.runId)
  const written = metrics.writeReports(outDir)
  console.log(JSON.stringify({ ...written.summary, jsonPath: written.jsonPath }, null, 2))
  if (metrics.inventoryFailures.length > 0) {
    throw new Error(`Cancellation consistency failures: ${metrics.inventoryFailures.join('; ')}`)
  }
  return written.summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCancellationTests().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
