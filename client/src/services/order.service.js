import { supabase } from '../lib/supabase'
import { getRestaurantByEmail, ensureValidRestaurantUUID } from './restaurant.service'
import { updateTableStatus } from './table.service'
import { assertMerchantOperational } from '../lib/merchantAuth'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = (str) => typeof str === 'string' && UUID_REGEX.test(str)
export const DEMO_ORDERS_STORAGE_KEY = 'servora_demo_orders_v1'

const LEGACY_DEMO_NAME_MAP = {
  'demo-ord-101': 'Table 4 Guest',
  'demo-ord-102': 'Table 2 Guest',
  'demo-ord-103': 'Table 7 Guest',
}

const createDefaultDemoOrders = () => [
  {
    id: 'demo-ord-101',
    restaurant_id: 'demo-merchant',
    table_number: '4',
    tableNumber: '4',
    customer_name: 'Table 4 Guest',
    customerName: 'Table 4 Guest',
    order_items: [
      { name: 'Butter Chicken Grand', price: 420, quantity: 1 },
      { name: 'Garlic Butter Naan', price: 65, quantity: 2 },
      { name: 'Virgin Blue Mojito', price: 160, quantity: 2 },
    ],
    total: 770,
    subtotal: 770,
    tax: 0,
    status: 'PREPARING',
    created_at: new Date(Date.now() - 8 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
      { status: 'PREPARING', timestamp: new Date(Date.now() - 8 * 60000).toISOString() },
    ],
  },
  {
    id: 'demo-ord-102',
    restaurant_id: 'demo-merchant',
    table_number: '2',
    tableNumber: '2',
    customer_name: 'Table 2 Guest',
    customerName: 'Table 2 Guest',
    order_items: [
      { name: 'Paneer Tikka Charcoal', price: 340, quantity: 1 },
      { name: 'Dal Makhani Special', price: 290, quantity: 1 },
      { name: 'Jeera Rice Bowl', price: 180, quantity: 1 },
    ],
    total: 810,
    subtotal: 810,
    tax: 0,
    status: 'READY',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 18 * 60000).toISOString() },
      { status: 'PREPARING', timestamp: new Date(Date.now() - 15 * 60000).toISOString() },
      { status: 'READY', timestamp: new Date(Date.now() - 2 * 60000).toISOString() },
    ],
  },
  {
    id: 'demo-ord-103',
    restaurant_id: 'demo-merchant',
    table_number: '7',
    tableNumber: '7',
    customer_name: 'Table 7 Guest',
    customerName: 'Table 7 Guest',
    order_items: [
      { name: 'Dum Handi Biryani', price: 450, quantity: 2 },
      { name: 'Gulab Jamun with Rabri', price: 150, quantity: 2 },
    ],
    total: 1200,
    subtotal: 1200,
    tax: 0,
    status: 'PENDING',
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 2 * 60000).toISOString() },
    ],
  },
]

export const getDemoOrders = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(DEMO_ORDERS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          let migrated = false
          const cleaned = parsed.map((o) => {
            const replacement = LEGACY_DEMO_NAME_MAP[o?.id]
            if (replacement && ['Aarav Sharma', 'Priya Patel', 'Vikram Singh'].includes(o.customer_name || o.customerName)) {
              migrated = true
              return { ...o, customer_name: replacement, customerName: replacement }
            }
            return o
          })
          if (migrated) {
            window.localStorage.setItem(DEMO_ORDERS_STORAGE_KEY, JSON.stringify(cleaned))
          }
          return cleaned
        }
      }
      const defaults = createDefaultDemoOrders()
      window.localStorage.setItem(DEMO_ORDERS_STORAGE_KEY, JSON.stringify(defaults))
      return defaults
    }
  } catch {
    // ignore storage access issues
  }
  return createDefaultDemoOrders()
}

const saveDemoOrders = (orders) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DEMO_ORDERS_STORAGE_KEY, JSON.stringify(orders))
    }
  } catch {
    // ignore storage quota errors
  }
}

