process.env.NODE_ENV = 'test'

const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const TENANT_A_ID = '3a10e567-9e10-4c27-aadd-64e84cd8694c'
const TENANT_B_ID = '9b21f678-1111-4c27-aadd-64e84cd86999'
const TENANT_SUSPENDED_ID = '7c32a111-2222-4c27-aadd-64e84cd86888'

const MERCHANT_A_TOKEN = 'mock-jwt-merchant-a-token-000001'
const MERCHANT_B_TOKEN = 'mock-jwt-merchant-b-token-000002'
const ADMIN_TOKEN = 'mock-jwt-super-admin-token-000003'
const EXPIRED_TOKEN = 'mock-jwt-expired-token-000004'
const DB_FAIL_RID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
let simulateRestDbError = false

const USERS = {
  [MERCHANT_A_TOKEN]: {
    id: 'user-merchant-a-1111-4111-8111-111111111111',
    email: 'owner-a@servora.test',
    app_metadata: { role: 'MERCHANT' },
    user_metadata: { role: 'SUPER_ADMIN' }, // spoofing attempt in user_metadata must be ignored
  },
  [MERCHANT_B_TOKEN]: {
    id: 'user-merchant-b-2222-4222-8222-222222222222',
    email: 'owner-b@servora.test',
    app_metadata: { role: 'MERCHANT' },
  },
  [ADMIN_TOKEN]: {
    id: 'user-admin-9999-4999-8999-999999999999',
    email: 'admin@servora.test',
    app_metadata: { role: 'SUPER_ADMIN' },
  },
}

const RESTAURANTS = new Map([
  [TENANT_A_ID, { id: TENANT_A_ID, owner_id: USERS[MERCHANT_A_TOKEN].id, business_name: 'Cafe Alpha', status: 'Active' }],
  [TENANT_B_ID, { id: TENANT_B_ID, owner_id: USERS[MERCHANT_B_TOKEN].id, business_name: 'Bistro Beta', status: 'Active' }],
  [TENANT_SUSPENDED_ID, { id: TENANT_SUSPENDED_ID, owner_id: USERS[MERCHANT_A_TOKEN].id, business_name: 'Suspended Diner', status: 'Suspended' }],
])

const MENU_ITEMS = [
  { id: '11111111-1111-4111-8111-111111111111', restaurant_id: TENANT_A_ID, name: 'Veg Momos', price: 140, half_price: 80, category: 'Starters', is_in_stock: true },
  { id: '22222222-2222-4222-8222-222222222222', restaurant_id: TENANT_A_ID, name: 'Cold Coffee', price: 120, half_price: null, category: 'Beverages', is_in_stock: false },
]

const INVOICE_STORE = new Map()

function createQueryBuilder(table) {
  const filters = {}
  let inFilter = null

  const execute = async () => {
    if (table === 'restaurants') {
      if (simulateRestDbError || filters.id === DB_FAIL_RID) {
        return { data: null, error: new Error('Simulated DB outage') }
      }
      const row = RESTAURANTS.get(filters.id) || null
      return { data: row, error: null }
    }
    if (table === 'menu_items') {
      const rows = MENU_ITEMS.filter((item) => {
        if (filters.restaurant_id && item.restaurant_id !== filters.restaurant_id) return false
        if (inFilter && inFilter.field === 'id' && !inFilter.values.includes(item.id)) return false
        return true
      })
      return { data: rows, error: null }
    }
    if (table === 'invoices') {
      if (filters.id) {
        return { data: INVOICE_STORE.get(filters.id) || null, error: null }
      }
      const rows = [...INVOICE_STORE.values()].filter((inv) =>
        !filters.restaurant_id || inv.restaurant_id === filters.restaurant_id
      )
      return { data: rows, error: null }
    }
    if (table === 'subscriptions') {
      return { data: [], error: null }
    }
    return { data: [], error: null }
  }

  const builder = {
    select() { return builder },
    eq(col, val) { filters[col] = val; return builder },
    in(col, vals) { inFilter = { field: col, values: vals }; return builder },
    order() { return builder },
    limit() { return builder },
    insert(row) {
      if (table === 'invoices') {
        const rec = { ...row, created_at: new Date().toISOString() }
        INVOICE_STORE.set(rec.id, rec)
      }
      return builder
    },
    upsert(row) {
      if (table === 'invoices') {
        const rec = { ...(INVOICE_STORE.get(row.id) || {}), ...row }
        INVOICE_STORE.set(rec.id, rec)
      }
      return builder
    },
    update(patch) {
      builder._patch = patch
      return builder
    },
    maybeSingle: async () => execute(),
    single: async () => execute(),
    then(resolve, reject) {
      return execute().then(resolve, reject)
    },
  }
  return builder
}

