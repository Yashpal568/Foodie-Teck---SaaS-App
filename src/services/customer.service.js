import { supabase } from '../lib/supabase'
import { ensureValidRestaurantUUID } from './restaurant.service'

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

export const syncCustomerFromOrder = async (restaurantId, customerData) => {
  let validId = isUUID(restaurantId) ? restaurantId : (await ensureValidRestaurantUUID(restaurantId))
  if (!validId || !isUUID(validId)) return null

  try {
    const { data, error } = await supabase
      .from('customers')
      .upsert({
        restaurant_id: validId,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        last_visit: new Date().toISOString()
      }, { onConflict: 'restaurant_id, email' })
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (err) {
    return null
  }
}

export const getCustomers = async (restaurantId) => {
  let validId = isUUID(restaurantId) ? restaurantId : (await ensureValidRestaurantUUID(restaurantId))
  if (!validId || !isUUID(validId)) return []

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', validId)
    
    if (error) throw error
    return data || []
  } catch (err) {
    return []
  }
}
