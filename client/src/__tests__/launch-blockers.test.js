import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const state = vi.hoisted(() => ({
  user: { id: 'owner-user-1' },
  userError: null,
  session: null,
  restaurants: {},
  orders: {},
  menuItems: {},
  tableSessions: {},
  rpcCalls: [],
  fromCalls: [],
  rpcMode: 'missing', // 'missing' | 'ok' | 'public_opt'
  menuUpdateCalls: 0,
}))

vi.mock('@/lib/supabase', () => {
  const makeBuilder = (table) => {
    const ctx = {
      table,
      op: null,
      patch: null,
      filters: [],
      inFilters: [],
      neqFilters: [],
    }

    const applyFilters = (rows) =>
      rows.filter((r) => {
        for (const [k, v] of ctx.filters) {
          if (String(r[k]) !== String(v)) return false
        }
        for (const [k, list] of ctx.inFilters) {
          if (!list.includes(String(r[k]).toUpperCase())) return false
        }
        for (const [k, v] of ctx.neqFilters) {
          if (String(r[k]) === String(v)) return false
        }
        return true
      })

    const execute = () => {
      state.fromCalls.push({ table, op: ctx.op || 'select' })
      if (table === 'restaurants') {
        const list = Object.values(state.restaurants)
        const matched = applyFilters(list)
        return { data: matched, error: null }
      }

      if (table === 'orders') {
        if (ctx.op === 'update') {
          const matched = applyFilters(Object.values(state.orders))
          const updated = matched.map((row) => {
            const next = { ...row, ...ctx.patch }
            state.orders[row.id] = next
            return next
          })
          return { data: updated, error: null }
        }
        const matched = applyFilters(Object.values(state.orders))
        return { data: matched, error: null }
      }

      if (table === 'menu_items') {
        if (ctx.op === 'update') {
          state.menuUpdateCalls += 1
          const matched = applyFilters(Object.values(state.menuItems))
          const updated = matched.map((row) => {
            const next = { ...row, ...ctx.patch }
            state.menuItems[row.id] = next
            return next
          })
          return { data: updated, error: null }
        }
        const matched = applyFilters(Object.values(state.menuItems))
        return { data: matched, error: null }
      }

      if (table === 'table_sessions') {
        if (ctx.op === 'upsert' || ctx.op === 'update') {
          const row = ctx.patch
          const key = `${row.restaurant_id}:${row.table_number}`
          state.tableSessions[key] = { ...(state.tableSessions[key] || {}), ...row }
          return { data: state.tableSessions[key], error: null }
        }
        return { data: applyFilters(Object.values(state.tableSessions)), error: null }
      }

      return { data: [], error: null }
    }

    const chain = {
      select: () => chain,
      update: (patch) => {
        ctx.op = 'update'
        ctx.patch = patch
        return chain
      },
      upsert: (payload) => {
        ctx.op = 'upsert'
        ctx.patch = payload
        return chain
      },
      eq: (k, v) => {
        ctx.filters.push([k, v])
        return chain
      },
      in: (k, arr) => {
        ctx.inFilters.push([k, arr.map((x) => String(x).toUpperCase())])
        return chain
      },
      neq: (k, v) => {
        ctx.neqFilters.push([k, v])
        return chain
      },
      order: () => chain,
      single: async () => {
        const res = execute()
        const row = Array.isArray(res.data) ? res.data[0] || null : res.data
        return { data: row, error: row ? null : { message: 'Not found' } }
      },
      maybeSingle: async () => {
        const res = execute()
        const row = Array.isArray(res.data) ? res.data[0] || null : res.data
        return { data: row, error: null }
      },
      then: (resolve, reject) => Promise.resolve(execute()).then(resolve, reject),
    }

    return chain
  }

  return {
    supabase: {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: state.user },
          error: state.userError,
        })),
        getSession: vi.fn(async () => ({ data: { session: state.session } })),
      },
      rpc: vi.fn(async (name, params) => {
        state.rpcCalls.push({ name, params })
        if (state.rpcMode === 'public_opt') {
          if (name === 'get_public_restaurant_profile') {
            const row = state.restaurants[params.p_restaurant_id]
            return { data: row ? [row] : [], error: null }
          }
          if (name === 'get_public_menu_bootstrap') {
            const r = state.restaurants[params.p_restaurant_id] || null
            const items = Object.values(state.menuItems).filter((m) => m.restaurant_id === params.p_restaurant_id)
            const tables = Object.values(state.tableSessions)
              .filter((t) => t.restaurant_id === params.p_restaurant_id)
              .map((t) => ({ table_number: t.table_number, status: t.status }))
            return {
              data: {
                profile: r,
                menu_items: items,
                gst: { enabled: true, rate: 5, label: 'GST', gstin: r?.gstin || '' },
                tables,
              },
              error: null,
            }
          }
          if (name === 'get_public_table_numbers') {
            const tables = Object.values(state.tableSessions)
              .filter((t) => t.restaurant_id === params.p_restaurant_id)
              .map((t) => ({ table_number: t.table_number }))
            return { data: tables, error: null }
          }
          if (name === 'claim_public_table_session') {
            return { data: null, error: null }
          }
        }
        if (state.rpcMode === 'missing') {
          return { data: null, error: { code: '42883', message: 'function does not exist' } }
        }
        return {
          data: {
            order: { id: params.p_order_id, status: 'CANCELLED', inventory_restored: true, restaurant_id: '3a10e567-9e10-4c27-aadd-64e84cd8694c', table_number: '3' },
            restored: true,
            already_cancelled: false,
          },
          error: null,
        }
      }),
      from: vi.fn((table) => makeBuilder(table)),
    },
  }
})

