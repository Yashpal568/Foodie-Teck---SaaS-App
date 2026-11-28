import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = {
  user: { id: 'user-owner-1111' },
  userError: null,
  sessionToken: 'mock-jwt-token-123456789012345',
  rpcHandler: vi.fn(async () => ({ data: null, error: null })),
  currentOrderRow: { id: '99999999-9999-4999-8999-999999999999', status: 'PENDING', restaurant_id: '3a10e567-9e10-4c27-aadd-64e84cd8694c', table_number: '1' },
  updateError: null,
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: mockDb.sessionToken ? { access_token: mockDb.sessionToken } : null },
      })),
      getUser: vi.fn(async () => ({
        data: { user: mockDb.user },
        error: mockDb.userError,
      })),
    },
    rpc: vi.fn((...args) => mockDb.rpcHandler(...args)),
    channel: vi.fn(() => ({
      subscribe: vi.fn((cb) => { cb('SUBSCRIBED'); return { unsubscribe: vi.fn() } }),
      send: vi.fn(async () => ({})),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        single: async () => ({ data: mockDb.currentOrderRow, error: null }),
        update: (patch) => {
          mockDb.currentOrderRow = { ...mockDb.currentOrderRow, ...patch }
          return chain
        },
        then: (resolve, reject) => Promise.resolve({ data: mockDb.currentOrderRow, error: mockDb.updateError }).then(resolve, reject),
      }
      return chain
    }),
  },
}))

vi.mock('@/services/restaurant.service', () => ({
  getRestaurantByEmail: vi.fn(async () => null),
  ensureValidRestaurantUUID: vi.fn(async (id) => id),
}))

import {
  isBillingServerConfigured,
  calculateBillPreview,
  calculateServerBill,
  createServerInvoice,
  settleInvoicePayment,
} from '@/services/billing.service'
import {
  createOrder,
  updateOrderStatus,
} from '@/services/order.service'
import {
  validateImageAsset,
  sanitizeFolderPath,
  uploadToCloudinary,
  MAX_UPLOAD_BYTES,
} from '@/services/cloudinary.service'

const VALID_RID = '3a10e567-9e10-4c27-aadd-64e84cd8694c'
const ITEM_UUID = '11111111-1111-4111-8111-111111111111'
const ORDER_UUID = '99999999-9999-4999-8999-999999999999'

