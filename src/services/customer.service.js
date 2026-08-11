import { supabase } from '../lib/supabase'

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

export const getCustomers = async (restaurantId) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurantId)
  
  if (error) throw error
  return data
}
