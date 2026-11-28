import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({})),
      send: vi.fn(async () => ({})),
    })),
    removeChannel: vi.fn(),
  },
}))

import {
  createOrder,
  fetchOrders,
  updateOrderStatus,
  DEMO_ORDERS_STORAGE_KEY,
} from '../services/order.service'
import { getTableSessions } from '../services/table.service'
import OverviewCards from '../components/dashboard/OverviewCards'
import fs from 'node:fs'
import path from 'node:path'

describe('Realtime Orders, Table 7 Occupancy & Pending Orders Card', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists new demo orders and marks Table 7 occupied in real time', async () => {
    const created = await createOrder({
      restaurantId: 'demo-merchant',
      tableNumber: '7',
      customerName: 'Test Diner',
      items: [{ id: 'dish-1', name: 'Paneer Tikka', price: 320, quantity: 2 }],
    })

    expect(created.id).toMatch(/^demo-ord-/)
    expect(created.table_number).toBe('7')

    const allOrders = await fetchOrders('demo-merchant')
    expect(allOrders.some((o) => o.id === created.id && o.table_number === '7')).toBe(true)

    const sessions = await getTableSessions('demo-merchant')
    const table7 = sessions.find((s) => Number(s.table_number) === 7)
    expect(table7).toBeTruthy()
    expect(table7.status).toBe('occupied')
    expect(table7.current_order_id).toBe(created.id)
  })

  it('updates demo order status persistently across KDS and tracking views without clearing other orders', async () => {
    const first = await createOrder({
      restaurantId: 'demo-merchant',
      tableNumber: '9',
      customerName: 'Stage Tester',
      items: [{ id: 'dish-2', name: 'Biryani', price: 360, quantity: 1 }],
    })

    await updateOrderStatus(first.id, 'PREPARING')
    let persisted = JSON.parse(window.localStorage.getItem(DEMO_ORDERS_STORAGE_KEY))
    let updated = persisted.find((o) => o.id === first.id)
    expect(updated.status).toBe('PREPARING')

    await updateOrderStatus(first.id, 'READY')
    await updateOrderStatus(first.id, 'SERVED')
    await updateOrderStatus(first.id, 'FINISHED')
    persisted = JSON.parse(window.localStorage.getItem(DEMO_ORDERS_STORAGE_KEY))
    updated = persisted.find((o) => o.id === first.id)
    expect(updated.status).toBe('FINISHED')

    const sessions = await getTableSessions('demo-merchant')
    const table9 = sessions.find((s) => Number(s.table_number) === 9)
    expect(table9.status).toBe('available')
  })

  it('places the Pending Orders KPI card directly between Today\'s Revenue and Active Tables and renders without crashing', () => {
    const overviewPath = path.resolve(process.cwd(), 'src/components/dashboard/OverviewCards.jsx')
    const src = fs.readFileSync(overviewPath, 'utf8')
    const revIdx = src.indexOf('Today\'s Revenue')
    const pendingIdx = src.indexOf('Pending Orders')
    const tablesIdx = src.indexOf('Active Tables')
    expect(revIdx).toBeGreaterThan(-1)
    expect(pendingIdx).toBeGreaterThan(revIdx)
    expect(tablesIdx).toBeGreaterThan(pendingIdx)

    const html = renderToString(React.createElement(OverviewCards, { restaurantId: 'demo-merchant' }))
    expect(html).toContain('Pending Orders')
    expect(html).toContain('Today&#x27;s Revenue')
    expect(html).toContain('Active Tables')
  })

  it('reconciles table occupancy dynamically from active orders in useTableSessions', () => {
    const hookPath = path.resolve(process.cwd(), 'src/hooks/useTableSessions.js')
    const src = fs.readFileSync(hookPath, 'utf8')
    expect(src).toContain('useOrderManagement')
    expect(src).toContain('activeByTable')
  })

  it('defaults unnamed orders cleanly to Table N Guest without random person names', async () => {
    const unnamedOrder = await createOrder({
      restaurantId: 'demo-merchant',
      tableNumber: '7',
      items: [{ id: 'dish-3', name: 'Paneer Roll', price: 180, quantity: 1 }],
    })
    expect(unnamedOrder.customer_name).toBe('Table 7 Guest')

    const allOrders = await fetchOrders('demo-merchant')
    expect(allOrders.some((o) => ['Vikram Singh', 'Priya Patel', 'Aarav Sharma'].includes(o.customer_name || o.customerName))).toBe(false)
  })

  it('transitions FINISHED orders in OrderTracking from Bill In Progress to Order Completed & Settled and fixes CustomerMenu storage handler', () => {
    const trackingSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/order/OrderTracking.jsx'), 'utf8')
    expect(trackingSrc).toContain("title: 'Order Completed & Settled'")
    expect(trackingSrc).toContain('if (isOrderFinished) return 5')
    expect(trackingSrc).toContain('!isOrderFinished && idx === currentStageIndex')

    const custSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/CustomerMenu.jsx'), 'utf8')
    const storageHandlerSlice = custSrc.slice(custSrc.indexOf('const handleStorage'))
    expect(storageHandlerSlice).not.toContain('servora_restaurant_logo_${resId}')
    expect(storageHandlerSlice).toContain('servora_restaurant_logo_${restaurantId}')
  })
})
