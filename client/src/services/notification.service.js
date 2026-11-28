import { supabase } from '../lib/supabase'
import { ensureValidRestaurantUUID } from './restaurant.service'
import { assertMerchantOperational } from '../lib/merchantAuth'

export const fetchNotifications = async (restaurantId) => {
  const validId = await ensureValidRestaurantUUID(restaurantId) || restaurantId
  if (!validId) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('restaurant_id', validId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) throw error
  return data || []
}

export const insertNotification = async (restaurantId, payload) => {
  const validId = await ensureValidRestaurantUUID(restaurantId) || restaurantId
  if (!validId) return null

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      restaurant_id: validId,
      type: payload.type || 'alert',
      title: payload.title || 'Notification',
      message: payload.message || '',
      order_id: payload.order_id || payload.orderId || null,
      table_number: (payload.table_number ?? payload.tableNumber) ? String(payload.table_number ?? payload.tableNumber) : null,
      is_read: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const markNotificationRead = async (notificationId, restaurantId = null) => {
  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (restaurantId) {
    const validId = await ensureValidRestaurantUUID(restaurantId) || restaurantId
    if (validId) query = query.eq('restaurant_id', validId)
  }

  const { data, error } = await query.select().single()
  if (error) throw error
  return data
}

export const markAllNotificationsRead = async (restaurantId) => {
  const validId = await ensureValidRestaurantUUID(restaurantId) || restaurantId
  if (!validId) return true
  await assertMerchantOperational(validId)
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('restaurant_id', validId)
    .eq('is_read', false)

  if (error) throw error
  return true
}

export const deleteNotification = async (notificationId, restaurantId) => {
  const validId = await ensureValidRestaurantUUID(restaurantId) || restaurantId
  if (!validId) return false
  await assertMerchantOperational(validId)
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('restaurant_id', validId)

  if (error) throw error
  return true
}

export const clearNotifications = async (restaurantId) => {
  const validId = await ensureValidRestaurantUUID(restaurantId) || restaurantId
  if (!validId) return true
  await assertMerchantOperational(validId)
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('restaurant_id', validId)

  if (error) throw error
  return true
}