import {
  computeAnalyticsSummary,
  computeCustomDateRangeStats,
  computeRevenueTrend,
  computeHourlyPeakData,
  computeMenuEngineeringItems,
  computeCategoryVelocity,
  filterOrdersByDate,
  shiftLocalDateKey,
  formatLocalDateKey,
} from '@/utils/analyticsHelpers'
import { updateOrderStatus } from '@/services/order.service'
import { updateMenuItem, syncCategories, fetchPublicMenuBootstrap, clearPublicMenuCache } from '@/services/menu.service'
import { updateRestaurantProfile, getRestaurantProfile, clearPublicProfileCache } from '@/services/restaurant.service'
import { saveGstSettings } from '@/services/admin.service'
import { syncTableSession, acknowledgeAllWaiterCalls, getTableSessions, updateTableStatus } from '@/services/table.service'
import { markAllNotificationsRead } from '@/services/notification.service'
import { verifyMerchantAccess, assertMerchantOperational } from '@/lib/merchantAuth'

const RID_A = '3a10e567-9e10-4c27-aadd-64e84cd8694c'
const ITEM_FINITE = '11111111-1111-4111-8111-111111111111'
const ITEM_FINITE_B = '33333333-3333-4333-8333-333333333333'
const ITEM_UNLIMITED = '22222222-2222-4222-8222-222222222222'
const ORDER_1 = '99999999-9999-4999-8999-999999999991'
const ORDER_2 = '99999999-9999-4999-8999-999999999992'
const ORDER_3 = '99999999-9999-4999-8999-999999999993'
const ORDER_MULTI = '99999999-9999-4999-8999-999999999994'

