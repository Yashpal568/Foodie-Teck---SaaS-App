import { describe, it, expect, vi, beforeEach } from 'vitest'

const RID_A = '3a10e567-9e10-4c27-aadd-64e84cd8694c'
const RID_B = '9b21f678-1111-4c27-aadd-64e84cd86999'

const mockState = {
  eqCalls: [],
  deletedIds: [],
  rowsByTenant: {
    [RID_A]: [
      { id: '11111111-1111-4111-8111-111111111111', restaurant_id: RID_A, type: 'new_order', title: 'Alpha Order', message: 'Table 1', is_read: false, created_at: new Date().toISOString() },
    ],
    [RID_B]: [
      { id: '22222222-2222-4222-8222-222222222222', restaurant_id: RID_B, type: 'waiter_call', title: 'Beta Waiter', message: 'Table 5', is_read: false, created_at: new Date().toISOString() },
    ],
  },
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => {
      const filters = {}
      let isDelete = false
      const chain = {
        select: () => chain,
        insert: (row) => ({ select: () => ({ single: async () => ({ data: { id: '33333333-3333-4333-8333-333333333333', ...row }, error: null }) }) }),
        update: () => chain,
        delete: () => { isDelete = true; return chain },
        eq: (k, v) => {
          filters[k] = v
          mockState.eqCalls.push([k, v])
          return chain
        },
        order: () => chain,
        limit: async () => ({
          data: mockState.rowsByTenant[filters.restaurant_id] || [],
          error: null,
        }),
        single: async () => ({ data: { id: filters.id, is_read: true }, error: null }),
        then: (resolve, reject) => {
          if (isDelete && filters.id) {
            mockState.deletedIds.push({ id: filters.id, restaurant_id: filters.restaurant_id })
          }
          return Promise.resolve({ data: [], error: null }).then(resolve, reject)
        },
      }
      return chain
    }),
  },
}))

vi.mock('@/services/restaurant.service', () => ({
  ensureValidRestaurantUUID: vi.fn(async (id) => id),
}))

vi.mock('@/lib/merchantAuth', () => ({
  assertMerchantOperational: vi.fn(async () => ({ status: 'Active' })),
}))

import {
  fetchNotifications,
  deleteNotification,
  clearNotifications,
} from '@/services/notification.service'

describe('Notification Per-Dashboard Isolation & Persistence', () => {
  beforeEach(() => {
    mockState.eqCalls = []
    mockState.deletedIds = []
  })

  it('fetches notifications strictly scoped to each restaurant UUID with zero leakage', async () => {
    const alpha = await fetchNotifications(RID_A)
    const beta = await fetchNotifications(RID_B)

    expect(alpha).toHaveLength(1)
    expect(alpha[0].restaurant_id).toBe(RID_A)
    expect(alpha[0].title).toBe('Alpha Order')

    expect(beta).toHaveLength(1)
    expect(beta[0].restaurant_id).toBe(RID_B)
    expect(beta[0].title).toBe('Beta Waiter')
  })

  it('scopes single-item dismiss and clear-all strictly by restaurant_id', async () => {
    const notifId = '11111111-1111-4111-8111-111111111111'
    await deleteNotification(notifId, RID_A)
    expect(mockState.deletedIds).toEqual([{ id: notifId, restaurant_id: RID_A }])

    await clearNotifications(RID_B)
    expect(mockState.eqCalls).toContainEqual(['restaurant_id', RID_B])
  })
})
