import assert from 'node:assert/strict'
import fs from 'node:fs'
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
  sleep,
} from './lib/supabase-staging.js'
import { LoadMetricsCollector } from './lib/metrics.js'

/**
 * Scale Test 2.0: Multi-Tenant Realtime (with disconnect/reconnect) & RLS Isolation Suite.
 * Uses real authenticated merchant JWTs across a stratified sample spanning all 500 seeded restaurants.
 */
export async function runScale2RealtimeAndIsolation(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: true,
  })

  const manifest = loadManifest(flags.manifest || flags.runId)
  const allRestaurants = manifest.restaurants
  const targetSampleCount = Math.min(allRestaurants.length, Number(flags.realtimeClients || 50))
  const step = Math.max(1, Math.floor(allRestaurants.length / targetSampleCount))
  const sampleRestaurants = []
  for (let i = 0; i < allRestaurants.length && sampleRestaurants.length < targetSampleCount; i += step) {
    sampleRestaurants.push(allRestaurants[i])
  }

  const metrics = new LoadMetricsCollector('scale2-realtime-isolation', manifest.runId)
  const anonClient = createStagingAnonClient(stagingEnv)
  const adminClient = createStagingAdminClient(stagingEnv)
  const sessions = []
  const createdOrderIds = []

  const rtChannels = []
  const trackedOrders = new Map()
  const receivedIds = new Set()
  let teardownStarted = false

  const realtimeHealth = {
    sampledRestaurants: sampleRestaurants.length,
    totalManifestRestaurants: allRestaurants.length,
    subscribed: 0,
    readyViaSystemAck: 0,
    readyViaFallback: 0,
    receivedWithin8s: 0,
    delayedAfter8s: 0,
    missingOrDropped: 0,
    crossTenantLeaks: 0,
    reconnectRecoveryPassed: false,
    reconnectLatencyMs: null,
  }

  try {
    console.log(`[SCALE 2.0 RT+RLS] Signing in ${sampleRestaurants.length} stratified merchants across ${allRestaurants.length} tenants...`)
    for (const r of sampleRestaurants) {
      const m = await signInStagingMerchant(stagingEnv, r.email, r.password)
      sessions.push({ ...m, restaurant: r })
      await sleep(300)
    }

    // 1. Authenticated Cross-Tenant Ring Isolation Checks
    for (let i = 0; i < sessions.length; i += 1) {
      const actor = sessions[i]
      const victim = sessions[(i + 1) % sessions.length]
      const vRest = victim.restaurant
      const vItem = vRest.menuItems[0]

      const checkIso = async (label, fn) => {
        const t0 = performance.now()
        try {
          await fn()
          metrics.recordRequest({ ok: true, status: 200, latencyMs: performance.now() - t0 })
        } catch (err) {
          metrics.recordRequest({ ok: false, status: 403, latencyMs: performance.now() - t0, error: err })
          metrics.isolationFailures.push(`${actor.restaurant.code}->${vRest.code} (${label}): ${err.message}`)
        }
      }

      await checkIso('orders_read', async () => {
        const { data } = await actor.client.from('orders').select('id').eq('restaurant_id', vRest.restaurantId)
        assert.equal(data?.length || 0, 0)
      })
      await checkIso('menu_items_write', async () => {
        const { data } = await actor.client.from('menu_items').update({ price: 1 }).eq('id', vItem.id).select('id')
        assert.equal(data?.length || 0, 0)
      })
      await checkIso('customers_read', async () => {
        const { data } = await actor.client.from('customers').select('id,email,phone').eq('restaurant_id', vRest.restaurantId)
        assert.equal(data?.length || 0, 0)
      })
      await checkIso('table_sessions_read', async () => {
        const { data } = await actor.client.from('table_sessions').select('id').eq('restaurant_id', vRest.restaurantId)
        assert.equal(data?.length || 0, 0)
      })
    }

    // 2. Anon Restriction & Suspended Merchant Check
    const tAnon = performance.now()
    const { data: anonRestaurants } = await anonClient.from('restaurants').select('id,email').eq('id', sampleRestaurants[0].restaurantId)
    if ((anonRestaurants?.length || 0) > 0) {
      metrics.isolationFailures.push('Anon queried raw restaurants PII directly')
      metrics.recordRequest({ ok: false, status: 403, latencyMs: performance.now() - tAnon })
    } else {
      metrics.recordRequest({ ok: true, status: 200, latencyMs: performance.now() - tAnon })
    }

    const suspTarget = sessions[sessions.length - 1]
    await adminClient.from('restaurants').update({ status: 'Suspended' }).eq('id', suspTarget.restaurant.restaurantId)
    const suspItem = suspTarget.restaurant.menuItems.find((i) => i.isInStock)
    const { data: suspWrite } = await suspTarget.client
      .from('menu_items')
      .update({ price: 999 })
      .eq('id', suspItem.id)
      .select('id')
    if ((suspWrite?.length || 0) > 0) {
      metrics.isolationFailures.push(`Suspended merchant ${suspTarget.restaurant.code} was allowed to mutate menu_items`)
    }
    const { error: suspOrderErr } = await anonClient.rpc('create_validated_order', {
      p_restaurant_id: suspTarget.restaurant.restaurantId,
      p_table_number: '1',
      p_items: [{ menu_item_id: suspItem.id, quantity: 1 }],
      p_idempotency_key: `s2-susp-${crypto.randomUUID()}`,
    })
    if (!suspOrderErr) {
      metrics.isolationFailures.push(`Suspended restaurant ${suspTarget.restaurant.code} accepted public order`)
    }
    await adminClient.from('restaurants').update({ status: 'Active' }).eq('id', suspTarget.restaurant.restaurantId)

    // 3. Simultaneous Realtime Channels across active sampled sessions (excluding temporarily suspended then restored check)
    const subscribeChannel = (sessionObj) =>
      new Promise((resolve, reject) => {
        let settled = false
        const hardTimer = setTimeout(
          () => reject(new Error(`Realtime subscribe timeout (${sessionObj.restaurant.code})`)),
          15000
        )
        let fallbackTimer = null
        const finish = (viaSys) => {
          if (settled) return
          settled = true
          clearTimeout(hardTimer)
          if (fallbackTimer) clearTimeout(fallbackTimer)
          if (viaSys) realtimeHealth.readyViaSystemAck += 1
          else realtimeHealth.readyViaFallback += 1
          resolve()
        }

        const ch = sessionObj.client
          .channel(`s2-rt-${sessionObj.restaurant.restaurantId}-${Date.now()}`)
          .on('system', {}, (payload) => {
            if (payload?.extension === 'postgres_changes' && payload?.status === 'ok') finish(true)
          })
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${sessionObj.restaurant.restaurantId}` },
            (payload) => {
              const ord = payload.new
              if (!ord?.id || receivedIds.has(ord.id)) return
              const receivedPerf = performance.now()
              const leak = ord.restaurant_id !== sessionObj.restaurant.restaurantId
              if (leak) realtimeHealth.crossTenantLeaks += 1
              receivedIds.add(ord.id)
              const tEntry = trackedOrders.get(ord.id)
              if (tEntry) {
                tEntry.receivedPerf = receivedPerf
                metrics.recordRealtimeEvent({
                  latencyMs: Math.max(0, receivedPerf - tEntry.rpcStartPerf),
                  crossTenantLeak: leak,
                })
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              realtimeHealth.subscribed += 1
              fallbackTimer = setTimeout(() => finish(false), 4000)
            } else if (status === 'CLOSED' && !teardownStarted) {
              // captured for disconnect/reconnect verification
            }
          })

        rtChannels.push({ client: sessionObj.client, ch, sessionObj })
      })

    await Promise.all(sessions.map((s) => subscribeChannel(s)))
    await sleep(500)

    // Trigger simultaneous public orders across subscribed tenants
    for (const s of sessions) {
      const item = s.restaurant.menuItems.find((i) => i.isInStock)
      const t0 = performance.now()
      metrics.realtimeExpected += 1
      const { data, error } = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: s.restaurant.restaurantId,
        p_table_number: String(s.restaurant.tables[0].tableNumber),
        p_customer_name: `S2 RT Guest ${s.restaurant.code}`,
        p_order_type: 'DINE-IN',
        p_items: [{ menu_item_id: item.id, quantity: 1 }],
        p_idempotency_key: `s2-rt-${s.restaurant.code}-${crypto.randomUUID()}`,
      })
      if (!error && data?.order?.id) {
        createdOrderIds.push(data.order.id)
        trackedOrders.set(data.order.id, { rpcStartPerf: t0, receivedPerf: null, within8s: false })
      }
    }

    const pDeadline = Date.now() + 8000
    while (Date.now() < pDeadline && receivedIds.size < trackedOrders.size) await sleep(200)
    for (const e of trackedOrders.values()) e.within8s = e.receivedPerf !== null
    realtimeHealth.receivedWithin8s = [...trackedOrders.values()].filter((e) => e.within8s).length

    if (receivedIds.size < trackedOrders.size) {
      const tDeadline = Date.now() + 7000
      while (Date.now() < tDeadline && receivedIds.size < trackedOrders.size) await sleep(250)
    }
    realtimeHealth.delayedAfter8s = [...trackedOrders.values()].filter((e) => !e.within8s && e.receivedPerf !== null).length
    realtimeHealth.missingOrDropped = [...trackedOrders.values()].filter((e) => e.receivedPerf === null).length

    // 4. WebSocket Disconnect & Reconnect Recovery Test on session[0]
    const reconnTarget = sessions[0]
    const firstChEntry = rtChannels.find((c) => c.sessionObj.restaurant.restaurantId === reconnTarget.restaurant.restaurantId)
    if (firstChEntry) {
      await reconnTarget.client.removeChannel(firstChEntry.ch)
      reconnTarget.client.realtime.disconnect()
      await sleep(300)
      reconnTarget.client.realtime.connect()
      reconnTarget.client.realtime.setAuth(reconnTarget.session.access_token)

      let reconnReceivedPerf = null
      let reconnOrderId = null
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Reconnect subscribe timeout')), 12000)
        const ch2 = reconnTarget.client
          .channel(`s2-reconn-${Date.now()}`)
          .on('system', {}, (p) => {
            if (p?.extension === 'postgres_changes' && p?.status === 'ok') {
              clearTimeout(timer)
              resolve()
            }
          })
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${reconnTarget.restaurant.restaurantId}` },
            (p) => {
              if (p.new?.id === reconnOrderId) reconnReceivedPerf = performance.now()
            }
          )
          .subscribe((st) => {
            if (st === 'SUBSCRIBED') {
              setTimeout(() => {
                clearTimeout(timer)
                resolve()
              }, 3500)
            }
          })
        rtChannels.push({ client: reconnTarget.client, ch: ch2, sessionObj: reconnTarget })
      })

      const item0 = reconnTarget.restaurant.menuItems.find((i) => i.isInStock)
      const rtStart = performance.now()
      const { data: rOrd } = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: reconnTarget.restaurant.restaurantId,
        p_table_number: String(reconnTarget.restaurant.tables[1].tableNumber),
        p_items: [{ menu_item_id: item0.id, quantity: 1 }],
        p_idempotency_key: `s2-reconn-${crypto.randomUUID()}`,
      })
      reconnOrderId = rOrd?.order?.id
      if (reconnOrderId) createdOrderIds.push(reconnOrderId)

      const waitEnd = Date.now() + 8000
      while (Date.now() < waitEnd && !reconnReceivedPerf) await sleep(150)
      if (reconnReceivedPerf) {
        realtimeHealth.reconnectRecoveryPassed = true
        realtimeHealth.reconnectLatencyMs = Number((reconnReceivedPerf - rtStart).toFixed(2))
      }
    }
  } finally {
    teardownStarted = true
    for (const { client, ch } of rtChannels) {
      await client.removeChannel(ch).catch(() => {})
    }
    for (const s of sessions) s.client.realtime.disconnect()
    anonClient.realtime.disconnect()
  }

  manifest.createdOrderIds = Array.from(new Set([...(manifest.createdOrderIds || []), ...createdOrderIds]))
  const manifestPath = path.join(path.dirname(REPORTS_ROOT), 'manifests', `manifest-${manifest.runId}.json`)
  if (fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  }

  const outDir = path.join(REPORTS_ROOT, manifest.runId)
  const written = metrics.writeReports(outDir)
  const output = { ...written.summary, realtimeHealth, jsonPath: written.jsonPath }
  fs.writeFileSync(written.jsonPath, JSON.stringify(output, null, 2))
  console.log(JSON.stringify(output, null, 2))
  if (metrics.isolationFailures.length > 0 || realtimeHealth.crossTenantLeaks > 0) {
    throw new Error('Tenant isolation or cross-tenant Realtime leak detected!')
  }
  return output
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runScale2RealtimeAndIsolation().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
