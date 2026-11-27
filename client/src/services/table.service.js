import { supabase } from '../lib/supabase'
import { ensureValidRestaurantUUID } from './restaurant.service'
import { generateRestaurantSignature, generateTableSignature } from '@/utils/tableSecurity'

/** Get floor plan (tables) directly from Supabase (uses public table-number RPC for guest menu when unauthenticated) */
export const getTableSessions = async (restaurantId) => {
  if (restaurantId === 'demo-merchant' || restaurantId === 'demo') {
    return [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
      id: `t-${n}`,
      restaurant_id: 'demo-merchant',
      table_number: n,
      status: n === 1 || n === 3 ? 'occupied' : 'available',
      current_order_id: null,
      total_amount: n === 1 ? 320 : n === 3 ? 550 : 0
    }))
  }

  const validId = await ensureValidRestaurantUUID(restaurantId)

  try {
    if (validId) {
      const { data, error } = await supabase
        .from('table_sessions')
        .select('*')
        .eq('restaurant_id', validId)
        .order('table_number', { ascending: true })
      
      if (!error && data && data.length > 0) {
        return data
      }

      // Public guest menu fallback via narrow table-number RPC when RLS restricts full table_sessions
      const { data: pubTables, error: rpcErr } = await supabase.rpc('get_public_table_numbers', {
        p_restaurant_id: validId,
      })
      if (!rpcErr && Array.isArray(pubTables) && pubTables.length > 0) {
        return pubTables.map((row) => ({
          id: `pub-t-${row.table_number}`,
          restaurant_id: validId,
          table_number: row.table_number,
        }))
      }
    }
  } catch (error) {
    console.warn('getTableSessions notice:', error)
  }

  return []
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
  const validId = (await ensureValidRestaurantUUID(restaurantId)) || restaurantId
  const callPayload = {
    id: `waiter_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    table_number: String(tableNumber || '1'),
    customer_name: customerName || 'Guest',
    restaurant_id: validId || restaurantId,
    created_at: new Date().toISOString()
  }

  // 1. Atomic RPC or DB Insert in Supabase waiter_calls + notifications
  let dbRecord = null
  if (validId && isValidUUID(validId)) {
    const { data: rpcRows, error: rpcErr } = await supabase.rpc('request_waiter_assistance', {
      p_restaurant_id: validId,
      p_table_number: String(tableNumber || '1'),
      p_customer_name: customerName || 'Guest',
    })

    if (!rpcErr && rpcRows) {
      const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
      if (row) {
        dbRecord = row
        callPayload.id = row.id
      }
    } else if (rpcErr && rpcErr.code !== '42883' && rpcErr.code !== 'PGRST202') {
      throw new Error(rpcErr.message || 'Unable to submit waiter assistance request.')
    } else {
      // Legacy schema compatibility before RPC migration is applied
      const { data, error } = await supabase
        .from('waiter_calls')
        .insert({
          restaurant_id: validId,
          table_number: String(tableNumber || '1'),
          customer_name: customerName || 'Guest',
          is_handled: false,
          created_at: callPayload.created_at
        })
        .select()
        .maybeSingle()

      if (error) {
        throw new Error(error.message || 'Unable to record waiter call in database.')
      }
      if (data) {
        dbRecord = data
        callPayload.id = data.id
      }

      await supabase
        .from('notifications')
        .insert({
          restaurant_id: validId,
          type: 'waiter_call',
          title: '🛎️ Waiter Requested',
          message: `Table ${String(tableNumber || '1')} (${customerName || 'Guest'}) is requesting service.`,
          table_number: String(tableNumber || '1'),
          is_read: false,
          created_at: callPayload.created_at
        })
        .then(({ error: notifErr }) => {
          if (notifErr) console.warn('Waiter notification DB insert warning:', notifErr.message)
        })
    }
  }

  // 2. Broadcast via Supabase Realtime Channels
  const targets = new Set([
    `waiter-toasts:rid=${validId}`,
    `waiter-toasts:rid=${restaurantId}`,
    `waiter-toasts:rid=all`
  ])

  targets.forEach(channelName => {
    try {
      const channel = supabase.channel(channelName)
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'waiter_call',
            payload: callPayload
          })
          setTimeout(() => {
            supabase.removeChannel(channel)
          }, 2000)
        }
      })
    } catch (broadcastErr) {
      console.warn('Broadcast channel notice:', broadcastErr)
    }
  })

  // 3. Local & Cross-Tab Broadcast for instantaneous popups across tabs
  try {
    localStorage.setItem('servora_latest_waiter_call', JSON.stringify({ ...callPayload, _timestamp: Date.now() }))
  } catch {
    // ignore browser storage error
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('servora_orders_channel')
      bc.postMessage({ type: 'WAITER_CALL', payload: callPayload })
      setTimeout(() => bc.close(), 1000)
    }
  } catch {
    // ignore BroadcastChannel unavailability
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('servora_waiter_call', { detail: callPayload }))
    } catch (localErr) {
      console.warn('Local waiter dispatch notice:', localErr)
    }
  }

  return dbRecord || callPayload
}

const isValidUUID = (val) =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

/** Fetch active waiter calls enriched with live table_sessions & active orders from Supabase */
export const getActiveWaiterCalls = async (restaurantId) => {
  const validId = await ensureValidRestaurantUUID(restaurantId)
  if (!isValidUUID(validId)) return []

  try {
    // Only surface recent unhandled requests (last 2 hours) so stale historical rows never ambush login
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const [callsRes, sessionsRes, ordersRes] = await Promise.all([
      supabase
        .from('waiter_calls')
        .select('*')
        .eq('restaurant_id', validId)
        .eq('is_handled', false)
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: true }),
      supabase
        .from('table_sessions')
        .select('table_number, status, customers, current_order_id')
        .eq('restaurant_id', validId),
      supabase
        .from('orders')
        .select('id, table_number, customer_name, status')
        .eq('restaurant_id', validId)
        .in('status', ['PENDING', 'PREPARING', 'READY', 'SERVED', 'BILL_REQUESTED'])
        .order('created_at', { ascending: false })
        .limit(40),
    ])

    const calls = (!callsRes.error && Array.isArray(callsRes.data)) ? callsRes.data : []
    const sessionsByTable = new Map(
      ((!sessionsRes.error && sessionsRes.data) || []).map((s) => [String(s.table_number), s])
    )
    const orderByTable = new Map()
    ;((!ordersRes.error && ordersRes.data) || []).forEach((o) => {
      const tbl = String(o.table_number || '')
      if (tbl && !orderByTable.has(tbl)) orderByTable.set(tbl, o)
    })

    return calls.map((c) => {
      const tbl = String(c.table_number || '')
      const session = sessionsByTable.get(tbl)
      const order = orderByTable.get(tbl)
      return {
        ...c,
        table_status: session?.status || null,
        guest_count: session?.customers || 0,
        active_order_status: order?.status || null,
        active_customer_name: order?.customer_name || null,
      }
    })
  } catch (err) {
    console.warn('getActiveWaiterCalls notice:', err)
  }
  return []
}

/** Acknowledge / mark a single waiter call (and any matching open table calls) as handled */
export const acknowledgeWaiterCall = async (callId, restaurantId = null, tableNumber = null) => {
  try {
    if (isValidUUID(callId)) {
      const { error } = await supabase
        .from('waiter_calls')
        .update({ is_handled: true })
        .eq('id', callId)
      return !error
    }

    const validId = restaurantId ? await ensureValidRestaurantUUID(restaurantId) : null
    if (isValidUUID(validId) && tableNumber) {
      const { error } = await supabase
        .from('waiter_calls')
        .update({ is_handled: true })
        .eq('restaurant_id', validId)
        .eq('table_number', String(tableNumber))
        .eq('is_handled', false)
      return !error
    }
    return true
  } catch (err) {
    console.warn('acknowledgeWaiterCall notice:', err)
    return false
  }
}

/** Acknowledge all active unhandled waiter calls for a restaurant */
export const acknowledgeAllWaiterCalls = async (restaurantId) => {
  const validId = await ensureValidRestaurantUUID(restaurantId)
  if (!isValidUUID(validId)) return true
  try {
    const { error } = await supabase
      .from('waiter_calls')
      .update({ is_handled: true })
      .eq('restaurant_id', validId)
      .eq('is_handled', false)
    return !error
  } catch (err) {
    console.warn('acknowledgeAllWaiterCalls notice:', err)
    return false
  }
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

/** Get QR Codes directly from Supabase */
export const getQRCodes = async (restaurantId) => {
  const validId = (await ensureValidRestaurantUUID(restaurantId)) || restaurantId
  if (!validId) return []

  try {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('restaurant_id', validId)
      .order('table_number', { ascending: true })
    
    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('getQRCodes Supabase query notice:', err)
  }

  return []
}

/** Bulk Save QR Codes directly to Supabase */
export const bulkSaveQRCodes = async (restaurantId, qrCodes) => {
  if (!qrCodes || qrCodes.length === 0) return true
  const validId = (await ensureValidRestaurantUUID(restaurantId)) || restaurantId
  if (!validId) return true

  try {
    const validQrCodes = qrCodes.filter(qr => qr.tableNumber !== undefined && qr.tableNumber !== null && !isNaN(Number(qr.tableNumber)))
    if (validQrCodes.length === 0) return true

    const masterSig = generateRestaurantSignature(validId)
    const qrPayloads = validQrCodes.map(qr => {
      const sig = qr.isUniversal ? masterSig : generateTableSignature(validId, qr.tableNumber)
      const url = qr.isUniversal
        ? `${window.location.origin}/menu?restaurant=${validId}&sig=${sig}`
        : `${window.location.origin}/menu?restaurant=${validId}&table=${qr.tableNumber}&sig=${sig}`
      return {
        restaurant_id: validId,
        table_number: Number(qr.tableNumber),
        url: qr.url || url,
        created_at: qr.generatedAt || new Date().toISOString()
      }
    })

    const validTableNumbers = validQrCodes.map(q => Number(q.tableNumber)).join(',')

    if (validTableNumbers) {
      await supabase
        .from('qr_codes')
        .delete()
        .eq('restaurant_id', validId)
        .not('table_number', 'in', `(${validTableNumbers})`)
    }

    const { error: qrError } = await supabase
      .from('qr_codes')
      .upsert(qrPayloads, { onConflict: 'restaurant_id, table_number' })

    if (qrError) console.warn('QR code cloud upsert warning:', qrError)

    const sessionPayloads = validQrCodes.map(qr => ({
      restaurant_id: validId,
      table_number: Number(qr.tableNumber),
      status: 'available',
      customers: 0,
      last_activity: new Date().toISOString()
    }))

    if (validTableNumbers) {
      await supabase
        .from('table_sessions')
        .delete()
        .eq('restaurant_id', validId)
        .not('table_number', 'in', `(${validTableNumbers})`)
    }

    const { error: sessionError } = await supabase
      .from('table_sessions')
      .upsert(sessionPayloads, { onConflict: 'restaurant_id, table_number' })

    if (sessionError) console.warn('Table session cloud upsert warning:', sessionError)
  } catch (err) {
    console.error('bulkSaveQRCodes error:', err)
  }

  return true
}