describe('Client Billing Integrity (client/src/services/billing.service.js)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('computes preview integer-paise totals marked non-authoritative', () => {
    const preview = calculateBillPreview({
      items: [{ name: 'Momos', price: 140, quantity: 2 }],
      discount: { type: 'PERCENT', value: 10 },
    })
    expect(preview.isPreview).toBe(true)
    expect(preview.authoritative).toBe(false)
    expect(preview.pricing.subtotal).toBe(280)
    expect(preview.pricing.discount.amount).toBe(28)
    expect(preview.pricing.grandTotal).toBeGreaterThan(252)
  })

  it('charges zero tax when restaurant gstSettings is disabled or rate is 0%', async () => {
    const previewDisabled = calculateBillPreview({
      items: [{ name: 'Farmhouse Special Pizza (10")', price: 340, quantity: 1, category: 'Pizza' }],
      gstSettings: { enabled: false, rate: 0, label: 'GST' },
    })
    expect(previewDisabled.pricing.subtotal).toBe(340)
    expect(previewDisabled.pricing.taxes.totalTax).toBe(0)
    expect(previewDisabled.pricing.taxes.cgst).toBe(0)
    expect(previewDisabled.pricing.taxes.sgst).toBe(0)
    expect(previewDisabled.pricing.grandTotal).toBe(340)

    const previewDisabledWithStaleRate = calculateBillPreview({
      items: [{ name: 'Cold Coffee', price: 130, quantity: 1, category: 'Beverages' }],
      gstSettings: { enabled: false, rate: 18, label: 'GST' },
    })
    expect(previewDisabledWithStaleRate.pricing.taxes.totalTax).toBe(0)
    expect(previewDisabledWithStaleRate.pricing.grandTotal).toBe(130)

    const demoBill = await calculateServerBill({
      items: [{ name: 'Farmhouse Special Pizza (10")', price: 340, quantity: 1, category: 'Pizza' }],
      restaurantId: 'demo-merchant',
      gstSettings: { enabled: false, rate: 0, label: 'GST' },
    })
    expect(demoBill.pricing.taxes.totalTax).toBe(0)
    expect(demoBill.pricing.grandTotal).toBe(340)
  })

  it('applies exact configured custom GST rate when enabled', () => {
    const gst5 = calculateBillPreview({
      items: [{ name: 'Farmhouse Special Pizza (10")', price: 340, quantity: 1, category: 'Pizza' }],
      gstSettings: { enabled: true, rate: 5, label: 'GST' },
    })
    expect(gst5.pricing.taxes.cgst).toBe(8.5)
    expect(gst5.pricing.taxes.sgst).toBe(8.5)
    expect(gst5.pricing.taxes.totalTax).toBe(17)
    expect(gst5.pricing.grandTotal).toBe(357)

    const gst12 = calculateBillPreview({
      items: [{ name: 'Paneer Tikka', price: 500, quantity: 1, category: 'Starters' }],
      gstSettings: { enabled: true, rate: 12, label: 'GST' },
    })
    expect(gst12.pricing.taxes.cgst).toBe(30)
    expect(gst12.pricing.taxes.sgst).toBe(30)
    expect(gst12.pricing.taxes.totalTax).toBe(60)
    expect(gst12.pricing.grandTotal).toBe(560)
  })

  it('treats optional Express billing server as unconfigured unless VITE_API_URL is set', () => {
    expect(isBillingServerConfigured()).toBe(false)
  })

  it('rejects empty items, negative price, and >100% discount', () => {
    expect(() => calculateBillPreview({ items: [] })).toThrow()
    expect(() => calculateBillPreview({ items: [{ name: 'Bad', price: -50, quantity: 1 }] })).toThrow()
    expect(() => calculateBillPreview({ items: [{ name: 'Ok', price: 100, quantity: 1 }], discount: { type: 'PERCENT', value: 110 } })).toThrow()
  })

  it('createServerInvoice fails loudly when server returns 500 or network error (no fake INV-*)', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'Database offline' }),
    }))

    await expect(createServerInvoice({ restaurantId: VALID_RID, items: [] })).rejects.toThrow(/Database offline/)

    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    await expect(createServerInvoice({ restaurantId: VALID_RID, items: [] })).rejects.toThrow(/Invoice was NOT issued/)
  })

  it('settleInvoicePayment rejects zero/negative payment amounts and never fakes PAID on error', async () => {
    await expect(settleInvoicePayment({
      invoiceId: 'inv-1',
      restaurantId: VALID_RID,
      payments: [{ method: 'CASH', amount: 0 }],
    })).rejects.toThrow(/invalid amount/)

    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ success: false, error: 'Settlement rejected' }),
    }))
    await expect(settleInvoicePayment({
      invoiceId: 'inv-1',
      restaurantId: VALID_RID,
      payments: [{ method: 'CASH', amount: 150 }],
    })).rejects.toThrow(/Settlement rejected/)
  })
})

