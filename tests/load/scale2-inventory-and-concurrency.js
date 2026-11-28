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

export async function runScale2InventoryAndConcurrency(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: true,
  })

  const manifest = loadManifest(flags.manifest || flags.runId)
  assert.ok(manifest.restaurants.length >= 4, 'Need seeded restaurants for Scale 2 inventory concurrency checks')

  const metrics = new LoadMetricsCollector('scale2-inventory-concurrency', manifest.runId)
  const anonClient = createStagingAnonClient(stagingEnv)
  const adminClient = createStagingAdminClient(stagingEnv)

  // Use tenants toward the end of the 500-restaurant list to avoid colliding with baseline single-tenant scripts
  const r1 = manifest.restaurants[0]
  const r2 = manifest.restaurants[1]
  const r3 = manifest.restaurants[Math.min(10, manifest.restaurants.length - 1)]
  const r4 = manifest.restaurants[Math.min(20, manifest.restaurants.length - 1)]

  const [m1, m2, m3] = await Promise.all([
    signInStagingMerchant(stagingEnv, r1.email, r1.password),
    signInStagingMerchant(stagingEnv, r2.email, r2.password),
    signInStagingMerchant(stagingEnv, r3.email, r3.password),
  ])

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

  const getStock = async (id) => {
    const { data, error } = await adminClient.from('menu_items').select('id,quantity,is_in_stock').eq('id', id).single()
    assert.ifError(error)
    return data
  }

  try {
    const finiteVariantItem = r1.menuItems.find((i) => i.initialQuantity != null && i.halfPrice != null) || r1.menuItems.find((i) => i.initialQuantity != null)
    const unlimitedItem = r1.menuItems.find((i) => i.initialQuantity === null && i.isInStock)
    const outOfStockItem = r1.menuItems.find((i) => i.isInStock === false)
    const raceFiniteR3 = r3.menuItems.find((i) => i.initialQuantity != null && i.halfPrice != null) || r3.menuItems.find((i) => i.initialQuantity != null)
    const lastUnitItemR4 = r4.menuItems.find((i) => i.initialQuantity != null && i.id !== raceFiniteR3.id)

    // 1. Concurrent ordering on same finite dish & variant + multi-variant full/half deduction
    await recordCheck('simultaneous_same_dish_and_variant_race', async () => {
      const before = await getStock(raceFiniteR3.id)
      const beforeQty = Number(before.quantity)
      assert.ok(beforeQty >= 10, 'Need >= 10 stock for simultaneous variant race')

      const racers = Array.from({ length: 6 }, (_, idx) =>
        anonClient.rpc('create_validated_order', {
          p_restaurant_id: r3.restaurantId,
          p_table_number: String((idx % 5) + 1),
          p_items: [
            { menu_item_id: raceFiniteR3.id, quantity: 1, variant: idx % 2 === 0 ? 'half' : 'full' },
          ],
          p_idempotency_key: `s2-race-${idx}-${crypto.randomUUID()}`,
        })
      )
      const results = await Promise.all(racers)
      const succeeded = results.filter((res) => !res.error && res.data?.order?.id)
      assert.equal(succeeded.length, 6)
      const after = await getStock(raceFiniteR3.id)
      assert.equal(Number(after.quantity), beforeQty - 6)

      // Restore cleanly via cancellations so manifest reconciliation stays intact
      for (const s of succeeded) {
        const { error: cErr } = await m3.client.rpc('cancel_order_and_restore_inventory', { p_order_id: s.data.order.id })
        assert.ifError(cErr)
      }
      assert.equal(Number((await getStock(raceFiniteR3.id)).quantity), beforeQty)
    })

    // 2. Last-unit stock race condition (set item qty=1 temporarily via merchant JWT, race 5 concurrent orders, 1 wins, 4 fail, never negative)
    await recordCheck('last_unit_stock_race_exactly_one_wins', async () => {
      const m4 = await signInStagingMerchant(stagingEnv, r4.email, r4.password)
      try {
        const orig = await getStock(lastUnitItemR4.id)
        const { error: updErr } = await m4.client
          .from('menu_items')
          .update({ quantity: 1, is_in_stock: true })
          .eq('id', lastUnitItemR4.id)
        assert.ifError(updErr)

        const raceResults = await Promise.all(
          Array.from({ length: 5 }, (_, idx) =>
            anonClient.rpc('create_validated_order', {
              p_restaurant_id: r4.restaurantId,
              p_table_number: String(idx + 1),
              p_items: [{ menu_item_id: lastUnitItemR4.id, quantity: 1, variant: 'full' }],
              p_idempotency_key: `s2-last1-${idx}-${crypto.randomUUID()}`,
            })
          )
        )
        const winners = raceResults.filter((x) => !x.error && x.data?.order?.id)
        const losers = raceResults.filter((x) => x.error)
        assert.equal(winners.length, 1, `Expected 1 winner, got ${winners.length}`)
        assert.equal(losers.length, 4)

        const midStock = await getStock(lastUnitItemR4.id)
        assert.equal(Number(midStock.quantity), 0)

        // Cancel winning order -> restores 1 unit -> then restore original seeded quantity
        const { error: cancelErr } = await m4.client.rpc('cancel_order_and_restore_inventory', { p_order_id: winners[0].data.order.id })
        assert.ifError(cancelErr)
        assert.equal(Number((await getStock(lastUnitItemR4.id)).quantity), 1)

        const { error: resetErr } = await m4.client
          .from('menu_items')
          .update({ quantity: orig.quantity, is_in_stock: orig.is_in_stock })
          .eq('id', lastUnitItemR4.id)
        assert.ifError(resetErr)
      } finally {
        m4.client.realtime.disconnect()
      }
    })

    // 3. Mid-run item toggled unavailable during live customer ordering
    await recordCheck('mid_run_item_marked_unavailable_blocks_new_orders', async () => {
      const orig = await getStock(finiteVariantItem.id)
      const { error: disableErr } = await m1.client
        .from('menu_items')
        .update({ is_in_stock: false })
        .eq('id', finiteVariantItem.id)
      assert.ifError(disableErr)

      const { data: blkData, error: blkErr } = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: r1.restaurantId,
        p_table_number: '1',
        p_items: [{ menu_item_id: finiteVariantItem.id, quantity: 1, variant: 'full' }],
        p_idempotency_key: `s2-unavail-${crypto.randomUUID()}`,
      })
      assert.ok(blkErr || !blkData?.order?.id, 'Expected order for unavailable item to be rejected')

      // Re-enable cleanly so rest of test continues accurately
      const { error: enableErr } = await m1.client
        .from('menu_items')
        .update({ is_in_stock: orig.is_in_stock })
        .eq('id', finiteVariantItem.id)
      assert.ifError(enableErr)
    })

    // 4. Out-of-stock item rejection + unlimited NULL preservation + cross-tenant item rejection
    await recordCheck('out_of_stock_unlimited_and_cross_tenant_guards', async () => {
      if (outOfStockItem) {
        const { error: oosErr } = await anonClient.rpc('create_validated_order', {
          p_restaurant_id: r1.restaurantId,
          p_table_number: '2',
          p_items: [{ menu_item_id: outOfStockItem.id, quantity: 1 }],
          p_idempotency_key: `s2-oos-${crypto.randomUUID()}`,
        })
        assert.ok(oosErr, 'Out-of-stock item should fail')
      }

      const r2Item = r2.menuItems.find((i) => i.isInStock)
      const { error: xErr } = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: r1.restaurantId,
        p_table_number: '2',
        p_items: [{ menu_item_id: r2Item.id, quantity: 1 }],
        p_idempotency_key: `s2-xitem-${crypto.randomUUID()}`,
      })
      assert.ok(xErr, 'Cross-restaurant item should fail')

      const { data: unlimOrd, error: unlimErr } = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: r1.restaurantId,
        p_table_number: '2',
        p_items: [{ menu_item_id: unlimitedItem.id, quantity: 4 }],
        p_idempotency_key: `s2-unlim-${crypto.randomUUID()}`,
      })
      assert.ifError(unlimErr)
      assert.equal((await getStock(unlimitedItem.id)).quantity, null)
      await m1.client.rpc('cancel_order_and_restore_inventory', { p_order_id: unlimOrd.order.id })
      assert.equal((await getStock(unlimitedItem.id)).quantity, null)
    })

    // 5. Multiple simultaneous orders on the same table + concurrent cancellation idempotency + table occupancy preservation
    await recordCheck('same_table_simultaneous_orders_and_concurrent_cancel', async () => {
      const before = Number((await getStock(finiteVariantItem.id)).quantity)
      const [o1, o2] = await Promise.all([
        anonClient.rpc('create_validated_order', {
          p_restaurant_id: r1.restaurantId,
          p_table_number: '7',
          p_items: [
            { menu_item_id: finiteVariantItem.id, quantity: 1, variant: 'full' },
            { menu_item_id: finiteVariantItem.id, quantity: 1, variant: 'half' },
          ],
          p_idempotency_key: `s2-t7a-${crypto.randomUUID()}`,
        }),
        anonClient.rpc('create_validated_order', {
          p_restaurant_id: r1.restaurantId,
          p_table_number: '7',
          p_items: [{ menu_item_id: unlimitedItem.id, quantity: 2 }],
          p_idempotency_key: `s2-t7b-${crypto.randomUUID()}`,
        }),
      ])
      assert.ifError(o1.error)
      assert.ifError(o2.error)
      assert.equal(Number((await getStock(finiteVariantItem.id)).quantity), before - 2)

      // Triple concurrent cancel on o1 -> 1 restored, 2 already_cancelled, table 7 remains occupied for o2
      const cancelRace = await Promise.all([
        m1.client.rpc('cancel_order_and_restore_inventory', { p_order_id: o1.data.order.id }),
        m1.client.rpc('cancel_order_and_restore_inventory', { p_order_id: o1.data.order.id }),
        m1.client.rpc('cancel_order_and_restore_inventory', { p_order_id: o1.data.order.id }),
      ])
      cancelRace.forEach((res) => assert.ifError(res.error))
      assert.equal(cancelRace.filter((r) => r.data?.restored === true).length, 1)
      assert.equal(Number((await getStock(finiteVariantItem.id)).quantity), before)

      const { data: tsMid } = await m1.client
        .from('table_sessions')
        .select('status')
        .eq('restaurant_id', r1.restaurantId)
        .eq('table_number', 7)
        .single()
      assert.equal(tsMid.status, 'occupied')

      const { error: c2Err } = await m1.client.rpc('cancel_order_and_restore_inventory', { p_order_id: o2.data.order.id })
      assert.ifError(c2Err)
      const { data: tsEnd } = await m1.client
        .from('table_sessions')
        .select('status')
        .eq('restaurant_id', r1.restaurantId)
        .eq('table_number', 7)
        .single()
      assert.equal(tsEnd.status, 'available')
    })

    // 6. Simultaneous cross-restaurant cancellations (r1 & r2)
    await recordCheck('cross_restaurant_parallel_cancellations', async () => {
      const f1 = r1.menuItems.find((i) => i.initialQuantity != null)
      const f2 = r2.menuItems.find((i) => i.initialQuantity != null)
      const b1 = Number((await getStock(f1.id)).quantity)
      const b2 = Number((await getStock(f2.id)).quantity)

      const [o1, o2] = await Promise.all([
        anonClient.rpc('create_validated_order', {
          p_restaurant_id: r1.restaurantId,
          p_table_number: '8',
          p_items: [{ menu_item_id: f1.id, quantity: 2 }],
          p_idempotency_key: `s2-xcan1-${crypto.randomUUID()}`,
        }),
        anonClient.rpc('create_validated_order', {
          p_restaurant_id: r2.restaurantId,
          p_table_number: '8',
          p_items: [{ menu_item_id: f2.id, quantity: 3 }],
          p_idempotency_key: `s2-xcan2-${crypto.randomUUID()}`,
        }),
      ])
      assert.ifError(o1.error)
      assert.ifError(o2.error)

      const [c1, c2] = await Promise.all([
        m1.client.rpc('cancel_order_and_restore_inventory', { p_order_id: o1.data.order.id }),
        m2.client.rpc('cancel_order_and_restore_inventory', { p_order_id: o2.data.order.id }),
      ])
      assert.ifError(c1.error)
      assert.ifError(c2.error)
      assert.equal(Number((await getStock(f1.id)).quantity), b1)
      assert.equal(Number((await getStock(f2.id)).quantity), b2)
    })
  } finally {
    m1.client.realtime.disconnect()
    m2.client.realtime.disconnect()
    m3.client.realtime.disconnect()
    anonClient.realtime.disconnect()
  }

  const outDir = path.join(REPORTS_ROOT, manifest.runId)
  const written = metrics.writeReports(outDir)
  console.log(JSON.stringify({ ...written.summary, jsonPath: written.jsonPath }, null, 2))
  if (metrics.inventoryFailures.length > 0) {
    throw new Error(`Scale 2 inventory concurrency failures: ${metrics.inventoryFailures.join('; ')}`)
  }
  return written.summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runScale2InventoryAndConcurrency().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
