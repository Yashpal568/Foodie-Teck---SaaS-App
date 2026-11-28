import { supabase } from '../lib/supabase'
import { ensureValidRestaurantUUID } from './restaurant.service'
import { generateRestaurantSignature, getPublicMenuOrigin } from '@/utils/tableSecurity'
import { assertMerchantOperational } from '@/lib/merchantAuth'

const hasAuthenticatedSession = async () => {
  try {
    const res = await supabase?.auth?.getSession?.()
    return Boolean(res?.data?.session?.user)
  } catch {
    return false
  }
}

const DEMO_TABLES_STORAGE_KEY = 'servora_demo_table_sessions_v1'

const createDefaultDemoTables = (count = 8) =>
  Array.from({ length: count }, (_, idx) => {
    const n = idx + 1
    return {
      id: `t-${n}`,
      restaurant_id: 'demo-merchant',
      table_number: n,
      status: n === 1 || n === 3 ? 'occupied' : 'available',
      customers: n === 1 || n === 3 ? 2 : 0,
      current_order_id: null,
      session_start: n === 1 || n === 3 ? new Date(Date.now() - 12 * 60000).toISOString() : null,
      last_activity: new Date().toISOString(),
      total_amount: n === 1 ? 320 : n === 3 ? 550 : 0,
    }
  })

const readDemoTableSessions = () => {
  try {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(DEMO_TABLES_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    }
  } catch {
    // ignore storage parse failure
  }
  return createDefaultDemoTables(8)
}

const writeDemoTableSessions = (sessions) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DEMO_TABLES_STORAGE_KEY, JSON.stringify(sessions))
      window.dispatchEvent(new CustomEvent('tableSessionsUpdated', { detail: { restaurantId: 'demo-merchant', sessions } }))
      window.dispatchEvent(new CustomEvent('qrCodesUpdated', { detail: { restaurantId: 'demo-merchant', count: sessions.length } }))
    }
  } catch {
    // ignore storage quota failure
  }
}