describe('1. Analytics CANCELLED Exclusion & No Hardcoded Tenant Fallback', () => {
  it('excludes CANCELLED orders from revenue, AOV, hourly peaks, trends, and custom date ranges', () => {
    const now = new Date()
    const todayIso = now.toISOString()

    const active = [
      { id: '1', status: 'PREPARING', total: 400, created_at: todayIso },
    ]
    const history = [
      { id: '2', status: 'FINISHED', total: 600, created_at: todayIso },
      { id: '3', status: 'CANCELLED', total: 5000, created_at: todayIso },
    ]

    const summary = computeAnalyticsSummary({
      orders: active,
      orderHistory: history,
      timeRange: '7days',
      nowMs: now.getTime(),
    })
    expect(summary.totalRevenue).toBe(1000)
    expect(summary.totalOrders).toBe(2)
    expect(summary.avgOrderValue).toBe(500)

    const trend = computeRevenueTrend([...active, ...history], '7days', now)
    const todayPoint = trend[trend.length - 1]
    expect(todayPoint.revenue).toBe(1000)
    expect(todayPoint.orders).toBe(2)

    const peaks = computeHourlyPeakData([...active, ...history])
    expect(peaks.reduce((s, p) => s + p.revenue, 0)).toBe(1000)

    const todayStr = now.toLocaleDateString('en-CA')
    const custom = computeCustomDateRangeStats(history, todayStr, todayStr)
    expect(custom.revenue).toBe(600)
    expect(custom.orders).toBe(1)

    const yestDate = new Date(now)
    yestDate.setDate(yestDate.getDate() - 1)
    const yestKey = formatLocalDateKey(yestDate)
    expect(shiftLocalDateKey(todayStr, -1)).toBe(yestKey)

    const mixedDates = [
      ...active,
      ...history,
      { id: 'y1', status: 'FINISHED', total: 1250, created_at: yestDate.toISOString() },
      { id: 'y1', status: 'FINISHED', total: 1250, created_at: yestDate.toISOString() },
      { id: 'y2', status: 'CANCELLED', total: 900, created_at: yestDate.toISOString() },
    ]
    const yestSummary = computeAnalyticsSummary({
      orders: mixedDates,
      timeRange: 'yesterday',
      nowMs: now.getTime(),
    })
    expect(yestSummary.totalRevenue).toBe(1250)
    expect(yestSummary.totalOrders).toBe(1)

    const customDateSummary = computeAnalyticsSummary({
      orders: mixedDates,
      timeRange: 'custom_date',
      selectedDate: yestKey,
      nowMs: now.getTime(),
    })
    expect(customDateSummary.totalRevenue).toBe(1250)
    expect(filterOrdersByDate(mixedDates, yestKey)).toHaveLength(2)

    const yestHourlyTrend = computeRevenueTrend(mixedDates, 'yesterday', now)
    expect(yestHourlyTrend.reduce((s, p) => s + p.revenue, 0)).toBe(1250)
  })

  it('computes Menu Engineering rankings & category velocity strictly from real orders (no static seeding)', () => {
    const menuItems = [
      { id: 'm1', name: 'Crispy Kurkure Paneer', category: 'Starters', price: 240 },
      { id: 'm2', name: 'Garlic Butter Naan', category: 'Breads & Rice', price: 65 },
      { id: 'm3', name: 'Gulab Jamun', category: 'Desserts', price: 180 },
    ]

    // 0 orders -> must NOT fabricate 1 sold / 4 views
    expect(computeMenuEngineeringItems({ billableOrders: [], menuItems, sortBy: 'orders' })).toEqual([])
    expect(computeMenuEngineeringItems({ billableOrders: [], menuItems, sortBy: 'revenue' })).toEqual([])

    const orders = [
      {
        id: 'o1',
        status: 'FINISHED',
        items: [
          { menu_item_id: 'm1', name: 'Crispy Kurkure Paneer', price: 240, quantity: 1 },
          { menu_item_id: 'm2', name: 'Garlic Butter Naan', price: 65, quantity: 3 },
        ],
      },
      {
        id: 'o2',
        status: 'CANCELLED',
        items: [{ menu_item_id: 'm3', name: 'Gulab Jamun', price: 180, quantity: 10 }],
      },
    ]

    const byOrders = computeMenuEngineeringItems({ billableOrders: orders, menuItems, sortBy: 'orders' })
    expect(byOrders.map((x) => x.item.name)).toEqual(['Garlic Butter Naan', 'Crispy Kurkure Paneer'])
    expect(byOrders[0].count).toBe(3)
    expect(byOrders[0].percentage).toBe('75.0')

    const byRevenue = computeMenuEngineeringItems({ billableOrders: orders, menuItems, sortBy: 'revenue' })
    expect(byRevenue.map((x) => x.item.name)).toEqual(['Crispy Kurkure Paneer', 'Garlic Butter Naan'])
    expect(byRevenue[0].revenue).toBe(240)

    const catVel = computeCategoryVelocity({ billableOrders: orders, menuItems })
    expect(catVel.totalOrders).toBe(4)
    expect(catVel.totalRevenue).toBe(435)
    expect(catVel.categories.find((c) => c.category === 'Desserts')?.orders).toBe(0)
  })

  it('removes hardcoded tigerbistro99@gmail.com fallback from AnalyticsDashboard', () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/components/dashboard/AnalyticsDashboard.jsx'), 'utf8')
    expect(src.toLowerCase()).not.toContain('tigerbistro99@gmail.com')
  })
})

