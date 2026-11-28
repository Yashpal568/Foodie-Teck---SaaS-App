import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'
import { Counter, Rate, Trend } from 'k6/metrics'

/**
 * SERVORA SCALE TEST 2.0 — DISTRIBUTED k6 LOAD GENERATOR SCRIPT
 *
 * Strictly targets Servora-Staging ONLY (refuses oliuhzkbnxjiwkrdlcfv or servora.quantumesh.in).
 * Usage (per shard):
 *   k6 run -e STAGING_URL=https://mhkxdidwmycsibdjflxz.supabase.co \
 *          -e STAGING_ANON_KEY=<anon> \
 *          -e MANIFEST_PATH=../../artifacts/load-test/manifests/manifest-<runId>.json \
 *          -e TARGET_PEAK_VUS=25000 \
 *          servora-scale2.js
 */

const DENYLIST = ['oliuhzkbnxjiwkrdlcfv', 'servora.quantumesh.in']
const STAGING_URL = (__ENV.STAGING_URL || '').replace(/\/+$/, '')
const STAGING_ANON_KEY = __ENV.STAGING_ANON_KEY || ''

if (!STAGING_URL || !STAGING_ANON_KEY) {
  throw new Error('SAFETY ABORT: STAGING_URL and STAGING_ANON_KEY are required for k6.')
}
for (const blocked of DENYLIST) {
  if (STAGING_URL.toLowerCase().includes(blocked)) {
    throw new Error(`SAFETY ABORT: Production target "${blocked}" is permanently blocked.`)
  }
}

const manifestData = new SharedArray('restaurants', () => {
  const raw = JSON.parse(open(__ENV.MANIFEST_PATH || '../../artifacts/load-test/manifests/manifest-scale2.json'))
  return raw.restaurants || []
})

const ordersCreated = new Counter('servora_orders_created')
const orderSuccessRate = new Rate('servora_order_success_rate')
const orderRpcLatency = new Trend('servora_create_order_ms')

const maxTotalVUs = Math.max(1, Number(__ENV.TARGET_PEAK_VUS || 1000))
const shardCount = Math.max(1, Number(__ENV.SHARD_COUNT || 1))
const rawShardIndex = __ENV.SHARD_INDEX !== undefined ? Number(__ENV.SHARD_INDEX) : null
const shardIndex =
  rawShardIndex !== null && Number.isInteger(rawShardIndex) && rawShardIndex >= 0 && rawShardIndex < shardCount
    ? rawShardIndex
    : null

export function perShardTarget(totalTarget, totalShards = 1, workerIndex = null) {
  const safeTotal = Math.max(1, Math.floor(Number(totalTarget) || 1))
  const safeShards = Math.max(1, Math.floor(Number(totalShards) || 1))
  if (workerIndex !== null && Number.isInteger(workerIndex) && workerIndex >= 0 && workerIndex < safeShards) {
    const base = Math.floor(safeTotal / safeShards)
    const rem = safeTotal % safeShards
    return Math.max(1, base + (workerIndex < rem ? 1 : 0))
  }
  return Math.max(1, Math.round(safeTotal / safeShards))
}

export function buildDistributedRampingStages(totalPeakVUs, totalShards = 1, workerIndex = null) {
  const peak = Math.max(1, Math.floor(Number(totalPeakVUs) || 1))
  const tierPlan = [
    { duration: '30s', totalTarget: 500 },
    { duration: '30s', totalTarget: 1000 },
    { duration: '45s', totalTarget: 5000 },
    { duration: '45s', totalTarget: 10000 },
    { duration: '60s', totalTarget: 25000 },
    { duration: '60s', totalTarget: 50000 },
    { duration: '60s', totalTarget: 75000 },
    { duration: '60s', totalTarget: 100000 },
  ]

  const stages = []
  let prevTarget = 0
  for (const tier of tierPlan) {
    const clampedTotal = Math.min(tier.totalTarget, peak)
    if (clampedTotal <= prevTarget && stages.length > 0) continue
    stages.push({
      duration: tier.duration,
      target: perShardTarget(clampedTotal, totalShards, workerIndex),
    })
    prevTarget = clampedTotal
    if (clampedTotal >= peak) break
  }

  if (prevTarget < peak) {
    stages.push({
      duration: '60s',
      target: perShardTarget(peak, totalShards, workerIndex),
    })
  }
  return stages
}

