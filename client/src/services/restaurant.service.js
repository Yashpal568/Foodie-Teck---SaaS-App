import { supabase, getCachedSession } from '../lib/supabase'
import { uploadToCloudinary, isBase64Image } from './cloudinary.service'

/** Get the current logged-in user's restaurant ID from Supabase session */
export const getMyRestaurant = async () => {

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
    if (!data.gstin) {
      try {
        data.gstin = localStorage.getItem(`servora_restaurant_gstin_${data.id}`) || ''
      } catch {
        // ignore storage error
      }
    }
  }

  return data
}

/** Update restaurant profile */
export const updateRestaurantProfile = async (restaurantId, profileData) => {
  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid) throw new Error("Could not resolve a valid UUID for this restaurant.")

  let rawLogo = profileData.logo_url || profileData.avatar || ''
  let rawCover = profileData.cover_url || profileData.cover || ''
  const name = profileData.business_name || profileData.name || ''

  // 1. Upload Base64 / File to Cloudinary CDN to prevent DB egress bloat
  let logo = rawLogo
  let cover = rawCover

  if (rawLogo && (isBase64Image(rawLogo) || rawLogo.length > 500)) {
    try {
      const cdnUrl = await uploadToCloudinary(rawLogo, 'servora_logos')
      if (cdnUrl) logo = cdnUrl
    } catch (e) {
      console.warn('Cloudinary logo upload notice:', e)
    }
  }

  if (rawCover && (isBase64Image(rawCover) || rawCover.length > 500)) {
    try {
      const cdnUrl = await uploadToCloudinary(rawCover, 'servora_covers')
      if (cdnUrl) cover = cdnUrl
    } catch (e) {
      console.warn('Cloudinary cover upload notice:', e)
    }
  }

  // 2. Instant local persistence & cache
  try {
    if (logo) {
      localStorage.setItem(`servora_restaurant_logo_${uuid}`, logo)
      localStorage.setItem(`servora_restaurant_logo_${restaurantId}`, logo)
      localStorage.setItem('servora_restaurant_logo', logo)
    }
    if (cover) {
      localStorage.setItem(`servora_restaurant_cover_${uuid}`, cover)
      localStorage.setItem(`servora_restaurant_cover_${restaurantId}`, cover)
      localStorage.setItem('servora_restaurant_cover', cover)
    }
    if (name) {
      localStorage.setItem(`servora_restaurant_name_${uuid}`, name)
      localStorage.setItem('servora_restaurant_name', name)
    }
  } catch {
    // ignore storage quota errors
  }

  // 3. Instant Cross-Tab Broadcast via BroadcastChannel
  try {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const bc = new BroadcastChannel('servora_profile_sync')
      bc.postMessage({
        restaurantId: uuid,
        slugId: restaurantId,
        business_name: name,
        logo_url: logo,
        cover_url: cover,
        timestamp: Date.now()
      })
      bc.close()
    }
  } catch {
    // ignore BroadcastChannel unavailability
  }

  // 4. Dispatch in current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('restaurantProfileUpdated', {
      detail: {
        restaurantId: uuid,
        business_name: name,
        logo_url: logo,
        cover_url: cover
      }
    }))
  }

  // 5. Update Supabase Cloud Database (Only clean CDN URLs, never multi-MB base64)
  const cleanGstin = profileData.gstin !== undefined
    ? String(profileData.gstin || '').trim().toUpperCase()
    : undefined

  if (cleanGstin !== undefined) {
    try {
      if (cleanGstin) localStorage.setItem(`servora_restaurant_gstin_${uuid}`, cleanGstin)
      else localStorage.removeItem(`servora_restaurant_gstin_${uuid}`)
    } catch {
      // ignore storage quota issue
    }
  }

  const updatePayload = {
    business_name: name || undefined,
    address: profileData.address,
    phone: profileData.phone,
    description: profileData.description,
    ...(cleanGstin !== undefined ? { gstin: cleanGstin } : {}),
    updated_at: new Date().toISOString(),
  }

  if (logo && !isBase64Image(logo)) {
    updatePayload.logo_url = logo
  }
  if (cover && !isBase64Image(cover)) {
    updatePayload.cover_url = cover
  }

  let { data, error } = await supabase
    .from('restaurants')
    .update(updatePayload)
    .eq('id', uuid)
    .select('*')
    .maybeSingle()

  // Graceful compatibility if DB migration adding `gstin` column hasn't run yet
  if (error && cleanGstin !== undefined && String(error.message || '').toLowerCase().includes('gstin')) {
    const { gstin: _omitted, ...fallbackPayload } = updatePayload
    const retry = await supabase
      .from('restaurants')
      .update(fallbackPayload)
      .eq('id', uuid)
      .select('*')
      .maybeSingle()
    data = retry.data
    error = retry.error
  }

  if (error) {
    console.warn('Supabase update warning:', error)
  }

  return data || {
    id: uuid,
    business_name: name,
    address: profileData.address,
    phone: profileData.phone,
    ...(cleanGstin !== undefined ? { gstin: cleanGstin } : {}),
    logo_url: logo,
    cover_url: cover
  }
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

