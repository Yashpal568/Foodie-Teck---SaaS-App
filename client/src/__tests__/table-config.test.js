import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockState = {
  existingSessions: [],
  qrUpsertCalls: [],
  qrDeleteFilters: [],
  sessionUpsertCalls: [],
  sessionDeleteFilters: [],
  upsertError: null,
  rpcCalls: [],
  rpcError: null,
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(async (fnName, params) => {
      mockState.rpcCalls.push({ fnName, params })
      if (mockState.rpcError) {
        return { data: null, error: mockState.rpcError }
      }
      return { data: null, error: null }
    }),
    from: vi.fn((table) => {
      const filters = []
      let op = 'select'
      let payload = null

      const chain = {
        select: () => chain,
        eq: (col, val) => {
          filters.push({ op: 'eq', col, val })
          return chain
        },
        gt: (col, val) => {
          filters.push({ op: 'gt', col, val })
          return chain
        },
        order: () => chain,
        upsert: (rows) => {
          op = 'upsert'
          payload = rows
          if (table === 'qr_codes') mockState.qrUpsertCalls.push(rows)
          if (table === 'table_sessions') mockState.sessionUpsertCalls.push(rows)
          return chain
        },
        delete: () => {
          op = 'delete'
          return chain
        },
        single: async () => {
          if (mockState.upsertError) {
            return { data: null, error: mockState.upsertError }
          }
          return { data: Array.isArray(payload) ? payload[0] : payload, error: null }
        },
        then: (resolve, reject) => {
          if (table === 'qr_codes' && op === 'delete') {
            mockState.qrDeleteFilters.push(filters)
          }
          if (table === 'table_sessions' && op === 'delete') {
            mockState.sessionDeleteFilters.push(filters)
          }
          if (table === 'table_sessions' && op === 'select') {
            return Promise.resolve({ data: mockState.existingSessions, error: null }).then(resolve, reject)
          }
          return Promise.resolve({ data: payload, error: null }).then(resolve, reject)
        },
      }
      return chain
    }),
  },
}))

vi.mock('@/services/restaurant.service', () => ({
  ensureValidRestaurantUUID: vi.fn(async (id) => id),
}))

import {
  getTableSessions,
  updateTableStatus,
  configureRestaurantTables,
} from '@/services/table.service'

const VALID_RID = '3a10e567-9e10-4c27-aadd-64e84cd8694c'

describe('Restaurant Table Configuration & Session Connection (table.service.js)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockState.existingSessions = []
    mockState.qrUpsertCalls = []
    mockState.qrDeleteFilters = []
    mockState.sessionUpsertCalls = []
    mockState.sessionDeleteFilters = []
    mockState.upsertError = null
    mockState.rpcCalls = []
    mockState.rpcError = null
  })

  it('creates N tables in demo mode, preserves occupied tables across resize, and syncs updates', async () => {
    const events = []
    const onUpdate = (e) => events.push(e.detail)
    window.addEventListener('tableSessionsUpdated', onUpdate)

    // Initial 8 default demo tables have tables 1 and 3 occupied
    const configuredSix = await configureRestaurantTables('demo-merchant', 6)
    expect(configuredSix).toHaveLength(6)
    expect(configuredSix.find((t) => t.table_number === 1)?.status).toBe('occupied')
    expect(configuredSix.find((t) => t.table_number === 3)?.status).toBe('occupied')
    expect(configuredSix.find((t) => t.table_number === 6)?.status).toBe('available')

    // Grow to 10 tables without losing occupied state on table 1 & 3
    const grown = await configureRestaurantTables('demo-merchant', 10)
    expect(grown).toHaveLength(10)
    expect(grown.find((t) => t.table_number === 1)?.status).toBe('occupied')

    // Claim table 2 for a dine-in guest
    const claimed = await updateTableStatus('demo-merchant', 2, { status: 'occupied', customers: 3 })
    expect(claimed?.status).toBe('occupied')
    expect(claimed?.customers).toBe(3)

    const liveSessions = await getTableSessions('demo-merchant')
    expect(liveSessions.find((t) => t.table_number === 2)?.status).toBe('occupied')
    expect(events.length).toBeGreaterThanOrEqual(3)

    window.removeEventListener('tableSessionsUpdated', onUpdate)
  })

  it('configures Universal QR + missing table_sessions rows without wiping active sessions in Supabase mode', async () => {
    mockState.existingSessions = [
      { restaurant_id: VALID_RID, table_number: 2, status: 'occupied', customers: 4 },
    ]

    const result = await configureRestaurantTables(VALID_RID, 5)
    expect(mockState.qrUpsertCalls).toHaveLength(1)
    expect(mockState.qrUpsertCalls[0]).toHaveLength(5)
    expect(mockState.qrUpsertCalls[0][0].url).toContain(`/menu?restaurant=${VALID_RID}&sig=`)

    // Only missing tables (1, 3, 4, 5) inserted as available; active Table 2 untouched!
    expect(mockState.sessionUpsertCalls).toHaveLength(1)
    expect(mockState.sessionUpsertCalls[0].map((r) => r.table_number)).toEqual([1, 3, 4, 5])

    // Excess delete filter only deletes available tables > 5
    expect(mockState.sessionDeleteFilters[0]).toEqual([
      { op: 'eq', col: 'restaurant_id', val: VALID_RID },
      { op: 'gt', col: 'table_number', val: 5 },
      { op: 'eq', col: 'status', val: 'available' },
    ])
    expect(result).toEqual(mockState.existingSessions)
  })

  it('routes unauthenticated QR customer table claims through claim_public_table_session RPC on RLS denial', async () => {
    mockState.upsertError = { code: '42501', message: 'new row violates row-level security policy' }

    const res = await updateTableStatus(VALID_RID, 4, { status: 'occupied' })
    expect(res).toEqual({
      restaurant_id: VALID_RID,
      table_number: 4,
      status: 'occupied',
    })
    expect(mockState.rpcCalls).toEqual([
      {
        fnName: 'claim_public_table_session',
        params: { p_restaurant_id: VALID_RID, p_table_number: 4 },
      },
    ])
  })

  it('throws loudly if both direct write and RPC claim fail', async () => {
    mockState.upsertError = { code: '42501', message: 'rls blocked' }
    mockState.rpcError = { code: 'P0001', message: 'Table not available' }

    await expect(updateTableStatus(VALID_RID, 4, { status: 'occupied' })).rejects.toMatchObject({
      code: '42501',
    })
  })
})
