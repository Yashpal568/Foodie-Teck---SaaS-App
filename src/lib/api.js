/**
 * SERVORA — Supabase API Service Layer
 * Centralizes all DB interactions. Drop-in replacement for localStorage ops.
 */
import { supabase } from './supabase'
export { supabase }

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Get the current logged-in user's restaurant ID from Supabase session */
export const getMyRestaurant = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  return data
}

/** Update restaurant profile */
export const updateRestaurantProfile = async (restaurantId, profileData) => {
  const { data, error } = await supabase
    .from('restaurants')
    .update({
      business_name: profileData.business_name || profileData.name,
      address: profileData.address,
      phone: profileData.phone,
      description: profileData.description,
      logo_url: profileData.logo_url || profileData.avatar,
      cover_url: profileData.cover_url || profileData.cover,
      updated_at: new Date().toISOString(),
    })
    .eq('id', restaurantId)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Find a restaurant profile by email (Legacy Bridge) */
export const getRestaurantByEmail = async (email) => {
  if (!email || !email.includes('@')) return null
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()
  return data
}

/** Legacy LocalStorage Cache (Now removed for DB-First Auth) */
export const getCachedRestaurantId = () => {
  return null
}


// ═══════════════════════════════════════════════════════════════
// MENU ITEMS
// ═══════════════════════════════════════════════════════════════

/** Fetch all menu items for the current restaurant */
export const fetchMenuItems = async (restaurantId) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true })

  if (error) throw error
  // Normalize field names to match existing UI expectations
  return (data || []).map(normalizeMenuItem)
}

/** Create a new menu item */
export const createMenuItem = async (restaurantId, itemData) => {
  const payload = {
    restaurant_id: restaurantId,
    name: itemData.name,
    description: itemData.description || '',
    price: Number(itemData.price),
    category: itemData.category,
    type: itemData.type || 'VEG',
    is_in_stock: itemData.isInStock ?? true,
    photo_url: itemData.photo || null,
  }

  const { data, error } = await supabase
    .from('menu_items')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return normalizeMenuItem(data)
}