const mockSupabase = {
  auth: {
    async getUser(token) {
      if (token === EXPIRED_TOKEN) {
        return { data: { user: null }, error: new Error('JWT expired') }
      }
      const user = USERS[token]
      if (!user) return { data: { user: null }, error: new Error('Invalid JWT') }
      return { data: { user }, error: null }
    },
  },
  from(table) {
    return createQueryBuilder(table)
  },
}

// Stub server/lib/supabase.js before importing routes/server
const supabaseModulePath = path.resolve(__dirname, '../lib/supabase.js')
require.cache[supabaseModulePath] = {
  id: supabaseModulePath,
  filename: supabaseModulePath,
  loaded: true,
  exports: { supabase: mockSupabase, isServiceRoleConfigured: true },
}

const emailServicePath = path.resolve(__dirname, '../services/email.service.js')
let lastDispatchedEmail = null
require.cache[emailServicePath] = {
  id: emailServicePath,
  filename: emailServicePath,
  loaded: true,
  exports: {
    sendWelcomeEmail: async (payload) => { lastDispatchedEmail = payload; return { queued: true } },
    sendForgotPasswordEmail: async (payload) => { lastDispatchedEmail = payload; return { queued: true } },
    sendPurchaseSummaryEmail: async (payload) => { lastDispatchedEmail = payload; return { queued: true } },
    sendSubscriptionExpiryEmail: async (payload) => { lastDispatchedEmail = payload; return { queued: true } },
    sendTestEmail: async (email) => { lastDispatchedEmail = { email }; return { queued: true } },
    verifySMTPConnection: async () => ({ configured: true, status: 'mocked' }),
  },
}

const { app } = require('../server')
const { calculateBill } = require('../services/billing.engine')
const { processPayment } = require('../services/payment.service')
const { generateInvoice } = require('../services/invoice.service')

let httpServer
let baseUrl

before(async () => {
  await new Promise((resolve) => {
    httpServer = app.listen(0, '127.0.0.1', () => {
      const addr = httpServer.address()
      baseUrl = `http://127.0.0.1:${addr.port}`
      resolve()
    })
  })
})

after(async () => {
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve))
  }
})

beforeEach(() => {
  lastDispatchedEmail = null
})

