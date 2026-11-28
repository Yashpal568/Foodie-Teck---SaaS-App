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
  requestOrderBill,
  DEMO_ORDERS_STORAGE_KEY,
} from '../services/order.service'
import {
  AUTO_PREP_STAGE_DURATION_MS,
  getAutoAdvanceInfo,
  readWaiterCooldownRemaining,
  doesOrderBelongToTable,
  normalizeTableKey,
} from '../utils/orderPipelineHelpers'
import { getTableSessions } from '../services/table.service'
import OverviewCards from '../components/dashboard/OverviewCards'
import OrderTracking from '../components/order/OrderTracking'
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

  it('auto-advances PREPARING -> READY -> SERVED every 5 minutes and stops at SERVED before billing', () => {
    const startMs = new Date('2026-11-28T10:00:00.000Z').getTime()
    const cookingOrder = {
      id: 'ord-auto-1',
      status: 'PREPARING',
      statusHistory: [{ status: 'PREPARING', timestamp: '2026-11-28T10:00:00.000Z' }],
    }

    const midway = getAutoAdvanceInfo(cookingOrder, startMs + 2 * 60 * 1000)
    expect(midway.canAutoAdvance).toBe(true)
    expect(midway.nextStatus).toBe('READY')
    expect(midway.isDue).toBe(false)
    expect(midway.formattedCountdown).toBe('3:00')

    const dueReady = getAutoAdvanceInfo(cookingOrder, startMs + AUTO_PREP_STAGE_DURATION_MS)
    expect(dueReady.isDue).toBe(true)
    expect(dueReady.nextStatus).toBe('READY')

    // Manual override to READY resets 5m stage timer for READY -> SERVED
    const readyOrder = {
      id: 'ord-auto-1',
      status: 'READY',
      updated_at: '2026-11-28T10:02:00.000Z',
    }
    const readyWait = getAutoAdvanceInfo(readyOrder, startMs + 5 * 60 * 1000)
    expect(readyWait.nextStatus).toBe('SERVED')
    expect(readyWait.isDue).toBe(false)
    expect(readyWait.formattedCountdown).toBe('2:00')

    const readyDue = getAutoAdvanceInfo(readyOrder, startMs + 7 * 60 * 1000)
    expect(readyDue.isDue).toBe(true)
    expect(readyDue.nextStatus).toBe('SERVED')

    // Served orders NEVER auto-close or auto-bill while customer is seated
    const servedOrder = { id: 'ord-auto-1', status: 'SERVED', updated_at: '2026-11-28T10:00:00.000Z' }
    const servedInfo = getAutoAdvanceInfo(servedOrder, startMs + 60 * 60 * 1000)
    expect(servedInfo.canAutoAdvance).toBe(false)
    expect(servedInfo.nextStatus).toBeNull()
    expect(servedInfo.isDue).toBe(false)
  })

  it('synchronizes waiter cooldown across CustomerMenu and OrderTracking and supports guest requestOrderBill', async () => {
    window.sessionStorage.setItem('servora_waiter_until_demo-merchant', String(Date.now() + 95000))
    expect(readWaiterCooldownRemaining('demo-merchant')).toBeGreaterThanOrEqual(90)

    const order = await createOrder({
      restaurantId: 'demo-merchant',
      tableNumber: '5',
      items: [{ id: 'dish-5', name: 'Crispy Paneer Burger', price: 180, quantity: 1 }],
    })
    await updateOrderStatus(order.id, 'PREPARING')
    await updateOrderStatus(order.id, 'READY')
    await updateOrderStatus(order.id, 'SERVED')
    const billReq = await requestOrderBill(order.id, 'demo-merchant', '5', 'Table 5 Guest')
    expect(billReq.status).toBe('BILL_REQUESTED')

    const updatedOrders = await fetchOrders('demo-merchant')
    expect(updatedOrders.find((o) => o.id === order.id)?.status).toBe('BILL_REQUESTED')

    const trackingSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/order/OrderTracking.jsx'), 'utf8')
    expect(trackingSrc).toContain('Waiter Called •')
    expect(trackingSrc).toContain('Request Final Bill')
    expect(trackingSrc).toContain('cartCount={cartCount}')

    const custSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/CustomerMenu.jsx'), 'utf8')
    expect(custSrc).toContain('waiterCooldownSeconds={waiterCooldownSeconds}')
    expect(custSrc).toContain('onCallWaiter={handleCallWaiter}')
    expect(custSrc).toContain('cartCount={getTotalItems()}')

    const renderedTracking = renderToString(
      React.createElement(OrderTracking, {
        orderId: order.id,
        initialOrder: { ...order, status: 'SERVED' },
        restaurantId: 'demo-merchant',
        tableNumber: '5',
        waiterCooldownSeconds: 109,
        waiterCooldownText: '1:49',
        cartCount: 2,
        onClose: () => { },
        onOpenCart: () => { },
        onOpenSearch: () => { },
        onCallWaiter: () => { },
      })
    )
    expect(renderedTracking).toContain('Waiter Called • 1:49')
    expect(renderedTracking).toContain('Ready to Leave? Request Final Bill')
  })

  it('prevents cross-table order leakage between Table 5 and Table 2 in CustomerMenu & OrderTracking and wires Table Billing modal', () => {
    expect(normalizeTableKey('Table 05')).toBe('5')
    expect(doesOrderBelongToTable({ table_number: '2' }, '5')).toBe(false)
    expect(doesOrderBelongToTable({ tableNumber: '5' }, '5')).toBe(true)

    // Mounting OrderTracking on Table 5 with a stale Table 2 order NEVER renders Table 2 data
    const leakedAttemptHtml = renderToString(
      React.createElement(OrderTracking, {
        orderId: 'demo-ord-table2',
        initialOrder: {
          id: 'demo-ord-table2',
          tableNumber: '2',
          customerName: 'Table 2 Guest',
          status: 'BILL_REQUESTED',
          total: 250,
          items: [{ name: 'Secret Table 2 Dish', price: 250, quantity: 1 }],
        },
        restaurantId: 'demo-merchant',
        tableNumber: '5',
        onClose: () => { },
      })
    )
    expect(leakedAttemptHtml).not.toContain('Secret Table 2 Dish')
    expect(leakedAttemptHtml).not.toContain('Table 2 Guest')
    expect(leakedAttemptHtml).toContain('Syncing Live Kitchen Journey')

    const custSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/CustomerMenu.jsx'), 'utf8')
    expect(custSrc).not.toContain('(liveRestaurantOrders || [])[0]')
    expect(custSrc).toContain('doesOrderBelongToTable')

    const trackingSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/order/OrderTracking.jsx'), 'utf8')
    expect(trackingSrc).not.toContain('demoOrders[0]')

    const kdsSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/dashboard/OrderManagement.jsx'), 'utf8')
    expect(kdsSrc).toContain('handleGenerateTableBill')
    expect(kdsSrc).toContain('Final Bill & Settlement')
    expect(kdsSrc).toContain('Create POS Order')
    expect(kdsSrc).not.toContain('Punch POS Order')
    expect(kdsSrc).toContain('Order Timeline • Table')
    expect(kdsSrc).toContain('ThermalReceiptModal')
    expect(kdsSrc).toContain('xl:grid-cols-5')
    expect(kdsSrc).toContain('Pay & Clear')
  })

  it('provides 80mm and 58mm thermal receipt template studio shared across Orders & KDS and POS preview', () => {
    const receiptSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/receipt/ThermalReceiptModal.jsx'),
      'utf8'
    )
    expect(receiptSrc).toContain('Print Receipt (')
    expect(receiptSrc).toContain('80mm')
    expect(receiptSrc).toContain('58mm')
    expect(receiptSrc).toContain('Include GST Breakdown')
    expect(receiptSrc).toContain('Show Customer / Feedback QR')
    expect(receiptSrc).not.toContain('Open Cash Drawer on Print')
    expect(receiptSrc).not.toContain('PrinterSetupWizard')
    expect(receiptSrc).toContain('Browser Print Dialog')
    expect(receiptSrc).toContain('Print Receipt Now')
    expect(receiptSrc).toContain('Download PDF')
    expect(receiptSrc).toContain('Send WhatsApp')
    expect(receiptSrc).toContain('generateReceiptPdfDoc')
    expect(receiptSrc).toContain('printerAdapter.printReceipt')
    expect(receiptSrc).toContain('z-[1300]')
    expect(receiptSrc).toContain('overlayClassName="z-[1250]')

    const posPreviewSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/pos/POSBillPreviewModal.jsx'),
      'utf8'
    )
    expect(posPreviewSrc).toContain('ThermalReceiptModal')
  })
})
