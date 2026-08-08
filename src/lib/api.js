/**
 * SERVORA — Supabase API Service Layer
 * Centralizes all DB interactions. Drop-in replacement for offline ops.
 */
import { supabase } from './supabase'
import { ensureAdminSession } from './adminSupabase'
export { supabase }

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Get the current logged-in user's restaurant ID from Supabase session */
export const getMyRestaurant = async () => {
  await ensureAdminSession()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (data?.id) {
    sessionStorage.setItem('servora_restaurant_id', data.id)
  }

  return data
}

/** Update restaurant profile */
export const updateRestaurantProfile = async (restaurantId, profileData) => {
  await ensureAdminSession()
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
    .maybeSingle()

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
    .maybeSingle()
  return data
}

/** Active Session Restaurant ID Resolver (DB-First Auth) */
export const getCachedRestaurantId = () => {
  return sessionStorage.getItem('servora_restaurant_id') || null
}

/** Resolves a valid PostgreSQL UUID for a restaurant (handles email & legacy IDs) */
export const ensureValidRestaurantUUID = async (restaurantId) => {
  await ensureAdminSession()
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  if (isUUID(restaurantId)) return restaurantId

  // Check sessionStorage cache
  const cached = sessionStorage.getItem(`servora_uuid_${restaurantId}`)
  if (cached && isUUID(cached)) return cached

  // Query Supabase by email
  if (restaurantId && restaurantId.includes('@')) {
    const cleanEmail = restaurantId.toLowerCase()
    const { data } = await supabase
      .from('restaurants')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (data?.id) {
      sessionStorage.setItem(`servora_uuid_${restaurantId}`, data.id)
      return data.id
    }

    // Multi-tenant Auto-Provisioning: Create a dedicated restaurant record for this new email
    try {
      const { data: created, error } = await supabase
        .from('restaurants')
        .insert({
          email: cleanEmail,
          business_name: cleanEmail.split('@')[0].toUpperCase(),
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (!error && created?.id) {
        sessionStorage.setItem(`servora_uuid_${restaurantId}`, created.id)
        return created.id
      }
    } catch (err) {
      console.warn('Auto-provisioning restaurant error:', err)
    }
  }

  const sessionCached = sessionStorage.getItem('servora_restaurant_id')
  if (sessionCached && isUUID(sessionCached)) return sessionCached

  // Fallback: Query default restaurant in DB
  const { data } = await supabase.from('restaurants').select('id').limit(1).maybeSingle()
  if (data?.id) {
    sessionStorage.setItem(`servora_uuid_${restaurantId}`, data.id)
    return data.id
  }

  return null
}

// ═══════════════════════════════════════════════════════════════
// MENU ITEMS (SUPABASE DATABASE STORAGE WITH RESILIENT FALLBACK)
// ═══════════════════════════════════════════════════════════════

export const normalizeMenuItem = (item) => {
  if (!item) return null
  const id = item.id || item._id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  return {
    id: id,
    _id: id,
    name: item.name || 'Unnamed Item',
    description: item.description || '',
    price: Number(item.price || 0),
    category: item.category || 'Main Course',
    type: item.type || 'VEG',
    isInStock: item.is_in_stock ?? item.isInStock ?? true,
    photo: item.photo_url || item.photo || null,
    created_at: item.created_at || item.createdAt || new Date().toISOString()
  }
}

/** Fetch menu items directly from Supabase DB with resilient local fallback */
export const fetchMenuItems = async (restaurantId) => {
  let dbItems = []
  const uuid = await ensureValidRestaurantUUID(restaurantId)

  if (uuid) {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', uuid)
        .order('created_at', { ascending: true })

      if (!error && data) {
        dbItems = data.map(normalizeMenuItem)
      }
    } catch (e) {
      console.warn('fetchMenuItems Supabase query notice:', e)
    }
  }

  // Local storage fallback buffer to protect against RLS block
  const localRaw = localStorage.getItem(`servora_menu_items_${restaurantId}`)
  const localItems = localRaw ? JSON.parse(localRaw).map(normalizeMenuItem) : []

  const itemMap = new Map()
  localItems.forEach(i => itemMap.set(i.id, i))
  dbItems.forEach(i => itemMap.set(i.id, i))

  return Array.from(itemMap.values())
}

/** Create a new menu item directly in Supabase DB */
export const createMenuItem = async (restaurantId, itemData) => {
  const newItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  const normalizedNewItem = normalizeMenuItem({
    id: newItemId,
    name: itemData.name,
    description: itemData.description || '',
    price: Number(itemData.price),
    category: itemData.category || 'Main Course',
    type: itemData.type || 'VEG',
    isInStock: itemData.isInStock ?? true,
    photo: itemData.photo || null,
    created_at: new Date().toISOString()
  })

  // Local Storage Buffer for Instant UI Render
  try {
    const localRaw = localStorage.getItem(`servora_menu_items_${restaurantId}`)
    const localItems = localRaw ? JSON.parse(localRaw) : []
    localStorage.setItem(`servora_menu_items_${restaurantId}`, JSON.stringify([...localItems, normalizedNewItem]))
  } catch (e) {}

  // Post directly to Supabase DB (sanitize photo_url so base64 strings don't exceed body limit)
  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (uuid) {
    try {
      const cleanPhotoUrl = (typeof itemData.photo === 'string' && (itemData.photo.startsWith('http://') || itemData.photo.startsWith('https://'))) ? itemData.photo : null

      const payload = {
        restaurant_id: uuid,
        name: itemData.name,
        description: itemData.description || '',
        price: Number(itemData.price),
        category: itemData.category || 'Main Course',
        type: itemData.type || 'VEG',
        is_in_stock: itemData.isInStock ?? true,
        photo_url: cleanPhotoUrl,
      }

      const { data, error } = await supabase
        .from('menu_items')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        return normalizeMenuItem({ ...data, photo_url: itemData.photo || data.photo_url })
      } else if (error) {
        console.warn('createMenuItem Supabase DB insert notice:', error.message || error)
      }
    } catch (err) {
      console.warn('createMenuItem Supabase DB exception:', err)
    }
  }

  return normalizedNewItem
}