/** Update an existing menu item */
export const updateMenuItem = async (itemId, itemData) => {
  const payload = {
    name: itemData.name,
    description: itemData.description || '',
    price: Number(itemData.price),
    category: itemData.category,
    type: itemData.type || 'VEG',
    is_in_stock: itemData.isInStock ?? true,
    photo_url: itemData.photo || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('menu_items')
    .update(payload)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return normalizeMenuItem(data)
}

/** Toggle stock status */
export const toggleMenuItemStock = async (itemId, isInStock) => {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_in_stock: isInStock, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return normalizeMenuItem(data)
}

/** Delete a menu item */
export const deleteMenuItem = async (itemId) => {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
  return true
}

/** Bulk replace all menu items (for import/template) */
/** Record a manual price change to audit_logs for real-time history tracking */
export const recordPriceChange = async (restaurantId, itemName, oldPrice, newPrice, itemId) => {
  const { error } = await supabase
    .from('audit_logs')
    .insert([{
      action: `PRICE_UPDATE | ${itemName} | ${oldPrice} | ${newPrice} | ${itemId || ''}`,
      type: 'MENU_CHANGE',
      actor: 'system',
      restaurant_id: restaurantId, // Using the correct UUID column
      severity: 'NOMINAL'
    }])

  if (error) console.error('Price change log error:', error)
}

/** Fetch Price History Analytics from BOTH sales data and manual audit logs */
export const fetchPriceHistory = async (restaurantId) => {
  // 1. Fetch sales history from order_items
  const { data: salesData, error: salesError } = await supabase
    .from('order_items')
    .select('name, price, menu_item_id, orders!inner(created_at, restaurant_id)')
    .eq('orders.restaurant_id', restaurantId)

  // 2. Fetch manual updates from audit_logs
  const { data: logData, error: logError } = await supabase
    .from('audit_logs')
    .select('action, created_at')
    .eq('restaurant_id', restaurantId) // Correct column check
    .eq('type', 'MENU_CHANGE')
    .like('action', 'PRICE_UPDATE%')

  if (salesError) throw salesError
  if (logError) throw logError

  const historyMap = {}

  // Process Sales Data
  salesData?.forEach(item => {
    const key = item.menu_item_id || item.name
    if (!historyMap[key]) historyMap[key] = { itemName: item.name, changes: [] }
    
    // @ts-ignore
    const date = item.orders?.created_at || (Array.isArray(item.orders) && item.orders[0]?.created_at)
    historyMap[key].changes.push({ date, price: item.price, type: 'sale' })
  })

  // Process Manual Logs Data
  logData?.forEach(log => {
    // action: "PRICE_UPDATE | Name | Old | New | Id"
    const parts = log.action.split(' | ')
    if (parts.length >= 4) {
      const name = parts[1]
      const oldPrice = parseFloat(parts[2])
      const newPrice = parseFloat(parts[3])
      const key = parts[4] || name

      if (!historyMap[key]) historyMap[key] = { itemName: name, changes: [] }
      historyMap[key].changes.push({ date: log.created_at, price: newPrice, oldPrice: oldPrice, type: 'setting' })
    }
  })

  // Unified Merge & Sort & Process for UI
  Object.values(historyMap).forEach(item => {
    // Sort chronologically
    const sorted = item.changes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const processed = []
    
    for (let i = 0; i < sorted.length; i++) {
       const current = sorted[i]
       const prev = sorted[i-1]
       
       // For 'setting' type, we already have oldPrice. For 'sale', calculate from previous state.
       const oldPrice = current.type === 'setting' ? current.oldPrice : (prev ? prev.price : current.price)
       
       // Only add change if price actually changed
       if (current.price !== oldPrice) {
         processed.unshift({
            date: current.date,
            oldPrice: oldPrice,
            newPrice: current.price,
            change: current.price - oldPrice,
            changePercent: oldPrice !== 0 ? ((current.price - oldPrice) / oldPrice * 100).toFixed(2) : "0.00",
            isSale: current.type === 'sale'
         })
       }
    }
    item.changes = processed // Newest first
  })

  return historyMap
}

export const bulkAddMenuItems = async (restaurantId, items) => {
  if (!items || items.length === 0) return []

  const payloads = items.map(item => ({
    restaurant_id: restaurantId,
    name: item.name,
    description: item.description || '',
    price: Number(item.price),
    category: item.category,
    type: item.type || 'VEG',
    is_in_stock: item.isInStock ?? true,
    photo_url: item.photo || null,
  }))

  const { data, error } = await supabase
    .from('menu_items')
    .insert(payloads)
    .select()

  if (error) throw error
  return (data || []).map(normalizeMenuItem)
}

export const bulkReplaceMenuItems = async (restaurantId, items) => {
  // Delete all existing items for this restaurant
  await supabase.from('menu_items').delete().eq('restaurant_id', restaurantId)
  return bulkAddMenuItems(restaurantId, items)
}

/** Normalizes DB snake_case → camelCase used in the UI */
const normalizeMenuItem = (item) => ({
  _id: item.id,
  id: item.id,
  name: item.name,
  description: item.description,
  price: item.price,
  category: item.category,
  type: item.type,
  isInStock: item.is_in_stock,
  photo: item.photo_url,
  restaurantId: item.restaurant_id,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
})


// ═══════════════════════════════════════════════════════════════
// GST SETTINGS
// ═══════════════════════════════════════════════════════════════

/** Fetch GST settings for a restaurant */
export const fetchGstSettings = async (restaurantId) => {
  const { data } = await supabase
    .from('gst_settings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  return data || { enabled: false, rate: 0, label: 'GST' }
}

/** Save GST settings */
export const saveGstSettings = async (restaurantId, gstData) => {
  const { error } = await supabase
    .from('gst_settings')
    .upsert({
      restaurant_id: restaurantId,
      enabled: gstData.enabled,
      rate: Number(gstData.rate) || 0,
      label: gstData.label || 'GST',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'restaurant_id' })

  if (error) throw error
  return true
}


// ═══════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════

/** Create a new order with its items */
export const createOrder = async (orderData) => {
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      restaurant_id: orderData.restaurantId,
      table_number: String(orderData.tableNumber),
      customer_name: orderData.customerName || 'Guest',
      status: 'PENDING',
      subtotal: orderData.subtotal,
      tax: orderData.tax || 0,
      total: orderData.total,
      gst_rate: orderData.gstRate || 0,
      gst_label: orderData.gstLabel || 'GST',
      type: orderData.type || 'DINE-IN',
    })
    .select()
    .single()

  if (error) throw error

  // atomic sync to table session
  if (orderData.type !== 'TAKE-AWAY') {
     await supabase
      .from('table_sessions')
      .update({ 
         status: 'occupied', 
         customers: orderData.guests || 1, 
         current_order_id: order.id,
         session_start: new Date().toISOString(),
         last_activity: new Date().toISOString()
      })
      .eq('restaurant_id', orderData.restaurantId)
      .eq('table_number', parseInt(orderData.tableNumber))
  }

  // Insert order line items
  if (orderData.items && orderData.items.length > 0) {
    const lineItems = orderData.items.map(item => ({
      order_id: order.id,
      menu_item_id: item._id || item.id || null,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(lineItems)

    if (itemsError) console.error('Error inserting order items:', itemsError)
  }

  return order
}

/** Fetch all orders for a restaurant */
export const fetchOrders = async (restaurantId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const updateOrderStatus = async (orderId, status) => {
  const { data: order, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single()

  if (error) throw error

  // Sync back to table_sessions for certain states
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
           // If finished, reset fields
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


// ═══════════════════════════════════════════════════════════════
// SUPPORT TICKETS
// ═══════════════════════════════════════════════════════════════

/** Create a new support ticket */
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
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Fetch all tickets for a restaurant */
export const fetchTickets = async (restaurantId) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, ticket_replies(*)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/** Fetch ALL tickets (admin view) */
export const fetchAllTickets = async () => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, ticket_replies(*), restaurants(business_name, email)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/** Add a reply to a ticket */
export const addTicketReply = async (ticketId, message, senderRole = 'merchant') => {
  const { data, error } = await supabase
    .from('ticket_replies')
    .insert({ ticket_id: ticketId, message, sender_role: senderRole })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Update ticket status */
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


// ═══════════════════════════════════════════════════════════════
// ADMIN — Merchants & Revenue
// ═══════════════════════════════════════════════════════════════

/** Fetch all restaurants (admin) */
export const fetchAllRestaurants = async () => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, subscriptions(plan_name, status, price)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/** Fetch revenue stats (admin) */
export const fetchRevenueStats = async () => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('total, created_at, restaurant_id')
    .order('created_at', { ascending: false })

  if (error) throw error
  return orders || []
}


// ─── Menu Categories ───────────────────────────────────────────────────────

/** Get all categories for a restaurant */
export const getCategories = async (restaurantId) => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true })
  
  if (error) throw error
  return data
}

/** Sync categories from local to cloud */
export const syncCategories = async (restaurantId, categoryNames) => {
  const { error } = await supabase
    .from('menu_categories')
    .upsert(
      categoryNames.map((name, index) => ({
        restaurant_id: restaurantId,
        name,
        order_index: index
      })),
      { onConflict: 'restaurant_id, name' }
    )
  
  if (error) throw error
}

/** Get all menu items by ID directly */
export const getMenuItems = async (restaurantId) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
  
  if (error) throw error
  return data
}

// ─── Floor Plan & QRs ──────────────────────────────────────────────────────

/** Get floor plan (tables) */
export const getTableSessions = async (restaurantId) => {
  const { data, error } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('table_number', { ascending: true })
  
  if (error) throw error
  return data
}

/** Update Table Status (Resilient Upsert) */
export const updateTableStatus = async (restaurantId, tableNumber, updates) => {
  const { data, error } = await supabase
    .from('table_sessions')
    .upsert({
      restaurant_id: restaurantId,
      table_number: parseInt(tableNumber),
      ...updates,
      last_activity: new Date().toISOString()
    }, { onConflict: 'restaurant_id, table_number' })
    .select()
    .single()
  
  if (error) throw error
  return data
}

/** 🛎️ Request Waiter Service */
export const requestWaiter = async (restaurantId, tableNumber, customerName = 'Guest') => {
  const { data, error } = await supabase
    .from('waiter_calls')
    .insert({
      restaurant_id: restaurantId,
      table_number: String(tableNumber),
      customer_name: customerName,
      is_handled: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Sync Table Session Record */
export const syncTableSession = async (restaurant_id, tableData) => {
  const { data, error } = await supabase
    .from('table_sessions')
    .upsert({
      restaurant_id,
      table_number: parseInt(tableData.tableNumber),
      status: tableData.status || 'available',
      customers: tableData.customers || 0,
      current_order_id: tableData.currentOrder,
      session_start: tableData.sessionStart,
      last_activity: new Date().toISOString()
    }, { onConflict: 'restaurant_id, table_number' })
    .select()
    .single()
  
  if (error) throw error
  return data
}

/** Get QR Codes */
export const getQRCodes = async (restaurantId) => {
  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('table_number', { ascending: true })
  
  if (error) throw error
  return data
}

/** Bulk Save QR Codes (Cloud Sync) */
export const bulkSaveQRCodes = async (restaurantId, qrCodes) => {
  if (!qrCodes || qrCodes.length === 0) return
  
  // 1. Sync QR Codes
  const qrPayloads = qrCodes.map(qr => ({
    restaurant_id: restaurantId,
    table_number: parseInt(qr.tableNumber),
    url: qr.url,
    created_at: qr.generatedAt || new Date().toISOString()
  }))

  const { error: qrError } = await supabase
    .from('qr_codes')
    .upsert(qrPayloads, { onConflict: 'restaurant_id, table_number' })

  if (qrError) throw qrError

  // 2. Initialize Table Sessions (Ensures Dashboard/Floor plan visibility)
  const sessionPayloads = qrCodes.map(qr => ({
    restaurant_id: restaurantId,
    table_number: parseInt(qr.tableNumber),
    status: 'available',
    last_activity: new Date().toISOString()
  }))

  const { error: sessionError } = await supabase
    .from('table_sessions')
    .upsert(sessionPayloads, { onConflict: 'restaurant_id, table_number' })

  if (sessionError) throw sessionError

  return true
}

// ─── CRM (Customers) ────────────────────────────────────────────────────────

/** Sync Customer from Order */
export const syncCustomerFromOrder = async (restaurantId, customerData) => {
  const { data, error } = await supabase
    .from('customers')
    .upsert({
      restaurant_id: restaurantId,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      last_visit: new Date().toISOString()
    }, { onConflict: 'restaurant_id, email' })
    .select()
    .single()
  
  if (error) throw error
  return data
}

/** Get All Customers */
export const getCustomers = async (restaurantId) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurantId)
  
  if (error) throw error
  return data
}