describe('2. Cancellation Inventory Restoration (Finite vs Unlimited, Concurrent & Idempotent)', () => {
  beforeEach(() => {
    state.rpcMode = 'missing'
    state.rpcCalls = []
    state.menuUpdateCalls = 0
    state.restaurants = {
      [RID_A]: { id: RID_A, owner_id: 'owner-user-1', status: 'Active', business_name: 'Cafe Alpha' },
    }
    state.menuItems = {
      [ITEM_FINITE]: { id: ITEM_FINITE, restaurant_id: RID_A, name: 'Paneer Bowl', quantity: 3, is_in_stock: true },
      [ITEM_FINITE_B]: { id: ITEM_FINITE_B, restaurant_id: RID_A, name: 'Dal Fry', quantity: 0, is_in_stock: false },
      [ITEM_UNLIMITED]: { id: ITEM_UNLIMITED, restaurant_id: RID_A, name: 'Filter Coffee', quantity: null, is_in_stock: true },
    }
    state.tableSessions = {
      [`${RID_A}:5`]: { restaurant_id: RID_A, table_number: 5, status: 'occupied', current_order_id: ORDER_1 },
    }
    state.orders = {
      [ORDER_1]: {
        id: ORDER_1,
        restaurant_id: RID_A,
        table_number: '5',
        status: 'PREPARING',
        inventory_restored: false,
        order_items: [
          { menu_item_id: ITEM_FINITE, quantity: 2 },
          { menu_item_id: ITEM_UNLIMITED, quantity: 4 },
        ],
      },
      [ORDER_2]: {
        id: ORDER_2,
        restaurant_id: RID_A,
        table_number: '5',
        status: 'PENDING',
        inventory_restored: false,
        order_items: [{ menu_item_id: ITEM_FINITE, quantity: 1 }],
      },
      [ORDER_3]: {
        id: ORDER_3,
        restaurant_id: RID_A,
        table_number: '8',
        status: 'PENDING',
        inventory_restored: false,
        order_items: [{ menu_item_id: ITEM_FINITE, quantity: 2 }],
      },
    }
  })

  it('restores finite stock once while ignoring unlimited/null stock and keeping active multi-order table occupied', async () => {
    // Cancel ORDER_1 while ORDER_2 is still active on Table 5
    const res1 = await updateOrderStatus(ORDER_1, 'CANCELLED')
    expect(res1.status).toBe('CANCELLED')
    expect(res1.inventoryRestored).toBe(true)

    // Finite item increased 3 + 2 = 5; unlimited/null item remains null
    expect(state.menuItems[ITEM_FINITE].quantity).toBe(5)
    expect(state.menuItems[ITEM_UNLIMITED].quantity).toBeNull()
    expect(state.menuUpdateCalls).toBe(1)

    // Table 5 must remain occupied because ORDER_2 is still PENDING
    expect(state.tableSessions[`${RID_A}:5`].status).toBe('occupied')

    // Idempotent second cancel must NOT restore stock twice
    const res2 = await updateOrderStatus(ORDER_1, 'CANCELLED')
    expect(res2.alreadyCancelled).toBe(true)
    expect(res2.inventoryRestored).toBe(false)
    expect(state.menuItems[ITEM_FINITE].quantity).toBe(5)
    expect(state.menuUpdateCalls).toBe(1)
  })

  it('deduplicates concurrent simultaneous cancellations cleanly without double-restoration', async () => {
    const [a, b] = await Promise.all([
      updateOrderStatus(ORDER_3, 'CANCELLED'),
      updateOrderStatus(ORDER_3, 'CANCELLED'),
    ])
    expect(a.status).toBe('CANCELLED')
    expect(b.status).toBe('CANCELLED')
    expect(state.menuItems[ITEM_FINITE].quantity).toBe(5) // 3 + 2 once, NEVER 7!
    expect(state.menuUpdateCalls).toBe(1)
    expect(state.tableSessions[`${RID_A}:8`].status).toBe('available')
  })

  it('uses atomic DB RPC cancel_order_and_restore_inventory when deployed', async () => {
    state.rpcMode = 'ok'
    const res = await updateOrderStatus('99999999-9999-4999-8999-999999999999', 'CANCELLED')
    expect(res.status).toBe('CANCELLED')
    expect(state.rpcCalls[0]?.name).toBe('cancel_order_and_restore_inventory')
  })

  it('aggregates duplicate menu_item_id variants and multiple finite items in one cancelled order', async () => {
    state.orders[ORDER_MULTI] = {
      id: ORDER_MULTI,
      restaurant_id: RID_A,
      table_number: '6',
      status: 'ORDERED',
      inventory_restored: false,
      order_items: [
        { menu_item_id: ITEM_FINITE, quantity: 1, variant: 'full' },
        { menu_item_id: ITEM_FINITE, quantity: 2, variant: 'half' },
        { menu_item_id: ITEM_FINITE_B, quantity: 3, variant: 'full' },
        { menu_item_id: ITEM_UNLIMITED, quantity: 5, variant: 'full' },
      ],
    }

    const res = await updateOrderStatus(ORDER_MULTI, 'CANCELLED')
    expect(res.status).toBe('CANCELLED')
    expect(res.inventoryRestored).toBe(true)
    expect(state.menuItems[ITEM_FINITE].quantity).toBe(6) // 3 + (1 + 2)
    expect(state.menuItems[ITEM_FINITE_B].quantity).toBe(3) // 0 + 3, flipped back in stock
    expect(state.menuItems[ITEM_FINITE_B].is_in_stock).toBe(true)
    expect(state.menuItems[ITEM_UNLIMITED].quantity).toBeNull()
    expect(state.menuUpdateCalls).toBe(2) // one aggregated update per distinct finite item
  })
})

