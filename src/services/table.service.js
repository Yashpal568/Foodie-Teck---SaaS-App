import { supabase } from '../lib/supabase'
import { ensureValidRestaurantUUID } from './restaurant.service'
import { generateTableSignature } from '@/utils/tableSecurity'

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

  // Broadcast the waiter call directly so the dashboard receives it immediately
  // bypassing the need for postgres_changes replication on the waiter_calls table
  const channel = supabase.channel(`waiter-toasts:rid=${validId}`)
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event: 'waiter_call',
        payload: {
          id: data?.id || Date.now(),
          table_number: String(tableNumber),
          customer_name: customerName,
          restaurant_id: validId
        }
      })
      setTimeout(() => {
        supabase.removeChannel(channel)
      }, 1000)
    }
  })

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

  try {
    const validQrCodes = qrCodes.filter(qr => qr.tableNumber !== undefined && qr.tableNumber !== null && !isNaN(Number(qr.tableNumber)));
    if (validQrCodes.length === 0) return true;

    const qrPayloads = validQrCodes.map(qr => {
      const sig = generateTableSignature(validId, qr.tableNumber)
      return {
        restaurant_id: validId,
        table_number: Number(qr.tableNumber),
        url: `${window.location.origin}/menu?restaurant=${validId}&table=${qr.tableNumber}&sig=${sig}`,
        created_at: qr.generatedAt || new Date().toISOString()
      }
    })

    const validTableNumbers = validQrCodes.map(q => Number(q.tableNumber)).join(',');

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
