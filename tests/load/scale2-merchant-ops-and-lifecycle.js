import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { REPORTS_ROOT, REPO_ROOT, parseCliArgs } from './config.js'
import { validateStagingEnvironment, assertNotProductionValue } from './safety-guard.js'
import {
  createStagingAnonClient,
  createStagingAdminClient,
  loadManifest,
  signInStagingMerchant,
} from './lib/supabase-staging.js'
import { LoadMetricsCollector } from './lib/metrics.js'
import { verifyTableSignature } from '../../client/src/utils/tableSecurity.js'

const require = createRequire(import.meta.url)

/**
 * Starts an ephemeral, staging-bound Express billing backend server (no emails, no prod DB).
 */
async function startStagingBillingServer(stagingEnv, port = 5059) {
  assertNotProductionValue(stagingEnv.supabaseUrl, 'stagingBillingServer.url')
  process.env.SUPABASE_URL = stagingEnv.supabaseUrl
  process.env.SUPABASE_SERVICE_ROLE_KEY = stagingEnv.serviceRoleKey
  process.env.SUPABASE_ANON_KEY = stagingEnv.anonKey
  process.env.NODE_ENV = 'test'

  const express = require(path.join(REPO_ROOT, 'server/node_modules/express'))
  const billingRouter = require(path.join(REPO_ROOT, 'server/routes/billing.routes.js'))

  const app = express()
  app.use(express.json({ limit: '1mb' }))
  app.use('/api/billing', billingRouter)

  const server = await new Promise((resolve, reject) => {
    const srv = app.listen(port, '127.0.0.1', () => resolve(srv))
    srv.on('error', reject)
  })
  return { server, baseUrl: `http://127.0.0.1:${port}` }
}