/** Update an existing menu item in Supabase DB */
export const updateMenuItem = async (itemId, itemData, restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  const updatedItem = normalizeMenuItem({
    id: itemId,
    name: itemData.name,
    description: itemData.description || '',
    price: Number(itemData.price),
    category: itemData.category,
    type: itemData.type || 'VEG',
    isInStock: itemData.isInStock ?? true,
    photo: itemData.photo || null,
  })

  // 1. Update local storage cache
  if (restaurantId) {
    try {
      const localRaw = localStorage.getItem(`servora_menu_items_${restaurantId}`)
      if (localRaw) {
        const items = JSON.parse(localRaw).map(i => (i.id === itemId || i._id === itemId) ? { ...i, ...updatedItem } : i)
        localStorage.setItem(`servora_menu_items_${restaurantId}`, JSON.stringify(items))
      }
    } catch (e) {}
  }

  // Sanitize photo_url to prevent PostgREST 400 Bad Request on base64 data URIs
  const cleanPhotoUrl = (typeof itemData.photo === 'string' && (itemData.photo.startsWith('http://') || itemData.photo.startsWith('https://'))) ? itemData.photo : null

  // 2. Post update to Supabase DB table `menu_items`
  if (isUUID(itemId)) {
    await ensureAdminSession()
    try {
      const payload = {
        name: itemData.name,
        description: itemData.description || '',
        price: Number(itemData.price),
        category: itemData.category,
        type: itemData.type || 'VEG',
        is_in_stock: itemData.isInStock ?? true,
        photo_url: cleanPhotoUrl,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('menu_items')
        .update(payload)
        .eq('id', itemId)
        .select()
        .single()

      if (!error && data) {
        return normalizeMenuItem({ ...data, photo_url: itemData.photo || data.photo_url })
      } else if (error) {
        console.warn('updateMenuItem Supabase DB update notice:', error.message || error)
      }
    } catch (e) {
      console.warn('updateMenuItem exception:', e)
    }
  } else if (restaurantId) {
    // If itemId is a temporary local string (e.g. "item-1785..."), insert as a real Supabase DB row!
    const uuid = await ensureValidRestaurantUUID(restaurantId)
    if (uuid) {
      try {
        const payload = {
          restaurant_id: uuid,
          name: itemData.name,
          description: itemData.description || '',
          price: Number(itemData.price),
          category: itemData.category,
          type: itemData.type || 'VEG',
          is_in_stock: itemData.isInStock ?? true,
          photo_url: cleanPhotoUrl,
        }

        const { data, error } = await supabase
          .from('menu_items')
          .insert(payload)
          .select()
          .single()

        if (!error && data) {
          return normalizeMenuItem({ ...data, photo_url: itemData.photo || data.photo_url })
        }
      } catch (err) {}
    }
  }

  return updatedItem
}

/** Toggle stock status in Supabase DB */
export const toggleMenuItemStock = async (itemId, isInStock, restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  if (isUUID(itemId)) {
    await ensureAdminSession()
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ is_in_stock: isInStock, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single()

      if (!error && data) {
        return normalizeMenuItem(data)
      }
    } catch (e) {}
  }

  return { id: itemId, _id: itemId, isInStock }
}