describe('3. Suspension Enforcement & POS Safety Wiring', () => {
  beforeEach(() => {
    state.restaurants = {
      [RID_A]: { id: RID_A, owner_id: 'owner-user-1', status: 'Suspended', business_name: 'Suspended Bistro' },
      ['4a10e567-9e10-4c27-aadd-64e84cd8694d']: {
        id: '4a10e567-9e10-4c27-aadd-64e84cd8694d',
        owner_id: 'owner-user-1',
        status: 'Active',
        business_name: 'Active Bistro',
      },
    }
    state.orders = {
      [ORDER_1]: { id: ORDER_1, restaurant_id: RID_A, table_number: '2', status: 'PENDING', order_items: [] },
    }
  })

  it('identifies suspended vs active merchants and blocks suspended workspace mutations across all services', async () => {
    const suspendedAccess = await verifyMerchantAccess(RID_A)
    expect(suspendedAccess.authorized).toBe(true)
    expect(suspendedAccess.isSuspended).toBe(true)

    await expect(assertMerchantOperational(RID_A)).rejects.toThrow(/suspended/i)
    await expect(updateMenuItem(ITEM_FINITE, { name: 'X', price: 10, category: 'Starters' }, RID_A)).rejects.toThrow(/suspended/i)
    await expect(syncCategories(RID_A, ['Starters'])).rejects.toThrow(/suspended/i)
    await expect(updateRestaurantProfile(RID_A, { name: 'Hacked' })).rejects.toThrow(/suspended/i)
    await expect(saveGstSettings(RID_A, { enabled: true, rate: 5, label: 'GST' })).rejects.toThrow(/suspended/i)
    await expect(syncTableSession(RID_A, { tableNumber: 1, status: 'available' })).rejects.toThrow(/suspended/i)
    await expect(acknowledgeAllWaiterCalls(RID_A)).rejects.toThrow(/suspended/i)
    await expect(markAllNotificationsRead(RID_A)).rejects.toThrow(/suspended/i)
    await expect(updateOrderStatus(ORDER_1, 'PREPARING')).rejects.toThrow(/suspended/i)

    const activeRid = '4a10e567-9e10-4c27-aadd-64e84cd8694d'
    const activeAccess = await verifyMerchantAccess(activeRid)
    expect(activeAccess.isSuspended).toBe(false)
    await expect(assertMerchantOperational(activeRid)).resolves.toEqual({ allowed: true, suspended: false })
  })

  it('wires setIsSuspended in Dashboard.jsx and removes fake POS fallback menu for real tenants', () => {
    const dashSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Dashboard.jsx'), 'utf8')
    expect(dashSrc).not.toContain('_setIsSuspended')
    expect(dashSrc).toContain('setIsSuspended(accountSuspended)')
    expect(dashSrc).toContain('suspendedSubView === "support"')

    const posSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/pos/POSTerminal.jsx'), 'utf8')
    expect(posSrc).toContain('else if (isDemoMode)')
  })
})