describe('Servora Server Security Middleware & Tenant Isolation', () => {
  it('blocks disallowed CORS origins with 403/500 error', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://evil-attacker.example.com' },
    })
    assert.equal(res.status >= 400, true)
  })

  it('rejects unauthenticated requests to /api/admin/session with 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/session`)
    assert.equal(res.status, 401)
  })

  it('rejects non-admin user even if user_metadata claims SUPER_ADMIN (403)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/session`, {
      headers: { Authorization: `Bearer ${MERCHANT_A_TOKEN}` },
    })
    assert.equal(res.status, 403)
  })

  it('grants /api/admin/session to verified app_metadata SUPER_ADMIN', async () => {
    const res = await fetch(`${baseUrl}/api/admin/session`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.success, true)
    assert.equal(body.user.role, 'SUPER_ADMIN')
  })

  it('protects /api/email/status and /api/email/test as admin-only', async () => {
    const unauth = await fetch(`${baseUrl}/api/email/status`)
    assert.equal(unauth.status, 401)

    const merchant = await fetch(`${baseUrl}/api/email/test`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@servora.test' }),
    })
    assert.equal(merchant.status, 403)
  })

  it('sanitizes untrusted redirect URLs on /api/email/forgot-password against phishing', async () => {
    const res = await fetch(`${baseUrl}/api/email/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner-a@servora.test',
        resetUrl: 'https://phishing.evil.example/steal-token',
      }),
    })
    assert.equal(res.status, 200)
    assert.ok(lastDispatchedEmail?.resetUrl)
    assert.equal(lastDispatchedEmail.resetUrl.includes('phishing.evil.example'), false)
    assert.equal(lastDispatchedEmail.resetUrl.endsWith('/reset-password'), true)
  })

  it('enforces tenant isolation on billing endpoints (Merchant A cannot access Merchant B)', async () => {
    const res = await fetch(`${baseUrl}/api/billing/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId: TENANT_B_ID,
        items: [{ name: 'Item', price: 100, quantity: 1 }],
      }),
    })
    assert.equal(res.status, 403)
  })
})