/** Delete a menu item directly from Supabase DB and purge local cache */
export const deleteMenuItem = async (itemId, restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  // 1. Purge from local storage cache across all keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('servora_menu_items_')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const items = JSON.parse(raw).filter(item => (item.id !== itemId && item._id !== itemId))
          localStorage.setItem(key, JSON.stringify(items))
        }
      }
    }
  } catch (e) {}

  // 2. Delete directly from Supabase DB table `menu_items` with retry guard
  if (isUUID(itemId)) {
    await ensureAdminSession()
    let retries = 3
    while (retries > 0) {
      try {
        const { error } = await supabase
          .from('menu_items')
          .delete()
          .eq('id', itemId)

        if (!error) {
          return true
        }
        console.warn(`deleteMenuItem attempt error (${retries} retries left):`, error.message || error)
      } catch (err) {
        console.warn(`deleteMenuItem network exception (${retries} retries left):`, err)
      }
      retries--
      if (retries > 0) await new Promise(r => setTimeout(r, 400))
    }
  }

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

/** Create a new order with its items in Supabase DB */
export const createOrder = async (orderData) => {
  // 0. Resolve restaurantId (UUID or Email)
  let targetRid = orderData.restaurantId
  if (targetRid && targetRid.includes('@')) {
    const profile = await getRestaurantByEmail(targetRid)
    if (profile && profile.id) targetRid = profile.id
  }

  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  const validRestaurantId = isUUID(targetRid) ? targetRid : (await ensureValidRestaurantUUID(targetRid || 'demo-restaurant'))

  // 1. Insert Order to Supabase DB table `orders`
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      restaurant_id: validRestaurantId,
      table_number: String(orderData.tableNumber || 'N/A'),
      customer_name: orderData.customerName || 'Guest Customer',
      status: 'PENDING',
      subtotal: Number(orderData.subtotal || 0),
      tax: Number(orderData.tax || 0),
      total: Number(orderData.total || 0),
      gst_rate: Number(orderData.gstRate || 0),
      gst_label: orderData.gstLabel || 'GST',
      type: orderData.type || 'DINE-IN',
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Supabase Order Insertion Error:', error)
    throw error
  }

  console.log('✅ Supabase Order Created Successfully:', order)

  // 2. Sync to table session
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

  // 3. Insert order line items into Supabase DB table `order_items`
  if (orderData.items && orderData.items.length > 0) {
    const lineItems = orderData.items.map(item => {
      const rawId = item._id || item.id
      return {
        order_id: order.id,
        menu_item_id: isUUID(rawId) ? rawId : null,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
      }
    })

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(lineItems)

    if (itemsError) console.error('Error inserting order items:', itemsError)
  }

  // 4. Insert notification entry into Supabase DB table `notifications`
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
  } catch (e) {
    console.warn('Notice: Notification insert notice:', e)
  }

  // 5. Trigger live local event, cross-tab storage broadcast & toast popup alert
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
    if (window['toast']) {
      window['toast'].success(`🔔 New Order #${order.id.slice(-6)} Received!`, {
        description: `Table ${orderData.tableNumber || '?'} • ${orderData.customerName || 'Guest'} (₹${orderData.total})`
      })
    }
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

/** Get all categories for a restaurant directly from Supabase */
export const getCategories = async (restaurantId) => {
  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid) return []

  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', uuid)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('getCategories Supabase error:', error)
    return []
  }

  return data || []
}

/** Sync categories directly in Supabase DB */
export const syncCategories = async (restaurantId, categoryNames) => {
  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid || !categoryNames || categoryNames.length === 0) return

  const payloads = categoryNames.map((name, index) => ({
    restaurant_id: uuid,
    name,
    order_index: index
  }))

  const { error } = await supabase
    .from('menu_categories')
    .upsert(payloads, { onConflict: 'restaurant_id, name' })

  if (error) {
    console.error('syncCategories Supabase error:', error)
  }
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
  const validId = await ensureValidRestaurantUUID(restaurantId)
  if (!validId) return []

  const { data, error } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('restaurant_id', validId)
    .order('table_number', { ascending: true })
  
  if (error) {
    console.warn('getTableSessions notice:', error)
    return []
  }
  return data || []
}

