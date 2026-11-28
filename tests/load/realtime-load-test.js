import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { REPORTS_ROOT, parseCliArgs } from './config.js'
import { validateStagingEnvironment } from './safety-guard.js'
import {
  createStagingAnonClient,
  loadManifest,
  signInStagingMerchant,
  sleep,
} from './lib/supabase-staging.js'
import { LoadMetricsCollector } from './lib/metrics.js'

export async function runRealtimeLoadTest(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: false,
    allowUnconfiguredDryRun: flags.dryRun,
  })

  if (flags.dryRun) {
    const summary = {
      mode: 'DRY_RUN',
      realtimeChannelsPlanned: flags.realtimeClients,
      isolationCheck: 'Verifies merchant A channel never receives merchant B order INSERT payloads',
      realtimeEventsVerified: 0,
    }
    console.log(JSON.stringify(summary, null, 2))
    return summary
  }

  const manifest = loadManifest(flags.manifest || flags.runId)
  const metrics = new LoadMetricsCollector('realtime-load', manifest.runId)
  const sampleRestaurants = manifest.restaurants.slice(0, Math.min(flags.realtimeClients, manifest.restaurants.length))
  const anonClient = createStagingAnonClient(stagingEnv)

  const merchantSessions = []
  const channels = []
  const trackedOrders = new Map()
  const pendingEarlyEvents = new Map()
  const receivedOrderIds = new Set()
  const channelHealth = {
    subscribed: 0,
    postgresChangesReady: 0,
    readyViaSystemAck: 0,
    readyViaFallbackTimeout: 0,
    maxCdcReadyLagMs: 0,
    channelErrors: [],
    timedOut: [],
    closedUnexpectedly: [],
  }
  let teardownStarted = false
  const diagnostics = {
    primaryWindowMs: 8000,
    tailWindowMs: 7000,
    receivedWithinPrimaryWindow: 0,
    delayedAfterPrimaryWindow: 0,
    missingOrDropped: 0,
    duplicateEventsIgnored: 0,
    ordersPersistedInDb: 0,
    missingOrderDetails: [],
  }

  try {
    for (const r of sampleRestaurants) {
      const m = await signInStagingMerchant(stagingEnv, r.email, r.password)
      merchantSessions.push({ ...m, restaurant: r })
    }

    // Subscribe every merchant strictly to its own filtered restaurant_id orders channel
    // and wait for BOTH WebSocket SUBSCRIBED and postgres_changes CDC readiness (`system` ok ack).
    await Promise.all(
      merchantSessions.map(
        ({ client, restaurant }) =>
          new Promise((resolve, reject) => {
            let settled = false
            let subscribedPerf = null
            const hardTimer = setTimeout(
              () => reject(new Error(`Realtime subscribe timeout for ${restaurant.code}`)),
              15000
            )
            let fallbackResolveTimer = null

            const finishReady = (viaSystemAck) => {
              if (settled) return
              settled = true
              clearTimeout(hardTimer)
              if (fallbackResolveTimer) clearTimeout(fallbackResolveTimer)
              if (viaSystemAck) {
                channelHealth.readyViaSystemAck += 1
              } else {
                channelHealth.readyViaFallbackTimeout += 1
              }
              if (subscribedPerf !== null) {
                const lag = Number((performance.now() - subscribedPerf).toFixed(2))
                if (lag > channelHealth.maxCdcReadyLagMs) channelHealth.maxCdcReadyLagMs = lag
              }
              resolve()
            }

            const ch = client
              .channel(`lt-orders-${restaurant.restaurantId}`)
              .on(
                'system',
                {},
                (payload) => {
                  if (payload?.extension === 'postgres_changes' && payload?.status === 'ok') {
                    channelHealth.postgresChangesReady += 1
                    finishReady(true)
                  }
                }
              )
              .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.restaurantId}` },
                (payload) => {
                  const ord = payload.new
                  if (!ord?.id) return
                  if (receivedOrderIds.has(ord.id)) {
                    diagnostics.duplicateEventsIgnored += 1
                    return
                  }
                  const receivedPerf = performance.now()
                  const crossTenantLeak = ord.restaurant_id !== restaurant.restaurantId
                  receivedOrderIds.add(ord.id)

                  const tracked = trackedOrders.get(ord.id)
                  if (tracked) {
                    tracked.receivedPerf = receivedPerf
                    tracked.eventRestaurantId = ord.restaurant_id
                    tracked.crossTenantLeak = crossTenantLeak
                    const latencyMs = Math.max(0, receivedPerf - tracked.rpcStartPerf)
                    metrics.recordRealtimeEvent({ latencyMs, crossTenantLeak })
                  } else {
                    // WebSocket INSERT arrived before HTTP RPC promise resolved
                    pendingEarlyEvents.set(ord.id, {
                      receivedPerf,
                      eventRestaurantId: ord.restaurant_id,
                      crossTenantLeak,
                    })
                  }
                }
              )
              .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                  subscribedPerf = performance.now()
                  channelHealth.subscribed += 1
                  channels.push({ client, ch, restaurant })
                  // Wait up to 4000ms after SUBSCRIBED for Postgres CDC filter ack (`system` ok)
                  fallbackResolveTimer = setTimeout(() => finishReady(false), 4000)
                } else if (status === 'CHANNEL_ERROR') {
                  channelHealth.channelErrors.push({
                    restaurantCode: restaurant.code,
                    error: err?.message || 'CHANNEL_ERROR',
                  })
                } else if (status === 'TIMED_OUT') {
                  channelHealth.timedOut.push(restaurant.code)
                } else if (status === 'CLOSED' && !teardownStarted) {
                  channelHealth.closedUnexpectedly.push(restaurant.code)
                }
              })
          })
      )
    )

    // Brief settle guard after CDC system acks before firing synthetic orders
    await sleep(500)

    // Trigger real public orders across subscribed tenants
    for (const { restaurant } of merchantSessions) {
      const item = restaurant.menuItems.find((i) => i.isInStock !== false)
      if (!item) continue
      const rpcStartPerf = performance.now()
      metrics.realtimeExpected += 1
      const { data, error } = await anonClient.rpc('create_validated_order', {
        p_restaurant_id: restaurant.restaurantId,
        p_table_number: String(restaurant.tables[0].tableNumber),
        p_customer_name: `RT Customer ${restaurant.code}`,
        p_order_type: 'DINE-IN',
        p_items: [{ menu_item_id: item.id, quantity: 1, variant: 'full' }],
        p_idempotency_key: `lt-rt-${restaurant.code}-${crypto.randomUUID()}`,
      })
      const rpcEndPerf = performance.now()
      if (error || !data?.order?.id) {
        metrics.recordRequest({ ok: false, status: 400, latencyMs: rpcEndPerf - rpcStartPerf, error })
      } else {
        const orderId = data.order.id
        const early = pendingEarlyEvents.get(orderId)
        const tracked = {
          orderId,
          restaurantId: restaurant.restaurantId,
          restaurantCode: restaurant.code,
          rpcStartPerf,
          rpcEndPerf,
          receivedPerf: early ? early.receivedPerf : null,
          delayedAfterPrimaryWindow: false,
          eventRestaurantId: early ? early.eventRestaurantId : null,
          crossTenantLeak: early ? early.crossTenantLeak : false,
        }
        trackedOrders.set(orderId, tracked)
        if (early) {
          pendingEarlyEvents.delete(orderId)
          metrics.recordRealtimeEvent({
            latencyMs: Math.max(0, early.receivedPerf - rpcStartPerf),
            crossTenantLeak: early.crossTenantLeak,
          })
        }
        metrics.recordRequest({ ok: true, status: 200, latencyMs: rpcEndPerf - rpcStartPerf, isOrderCreate: true })
      }
    }

    // Primary 8s wait window
    const primaryDeadline = Date.now() + diagnostics.primaryWindowMs
    while (Date.now() < primaryDeadline && receivedOrderIds.size < trackedOrders.size) {
      await sleep(200)
    }

    for (const ord of trackedOrders.values()) {
      ord.withinPrimaryWindow = ord.receivedPerf !== null
    }
    diagnostics.receivedWithinPrimaryWindow = [...trackedOrders.values()].filter((o) => o.withinPrimaryWindow).length

    // Secondary diagnostic tail window (+7s) to classify delayed vs dropped events accurately
    if (receivedOrderIds.size < trackedOrders.size) {
      const tailDeadline = Date.now() + diagnostics.tailWindowMs
      while (Date.now() < tailDeadline && receivedOrderIds.size < trackedOrders.size) {
        await sleep(250)
      }
      for (const ord of trackedOrders.values()) {
        if (!ord.withinPrimaryWindow && ord.receivedPerf !== null) {
          ord.delayedAfterPrimaryWindow = true
        }
      }
    }

    // Confirm via public RPC that all tracked orders were genuinely committed in Postgres
    let persistedCount = 0
    for (const ord of trackedOrders.values()) {
      const { data: st } = await anonClient.rpc('get_public_order_status', {
        p_order_id: ord.orderId,
        p_restaurant_id: ord.restaurantId,
      })
      const row = Array.isArray(st) ? st[0] : st
      if (row?.id) persistedCount += 1
    }
    diagnostics.ordersPersistedInDb = persistedCount

    const delayedList = [...trackedOrders.values()].filter((o) => o.delayedAfterPrimaryWindow)
    const missingList = [...trackedOrders.values()].filter((o) => o.receivedPerf === null)
    diagnostics.delayedAfterPrimaryWindow = delayedList.length
    diagnostics.missingOrDropped = missingList.length
    diagnostics.missingOrderDetails = missingList.map((o) => ({
      orderId: o.orderId,
      restaurantCode: o.restaurantCode,
      restaurantId: o.restaurantId,
    }))

    if (metrics.realtimeReceived === 0) {
      throw new Error('Realtime verification failed: 0 live WebSocket order events received.')
    }
  } finally {
    teardownStarted = true
    for (const { client, ch } of channels) {
      await client.removeChannel(ch).catch(() => {})
      client.realtime.disconnect()
    }
    anonClient.realtime.disconnect()
  }

  const outDir = path.join(REPORTS_ROOT, manifest.runId)
  const written = metrics.writeReports(outDir)
  const outputPayload = {
    ...written.summary,
    channelHealth,
    realtimeDiagnostics: diagnostics,
    jsonPath: written.jsonPath,
  }
  fs.writeFileSync(written.jsonPath, JSON.stringify(outputPayload, null, 2))
  console.log(JSON.stringify(outputPayload, null, 2))
  return outputPayload
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRealtimeLoadTest().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