export const VALID_ORDER_TRANSITIONS = {
  PENDING: ['PENDING', 'ORDERED', 'PREPARING', 'CANCELLED'],
  ORDERED: ['ORDERED', 'PREPARING', 'CANCELLED'],
  PREPARING: ['PREPARING', 'READY', 'CANCELLED'],
  READY: ['READY', 'SERVED', 'CANCELLED'],
  SERVED: ['SERVED', 'BILL_REQUESTED', 'FINISHED'],
  BILL_REQUESTED: ['BILL_REQUESTED', 'FINISHED'],
  FINISHED: ['FINISHED'],
  FINISHED_CLOSED: ['FINISHED_CLOSED'],
  CANCELLED: ['CANCELLED'],
}

// Track recently processed client idempotency keys to prevent duplicate submits on rapid double-taps
const recentClientOrderKeys = new Map()
// Guard against concurrent duplicate status transitions (e.g., double-click on Cancel)
const inFlightStatusTransitions = new Map()
const restoredInventoryOrderIds = new Set()

/**
 * Restore ONLY finite (`quantity != null`) menu_items quantities when an order is cancelled.
 * Leaves unlimited (`quantity === null`) items untouched and preserves idempotency per orderId.
 */
export const restoreFiniteOrderInventory = async (order, restaurantId) => {
  if (!order?.id || restoredInventoryOrderIds.has(order.id) || order.inventory_restored === true) {
    return { restoredCount: 0, skippedReason: 'already_restored' }
  }
  const rid = restaurantId || order.restaurant_id
  const lines = Array.isArray(order.order_items)
    ? order.order_items
    : Array.isArray(order.items)
      ? order.items
      : []

  restoredInventoryOrderIds.add(order.id)
  let restoredCount = 0

  try {
    // Aggregate multiple order lines that reference the same menu_item_id (e.g. Full + Half)
    const qtyByMenuItemId = new Map()
    for (const line of lines) {
      const menuItemId = line?.menu_item_id || line?.id
      const qty = Number(line?.quantity || 0)
      if (!menuItemId || !isUUID(String(menuItemId)) || !Number.isFinite(qty) || qty <= 0) {
        continue
      }
      const key = String(menuItemId)
      qtyByMenuItemId.set(key, (qtyByMenuItemId.get(key) || 0) + qty)
    }

    for (const [menuItemId, qty] of qtyByMenuItemId.entries()) {
      const menuQuery = supabase.from('menu_items')
      if (typeof menuQuery?.select !== 'function') continue

      const { data: menuRow, error: fetchMenuErr } = await menuQuery
        .select('id, quantity, is_in_stock')
        .eq('id', menuItemId)
        .eq('restaurant_id', rid)
        .maybeSingle()

      if (fetchMenuErr || !menuRow) continue

      // Unlimited inventory (`quantity === null` or undefined): never increment or decrement
      if (menuRow.quantity === null || menuRow.quantity === undefined) {
        continue
      }

      const currentQty = Number(menuRow.quantity)
      if (!Number.isFinite(currentQty)) continue

      const nextQty = Math.max(0, currentQty) + qty
      await supabase
        .from('menu_items')
        .update({
          quantity: nextQty,
          is_in_stock: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', menuItemId)
        .eq('restaurant_id', rid)

      restoredCount += 1
    }

    return { restoredCount, skippedReason: null }
  } catch (err) {
    restoredInventoryOrderIds.delete(order.id)
    throw err
  }
}

const dispatchOrderBroadcasts = (orderBroadcastPayload, broadcastTargetId) => {
  try {
    localStorage.setItem('servora_latest_order', JSON.stringify(orderBroadcastPayload))
  } catch {
    // non-fatal browser storage error
  }

  try {
    const broadcastChannel = supabase.channel(`order-toasts:rid=${broadcastTargetId}`)
    broadcastChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        broadcastChannel
          .send({
            type: 'broadcast',
            event: 'new_order',
            payload: orderBroadcastPayload,
          })
          .then(() => {
            setTimeout(() => supabase.removeChannel(broadcastChannel), 500)
          })
      }
    })
  } catch {
    // non-fatal realtime broadcast notice
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('servora_orders_channel')
      channel.postMessage({ type: 'NEW_ORDER', payload: orderBroadcastPayload })
      setTimeout(() => channel.close(), 1000)
    }
  } catch {
    // non-fatal cross-tab channel notice
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('servora_new_order', { detail: orderBroadcastPayload }))
    window.dispatchEvent(new CustomEvent('newOrderCreated', { detail: orderBroadcastPayload }))
  }
}

