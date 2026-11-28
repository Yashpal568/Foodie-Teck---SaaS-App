import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import {
  MANIFESTS_ROOT,
  parseCliArgs,
  generateRunId,
  formatRestaurantCode,
} from './config.js'
import { validateStagingEnvironment, assertNotProductionValue } from './safety-guard.js'
import {
  createStagingAdminClient,
  createSeededRng,
  randomInt,
} from './lib/supabase-staging.js'
import {
  generateRestaurantSignature,
  generateTableSignature,
} from '../../client/src/utils/tableSecurity.js'

const CATEGORIES = ['Starters', 'Main Course', 'Breads', 'Biryani & Rice', 'Beverages', 'Desserts']
const DISH_BASES = [
  'Paneer Tikka',
  'Dal Makhani',
  'Butter Chicken',
  'Veg Hakka Noodles',
  'Crispy Chilli Potato',
  'Garlic Naan',
  'Dum Biryani',
  'Cold Brew Coffee',
  'Masala Chaas',
  'Gulab Jamun',
  'Mushroom Duplex',
  'Tandoori Roti',
]

export function buildSyntheticRestaurantPlan({
  runId,
  restaurantCount = 100,
  minTables = 10,
  maxTables = 15,
  minItems = 20,
  maxItems = 50,
  publicOrigin = 'https://staging-menu.servora.invalid',
  seed = 20261127,
}) {
  const rng = createSeededRng(seed)
  const restaurants = []

  for (let i = 1; i <= restaurantCount; i += 1) {
    const code = formatRestaurantCode(i)
    const tableCount = randomInt(rng, minTables, maxTables)
    const itemCount = randomInt(rng, minItems, maxItems)
    const ownerEmail = `loadtest.${runId}.${String(i).padStart(3, '0')}@servora.invalid`
    const ownerPassword = `LT_${crypto.randomBytes(9).toString('hex')}!9a`
    const syntheticId = crypto.randomUUID()

    const items = []
    for (let m = 1; m <= itemCount; m += 1) {
      const category = CATEGORIES[(m - 1) % CATEGORIES.length]
      const dishBase = DISH_BASES[(m - 1) % DISH_BASES.length]
      const price = randomInt(rng, 60, 480)
      const hasHalfVariant = m % 3 === 0
      const halfPrice = hasHalfVariant ? Math.max(40, Math.round(price * 0.6)) : null
      const isUnavailable = m === itemCount // keep at least 1 out-of-stock item per tenant for negative checks
      const isFinite = m % 2 === 1 && !isUnavailable
      const initialQty = isFinite ? randomInt(rng, 25, 120) : null

      items.push({
        id: crypto.randomUUID(),
        name: `${dishBase} #${m}`,
        description: `Synthetic load-test item ${m} (${code})`,
        category,
        price,
        half_price: halfPrice,
        type: m % 4 === 0 ? 'NON_VEG' : 'VEG',
        quantity: initialQty,
        initial_quantity: initialQty,
        is_in_stock: !isUnavailable,
      })
    }

    const tables = Array.from({ length: tableCount }, (_, tIdx) => ({
      table_number: tIdx + 1,
      status: 'available',
      customers: 0,
    }))

    const gstEnabled = i % 2 === 0
    const gstRate = gstEnabled ? (i % 4 === 0 ? 12 : 5) : 0

    restaurants.push({
      index: i,
      id: syntheticId,
      code,
      business_name: code,
      email: ownerEmail,
      password: ownerPassword,
      phone: `90000${String(i).padStart(5, '0')}`,
      address: `Plot ${i}, Load Test Tech Park, Synthetic City`,
      description: `Synthetic Tenant [run:${runId}]`,
      gstin: i % 3 === 0 ? `27LOADT${String(i).padStart(4, '0')}A1Z5` : '',
      gstSettings: { enabled: gstEnabled, rate: gstRate, label: 'GST' },
      utr_number: `LT_${runId}_${String(i).padStart(3, '0')}`.toUpperCase(),
      categories: CATEGORIES.map((name, idx) => ({ name, order_index: idx + 1 })),
      items,
      tables,
      publicOrigin,
    })
  }

  return restaurants
}

