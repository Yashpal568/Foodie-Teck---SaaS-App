import { supabase } from '../lib/supabase'
import { getRestaurantByEmail, ensureValidRestaurantUUID } from './restaurant.service'

/** Create a new order with its items in Supabase DB */
export const createOrder = async (orderData) => {
  let targetRid = orderData.restaurantId
  if (targetRid && targetRid.includes('@')) {
    const profile = await getRestaurantByEmail(targetRid)
    if (profile && profile.id) targetRid = profile.id
  }

  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  const validRestaurantId = isUUID(targetRid) ? targetRid : (await ensureValidRestaurantUUID(targetRid || 'demo-restaurant'))

  const lineItems = (orderData.items || []).map(item => {
    const rawId = item._id || item.id
    const itemPrice = Math.max(0, Number(item.price || 0))
    const itemQuantity = Math.max(1, Math.min(99, Number(item.quantity) || 1))
    return {
      menu_item_id: isUUID(rawId) ? rawId : null,
      name: String(item.name || 'Menu Item').slice(0, 100),
      price: itemPrice,
      quantity: itemQuantity
    }
  })

  const computedSubtotal = lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const gstRate = Math.max(0, Math.min(100, Number(orderData.gstRate || 0)))
  const computedTax = computedSubtotal * (gstRate / 100)
  const computedTotal = computedSubtotal + computedTax

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      restaurant_id: validRestaurantId,
      table_number: String(orderData.tableNumber || 'N/A'),
      customer_name: String(orderData.customerName || 'Guest Customer').slice(0, 100),
      status: 'PENDING',
      subtotal: computedSubtotal,
      tax: computedTax,
      total: computedTotal,
      gst_rate: gstRate,
      gst_label: orderData.gstLabel || 'GST',
      type: orderData.type || 'DINE-IN',
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error

  if (orderData.type !== 'TAKE-AWAY' && orderData.tableNumber) {
    try {
      await supabase
        .from('table_sessions')
        .update({ 
           status: 'occupied', 
           customers: orderData.guests || 1, 
           current_order_id: order.id,
           session_start: new Date().toISOString(),
           last_activity: new Date().toISOString()
        })
        .eq('restaurant_id', validRestaurantId)
        .eq('table_number', parseInt(orderData.tableNumber))
    } catch (e) {}
  }

  if (lineItems.length > 0) {
    const orderItemsPayload = lineItems.map(item => ({
      order_id: order.id,
      ...item
    }))
    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload)
    if (itemsError) console.error('Error inserting order items:', itemsError)
  }

  try {
    const itemsSummary = orderData.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Items'
    await supabase.from('notifications').insert({
      restaurant_id: validRestaurantId,
      type: 'new_order',
      title: '🔔 New Order Received',
      message: `Order #${order.id.slice(-6)} from Table ${orderData.tableNumber || '?'}: ${orderData.customerName || 'Guest'} (${itemsSummary})`,
      order_id: order.id,
      table_number: String(orderData.tableNumber || '?'),
      is_read: false,
      created_at: new Date().toISOString()
    })
  } catch (e) {}

  try {
    const customerName = orderData.customerName?.trim() || 'Guest Customer'
    if (customerName && customerName !== 'Guest Customer') {
      await supabase.from('customers').upsert({
        restaurant_id: validRestaurantId,
        name: customerName,
        last_visit: new Date().toISOString(),
      }, { onConflict: 'restaurant_id,name', ignoreDuplicates: false })
    }
  } catch (e) {}

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('servora_latest_order', JSON.stringify({
        ...order,
        restaurant_id: validRestaurantId,
        itemsCount: orderData.items?.length || 1,
        _broadcast_ts: Date.now()
      }))
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('servora_new_order', { detail: order }))
  }

  return order
}

export const fetchOrders = async (restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  let validId = restaurantId
  if (!isUUID(validId)) {
    validId = await ensureValidRestaurantUUID(restaurantId)
  }
  if (!validId || !isUUID(validId)) return []

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', validId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('fetchOrders query notice:', err)
    return []
  }
}

export const updateOrderStatus = async (orderId, status) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  
  if (!orderId || !isUUID(orderId)) {
    console.log(`Demo/Mock order status updated: ${orderId} -> ${status}`)
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', { detail: { orderId, status } }))
    return { id: orderId, status, updated_at: new Date().toISOString() }
  }

  const { data: order, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single()

  if (error) throw error

  if (order) {
    let tableStatus = null;
    if (status === 'PREPARING') tableStatus = 'occupied';
    if (status === 'READY') tableStatus = 'occupied';
    if (status === 'SERVED') tableStatus = 'occupied';
    if (status === 'BILL_REQUESTED') tableStatus = 'billing';
    if (status === 'FINISHED') tableStatus = 'available';

    if (tableStatus) {
       await supabase
        .from('table_sessions')
        .update({ 
           status: tableStatus,
           last_activity: new Date().toISOString(),
           ...(status === 'FINISHED' ? { 
              current_order_id: null, 
              customers: 0,
              session_start: null 
           } : {})
        })
        .eq('restaurant_id', order.restaurant_id)
        .eq('table_number', parseInt(order.table_number))
    }
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
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export const fetchTickets = async (restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  let validId = restaurantId
  if (!isUUID(validId)) {
    validId = await ensureValidRestaurantUUID(restaurantId)
  }
  if (!validId || !isUUID(validId)) return []

  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, ticket_replies(*)')
      .eq('restaurant_id', validId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    return []
  }
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

  await supabase
    .from('support_tickets')
    .update({ updated_at: new Date().toISOString(), status: senderRole === 'merchant' ? 'OPEN' : 'IN-PROGRESS' })
    .eq('id', ticketId)

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