describe('4. Scale Test 2.0 Phase 1 Public Read & Table Lifecycle Optimizations', () => {
  beforeEach(() => {
    state.session = null
    state.rpcCalls = []
    state.fromCalls = []
    state.rpcMode = 'public_opt'
    clearPublicProfileCache()
    clearPublicMenuCache()
    state.restaurants = {
      [RID_A]: {
        id: RID_A,
        business_name: 'Spice Villa',
        status: 'Active',
        logo_url: '',
        cover_url: '',
        description: 'North Indian',
        gstin: '27ABCDE1234F1Z5',
      },
    }
    state.menuItems = {
      [ITEM_FINITE]: { id: ITEM_FINITE, restaurant_id: RID_A, name: 'Paneer Tikka', price: 220, half_price: 130, quantity: 3, is_in_stock: true, category: 'Starters' },
      [ITEM_UNLIMITED]: { id: ITEM_UNLIMITED, restaurant_id: RID_A, name: 'Masala Chai', price: 40, half_price: null, quantity: null, is_in_stock: true, category: 'Beverages' },
    }
    state.tableSessions = {
      [`${RID_A}:4`]: { restaurant_id: RID_A, table_number: 4, status: 'occupied' },
      [`${RID_A}:5`]: { restaurant_id: RID_A, table_number: 5, status: 'available' },
    }
  })

  it('routes anonymous guest profile, table list, and occupied claim directly to public RPCs without direct table queries', async () => {
    const profile = await getRestaurantProfile(RID_A)
    expect(profile?.business_name).toBe('Spice Villa')

    const tables = await getTableSessions(RID_A)
    expect(tables).toHaveLength(2)

    const claimed = await updateTableStatus(RID_A, 5, { status: 'occupied' })
    expect(claimed?.status).toBe('occupied')

    expect(state.fromCalls).toHaveLength(0)
    expect(state.rpcCalls.map((c) => c.name)).toEqual([
      'get_public_restaurant_profile',
      'get_public_table_numbers',
      'claim_public_table_session',
    ])
  })

  it('consolidates profile, menu, gst, and table statuses via fetchPublicMenuBootstrap and falls back safely on 42883', async () => {
    const boot = await fetchPublicMenuBootstrap(RID_A)
    expect(boot?.profile?.business_name).toBe('Spice Villa')
    expect(boot?.menuItems).toHaveLength(2)
    expect(boot?.menuItems.find((i) => i.id === ITEM_FINITE)?.quantity).toBe(3)
    expect(boot?.menuItems.find((i) => i.id === ITEM_UNLIMITED)?.quantity).toBeNull()
    expect(boot?.gst?.rate).toBe(5)
    expect(boot?.tables.find((t) => t.table_number === 4)?.status).toBe('occupied')
    expect(state.rpcCalls).toHaveLength(1)
    expect(state.fromCalls).toHaveLength(0)

    // Graceful fallback when RPC is missing
    clearPublicMenuCache()
    state.rpcCalls = []
    state.fromCalls = []
    state.rpcMode = 'missing'
    const fallback = await fetchPublicMenuBootstrap(RID_A)
    expect(fallback?.menuItems).toHaveLength(2)
    expect(state.fromCalls.some((f) => f.table === 'menu_items')).toBe(true)
  })

  it('verifies Phase 1 migration keeps conditional claim_public_table_session and recommended indexes without dropping subscribed Realtime tables', () => {
    const migSql = fs.readFileSync(
      path.resolve(process.cwd(), '../supabase/migrations/20261128000001_scale2_phase1_indexes_and_rpc_opt.sql'),
      'utf8'
    )
    expect(migSql).toContain('idx_menu_items_restaurant_created_at')
    expect(migSql).toContain('idx_order_items_menu_item_id')
    expect(migSql).toContain('idx_customers_restaurant_id')
    expect(migSql).toContain('idx_payment_verifications_restaurant_id')
    expect(migSql).toContain('idx_table_sessions_restaurant_status')
    expect(migSql).toContain("WHERE LOWER(COALESCE(public.table_sessions.status, 'available')) IN ('available', 'needs-cleaning')")
    expect(migSql).toContain('CREATE OR REPLACE FUNCTION public.get_public_menu_bootstrap')
    expect(migSql).not.toContain('ALTER PUBLICATION supabase_realtime DROP TABLE')
  })
})
