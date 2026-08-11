import { supabase, getCachedSession } from '../lib/supabase'
import { ensureAdminSession } from '../lib/adminSupabase'

/** Get the current logged-in user's restaurant ID from Supabase session */
export const getMyRestaurant = async () => {
  await ensureAdminSession()
  const { data: { session } } = await getCachedSession()
  const user = session?.user
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
  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid) throw new Error("Could not resolve a valid UUID for this restaurant.")

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
    .eq('id', uuid)
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