const dispatchStatusBroadcasts = (orderId, status, extra = {}) => {
  const payload = { id: orderId, orderId, status, timestamp: Date.now(), ...extra }
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('servora_orders_channel')
      channel.postMessage({ type: 'ORDER_STATUS_UPDATED', payload })
      setTimeout(() => channel.close(), 1000)
    }
  } catch {
    // non-fatal cross-tab channel notice
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', { detail: payload }))
  }
}

/**
 * Create a new order atomically and idempotently in Supabase DB.
 * - Uses atomic RPC `create_validated_order` (authoritative DB pricing, stock row locking, single TX).
 * - Preserves isolated sandbox mode ONLY for `'demo-merchant'` / `'demo'`.
 * - NEVER fakes persisted orders when a real tenant DB write fails.
 */
export const createOrder = async (orderData) => {
  if (!orderData || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    throw new Error('Cannot submit an empty order. Please add at least one item.')
  }

  let targetRid = orderData.restaurantId
  const isDemo = targetRid === 'demo-merchant' || targetRid === 'demo'

  if (!isDemo && targetRid && targetRid.includes('@')) {
    const profile = await getRestaurantByEmail(targetRid)
    if (profile?.id) targetRid = profile.id
  }

  const validRestaurantId = isDemo
    ? null
    : isUUID(targetRid)
      ? targetRid
      : await ensureValidRestaurantUUID(targetRid)

  const idempotencyKey =
    orderData.idempotencyKey ||
    `ord_idem_${validRestaurantId || 'demo'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  if (recentClientOrderKeys.has(idempotencyKey)) {
    return recentClientOrderKeys.get(idempotencyKey)
  }

  // Validate line items & quantities strictly upfront
  const validatedInputItems = orderData.items.map((item, idx) => {
    const qty = Number(item.quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new Error(`Invalid quantity for item "${item.name || idx + 1}". Must be between 1 and 99.`)
    }
    const price = Number(item.price)
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid price for item "${item.name || idx + 1}".`)
    }
    const rawId = item._id || item.id || item.menu_item_id
    return {
      rawId,
      menu_item_id: isUUID(rawId) ? rawId : null,
      name: String(item.name || 'Menu Item').slice(0, 100),
      price: Number(price.toFixed(2)),
      quantity: qty,
      variant: String(item.variant || 'full').toLowerCase(),
    }
  })

  // Strictly Isolated Demo Sandbox
  if (isDemo) {
    const subtotal = Number(validatedInputItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2))
    const gstRate = Math.max(0, Math.min(100, Number(orderData.gstRate || 0)))
    const tax = Number((subtotal * (gstRate / 100)).toFixed(2))
    const total = Number((subtotal + tax).toFixed(2))
    const resolvedTableLabel = String(orderData.tableNumber || orderData.table_number || '1')
    const resolvedGuestName =
      String(orderData.customerName || orderData.customer_name || '').trim() ||
      `Table ${resolvedTableLabel} Guest`
    const demoOrder = {
      id: `demo-ord-${Date.now().toString(36)}`,
      restaurant_id: 'demo-merchant',
      table_number: resolvedTableLabel,
      customer_name: resolvedGuestName.slice(0, 100),
      status: orderData.status || 'PENDING',
      subtotal,
      tax,
      total,
      gst_rate: gstRate,
      gst_label: orderData.gstLabel || 'GST',
      type: String(orderData.type || orderData.order_type || 'DINE-IN'),
      payment_status: orderData.payment_status || 'DEMO',
      is_prepaid: Boolean(orderData.is_prepaid),
      notes: String(orderData.notes || orderData.specialInstructions || ''),
      guests: Number(orderData.guests || 1),
      created_at: new Date().toISOString(),
      order_items: validatedInputItems,
    }
    const existingDemo = getDemoOrders()
    saveDemoOrders([demoOrder, ...existingDemo.filter((o) => String(o.id) !== String(demoOrder.id))])

    if (demoOrder.type !== 'TAKE-AWAY' && demoOrder.table_number) {
      updateTableStatus('demo-merchant', demoOrder.table_number, {
        status: 'occupied',
        customers: Number(orderData.guests || 1),
        current_order_id: demoOrder.id,
        session_start: new Date().toISOString(),
      }).catch(() => {})
    }
    dispatchOrderBroadcasts({ ...demoOrder, tableNumber: demoOrder.table_number, customerName: demoOrder.customer_name, items: validatedInputItems }, 'demo-merchant')
    recentClientOrderKeys.set(idempotencyKey, demoOrder)
    return demoOrder
  }

  if (!validRestaurantId || !isUUID(validRestaurantId)) {
    throw new Error('Unable to verify target restaurant. Please rescan the restaurant QR code.')
  }

  const allItemsHaveUUID = validatedInputItems.every((i) => isUUID(i.menu_item_id))
  let persistedOrder = null

  // ── 1. Preferred Path: Atomic Database RPC (DB Prices + Stock Locking + Single TX) ──
  if (allItemsHaveUUID) {
    const rpcCustomerName =
      String(orderData.customerName || orderData.customer_name || '').trim() ||
      (orderData.tableNumber || orderData.table_number
        ? `Table ${orderData.tableNumber || orderData.table_number} Guest`
        : 'Guest Customer')
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_validated_order', {
      p_restaurant_id: validRestaurantId,
      p_table_number: String(orderData.tableNumber || orderData.table_number || '1'),
      p_customer_name: rpcCustomerName,
      p_order_type: String(orderData.type || orderData.order_type || 'DINE-IN'),
      p_items: validatedInputItems.map((i) => ({
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
        variant: i.variant,
      })),
      p_guests: Number(orderData.guests || 1),
      p_notes: String(orderData.notes || orderData.specialInstructions || ''),
      p_idempotency_key: idempotencyKey,
      p_initial_status: String(orderData.status || 'PENDING'),
      p_is_prepaid: Boolean(orderData.is_prepaid || orderData.payment_status === 'PAID'),
      p_payment_method: String(orderData.payment_method || ''),
    })

    if (!rpcError && rpcResult?.order) {
      persistedOrder = rpcResult.order
    } else if (rpcError && rpcError.code !== '42883' && rpcError.code !== 'PGRST202') {
      // Genuine validation/stock/RLS failure from DB — never mask with fallback!
      throw new Error(rpcError.message || 'Order rejected by server validation.')
    }
  }

  // ── 2. Compatibility Fallback ONLY if atomic RPC migration is not yet applied in Supabase ──
  if (!persistedOrder) {
    // Verify authoritative menu item prices & availability before inserting
    const menuIds = validatedInputItems.map((i) => i.menu_item_id).filter(Boolean)
    let dbMenuMap = new Map()
    if (menuIds.length > 0) {
      const { data: dbMenuRows, error: menuErr } = await supabase
        .from('menu_items')
        .select('id, name, price, half_price, quantity, is_in_stock')
        .eq('restaurant_id', validRestaurantId)
        .in('id', menuIds)
      if (menuErr) throw new Error(`Unable to validate menu catalog: ${menuErr.message}`)
      dbMenuMap = new Map((dbMenuRows || []).map((r) => [r.id, r]))
    }

    const authoritativeLines = validatedInputItems.map((item) => {
      if (item.menu_item_id) {
        const dbRow = dbMenuMap.get(item.menu_item_id)
        if (!dbRow) throw new Error(`Menu item "${item.name}" does not belong to this restaurant.`)
        if (dbRow.is_in_stock === false) throw new Error(`"${dbRow.name}" is currently out of stock.`)
        if (dbRow.quantity != null && dbRow.quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${dbRow.name}" (${dbRow.quantity} left).`)
        }
        const unitPrice = item.variant === 'half' && dbRow.half_price != null ? Number(dbRow.half_price) : Number(dbRow.price)
        return {
          menu_item_id: dbRow.id,
          name: dbRow.name,
          price: Number(unitPrice.toFixed(2)),
          quantity: item.quantity,
        }
      }
      return {
        menu_item_id: null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }
    })

    const subtotal = Number(authoritativeLines.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2))
    const gstRate = Math.max(0, Math.min(100, Number(orderData.gstRate || 0)))
    const tax = Number((subtotal * (gstRate / 100)).toFixed(2))
    const total = Number((subtotal + tax).toFixed(2))

    const isPrepaid = Boolean(orderData.is_prepaid || orderData.payment_status === 'PAID')
    const rawCustomer = String(orderData.customerName || orderData.customer_name || 'Guest Customer').replace(/\s*•\s*PAID/gi, '').trim() || 'Guest Customer'
    const customerNameFormatted = isPrepaid ? `${rawCustomer} • PAID` : rawCustomer
    const rawType = String(orderData.type || orderData.order_type || 'DINE-IN').replace(/\s*•\s*PAID/gi, '').trim() || 'DINE-IN'
    const typeFormatted = isPrepaid ? `${rawType} • PAID` : rawType

    const { data: insertedOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        restaurant_id: validRestaurantId,
        table_number: String(orderData.tableNumber || orderData.table_number || '1'),
        customer_name: customerNameFormatted.slice(0, 100),
        status: orderData.status || 'PENDING',
        subtotal,
        tax,
        total,
        gst_rate: gstRate,
        gst_label: orderData.gstLabel || 'GST',
        type: typeFormatted,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderErr || !insertedOrder) {
      throw new Error(orderErr?.message || 'Failed to persist order in database. Please try again.')
    }

    const orderItemsPayload = authoritativeLines.map((line) => ({
      order_id: insertedOrder.id,
      ...line,
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsPayload)
    if (itemsErr) {
      // Compensating rollback of orphan order header so partial writes never remain
      await supabase.from('orders').delete().eq('id', insertedOrder.id)
      throw new Error(`Order items failed to save (${itemsErr.message}). Order rolled back cleanly.`)
    }

    // Best-effort stock deduction guarded against negative stock
    for (const item of authoritativeLines) {
      if (item.menu_item_id) {
        const dbRow = dbMenuMap.get(item.menu_item_id)
        if (dbRow && dbRow.quantity !== null && dbRow.quantity !== undefined) {
          const newQty = Math.max(0, dbRow.quantity - item.quantity)
          await supabase
            .from('menu_items')
            .update({ quantity: newQty, is_in_stock: newQty > 0 })
            .eq('id', item.menu_item_id)
            .eq('restaurant_id', validRestaurantId)
            .gte('quantity', item.quantity)
        }
      }
    }

    if (orderData.type !== 'TAKE-AWAY' && orderData.tableNumber) {
      const parsedTable = parseInt(String(orderData.tableNumber).replace(/\D/g, ''), 10)
      if (Number.isInteger(parsedTable) && parsedTable > 0) {
        const { error: upsertErr } = await supabase
          .from('table_sessions')
          .upsert({
            restaurant_id: validRestaurantId,
            table_number: parsedTable,
            status: 'occupied',
            customers: orderData.guests || 1,
            current_order_id: insertedOrder.id,
            session_start: new Date().toISOString(),
            last_activity: new Date().toISOString(),
          }, { onConflict: 'restaurant_id, table_number' })
        if (upsertErr) {
          await supabase.rpc('claim_public_table_session', {
            p_restaurant_id: validRestaurantId,
            p_table_number: parsedTable,
          }).catch(() => {})
        }
      }
    }

    const itemsSummary = authoritativeLines.map((i) => `${i.quantity}x ${i.name}`).join(', ')
    await supabase
      .from('notifications')
      .insert({
        restaurant_id: validRestaurantId,
        type: 'new_order',
        title: '🔔 New Order Received',
        message: `Order #${insertedOrder.id.slice(-6)} from Table ${orderData.tableNumber || '?'}: ${customerNameFormatted} (${itemsSummary})`,
        order_id: insertedOrder.id,
        table_number: String(orderData.tableNumber || '?'),
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.warn('Notification log notice (non-fatal to order):', error.message)
      })

    persistedOrder = { ...insertedOrder, order_items: authoritativeLines }
  }

  recentClientOrderKeys.set(idempotencyKey, persistedOrder)
  if (recentClientOrderKeys.size > 100) {
    const oldest = recentClientOrderKeys.keys().next().value
    recentClientOrderKeys.delete(oldest)
  }

  const broadcastPayload = {
    ...persistedOrder,
    restaurant_id: validRestaurantId,
    tableNumber: String(persistedOrder.table_number || orderData.tableNumber || '1'),
    customerName: persistedOrder.customer_name || orderData.customerName || 'Guest Customer',
    items: persistedOrder.order_items || validatedInputItems,
    items_count: validatedInputItems.reduce((sum, i) => sum + i.quantity, 0),
    _timestamp: Date.now(),
  }
  dispatchOrderBroadcasts(broadcastPayload, validRestaurantId)

  return persistedOrder
}

