import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { parseCliArgs } from './config.js'
import { validateStagingEnvironment } from './safety-guard.js'
import { createStagingAnonClient, createSeededRng, loadManifest, randomInt, sleep } from './lib/supabase-staging.js'
import { buildSyntheticRestaurantPlan } from './seed-restaurants.js'
import { verifyTableSignature, generateTableSignature } from '../../client/src/utils/tableSecurity.js'

function pickOrderCart(restaurant, rng) {
  const availableItems = (restaurant.menuItems || []).filter((i) => i.isInStock !== false)
  if (availableItems.length === 0) return []

  const lineCount = Math.min(availableItems.length, randomInt(rng, 1, 3))
  const chosen = []
  const usedIds = new Set()

  for (let i = 0; i < lineCount; i += 1) {
    const candidate = availableItems[randomInt(rng, 0, availableItems.length - 1)]
    if (usedIds.has(candidate.id)) continue
    usedIds.add(candidate.id)
    const variant = candidate.halfPrice != null && rng() > 0.5 ? 'half' : 'full'
    chosen.push({
      menu_item_id: candidate.id,
      quantity: randomInt(rng, 1, 2),
      variant,
    })
  }
  return chosen
}

export async function runVirtualCustomerSession({
  anonClient,
  restaurant,
  table,
  rng,
  metrics,
  dryRun = false,
  onOrderCreated = null,
}) {
  const tableNum = table.tableNumber ?? table.table_number
  const sig = table.signature || generateTableSignature(restaurant.restaurantId, tableNum)

  if (!verifyTableSignature(restaurant.restaurantId, tableNum, sig)) {
    metrics?.recordRequest({ ok: false, status: 403, error: new Error('Invalid QR signature') })
    return { ok: false, reason: 'invalid_qr_signature' }
  }

  const cartItems = pickOrderCart(restaurant, rng)
  if (cartItems.length === 0) return { ok: true, skipped: 'no_available_items' }

  const idempotencyKey = `lt-${restaurant.code}-${tableNum}-${crypto.randomUUID()}`

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      qrVerified: true,
      restaurantId: restaurant.restaurantId,
      tableNumber: tableNum,
      idempotencyKey,
      items: cartItems,
    }
  }

  const measure = async (fn, opts = {}) => {
    const t0 = performance.now()
    try {
      const res = await fn()
      const latencyMs = performance.now() - t0
      if (res?.error) {
        const msg = String(res.error?.message || res.error || '')
        const isTransportError =
          Number(res.status || 0) <= 0 &&
          (/fetch failed|network|econnreset|etimedout|socket|und_err/i.test(msg) || Boolean(res.error?.cause))
        const status =
          Number.isFinite(Number(res.status)) && Number(res.status) > 0
            ? Number(res.status)
            : res.error?.code === 'PGRST116'
              ? 404
              : isTransportError
                ? 'NETWORK_ERROR'
                : 400
        metrics?.recordRequest({ ok: false, status, latencyMs, error: res.error, ...opts })
        return { error: res.error, data: null }
      }
      metrics?.recordRequest({
        ok: true,
        status: res?.status || 200,
        latencyMs,
        isDuplicate: Boolean(res?.data?.duplicate),
        ...opts,
      })
      return { data: res?.data ?? res, error: null }
    } catch (err) {
      metrics?.recordRequest({ ok: false, status: 'NETWORK_ERROR', latencyMs: performance.now() - t0, error: err, ...opts })
      return { error: err, data: null }
    }
  }

  // 1-2. Guest scans QR and loads public profile, valid tables, menu, and GST settings
  const profRes = await measure(() =>
    anonClient.rpc('get_public_restaurant_profile', { p_restaurant_id: restaurant.restaurantId })
  )
  if (profRes.error) return { ok: false, step: 'public_profile', error: profRes.error.message }

  await measure(() => anonClient.rpc('get_public_table_numbers', { p_restaurant_id: restaurant.restaurantId }))
  await measure(() =>
    anonClient.from('menu_items').select('id,name,price,half_price,category,is_in_stock,quantity').eq('restaurant_id', restaurant.restaurantId)
  )
  await measure(() =>
    anonClient.from('gst_settings').select('enabled,rate,label').eq('restaurant_id', restaurant.restaurantId).maybeSingle()
  )

  // 3. Claim table session cleanly via guest RPC
  await measure(() =>
    anonClient.rpc('claim_public_table_session', {
      p_restaurant_id: restaurant.restaurantId,
      p_table_number: Number(tableNum),
    })
  )

  // 4-5. Submit validated atomic order via create_validated_order RPC
  const orderRes = await measure(
    () =>
      anonClient.rpc('create_validated_order', {
        p_restaurant_id: restaurant.restaurantId,
        p_table_number: String(tableNum),
        p_customer_name: `LT Guest ${restaurant.code} T${tableNum}`,
        p_order_type: 'DINE-IN',
        p_items: cartItems,
        p_guests: randomInt(rng, 1, 4),
        p_notes: 'Load test order',
        p_idempotency_key: idempotencyKey,
      }),
    { isOrderCreate: true }
  )

  const orderId = orderRes.data?.order?.id
  if (!orderId) return { ok: false, step: 'create_validated_order', error: orderRes.error?.message || 'missing order id' }
  if (onOrderCreated) onOrderCreated(orderRes.data.order)

  // 6-7. Poll order tracking via public status RPC
  await measure(() =>
    anonClient.rpc('get_public_order_status', {
      p_order_id: orderId,
      p_restaurant_id: restaurant.restaurantId,
    })
  )

  // 8. 20% of customers place a second follow-up add-on item
  if (rng() < 0.2) {
    await sleep(50)
    const addon = pickOrderCart(restaurant, rng).slice(0, 1)
    if (addon.length > 0) {
      const addonRes = await measure(
        () =>
          anonClient.rpc('create_validated_order', {
            p_restaurant_id: restaurant.restaurantId,
            p_table_number: String(tableNum),
            p_customer_name: `LT Guest ${restaurant.code} T${tableNum}`,
            p_order_type: 'DINE-IN',
            p_items: addon,
            p_guests: 1,
            p_idempotency_key: `lt-addon-${restaurant.code}-${crypto.randomUUID()}`,
          }),
        { isOrderCreate: true }
      )
      if (addonRes.data?.order?.id && onOrderCreated) onOrderCreated(addonRes.data.order)
    }
  }

  return { ok: true, orderId }
}