describe('Order Validation, Atomicity, State Machine & Demo Isolation (client/src/services/order.service.js)', () => {
  beforeEach(() => {
    mockDb.rpcHandler.mockReset()
    mockDb.currentOrderRow = { id: ORDER_UUID, status: 'PENDING', restaurant_id: VALID_RID, table_number: '1' }
  })

  it('rejects empty cart, invalid quantity, and negative item price upfront', async () => {
    await expect(createOrder({ restaurantId: VALID_RID, items: [] })).rejects.toThrow(/empty order/)
    await expect(createOrder({ restaurantId: VALID_RID, items: [{ name: 'Tea', price: 20, quantity: 0 }] })).rejects.toThrow(/Invalid quantity/)
    await expect(createOrder({ restaurantId: VALID_RID, items: [{ name: 'Tea', price: -5, quantity: 1 }] })).rejects.toThrow(/Invalid price/)
  })

  it('keeps demo-merchant orders isolated in sandbox mode without RPC calls', async () => {
    const order = await createOrder({
      restaurantId: 'demo-merchant',
      tableNumber: '4',
      items: [{ id: 'demo-item-1', name: 'Espresso', price: 120, quantity: 1 }],
    })
    expect(order.restaurant_id).toBe('demo-merchant')
    expect(order.payment_status).toBe('DEMO')
    expect(mockDb.rpcHandler).not.toHaveBeenCalled()
  })

  it('calls create_validated_order RPC and deduplicates rapid retries via idempotencyKey', async () => {
    mockDb.rpcHandler.mockResolvedValue({
      data: {
        order: {
          id: ORDER_UUID,
          restaurant_id: VALID_RID,
          table_number: '2',
          customer_name: 'Guest',
          status: 'PENDING',
          order_items: [{ menu_item_id: ITEM_UUID, quantity: 2, price: 140 }],
        },
      },
      error: null,
    })

    const payload = {
      restaurantId: VALID_RID,
      tableNumber: '2',
      idempotencyKey: `idem-${Date.now()}`,
      items: [{ id: ITEM_UUID, name: 'Veg Momos', price: 140, quantity: 2 }],
    }

    const first = await createOrder(payload)
    const retry = await createOrder(payload)
    expect(first.id).toBe(ORDER_UUID)
    expect(retry.id).toBe(ORDER_UUID)
    expect(mockDb.rpcHandler).toHaveBeenCalledTimes(1)
    expect(mockDb.rpcHandler).toHaveBeenCalledWith('create_validated_order', expect.objectContaining({
      p_restaurant_id: VALID_RID,
      p_idempotency_key: payload.idempotencyKey,
    }))
  })

  it('fails loudly when atomic RPC rejects out-of-stock orders (never fakes ord-*)', async () => {
    mockDb.rpcHandler.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'Item "Veg Momos" is out of stock' },
    })

    await expect(createOrder({
      restaurantId: VALID_RID,
      tableNumber: '3',
      items: [{ id: ITEM_UUID, name: 'Veg Momos', price: 140, quantity: 2 }],
    })).rejects.toThrow(/out of stock/)
  })

  it('enforces valid state machine transitions in updateOrderStatus', async () => {
    mockDb.currentOrderRow.status = 'PENDING'
    await expect(updateOrderStatus(ORDER_UUID, 'FINISHED')).rejects.toThrow(/Invalid order status transition/)

    mockDb.currentOrderRow.status = 'PENDING'
    const res = await updateOrderStatus(ORDER_UUID, 'PREPARING')
    expect(res.status).toBe('PREPARING')
  })
})

describe('Cloudinary Upload Hardening (client/src/services/cloudinary.service.js)', () => {
  beforeEach(() => {
    mockDb.user = { id: 'user-owner-1111' }
    mockDb.userError = null
  })

  it('rejects SVG, HTML, empty assets, and files larger than 5MB', () => {
    expect(() => validateImageAsset({ type: 'image/svg+xml', size: 1024 })).toThrow(/Unsupported file type/)
    expect(() => validateImageAsset({ type: 'text/html', size: 500 })).toThrow(/Unsupported file type/)
    expect(() => validateImageAsset({ type: 'image/png', size: 0 })).toThrow(/empty/)
    expect(() => validateImageAsset({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 })).toThrow(/exceeds maximum/)
    expect(() => validateImageAsset({ type: 'image/webp', size: 100_000 })).not.toThrow()
  })

  it('sanitizes folder paths against traversal and scopes to tenant UUID', () => {
    const clean = sanitizeFolderPath('../../etc/passwd?bad=1', VALID_RID)
    expect(clean.includes('..')).toBe(false)
    expect(clean.startsWith(`servora/tenants/${VALID_RID}/`)).toBe(true)
  })

  it('requires authentication when uploading for non-demo tenants', async () => {
    mockDb.user = null
    const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
    await expect(uploadToCloudinary(blob, 'menu_items', VALID_RID)).rejects.toThrow(/Authentication required/)
  })
})
