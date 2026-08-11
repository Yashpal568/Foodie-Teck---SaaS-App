import { supabase } from '../lib/supabase'
import { ensureValidRestaurantUUID } from './restaurant.service'

export const fetchNotifications = async (restaurantId) => {
  const validId = await ensureValidRestaurantUUID(restaurantId) || restaurantId
  if (!validId) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('restaurant_id', validId)
    .order('created_at', { ascending: false })
    .limit(20)

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
      order_id: payload.order_id || null,
      table_number: payload.table_number ? String(payload.table_number) : null,
      is_read: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const markNotificationRead = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const markAllNotificationsRead = async (restaurantId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('restaurant_id', restaurantId)
    .eq('is_read', false)

  if (error) throw error
  return true
}

export const clearNotifications = async (restaurantId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('restaurant_id', restaurantId)

  if (error) throw error
  return true
}