/** Get floor plan (tables) directly from Supabase (uses public table-number RPC for guest menu when unauthenticated) */
export const getTableSessions = async (restaurantId) => {
  if (restaurantId === 'demo-merchant' || restaurantId === 'demo') {
    return readDemoTableSessions()
  }

  const validId = await ensureValidRestaurantUUID(restaurantId)

  try {
    if (validId) {
      const hasSession = await hasAuthenticatedSession()
      if (hasSession) {
        const { data, error } = await supabase
          .from('table_sessions')
          .select('*')
          .eq('restaurant_id', validId)
          .order('table_number', { ascending: true })
        
        if (!error && data && data.length > 0) {
          return data
        }
      }

      // Anonymous guest path (or fallback): call narrow public table RPC directly
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

/** Update Table Status (supports Supabase UUID tenants, demo mode, and public QR table claim RPC) */
export const updateTableStatus = async (restaurantId, tableNumber, updates) => {
  const cleanTableNum = parseInt(tableNumber, 10)
  if (!Number.isInteger(cleanTableNum) || cleanTableNum < 1) return null

  if (restaurantId === 'demo-merchant' || restaurantId === 'demo') {
    const current = readDemoTableSessions()
    const exists = current.some((s) => Number(s.table_number) === cleanTableNum)
    const next = exists
      ? current.map((s) =>
          Number(s.table_number) === cleanTableNum
            ? { ...s, ...updates, table_number: cleanTableNum, last_activity: new Date().toISOString() }
            : s
        )
      : [
          ...current,
          {
            id: `t-${cleanTableNum}`,
            restaurant_id: 'demo-merchant',
            table_number: cleanTableNum,
            status: updates?.status || 'available',
            customers: updates?.customers || 0,
            current_order_id: updates?.current_order_id || null,
            session_start: updates?.session_start || null,
            last_activity: new Date().toISOString(),
          },
        ]
    writeDemoTableSessions(next)
    return next.find((s) => Number(s.table_number) === cleanTableNum) || null
  }

  const validId = await ensureValidRestaurantUUID(restaurantId)
  if (!validId) return null
  const isClaimOccupied = String(updates?.status || '').toLowerCase() === 'occupied'
  if (!isClaimOccupied) {
    await assertMerchantOperational(validId)
  }

  const hasSession = await hasAuthenticatedSession()
  if (!hasSession && isClaimOccupied) {
    const { error: rpcErr } = await supabase.rpc('claim_public_table_session', {
      p_restaurant_id: validId,
      p_table_number: cleanTableNum,
    })
    if (!rpcErr) {
      return { restaurant_id: validId, table_number: cleanTableNum, status: 'occupied' }
    }
  }

  const { data, error } = await supabase
    .from('table_sessions')
    .upsert({
      restaurant_id: validId,
      table_number: cleanTableNum,
      ...updates,
      last_activity: new Date().toISOString()
    }, { onConflict: 'restaurant_id, table_number' })
    .select()
    .single()

  if (error) {
    // When anonymous QR customers claim an available table, route through the safe RPC
    if (String(updates?.status || '').toLowerCase() === 'occupied') {
      const { error: rpcErr } = await supabase.rpc('claim_public_table_session', {
        p_restaurant_id: validId,
        p_table_number: cleanTableNum,
      })
      if (!rpcErr) {
        return { restaurant_id: validId, table_number: cleanTableNum, status: 'occupied' }
      }
    }
    throw error
  }
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
  ].filter(Boolean))

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
  await assertMerchantOperational(validId)
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
  await assertMerchantOperational(validId)

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
  if (!restaurantId || restaurantId === 'demo-merchant' || restaurantId === 'demo' || restaurantId === 'guest') {
    return []
  }
  const validId = (await ensureValidRestaurantUUID(restaurantId)) || restaurantId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!validId || !uuidRegex.test(String(validId))) return []

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

/**
 * Create/resize dining tables for a restaurant AND connect them non-destructively to `table_sessions` + `qr_codes`.
 * Preserves existing active (`occupied` / `billing` / `needs-cleaning` / `reserved`) table sessions!
 */
export const configureRestaurantTables = async (restaurantId, targetCount) => {
  const count = Math.max(1, Math.min(999, parseInt(targetCount, 10) || 1))
  const isDemo = restaurantId === 'demo-merchant' || restaurantId === 'demo'

  if (isDemo) {
    const existing = readDemoTableSessions()
    const byNum = new Map(existing.map((s) => [Number(s.table_number), s]))
    const next = Array.from({ length: count }, (_, idx) => {
      const n = idx + 1
      const prev = byNum.get(n)
      if (prev) return prev
      return {
        id: `t-${n}`,
        restaurant_id: 'demo-merchant',
        table_number: n,
        status: 'available',
        customers: 0,
        current_order_id: null,
        session_start: null,
        last_activity: new Date().toISOString(),
        total_amount: 0,
      }
    })
    writeDemoTableSessions(next)
    return next
  }

  const validId = (await ensureValidRestaurantUUID(restaurantId)) || restaurantId
  if (!isValidUUID(validId)) {
    throw new Error('Could not resolve restaurant UUID to configure floor tables.')
  }
  await assertMerchantOperational(validId)

  const origin = getPublicMenuOrigin()
  const masterSig = generateRestaurantSignature(validId)
  const masterUrl = `${origin}/menu?restaurant=${validId}&sig=${masterSig}`
  const tableNumbers = Array.from({ length: count }, (_, idx) => idx + 1)

  // 1. Sync qr_codes (Universal Restaurant QR URL per configured table slot 1..N)
  const qrPayloads = tableNumbers.map((n) => ({
    restaurant_id: validId,
    table_number: n,
    url: masterUrl,
    created_at: new Date().toISOString(),
  }))

  await supabase
    .from('qr_codes')
    .delete()
    .eq('restaurant_id', validId)
    .gt('table_number', count)

  const { error: qrError } = await supabase
    .from('qr_codes')
    .upsert(qrPayloads, { onConflict: 'restaurant_id, table_number' })
  if (qrError) throw qrError

  // 2. Fetch existing table_sessions so active occupied/billing tables are NEVER wiped
  const { data: existingSessions, error: fetchSessErr } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('restaurant_id', validId)
  if (fetchSessErr) throw fetchSessErr

  const existingNums = new Set((existingSessions || []).map((s) => Number(s.table_number)))
  const missingPayloads = tableNumbers
    .filter((n) => !existingNums.has(n))
    .map((n) => ({
      restaurant_id: validId,
      table_number: n,
      status: 'available',
      customers: 0,
      last_activity: new Date().toISOString(),
    }))

  if (missingPayloads.length > 0) {
    const { error: insertErr } = await supabase
      .from('table_sessions')
      .upsert(missingPayloads, { onConflict: 'restaurant_id, table_number' })
    if (insertErr) throw insertErr
  }

  // Only remove excess idle/available tables above `count`
  await supabase
    .from('table_sessions')
    .delete()
    .eq('restaurant_id', validId)
    .gt('table_number', count)
    .eq('status', 'available')

  const { data: syncedSessions, error: finalErr } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('restaurant_id', validId)
    .order('table_number', { ascending: true })

  if (finalErr) throw finalErr

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tableSessionsUpdated', { detail: { restaurantId: validId, sessions: syncedSessions || [] } }))
    window.dispatchEvent(new CustomEvent('qrCodesUpdated', { detail: { restaurantId: validId, count: (syncedSessions || []).length } }))
  }

  return syncedSessions || []
}

/** Bulk Save QR Codes directly to Supabase without wiping active Table Sessions */
export const bulkSaveQRCodes = async (restaurantId, qrCodes) => {
  if (!qrCodes || qrCodes.length === 0) return true
  const validQrCodes = qrCodes.filter(qr => qr.tableNumber !== undefined && qr.tableNumber !== null && !isNaN(Number(qr.tableNumber)))
  if (validQrCodes.length === 0) return true

  const maxCount = Math.max(...validQrCodes.map((q) => Number(q.tableNumber)))
  await configureRestaurantTables(restaurantId, maxCount)
  return true
}