export async function runCustomerPreviewCli(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: false,
    allowUnconfiguredDryRun: flags.dryRun,
  })

  if (flags.dryRun) {
    const plan = buildSyntheticRestaurantPlan({
      runId: flags.runId || 'dryrun',
      restaurantCount: 2,
      minTables: 10,
      maxTables: 12,
      minItems: 20,
      maxItems: 25,
    })
    const rng = createSeededRng(101)
    const sampleSessions = []
    for (const r of plan) {
      const normalized = {
        ...r,
        restaurantId: r.id,
        menuItems: r.items.map((m) => ({
          id: m.id,
          name: m.name,
          price: m.price,
          halfPrice: m.half_price,
          isInStock: m.is_in_stock,
        })),
        tables: r.tables.map((t) => ({ tableNumber: t.table_number })),
      }
      sampleSessions.push(
        await runVirtualCustomerSession({
          anonClient: null,
          restaurant: normalized,
          table: normalized.tables[0],
          rng,
          dryRun: true,
        })
      )
    }
    console.log(JSON.stringify({ mode: 'DRY_RUN', sampleSessions }, null, 2))
    return sampleSessions
  }

  const manifest = loadManifest(flags.manifest || flags.runId)
  const anonClient = createStagingAnonClient(stagingEnv)
  const rng = createSeededRng()
  const r = manifest.restaurants[0]
  const res = await runVirtualCustomerSession({
    anonClient,
    restaurant: r,
    table: r.tables[0],
    rng,
    dryRun: false,
  })
  console.log(JSON.stringify(res, null, 2))
  return res
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCustomerPreviewCli().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