export async function runSeedRestaurants(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const runId = flags.runId || generateRunId('lt')
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: !flags.dryRun,
    allowUnconfiguredDryRun: flags.dryRun,
  })

  const publicOrigin = stagingEnv.publicOrigin || 'https://staging-menu.servora.invalid'
  assertNotProductionValue(publicOrigin, 'seed.publicOrigin')

  const plan = buildSyntheticRestaurantPlan({
    runId,
    restaurantCount: flags.restaurants,
    minTables: flags.minTables,
    maxTables: flags.maxTables,
    minItems: flags.minItems,
    maxItems: flags.maxItems,
    publicOrigin,
  })

  const totalTables = plan.reduce((s, r) => s + r.tables.length, 0)
  const totalItems = plan.reduce((s, r) => s + r.items.length, 0)

  if (flags.dryRun) {
    const summary = {
      mode: 'DRY_RUN',
      runId,
      stagingConfigured: Boolean(stagingEnv.configured),
      restaurantsPlanned: plan.length,
      tablesPlanned: totalTables,
      menuItemsPlanned: totalItems,
      finiteItemsPlanned: plan.reduce((s, r) => s + r.items.filter((i) => i.quantity !== null).length, 0),
      unlimitedItemsPlanned: plan.reduce((s, r) => s + r.items.filter((i) => i.quantity === null && i.is_in_stock).length, 0),
      unavailableItemsPlanned: plan.reduce((s, r) => s + r.items.filter((i) => !i.is_in_stock).length, 0),
      sampleNames: [plan[0]?.code, plan[plan.length - 1]?.code],
      dbWritesExecuted: 0,
    }
    console.log(JSON.stringify(summary, null, 2))
    return summary
  }

  const adminClient = createStagingAdminClient(stagingEnv)
  const manifest = {
    runId,
    projectRef: stagingEnv.projectRef,
    createdAt: new Date().toISOString(),
    publicOrigin,
    restaurants: [],
    createdOrderIds: [],
  }

  const seedSingleRestaurant = async (r) => {
    let userRes = null
    let userErr = null
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const created = await adminClient.auth.admin.createUser({
        email: r.email,
        password: r.password,
        email_confirm: true,
        user_metadata: { load_test_run_id: runId, restaurant_code: r.code },
        app_metadata: { role: 'MERCHANT' },
      })
      userRes = created.data
      userErr = created.error
      if (!userErr && userRes?.user?.id) break
      if (/rate limit|429|timeout|fetch failed/i.test(String(userErr?.message || '')) && attempt < 5) {
        await new Promise((res) => setTimeout(res, attempt * 1500))
        continue
      }
      break
    }
    if (userErr || !userRes?.user?.id) {
      throw new Error(`Failed creating auth user for ${r.code}: ${userErr?.message || 'unknown'}`)
    }
    const ownerId = userRes.user.id

    const { data: restRow, error: restErr } = await adminClient
      .from('restaurants')
      .insert({
        id: r.id,
        owner_id: ownerId,
        business_name: r.business_name,
        email: r.email,
        phone: r.phone,
        address: r.address,
        description: r.description,
        gstin: r.gstin,
        status: 'Active',
      })
      .select()
      .single()
    if (restErr) throw new Error(`Restaurant insert failed (${r.code}): ${restErr.message}`)

    const [subRes, pvRes, gstRes, catRes, itemsRes, tablesRes, custRes] = await Promise.all([
      adminClient.from('subscriptions').insert({
        restaurant_id: restRow.id,
        plan_name: 'All-in-One Unlimited',
        price: 2100,
        status: 'ACTIVE',
        utr_number: r.utr_number,
      }),
      adminClient.from('payment_verifications').insert({
        restaurant_id: restRow.id,
        merchant_name: restRow.business_name,
        email: restRow.email,
        plan_name: 'All-in-One Unlimited',
        amount: 2100,
        utr_number: r.utr_number,
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
      }),
      adminClient.from('gst_settings').insert({
        restaurant_id: restRow.id,
        enabled: r.gstSettings.enabled,
        rate: r.gstSettings.rate,
        label: r.gstSettings.label,
      }),
      adminClient
        .from('menu_categories')
        .insert(r.categories.map((c) => ({ restaurant_id: restRow.id, ...c }))),
      adminClient
        .from('menu_items')
        .insert(
          r.items.map(({ initial_quantity, ...itemFields }) => ({
            ...itemFields,
            restaurant_id: restRow.id,
          }))
        )
        .select(),
      adminClient
        .from('table_sessions')
        .insert(r.tables.map((t) => ({ ...t, restaurant_id: restRow.id })))
        .select(),
      adminClient
        .from('customers')
        .insert({
          restaurant_id: restRow.id,
          name: `Synthetic Regular ${r.code}`,
          email: `guest.${runId}.${r.index}@servora.invalid`,
          phone: `91000${String(r.index).padStart(5, '0')}`,
        })
        .select()
        .single(),
    ])

    if (subRes.error) throw new Error(`Subscription insert failed (${r.code}): ${subRes.error.message}`)
    if (pvRes.error) throw new Error(`Payment verification insert failed (${r.code}): ${pvRes.error.message}`)
    if (gstRes.error) throw new Error(`GST settings insert failed (${r.code}): ${gstRes.error.message}`)
    if (catRes.error) throw new Error(`Menu category insert failed (${r.code}): ${catRes.error.message}`)
    if (itemsRes.error) throw new Error(`Menu items insert failed (${r.code}): ${itemsRes.error.message}`)
    if (tablesRes.error) throw new Error(`Table sessions insert failed (${r.code}): ${tablesRes.error.message}`)
    if (custRes.error) throw new Error(`Customer insert failed (${r.code}): ${custRes.error.message}`)

    const insertedItems = itemsRes.data
    const insertedTables = tablesRes.data
    const insertedCustomer = custRes.data

    const masterSig = generateRestaurantSignature(restRow.id)
    const masterUrl = `${publicOrigin}/menu?restaurant=${restRow.id}&sig=${masterSig}`

    const qrPayloads = insertedTables.map((t) => {
      const tableSig = generateTableSignature(restRow.id, t.table_number)
      return {
        restaurant_id: restRow.id,
        table_number: t.table_number,
        url: `${publicOrigin}/menu?restaurant=${restRow.id}&table=${t.table_number}&sig=${tableSig}`,
        _masterUrl: masterUrl,
        _tableSig: tableSig,
      }
    })

    const { data: insertedQRs, error: qrErr } = await adminClient
      .from('qr_codes')
      .insert(qrPayloads.map(({ _masterUrl, _tableSig, ...dbRow }) => dbRow))
      .select()
    if (qrErr) throw new Error(`QR insert failed (${r.code}): ${qrErr.message}`)

    const qtyById = new Map(r.items.map((it) => [it.id, it.initial_quantity]))
    return {
      index: r.index,
      code: r.code,
      restaurantId: restRow.id,
      ownerUserId: ownerId,
      email: r.email,
      password: r.password,
      gstSettings: r.gstSettings,
      masterQrUrl: masterUrl,
      customerIds: [insertedCustomer.id],
      tables: insertedTables.map((t, idx) => ({
        tableSessionId: t.id,
        tableNumber: t.table_number,
        qrCodeId: insertedQRs[idx]?.id || null,
        qrUrl: qrPayloads[idx].url,
        signature: qrPayloads[idx]._tableSig,
      })),
      menuItems: insertedItems.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        price: Number(m.price),
        halfPrice: m.half_price != null ? Number(m.half_price) : null,
        initialQuantity: qtyById.get(m.id) ?? m.quantity,
        isInStock: m.is_in_stock,
      })),
    }
  }

  const SEED_CONCURRENCY = 8
  for (let i = 0; i < plan.length; i += SEED_CONCURRENCY) {
    const batch = plan.slice(i, i + SEED_CONCURRENCY)
    const settled = await Promise.all(batch.map((r) => seedSingleRestaurant(r)))
    manifest.restaurants.push(...settled)
    console.log(`Seeded ${Math.min(i + SEED_CONCURRENCY, plan.length)}/${plan.length} synthetic restaurants...`)
  }
  manifest.restaurants.sort((a, b) => a.index - b.index)

  fs.mkdirSync(MANIFESTS_ROOT, { recursive: true })
  const manifestPath = path.join(MANIFESTS_ROOT, `manifest-${runId}.json`)
  const serialized = plan.length >= 200 ? JSON.stringify(manifest) : JSON.stringify(manifest, null, 2)
  fs.writeFileSync(manifestPath, serialized)

  const csvRows = ['restaurant_code,restaurant_id,table_number,table_session_id,qr_url']
  for (const r of manifest.restaurants) {
    for (const t of r.tables) {
      csvRows.push(`${r.code},${r.restaurantId},${t.tableNumber},${t.tableSessionId},"${t.qrUrl}"`)
    }
  }
  const tablesCsvPath = path.join(MANIFESTS_ROOT, `tables-${runId}.csv`)
  fs.writeFileSync(tablesCsvPath, csvRows.join('\n'))

  console.log(`Seed complete. Manifest saved to: ${manifestPath}`)
  return { manifest, manifestPath, tablesCsvPath }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeedRestaurants().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