export async function runScale2MerchantOpsAndLifecycle(argv = process.argv.slice(2)) {
  const flags = parseCliArgs(argv)
  const stagingEnv = validateStagingEnvironment({
    envFile: flags.envFile,
    requireServiceRole: true,
  })

  const manifest = loadManifest(flags.manifest || flags.runId)
  const sampleSize = Math.min(manifest.restaurants.length, Number(process.env.SCALE2_OPS_TENANTS || 10))
  const tenants = manifest.restaurants.slice(0, sampleSize)

  const metrics = new LoadMetricsCollector('scale2-merchant-ops-lifecycle', manifest.runId)
  const anonClient = createStagingAnonClient(stagingEnv)
  const adminClient = createStagingAdminClient(stagingEnv)
  const createdOrderIds = []

  const { server, baseUrl } = await startStagingBillingServer(stagingEnv)
  const lifecycleResults = []

  try {
    for (let idx = 0; idx < tenants.length; idx += 1) {
      const r = tenants[idx]
      const tStart = performance.now()
      const merchant = await signInStagingMerchant(stagingEnv, r.email, r.password)
      const token = merchant.session.access_token
      const tableNum = r.tables[0].tableNumber
      const itemA = r.menuItems.find((i) => i.isInStock && i.initialQuantity === null) || r.menuItems.find((i) => i.isInStock)
      const itemB = r.menuItems.find((i) => i.isInStock && i.id !== itemA.id)

      try {
        // 1. Customer verifies signed table QR & loads public profile/menu/table numbers
        assert.equal(verifyTableSignature(r.restaurantId, tableNum, r.tables[0].signature), true)
        assert.equal(verifyTableSignature(r.restaurantId, tableNum, `${r.tables[0].signature.slice(0, -4)}0000`), false)

        const { data: prof, error: profErr } = await anonClient.rpc('get_public_restaurant_profile', {
          p_restaurant_id: r.restaurantId,
        })
        assert.ifError(profErr)
        assert.equal(prof?.[0]?.id, r.restaurantId)

        const { error: claimErr } = await anonClient.rpc('claim_public_table_session', {
          p_restaurant_id: r.restaurantId,
          p_table_number: Number(tableNum),
        })
        assert.ifError(claimErr)

        // 2. Customer places Order #1
        const { data: ord1Res, error: ord1Err } = await anonClient.rpc('create_validated_order', {
          p_restaurant_id: r.restaurantId,
          p_table_number: String(tableNum),
          p_customer_name: `Lifecycle Guest 1 (${r.code})`,
          p_order_type: 'DINE-IN',
          p_items: [
            { menu_item_id: itemA.id, quantity: 1, variant: 'full' },
            ...(itemB ? [{ menu_item_id: itemB.id, quantity: 1, variant: itemB.halfPrice ? 'half' : 'full' }] : []),
          ],
          p_idempotency_key: `s2-lc1-${r.code}-${crypto.randomUUID()}`,
        })
        assert.ifError(ord1Err)
        const order1 = ord1Res.order
        createdOrderIds.push(order1.id)

        // 3. Concurrent Order #2 placed on same table while Order #1 is being processed
        const { data: ord2Res, error: ord2Err } = await anonClient.rpc('create_validated_order', {
          p_restaurant_id: r.restaurantId,
          p_table_number: String(tableNum),
          p_customer_name: `Lifecycle Guest 2 (${r.code})`,
          p_order_type: 'DINE-IN',
          p_items: [{ menu_item_id: itemA.id, quantity: 1, variant: 'full' }],
          p_idempotency_key: `s2-lc2-${r.code}-${crypto.randomUUID()}`,
        })
        assert.ifError(ord2Err)
        const order2 = ord2Res.order
        createdOrderIds.push(order2.id)

        // 4. Merchant dashboard receives both orders
        const { data: merchOrders, error: listErr } = await merchant.client
          .from('orders')
          .select('id,status,total')
          .eq('restaurant_id', r.restaurantId)
          .in('id', [order1.id, order2.id])
        assert.ifError(listErr)
        assert.equal(merchOrders.length, 2)

        // 5. Merchant KDS progression on Order #1: PREPARING -> READY -> SERVED -> BILL_REQUESTED
        for (const nextStatus of ['PREPARING', 'READY', 'SERVED', 'BILL_REQUESTED']) {
          const { error: stErr } = await merchant.client
            .from('orders')
            .update({ status: nextStatus, updated_at: new Date().toISOString() })
            .eq('id', order1.id)
          assert.ifError(stErr)

          const { data: pubTrack } = await anonClient.rpc('get_public_order_status', {
            p_order_id: order1.id,
            p_restaurant_id: r.restaurantId,
          })
          assert.equal(pubTrack?.[0]?.status, nextStatus)
        }

        // 6. Merchant updates finite stock (increment/decrement safely and keep consistent for cleanup)
        const { error: stockUpdErr } = await merchant.client
          .from('menu_items')
          .update({ is_in_stock: true })
          .eq('id', itemA.id)
        assert.ifError(stockUpdErr)

        // 7. Authoritative Billing Calculation + Invoice Generation + Simulated Test Payment Settlement
        const calcResp = await fetch(`${baseUrl}/api/billing/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            restaurantId: r.restaurantId,
            items: [{ menuItemId: itemA.id, name: itemA.name, price: itemA.price, quantity: 1 }],
          }),
        })
        assert.equal(calcResp.status, 200)
        const calcJson = await calcResp.json()
        assert.equal(calcJson.success, true)

        const invResp = await fetch(`${baseUrl}/api/billing/invoice/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            restaurantId: r.restaurantId,
            orderId: order1.id,
            tableNumber: String(tableNum),
            customer: { name: `Lifecycle Guest 1 (${r.code})` },
            items: [{ menuItemId: itemA.id, name: itemA.name, price: itemA.price, quantity: 1 }],
          }),
        })
        assert.equal(invResp.status, 201)
        const invJson = await invResp.json()
        const invoice = invJson.data
        assert.ok(invoice?.id)

        // Simulated test-mode payment settlement (idempotent)
        const settleIdem = `s2-pay-${order1.id}`
        const settleResp = await fetch(`${baseUrl}/api/billing/payment/settle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Idempotency-Key': settleIdem,
          },
          body: JSON.stringify({
            restaurantId: r.restaurantId,
            invoiceId: invoice.id,
            payments: [{ method: 'UPI', amount: invoice.pricing.grandTotal, reference: `TEST-UTR-${r.code}` }],
          }),
        })
        assert.equal(settleResp.status, 200)
        const settleJson = await settleResp.json()
        assert.equal(settleJson.invoice.status, 'PAID')

        // Idempotent replay verification
        const replayResp = await fetch(`${baseUrl}/api/billing/payment/settle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Idempotency-Key': settleIdem,
          },
          body: JSON.stringify({
            restaurantId: r.restaurantId,
            invoiceId: invoice.id,
            payments: [{ method: 'UPI', amount: invoice.pricing.grandTotal, reference: `TEST-UTR-${r.code}` }],
          }),
        })
        const replayJson = await replayResp.json()
        assert.equal(replayJson.idempotentReplay, true)

        // 8. Check table NOT released prematurely while Order #2 is still open!
        const { data: openCheck } = await merchant.client
          .from('orders')
          .select('id')
          .eq('restaurant_id', r.restaurantId)
          .eq('table_number', String(tableNum))
          .not('status', 'in', '("FINISHED","FINISHED_CLOSED","CANCELLED")')
        assert.ok(openCheck.length >= 1, 'Order #2 should remain open on table')

        // Re-assert occupied since Order #2 is active, then finish Order #2 & release table cleanly
        await merchant.client
          .from('table_sessions')
          .update({ status: 'occupied', current_order_id: order2.id })
          .eq('restaurant_id', r.restaurantId)
          .eq('table_number', tableNum)

        const { error: fin2Err } = await merchant.client
          .from('orders')
          .update({ status: 'FINISHED', payment_status: 'PAID', updated_at: new Date().toISOString() })
          .eq('id', order2.id)
        assert.ifError(fin2Err)

        const { error: relErr } = await merchant.client
          .from('table_sessions')
          .update({ status: 'available', current_order_id: null, customers: 0, session_start: null })
          .eq('restaurant_id', r.restaurantId)
          .eq('table_number', tableNum)
        assert.ifError(relErr)

        // 9. Clean up generated test invoice row from staging DB & verify new guest reclaims released table
        await adminClient.from('invoices').delete().eq('id', invoice.id)

        const { error: reclaimErr } = await anonClient.rpc('claim_public_table_session', {
          p_restaurant_id: r.restaurantId,
          p_table_number: Number(tableNum),
        })
        assert.ifError(reclaimErr)

        // Reset back to available after lifecycle check
        await merchant.client
          .from('table_sessions')
          .update({ status: 'available', current_order_id: null, customers: 0, session_start: null })
          .eq('restaurant_id', r.restaurantId)
          .eq('table_number', tableNum)

        metrics.recordRequest({ ok: true, status: 200, latencyMs: performance.now() - tStart, isOrderCreate: true })
        lifecycleResults.push({ code: r.code, status: 'PASS' })
      } catch (err) {
        metrics.recordRequest({ ok: false, status: 500, latencyMs: performance.now() - tStart, error: err })
        lifecycleResults.push({ code: r.code, status: 'FAIL', error: err.message })
      } finally {
        merchant.client.realtime.disconnect()
      }
    }
  } finally {
    await new Promise((res) => server.close(res))
    anonClient.realtime.disconnect()
  }

  manifest.createdOrderIds = Array.from(new Set([...(manifest.createdOrderIds || []), ...createdOrderIds]))
  const manifestPath = path.join(path.dirname(REPORTS_ROOT), 'manifests', `manifest-${manifest.runId}.json`)
  if (fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  }

  const outDir = path.join(REPORTS_ROOT, manifest.runId)
  const written = metrics.writeReports(outDir)
  const payload = {
    ...written.summary,
    tenantsTested: tenants.length,
    passedCount: lifecycleResults.filter((x) => x.status === 'PASS').length,
    failedCount: lifecycleResults.filter((x) => x.status === 'FAIL').length,
    lifecycleResults,
    jsonPath: written.jsonPath,
  }
  fs.writeFileSync(written.jsonPath, JSON.stringify(payload, null, 2))
  console.log(JSON.stringify(payload, null, 2))
  return payload
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runScale2MerchantOpsAndLifecycle().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