export const fetchOrders = async (restaurantId) => {
  if (restaurantId === 'demo-merchant' || restaurantId === 'demo' || restaurantId === 'guest') {
    return getDemoOrders()
  }

  let validId = restaurantId
  if (!isUUID(validId)) {
    validId = await ensureValidRestaurantUUID(restaurantId)
  }
  if (!validId || !isUUID(validId)) return []

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('restaurant_id', validId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchOrders query error:', error)
    throw error
  }
  return data || []
}

export const updateOrderStatus = async (orderId, nextStatus) => {
  const normalizedNext = String(nextStatus || '').toUpperCase()
  if (!normalizedNext || !VALID_ORDER_TRANSITIONS[normalizedNext]) {
    throw new Error(`Invalid order status: "${nextStatus}".`)
  }

  const transitionKey = `${orderId}:${normalizedNext}`
  if (inFlightStatusTransitions.has(transitionKey)) {
    return inFlightStatusTransitions.get(transitionKey)
  }

  const runTransition = async () => {
    if (!orderId || !isUUID(orderId)) {
      const existingDemo = getDemoOrders()
      const currentTarget = existingDemo.find((o) => String(o.id) === String(orderId)) || null
      if (currentTarget) {
        const currentDemoStatus = String(currentTarget.status || 'PENDING').toUpperCase()
        if (currentDemoStatus === 'CANCELLED' && normalizedNext === 'CANCELLED') {
          return { ...currentTarget, alreadyCancelled: true }
        }
        const allowed = VALID_ORDER_TRANSITIONS[currentDemoStatus] || []
        if (!allowed.includes(normalizedNext)) {
          throw new Error(`Invalid order status transition from ${currentDemoStatus} to ${normalizedNext}.`)
        }
      }

      let targetOrder = currentTarget
      const updatedDemoList = existingDemo.map((o) => {
        if (String(o.id) !== String(orderId)) return o
        const markRestored = normalizedNext === 'CANCELLED' ? { inventory_restored: true } : {}
        targetOrder = {
          ...o,
          status: normalizedNext,
          ...markRestored,
          updated_at: new Date().toISOString(),
          statusHistory: [
            ...(Array.isArray(o.statusHistory) ? o.statusHistory : []),
            { status: normalizedNext, timestamp: new Date().toISOString() },
          ],
        }
        return targetOrder
      })
      saveDemoOrders(updatedDemoList)

      if (targetOrder && targetOrder.table_number) {
        const tNum = parseInt(String(targetOrder.table_number).replace(/\D/g, ''), 10)
        if (Number.isInteger(tNum) && tNum > 0) {
          const hasOtherOpenOrder = updatedDemoList.some(
            (o) =>
              String(o.id) !== String(orderId) &&
              parseInt(String(o.table_number || o.tableNumber || '').replace(/\D/g, ''), 10) === tNum &&
              !['FINISHED', 'FINISHED_CLOSED', 'CANCELLED'].includes(String(o.status || '').toUpperCase())
          )
          if (normalizedNext === 'BILL_REQUESTED') {
            updateTableStatus('demo-merchant', tNum, { status: 'billing' }).catch(() => {})
          } else if ((normalizedNext === 'FINISHED' || normalizedNext === 'CANCELLED') && !hasOtherOpenOrder) {
            updateTableStatus('demo-merchant', tNum, {
              status: 'available',
              current_order_id: null,
              customers: 0,
              session_start: null,
            }).catch(() => {})
          } else if (['PENDING', 'ORDERED', 'PREPARING', 'READY', 'SERVED'].includes(normalizedNext)) {
            updateTableStatus('demo-merchant', tNum, { status: 'occupied' }).catch(() => {})
          }
        }
      }

      dispatchStatusBroadcasts(orderId, normalizedNext, {
        restaurant_id: 'demo-merchant',
        table_number: targetOrder?.table_number || targetOrder?.tableNumber || '?',
      })
      return targetOrder || { id: orderId, status: normalizedNext, updated_at: new Date().toISOString() }
    }

    // 1. Atomic Postgres cancellation RPC (locks order & restores finite stock idempotently)
    if (normalizedNext === 'CANCELLED' && typeof supabase.rpc === 'function') {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('cancel_order_and_restore_inventory', {
        p_order_id: orderId,
      })

      if (!rpcErr && rpcData?.order) {
        restoredInventoryOrderIds.add(orderId)
        dispatchStatusBroadcasts(orderId, 'CANCELLED', {
          restaurant_id: rpcData.order.restaurant_id,
          table_number: rpcData.order.table_number,
        })
        return {
          ...rpcData.order,
          inventoryRestored: Boolean(rpcData.restored),
          alreadyCancelled: Boolean(rpcData.already_cancelled),
        }
      }

      if (rpcErr && rpcErr.code !== '42883' && rpcErr.code !== 'PGRST202') {
        throw new Error(rpcErr.message || 'Order cancellation rejected.')
      }
    }

    const { data: currentOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('id, status, restaurant_id, table_number, inventory_restored, order_items(*)')
      .eq('id', orderId)
      .single()

    if (fetchErr || !currentOrder) {
      throw new Error(fetchErr?.message || 'Order not found.')
    }

    await assertMerchantOperational(currentOrder.restaurant_id)

    const currentStatus = String(currentOrder.status || 'PENDING').toUpperCase()
    if (currentStatus === 'CANCELLED' && normalizedNext === 'CANCELLED') {
      // Idempotent repeat cancel: do not throw or restore inventory twice
      restoredInventoryOrderIds.add(orderId)
      return { ...currentOrder, alreadyCancelled: true, inventoryRestored: false }
    }

    const allowedNext = VALID_ORDER_TRANSITIONS[currentStatus] || []
    if (!allowedNext.includes(normalizedNext)) {
      throw new Error(`Invalid order status transition from ${currentStatus} to ${normalizedNext}.`)
    }

    const updatePayload = {
      status: normalizedNext,
      updated_at: new Date().toISOString(),
    }

    let orderQuery = supabase.from('orders').update(updatePayload).eq('id', orderId)
    if (normalizedNext === 'CANCELLED' && typeof orderQuery?.in === 'function') {
      // Atomic guard: only the winning concurrent caller transitions out of cancellable state
      orderQuery = orderQuery.in('status', ['PENDING', 'ORDERED', 'PREPARING', 'READY'])
    }

    const selectChain = orderQuery.select()
    const { data: order, error } =
      typeof selectChain?.maybeSingle === 'function'
        ? await selectChain.maybeSingle()
        : await selectChain.single()

    if (error) {
      console.error('Supabase status update error:', error)
      throw error
    }

    if (!order && normalizedNext === 'CANCELLED') {
      // Another concurrent cancellation won the race first; return idempotently without restoring again
      const { data: latestRow } = await supabase
        .from('orders')
        .select('id, status, restaurant_id, table_number')
        .eq('id', orderId)
        .single()
      return { ...(latestRow || currentOrder), alreadyCancelled: true, inventoryRestored: false }
    }

    let restoreResult = { restoredCount: 0 }
    if (normalizedNext === 'CANCELLED' && order) {
      restoreResult = await restoreFiniteOrderInventory(
        {
          ...currentOrder,
          ...order,
          order_items: currentOrder.order_items || order.order_items || [],
        },
        order.restaurant_id || currentOrder.restaurant_id
      )
    }

    if (order) {
      let tableStatus = null
      if (normalizedNext === 'PREPARING' || normalizedNext === 'READY' || normalizedNext === 'SERVED') {
        tableStatus = 'occupied'
      } else if (normalizedNext === 'BILL_REQUESTED') {
        tableStatus = 'billing'
      } else if (normalizedNext === 'FINISHED' || normalizedNext === 'CANCELLED') {
        tableStatus = 'available'
      }

      if (tableStatus && order.table_number && order.restaurant_id) {
        const tNum = parseInt(String(order.table_number).replace(/\D/g, ''), 10) || 1
        let skipTableReset = false
        if (tableStatus === 'available') {
          const otherOrdersChain = supabase
            .from('orders')
            .select('id, status, table_number')
            .eq('restaurant_id', order.restaurant_id)
          if (typeof otherOrdersChain?.neq === 'function') {
            const { data: otherRows } = await otherOrdersChain.neq('id', order.id)
            if (Array.isArray(otherRows)) {
              skipTableReset = otherRows.some((o2) => {
                const t2 = parseInt(String(o2.table_number || '').replace(/\D/g, ''), 10)
                const st2 = String(o2.status || '').toUpperCase()
                return t2 === tNum && !['FINISHED', 'FINISHED_CLOSED', 'CANCELLED'].includes(st2)
              })
            }
          }
        }

        if (!skipTableReset) {
          const tableApi = supabase.from('table_sessions')
          const clearSessionFields =
            normalizedNext === 'FINISHED' || normalizedNext === 'CANCELLED'
              ? {
                  current_order_id: null,
                  customers: 0,
                  session_start: null,
                }
              : {
                  current_order_id: order.id,
                }

          const syncCall =
            typeof tableApi?.upsert === 'function'
              ? tableApi.upsert(
                  {
                    restaurant_id: order.restaurant_id,
                    table_number: tNum,
                    status: tableStatus,
                    last_activity: new Date().toISOString(),
                    ...clearSessionFields,
                  },
                  { onConflict: 'restaurant_id, table_number' }
                )
              : tableApi
                  .update({
                    status: tableStatus,
                    last_activity: new Date().toISOString(),
                    ...clearSessionFields,
                  })
                  .eq('restaurant_id', order.restaurant_id)
                  .eq('table_number', tNum)

          await syncCall.then(({ error: tableErr }) => {
            if (tableErr) console.warn('Table session sync warning:', tableErr.message)
          })
        }
      }

      dispatchStatusBroadcasts(orderId, normalizedNext, {
        restaurant_id: order?.restaurant_id,
        table_number: order?.table_number,
      })
    }

    return normalizedNext === 'CANCELLED'
      ? { ...order, inventoryRestored: restoreResult.restoredCount > 0, alreadyCancelled: false }
      : order
  }

  const promise = runTransition().finally(() => {
    inFlightStatusTransitions.delete(transitionKey)
  })
  inFlightStatusTransitions.set(transitionKey, promise)
  return promise
}

export const createTicket = async (restaurantId, ticketData) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      restaurant_id: restaurantId,
      business_name: ticketData.businessName,
      subject: ticketData.subject,
      description: ticketData.description,
      category: ticketData.category || 'General',
      priority: ticketData.priority || 'MEDIUM',
      status: 'OPEN',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export const fetchTickets = async (restaurantId) => {
  let validId = restaurantId
  if (!isUUID(validId)) {
    validId = await ensureValidRestaurantUUID(restaurantId)
  }
  if (!validId || !isUUID(validId)) return []

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, ticket_replies(*)')
    .eq('restaurant_id', validId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const fetchAllTickets = async () => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, ticket_replies(*), restaurants(business_name, email)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const addTicketReply = async (ticketId, message, senderRole = 'merchant') => {
  const { data, error } = await supabase
    .from('ticket_replies')
    .insert({ ticket_id: ticketId, message, sender_role: senderRole })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateTicketStatus = async (ticketId, status) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .select()
    .single()
  if (error) throw error
  return data
}