/** Get public restaurant profile for customer menu (no merchant PII) */
export const getRestaurantProfile = async (restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  if (!restaurantId) return null

  if (restaurantId === 'demo-merchant' || restaurantId === 'demo') {
    return {
      id: 'demo-merchant',
      business_name: 'Servora Demo Kitchen',
      name: 'Servora Demo Kitchen',
      description: 'Multi-Cuisine • Gourmet Dining',
      cuisine: 'Multi-Cuisine',
      logo_url: '',
      cover_url: '',
      status: 'Active',
    }
  }

  let validId = isUUID(restaurantId) ? restaurantId : await ensureValidRestaurantUUID(restaurantId)

  try {
    let q = supabase.from('restaurants').select('id, business_name, description, logo_url, cover_url, status')
    if (validId && isUUID(validId)) {
      q = q.eq('id', validId).maybeSingle()
    } else if (typeof restaurantId === 'string' && restaurantId.includes('@')) {
      q = q.eq('email', restaurantId.toLowerCase()).maybeSingle()
    } else {
      return null
    }

    const { data, error } = await q
    if (!error && data) {
      const cleanName = (data.business_name || '').trim() || 'Restaurant Menu'
      return {
        ...data,
        name: cleanName,
        business_name: cleanName,
        logo_url: data.logo_url || '',
        cover_url: data.cover_url || '',
        description: data.description || 'Multi-Cuisine • Gourmet Dining',
        cuisine: 'Multi-Cuisine',
      }
    }

    // Fallback to narrow public RPC when hardened RLS restricts direct table SELECT for anon guests
    if (validId && isUUID(validId)) {
      const { data: rpcRows } = await supabase.rpc('get_public_restaurant_profile', { p_restaurant_id: validId })
      const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
      if (row) {
        const cleanName = (row.business_name || '').trim() || 'Restaurant Menu'
        return {
          ...row,
          name: cleanName,
          business_name: cleanName,
          logo_url: row.logo_url || '',
          cover_url: row.cover_url || '',
          description: row.description || 'Multi-Cuisine • Gourmet Dining',
          cuisine: 'Multi-Cuisine',
        }
      }
    }
  } catch (e) {
    console.warn('Error in getRestaurantProfile:', e)
  }

  return null
}

/** Active Session Restaurant ID Resolver (non-authoritative UI cache only) */
export const getCachedRestaurantId = () => {
  return sessionStorage.getItem('servora_restaurant_id') || null
}

/** Resolves a valid PostgreSQL UUID strictly for exact restaurant identifier (never auto-creates or switches tenants) */
export const ensureValidRestaurantUUID = async (restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  if (!restaurantId || typeof restaurantId !== 'string') return null
  if (isUUID(restaurantId)) return restaurantId
  if (restaurantId === 'demo-merchant' || restaurantId === 'demo') return null

  const cached = sessionStorage.getItem(`servora_uuid_${restaurantId}`)
  if (cached && isUUID(cached)) return cached

  if (restaurantId.includes('@')) {
    const cleanEmail = restaurantId.toLowerCase()
    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (!error && data?.id) {
      sessionStorage.setItem(`servora_uuid_${restaurantId}`, data.id)
      return data.id
    }
  }

  return null
}