/** Update Table Status (Resilient Upsert) */
export const updateTableStatus = async (restaurantId, tableNumber, updates) => {
  const validId = await ensureValidRestaurantUUID(restaurantId)
  if (!validId) return null

  const { data, error } = await supabase
    .from('table_sessions')
    .upsert({
      restaurant_id: validId,
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
  const validId = await ensureValidRestaurantUUID(restaurantId)
  if (!validId) return null

  const { data, error } = await supabase
    .from('waiter_calls')
    .insert({
      restaurant_id: validId,
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
  const validId = await ensureValidRestaurantUUID(restaurant_id)
  if (!validId) return null

  const { data, error } = await supabase
    .from('table_sessions')
    .upsert({
      restaurant_id: validId,
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

/** Get QR Codes directly from Supabase with LocalStorage fallback */
export const getQRCodes = async (restaurantId) => {
  const validId = await ensureValidRestaurantUUID(restaurantId) || restaurantId
  if (!validId) return []

  try {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('restaurant_id', validId)
      .order('table_number', { ascending: true })
    
    if (!error && data && data.length > 0) {
      try {
        localStorage.setItem(`servora_qr_codes_${validId}`, JSON.stringify(data))
        if (restaurantId && restaurantId !== validId) {
          localStorage.setItem(`servora_qr_codes_${restaurantId}`, JSON.stringify(data))
        }
      } catch (e) {}
      return data
    }
  } catch (err) {
    console.warn('getQRCodes Supabase query notice:', err)
  }

  // Resilient LocalStorage Cache Fallback
  try {
    const cached = localStorage.getItem(`servora_qr_codes_${validId}`) || 
                   localStorage.getItem(`servora_qr_codes_${restaurantId}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {}

  return []
}

/** Bulk Save QR Codes (Cloud Sync to Supabase + LocalStorage Cache) */
export const bulkSaveQRCodes = async (restaurantId, qrCodes) => {
  if (!qrCodes || qrCodes.length === 0) return
  
  const validId = await ensureValidRestaurantUUID(restaurantId) || restaurantId
  if (!validId) return

  // Cache in LocalStorage immediately for instant offline & UI restore
  try {
    localStorage.setItem(`servora_qr_codes_${validId}`, JSON.stringify(qrCodes))
    if (restaurantId && restaurantId !== validId) {
      localStorage.setItem(`servora_qr_codes_${restaurantId}`, JSON.stringify(qrCodes))
    }
  } catch (e) {}

  try {
    // 1. Sync QR Codes table in Supabase
    const qrPayloads = qrCodes.map(qr => ({
      restaurant_id: validId,
      table_number: parseInt(qr.tableNumber),
      url: qr.url || `${window.location.origin}/menu?restaurant=${validId}&table=${qr.tableNumber}`,
      created_at: qr.generatedAt || new Date().toISOString()
    }))

    // Delete any old extra records if count changed
    await supabase
      .from('qr_codes')
      .delete()
      .eq('restaurant_id', validId)
      .not('table_number', 'in', `(${qrCodes.map(q => parseInt(q.tableNumber)).join(',')})`)

    const { error: qrError } = await supabase
      .from('qr_codes')
      .upsert(qrPayloads, { onConflict: 'restaurant_id, table_number' })

    if (qrError) console.warn('QR code cloud upsert warning:', qrError)

    // 2. Initialize / Upsert Table Sessions (Ensures Dashboard/Floor plan visibility)
    const sessionPayloads = qrCodes.map(qr => ({
      restaurant_id: validId,
      table_number: parseInt(qr.tableNumber),
      status: 'available',
      customers: 0,
      last_activity: new Date().toISOString()
    }))

    // Delete any excess table sessions
    await supabase
      .from('table_sessions')
      .delete()
      .eq('restaurant_id', validId)
      .not('table_number', 'in', `(${qrCodes.map(q => parseInt(q.tableNumber)).join(',')})`)

    const { error: sessionError } = await supabase
      .from('table_sessions')
      .upsert(sessionPayloads, { onConflict: 'restaurant_id, table_number' })

    if (sessionError) console.warn('Table session cloud upsert warning:', sessionError)
  } catch (err) {
    console.error('bulkSaveQRCodes error:', err)
  }

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


// ─── Notifications ─────────────────────────────────────────────────────────

export const fetchNotifications = async (restaurantId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) {
    console.warn('fetchNotifications failed - returning empty array', error)
    return []
  }
  return data || []
}

export const insertNotification = async (restaurantId, payload) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      restaurant_id: restaurantId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      order_id: payload.orderId,
      table_number: payload.tableNumber ? String(payload.tableNumber) : null,
      is_read: false
    })
    .select()
    .single()
  
  if (error) {
    console.warn('insertNotification failed', error)
    return null
  }
  return data
}

export const markNotificationRead = async (notificationId) => {
  if (!notificationId || String(notificationId).startsWith('temp-')) return
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
}

export const markAllNotificationsRead = async (restaurantId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('restaurant_id', restaurantId)
}

export const clearNotifications = async (restaurantId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('restaurant_id', restaurantId)
}

export const logPriceChange = recordPriceChange




