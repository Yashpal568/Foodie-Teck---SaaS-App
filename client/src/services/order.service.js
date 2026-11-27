import { supabase } from '../lib/supabase'
import { getRestaurantByEmail, ensureValidRestaurantUUID } from './restaurant.service'
import { updateTableStatus } from './table.service'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = (str) => typeof str === 'string' && UUID_REGEX.test(str)

export const VALID_ORDER_TRANSITIONS = {
  PENDING: ['PENDING', 'PREPARING', 'CANCELLED'],
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
    const demoOrder = {
      id: `demo-ord-${Date.now().toString(36)}`,
      restaurant_id: 'demo-merchant',
      table_number: String(orderData.tableNumber || orderData.table_number || '1'),
      customer_name: String(orderData.customerName || 'Guest Customer').slice(0, 100),
      status: orderData.status || 'PENDING',
      subtotal,
      tax,
      total,
      gst_rate: gstRate,
      gst_label: orderData.gstLabel || 'GST',
      type: String(orderData.type || orderData.order_type || 'DINE-IN'),
      payment_status: orderData.payment_status || 'DEMO',
      is_prepaid: Boolean(orderData.is_prepaid),
      created_at: new Date().toISOString(),
      order_items: validatedInputItems,
    }
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
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_validated_order', {
      p_restaurant_id: validRestaurantId,
      p_table_number: String(orderData.tableNumber || orderData.table_number || '1'),
      p_customer_name: String(orderData.customerName || orderData.customer_name || 'Guest Customer'),
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
      await supabase
        .from('table_sessions')
        .update({
          status: 'occupied',
          customers: orderData.guests || 1,
          current_order_id: insertedOrder.id,
          session_start: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        })
        .eq('restaurant_id', validRestaurantId)
        .eq('table_number', parseInt(orderData.tableNumber, 10))
        .then(({ error }) => {
          if (error) console.warn('Table session update warning:', error.message)
        })
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

  if (!orderId || !isUUID(orderId)) {
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', { detail: { orderId, status: normalizedNext } }))
    return { id: orderId, status: normalizedNext, updated_at: new Date().toISOString() }
  }

  const { data: currentOrder, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, restaurant_id, table_number')
    .eq('id', orderId)
    .single()

  if (fetchErr || !currentOrder) {
    throw new Error(fetchErr?.message || 'Order not found.')
  }

  const currentStatus = String(currentOrder.status || 'PENDING').toUpperCase()
  const allowedNext = VALID_ORDER_TRANSITIONS[currentStatus] || []
  if (!allowedNext.includes(normalizedNext)) {
    throw new Error(`Invalid order status transition from ${currentStatus} to ${normalizedNext}.`)
  }

  const { data: order, error } = await supabase
    .from('orders')
    .update({ status: normalizedNext, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    console.error('Supabase status update error:', error)
    throw error
  }

  if (order) {
    let tableStatus = null
    if (normalizedNext === 'PREPARING' || normalizedNext === 'READY' || normalizedNext === 'SERVED') {
      tableStatus = 'occupied'
    } else if (normalizedNext === 'BILL_REQUESTED') {
      tableStatus = 'billing'
    } else if (normalizedNext === 'FINISHED') {
      tableStatus = 'available'
    }

    if (tableStatus && order.table_number && order.restaurant_id) {
      const tNum = parseInt(String(order.table_number).replace(/\D/g, ''), 10) || 1
      await supabase
        .from('table_sessions')
        .update({
          status: tableStatus,
          last_activity: new Date().toISOString(),
          ...(normalizedNext === 'FINISHED'
            ? {
                current_order_id: null,
                customers: 0,
                session_start: null,
              }
            : {}),
        })
        .eq('restaurant_id', order.restaurant_id)
        .eq('table_number', tNum)
        .then(({ error: tableErr }) => {
          if (tableErr) console.warn('Table session sync warning:', tableErr.message)
        })
    }

    window.dispatchEvent(new CustomEvent('orderStatusUpdated', { detail: { orderId, status: normalizedNext } }))
  }
  return order
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
