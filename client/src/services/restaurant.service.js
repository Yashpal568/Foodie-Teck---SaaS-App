import { supabase, getCachedSession } from '../lib/supabase'
import { uploadToCloudinary, isBase64Image } from './cloudinary.service'
import { assertMerchantOperational } from '../lib/merchantAuth'

const PUBLIC_PROFILE_CACHE_TTL_MS = 15000
const publicProfileCache = new Map()

export const clearPublicProfileCache = (restaurantId = null) => {
  if (!restaurantId) {
    publicProfileCache.clear()
    return
  }
  publicProfileCache.delete(String(restaurantId))
}

const hasAuthenticatedSession = async () => {
  try {
    const res = await supabase?.auth?.getSession?.()
    return Boolean(res?.data?.session?.user)
  } catch {
    return false
  }
}

const formatPublicRestaurantProfile = (row) => {
  if (!row) return null
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
    if (data.gstin === undefined || data.gstin === null) {
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
  await assertMerchantOperational(uuid)

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

  // 2. Instant tenant-scoped local persistence & cache (never global unscoped keys)
  try {
    if (logo) {
      localStorage.setItem(`servora_restaurant_logo_${uuid}`, logo)
      localStorage.setItem(`servora_restaurant_logo_${restaurantId}`, logo)
    }
    if (cover) {
      localStorage.setItem(`servora_restaurant_cover_${uuid}`, cover)
      localStorage.setItem(`servora_restaurant_cover_${restaurantId}`, cover)
    }
    if (name) {
      localStorage.setItem(`servora_restaurant_name_${uuid}`, name)
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

  clearPublicProfileCache(uuid)

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
    const hasSession = await hasAuthenticatedSession()

    if (!hasSession && validId && isUUID(validId)) {
      const cacheKey = String(validId)
      const cached = publicProfileCache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value
      }

      const { data: rpcRows } = await supabase.rpc('get_public_restaurant_profile', { p_restaurant_id: validId })
      const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
      const formatted = formatPublicRestaurantProfile(row)
      if (formatted) {
        publicProfileCache.set(cacheKey, {
          value: formatted,
          expiresAt: Date.now() + PUBLIC_PROFILE_CACHE_TTL_MS,
        })
        return formatted
      }
      return null
    }

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
      return formatPublicRestaurantProfile(data)
    }

    // Fallback to narrow public RPC when hardened RLS restricts direct table SELECT for guests
    if (validId && isUUID(validId)) {
      const { data: rpcRows } = await supabase.rpc('get_public_restaurant_profile', { p_restaurant_id: validId })
      const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
      const formatted = formatPublicRestaurantProfile(row)
      if (formatted) {
        return formatted
      }
    }
  } catch (e) {
    console.warn('Error in getRestaurantProfile:', e)
  }

  return null
}

/**
 * Fetch merchant's default UPI ID from Supabase `payment_methods` table.
 * Falls back to localStorage only for demo mode or offline resilience.
 */
export const getMerchantUpi = async (restaurantId) => {
  if (!restaurantId) return ''
  if (restaurantId === 'demo-merchant' || restaurantId === 'demo' || restaurantId === 'guest') {
    try {
      return localStorage.getItem(`servora_merchant_upi_${restaurantId}`) || ''
    } catch {
      return ''
    }
  }
  try {
    const uuid = await ensureValidRestaurantUUID(restaurantId)
    if (!uuid || !supabase) return ''
    const { data, error } = await supabase
      .from('payment_methods')
      .select('details')
      .eq('restaurant_id', uuid)
      .eq('type', 'UPI')
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data?.details?.upi_id) {
      const dbUpi = String(data.details.upi_id).trim()
      try {
        localStorage.setItem(`servora_merchant_upi_${restaurantId}`, dbUpi)
      } catch {}
      return dbUpi
    }
    return ''
  } catch {
    try {
      return localStorage.getItem(`servora_merchant_upi_${restaurantId}`) || ''
    } catch {
      return ''
    }
  }
}

/**
 * Persist merchant's default UPI ID to Supabase `payment_methods` table (RLS-enforced).
 */
export const saveMerchantUpiToDb = async (restaurantId, upiId) => {
  const cleanUpi = String(upiId || '').trim()
  if (!cleanUpi) throw new Error('UPI ID cannot be empty')
  try {
    localStorage.setItem(`servora_merchant_upi_${restaurantId || 'default'}`, cleanUpi)
  } catch {}

  if (!restaurantId || restaurantId === 'demo-merchant' || restaurantId === 'demo' || restaurantId === 'guest') {
    return { upi_id: cleanUpi, localOnly: true }
  }

  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid) throw new Error('Could not resolve restaurant UUID for UPI update.')
  await assertMerchantOperational(uuid)

  const { data: existing } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('restaurant_id', uuid)
    .eq('type', 'UPI')
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('payment_methods')
      .update({
        details: { upi_id: cleanUpi },
        is_default: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .eq('restaurant_id', uuid)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('payment_methods')
      .insert({
        restaurant_id: uuid,
        type: 'UPI',
        details: { upi_id: cleanUpi },
        is_default: true,
        updated_at: new Date().toISOString()
      })
    if (error) throw error
  }
  return { upi_id: cleanUpi, localOnly: false }
}

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