describe('Authoritative Billing Engine & Payment Idempotency', () => {
  it('rejects negative prices, zero quantities, and excessive discounts', () => {
    assert.throws(() => calculateBill({ items: [{ name: 'Bad', price: -10, quantity: 1 }] }))
    assert.throws(() => calculateBill({ items: [{ name: 'Zero', price: 100, quantity: 0 }] }))
    assert.throws(() => calculateBill({
      items: [{ name: 'Good', price: 100, quantity: 1 }],
      discount: { type: 'PERCENT', value: 150 },
    }))
  })

  it('uses authoritative DB prices and rejects out-of-stock items', async () => {
    const res = await fetch(`${baseUrl}/api/billing/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId: TENANT_A_ID,
        // Client tries to spoof Veg Momos (real price 140) as ₹1
        items: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Veg Momos', price: 1, quantity: 2 }],
      }),
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.data.pricing.subtotal, 280)
  })

  it('deduplicates payment settlement retries with identical idempotencyKey', async () => {
    const invoice = await generateInvoice({
      restaurantId: TENANT_A_ID,
      items: [{ name: 'Veg Momos', price: 100, quantity: 2, category: 'Starters' }],
    })
    assert.equal(invoice.status, 'ISSUED')

    const key = `idem-${Date.now()}`
    const first = await processPayment({
      invoiceId: invoice.id,
      restaurantId: TENANT_A_ID,
      idempotencyKey: key,
      payments: [{ method: 'UPI', amount: invoice.pricing.grandTotal, utr: 'UTR1234567890' }],
    })
    assert.equal(first.invoice.status, 'PAID')
    assert.equal(Boolean(first.idempotentReplay), false)

    const replay = await processPayment({
      invoiceId: invoice.id,
      restaurantId: TENANT_A_ID,
      idempotencyKey: key,
      payments: [{ method: 'UPI', amount: invoice.pricing.grandTotal, utr: 'UTR1234567890' }],
    })
    assert.equal(replay.idempotentReplay, true)
    assert.equal(replay.invoice.payments.length, 1)
  })

  it('rejects expired and malformed JWTs cleanly with 401', async () => {
    const expiredRes = await fetch(`${baseUrl}/api/admin/session`, {
      headers: { Authorization: `Bearer ${EXPIRED_TOKEN}` },
    })
    assert.equal(expiredRes.status, 401)

    const shortRes = await fetch(`${baseUrl}/api/billing/calculate`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid.jwt',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ restaurantId: TENANT_A_ID, items: [{ name: 'Tea', price: 20, quantity: 1 }] }),
    })
    assert.equal(shortRes.status, 401)
  })

  it('fails closed with 503 when tenant verification database lookup fails', async () => {
    const res = await fetch(`${baseUrl}/api/billing/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId: DB_FAIL_RID,
        items: [{ name: 'Tea', price: 20, quantity: 1 }],
      }),
    })
    assert.equal(res.status, 503)
  })

  it('rejects out-of-stock menu items during authoritative billing calculation (400)', async () => {
    const res = await fetch(`${baseUrl}/api/billing/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId: TENANT_A_ID,
        items: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Cold Coffee', price: 120, quantity: 1 }],
      }),
    })
    assert.equal(res.status, 400)
  })

  it('blocks unauthorized cross-tenant invoice read (GET /api/billing/invoice/:id -> 403)', async () => {
    const tenantBInvoice = await generateInvoice({
      restaurantId: TENANT_B_ID,
      items: [{ name: 'Bistro Dish', price: 250, quantity: 1, category: 'Starters' }],
    })

    const res = await fetch(`${baseUrl}/api/billing/invoice/${tenantBInvoice.id}`, {
      headers: { Authorization: `Bearer ${MERCHANT_A_TOKEN}` },
    })
    assert.equal(res.status, 403)
  })

  it('rejects API access when restaurant workspace status is Suspended (403)', async () => {
    const res = await fetch(`${baseUrl}/api/billing/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId: TENANT_SUSPENDED_ID,
        items: [{ name: 'Tea', price: 20, quantity: 1 }],
      }),
    })
    assert.equal(res.status, 403)

    const suspendedInvoice = await generateInvoice({
      restaurantId: TENANT_SUSPENDED_ID,
      items: [{ name: 'Tea', price: 20, quantity: 1, category: 'Beverages' }],
    })
    const invRes = await fetch(`${baseUrl}/api/billing/invoice/${suspendedInvoice.id}`, {
      headers: { Authorization: `Bearer ${MERCHANT_A_TOKEN}` },
    })
    assert.equal(invRes.status, 403)
  })

  it('applies zero tax when gstSettings is disabled and custom rate when enabled', async () => {
    const disabledRes = await fetch(`${baseUrl}/api/billing/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId: TENANT_A_ID,
        items: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Veg Momos', price: 140, quantity: 2 }],
        gstSettings: { enabled: false, rate: 0, label: 'GST' },
      }),
    })
    assert.equal(disabledRes.status, 200)
    const disabledBody = await disabledRes.json()
    assert.equal(disabledBody.data.pricing.taxes.totalTax, 0)
    assert.equal(disabledBody.data.pricing.grandTotal, 280)

    const customRes = calculateBill({
      restaurantId: TENANT_A_ID,
      items: [{ name: 'Veg Momos', price: 100, quantity: 2 }],
      gstSettings: { enabled: true, rate: 12, label: 'GST' },
    })
    assert.equal(customRes.pricing.taxes.totalTax, 24)
    assert.equal(customRes.pricing.grandTotal, 224)
  })
})

describe('QZ Tray Digital Signing Security', () => {
  it('rejects unauthenticated /api/print/qz-sign (401), rejects invalid payloads (400), and signs valid payloads with RSA-SHA512', async () => {
    const crypto = require('crypto')
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    // 1. Unauthenticated request must be rejected (401)
    const unauthRes = await fetch(`${baseUrl}/api/print/qz-sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toSign: 'test-challenge' }),
    })
    assert.equal(unauthRes.status, 401)

    const prevKey = process.env.QZ_PRIVATE_KEY
    process.env.QZ_PRIVATE_KEY = privateKey
    try {
      // 2. Cross-tenant signing attempt rejected (403)
      const crossTenantRes = await fetch(`${baseUrl}/api/print/qz-sign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ restaurantId: TENANT_B_ID, toSign: 'cross-tenant-challenge' }),
      })
      assert.equal(crossTenantRes.status, 403)

      // 3. Empty/oversized payload rejected (400)
      const badRes = await fetch(`${baseUrl}/api/print/qz-sign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ restaurantId: TENANT_A_ID, toSign: '' }),
      })
      assert.equal(badRes.status, 400)

      // 4. Valid authenticated signing request returns verifiable RSA-SHA512 signature
      const payload = 'qz-challenge-2026-servora'
      const okRes = await fetch(`${baseUrl}/api/print/qz-sign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ restaurantId: TENANT_A_ID, toSign: payload }),
      })
      assert.equal(okRes.status, 200)
      const body = await okRes.json()
      assert.equal(body.success, true)
      assert.equal(body.algorithm, 'RSA-SHA512')

      const verifier = crypto.createVerify('RSA-SHA512')
      verifier.update(payload)
      verifier.end()
      assert.equal(verifier.verify(publicKey, body.signature, 'base64'), true)

      // 5. Control-byte injection & oversized payloads must be rejected (400)
      const ctrlRes = await fetch(`${baseUrl}/api/print/qz-sign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ restaurantId: TENANT_A_ID, toSign: 'bad\x00payload' }),
      })
      assert.equal(ctrlRes.status, 400)

      // 5. Public certificate endpoint returns only cert text (never private key)
      const prevCert = process.env.QZ_CERT_PEM
      process.env.QZ_CERT_PEM = '-----BEGIN CERTIFICATE-----\nTESTCERT\n-----END CERTIFICATE-----'
      try {
        const certRes = await fetch(`${baseUrl}/api/print/qz-certificate`)
        assert.equal(certRes.status, 200)
        const certText = await certRes.text()
        assert.ok(certText.includes('BEGIN CERTIFICATE'))
        assert.ok(!certText.includes('PRIVATE KEY'))
      } finally {
        if (prevCert === undefined) delete process.env.QZ_CERT_PEM
        else process.env.QZ_CERT_PEM = prevCert
      }

      // 6. Durable printer config API enforces tenant isolation & persistence per restaurantId + terminalId
      const unauthCfg = await fetch(`${baseUrl}/api/print/config?restaurantId=${TENANT_A_ID}&terminalId=pos-1`)
      assert.equal(unauthCfg.status, 401)

      const crossCfgPut = await fetch(`${baseUrl}/api/print/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId: TENANT_B_ID,
          terminalId: 'pos-1',
          stations: { billing: { printerName: 'Hijacked' } },
        }),
      })
      assert.equal(crossCfgPut.status, 403)

      const saveCfgRes = await fetch(`${baseUrl}/api/print/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${MERCHANT_A_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId: TENANT_A_ID,
          terminalId: 'counter-1',
          terminalLabel: 'Front Desk POS',
          stations: {
            billing: { enabled: true, printerId: 'qz:EPSON-TM82', printerName: 'EPSON-TM82', paperWidthId: '80mm' },
            kitchen: { enabled: true, printerId: 'qz:KITCHEN-80', printerName: 'KITCHEN-80', paperWidthId: '80mm' },
          },
        }),
      })
      assert.equal(saveCfgRes.status, 200)

      const loadCfgRes = await fetch(
        `${baseUrl}/api/print/config?restaurantId=${TENANT_A_ID}&terminalId=counter-1`,
        { headers: { Authorization: `Bearer ${MERCHANT_A_TOKEN}` } }
      )
      assert.equal(loadCfgRes.status, 200)
      const loadCfgBody = await loadCfgRes.json()
      assert.equal(loadCfgBody.config.stations.billing.printerName, 'EPSON-TM82')
      assert.equal(loadCfgBody.config.stations.kitchen.printerName, 'KITCHEN-80')
    } finally {
      if (prevKey === undefined) delete process.env.QZ_PRIVATE_KEY
      else process.env.QZ_PRIVATE_KEY = prevKey
    }
  })
})