const distributedStages = buildDistributedRampingStages(maxTotalVUs, shardCount, shardIndex)

export const options = {
  scenarios: {
    progressive_customer_traffic: {
      executor: 'ramping-vus',
      startVUs: distributedStages[0]?.target || perShardTarget(Math.min(500, maxTotalVUs), shardCount, shardIndex),
      stages: distributedStages,
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.15'],
    servora_create_order_ms: ['p(95)<8000'],
  },
}

const headers = {
  apikey: STAGING_ANON_KEY,
  Authorization: `Bearer ${STAGING_ANON_KEY}`,
  'Content-Type': 'application/json',
}

export default function () {
  const r = manifestData[Math.floor(Math.random() * manifestData.length)]
  const t = r.tables[Math.floor(Math.random() * r.tables.length)]
  const avail = (r.menuItems || []).filter((i) => i.isInStock !== false)
  if (avail.length === 0) return

  const picked = avail[Math.floor(Math.random() * avail.length)]
  const variant = picked.halfPrice != null && Math.random() > 0.5 ? 'half' : 'full'

  let tableAlreadyActive = false
  const bootRes = http.post(
    `${STAGING_URL}/rest/v1/rpc/get_public_menu_bootstrap`,
    JSON.stringify({ p_restaurant_id: r.restaurantId }),
    { headers }
  )

  if (bootRes.status === 200) {
    check(bootRes, { 'bootstrap 200': (res) => res.status === 200 })
    const bootTables = bootRes.json('tables') || []
    const matchedTable = Array.isArray(bootTables)
      ? bootTables.find((row) => Number(row.table_number) === Number(t.tableNumber))
      : null
    const st = String(matchedTable?.status || '').toLowerCase()
    tableAlreadyActive = st === 'occupied' || st === 'billing'
  } else {
    const profRes = http.post(
      `${STAGING_URL}/rest/v1/rpc/get_public_restaurant_profile`,
      JSON.stringify({ p_restaurant_id: r.restaurantId }),
      { headers }
    )
    check(profRes, { 'profile 200': (res) => res.status === 200 })

    const menuRes = http.get(
      `${STAGING_URL}/rest/v1/menu_items?restaurant_id=eq.${r.restaurantId}&select=id,name,price,half_price,is_in_stock,quantity`,
      { headers }
    )
    check(menuRes, { 'menu 200': (res) => res.status === 200 })
  }

  if (!tableAlreadyActive) {
    http.post(
      `${STAGING_URL}/rest/v1/rpc/claim_public_table_session`,
      JSON.stringify({ p_restaurant_id: r.restaurantId, p_table_number: Number(t.tableNumber) }),
      { headers }
    )
  }

  const idemKey = `k6-${__VU}-${__ITER}-${Date.now()}`
  const ordRes = http.post(
    `${STAGING_URL}/rest/v1/rpc/create_validated_order`,
    JSON.stringify({
      p_restaurant_id: r.restaurantId,
      p_table_number: String(t.tableNumber),
      p_customer_name: `k6 Guest VU${__VU}`,
      p_order_type: 'DINE-IN',
      p_items: [{ menu_item_id: picked.id, quantity: 1, variant }],
      p_guests: 2,
      p_idempotency_key: idemKey,
    }),
    { headers }
  )
  orderRpcLatency.add(ordRes.timings.duration)
  const ok = ordRes.status === 200 && Boolean(ordRes.json('order.id'))
  orderSuccessRate.add(ok)
  if (ok) {
    ordersCreated.add(1)
    const ordId = ordRes.json('order.id')
    http.post(
      `${STAGING_URL}/rest/v1/rpc/get_public_order_status`,
      JSON.stringify({ p_order_id: ordId, p_restaurant_id: r.restaurantId }),
      { headers }
    )
  }

  sleep(Math.random() * 0.4 + 0.1)
}
