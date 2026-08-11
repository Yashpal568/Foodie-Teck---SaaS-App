import { supabase } from '../lib/supabase'
import { ensureAdminSession } from '../lib/adminSupabase'
import { ensureValidRestaurantUUID } from './restaurant.service'

export const normalizeMenuItem = (item) => {
  if (!item) return null
  const id = item.id || item._id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  const photo = item.photo || item.photo_url || item.image_url || item.image || item.imageUrl || item.photoUrl || null
  return {
    id: id,
    _id: id,
    name: item.name || 'Unnamed Item',
    description: item.description || '',
    price: Number(item.price || 0),
    category: item.category || 'Main Course',
    type: item.type || 'VEG',
    isInStock: item.is_in_stock ?? item.isInStock ?? true,
    photo: photo,
    photo_url: photo,
    image_url: photo,
    image: photo,
    imageUrl: photo,
    created_at: item.created_at || item.createdAt || new Date().toISOString()
  }
}

/** Fetch menu items directly from Supabase DB with resilient local fallback */
export const fetchMenuItems = async (restaurantId) => {
  let dbItems = []
  const uuid = await ensureValidRestaurantUUID(restaurantId)

  if (uuid) {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', uuid)
        .order('created_at', { ascending: true })

      if (!error && data) {
        dbItems = data.map(normalizeMenuItem)
      }
    } catch (e) {
      console.warn('fetchMenuItems Supabase query notice:', e)
    }
  }

  const localRaw = localStorage.getItem(`servora_menu_items_${restaurantId}`)
  const localItems = localRaw ? JSON.parse(localRaw).map(normalizeMenuItem) : []

  const itemMap = new Map()
  localItems.forEach(i => itemMap.set(i.id, i))
  dbItems.forEach(i => itemMap.set(i.id, i))

  return Array.from(itemMap.values())
}

/** Create a new menu item directly in Supabase DB */
export const createMenuItem = async (restaurantId, itemData) => {
  const newItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  const photoVal = itemData.photo || itemData.photo_url || itemData.image_url || itemData.image || null
  const normalizedNewItem = normalizeMenuItem({
    id: newItemId,
    name: itemData.name,
    description: itemData.description || '',
    price: Number(itemData.price),
    category: itemData.category || 'Main Course',
    type: itemData.type || 'VEG',
    isInStock: itemData.isInStock ?? true,
    photo: photoVal,
    created_at: new Date().toISOString()
  })

  try {
    const localRaw = localStorage.getItem(`servora_menu_items_${restaurantId}`)
    const localItems = localRaw ? JSON.parse(localRaw) : []
    localStorage.setItem(`servora_menu_items_${restaurantId}`, JSON.stringify([...localItems, normalizedNewItem]))
  } catch (e) {}

  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (uuid) {
    try {
      const payload = {
        restaurant_id: uuid,
        name: itemData.name,
        description: itemData.description || '',
        price: Number(itemData.price),
        category: itemData.category || 'Main Course',
        type: itemData.type || 'VEG',
        is_in_stock: itemData.isInStock ?? true,
        photo_url: photoVal,
      }

      const { data, error } = await supabase
        .from('menu_items')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        return normalizeMenuItem({ ...data, photo_url: photoVal || data.photo_url })
      }
    } catch (err) {}
  }
  return normalizedNewItem
}

/** Update an existing menu item in Supabase DB */
export const updateMenuItem = async (itemId, itemData, restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  const photoVal = itemData.photo || itemData.photo_url || itemData.image_url || itemData.image || null

  const updatedItem = normalizeMenuItem({
    id: itemId,
    name: itemData.name,
    description: itemData.description || '',
    price: Number(itemData.price),
    category: itemData.category,
    type: itemData.type || 'VEG',
    isInStock: itemData.isInStock ?? true,
    photo: photoVal,
  })

  if (restaurantId) {
    try {
      const localRaw = localStorage.getItem(`servora_menu_items_${restaurantId}`)
      if (localRaw) {
        const items = JSON.parse(localRaw).map(i => (i.id === itemId || i._id === itemId) ? { ...i, ...updatedItem } : i)
        localStorage.setItem(`servora_menu_items_${restaurantId}`, JSON.stringify(items))
      }
    } catch (e) {}
  }

  if (isUUID(itemId)) {
    await ensureAdminSession()
    try {
      const payload = {
        name: itemData.name,
        description: itemData.description || '',
        price: Number(itemData.price),
        category: itemData.category,
        type: itemData.type || 'VEG',
        is_in_stock: itemData.isInStock ?? true,
        photo_url: photoVal,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('menu_items')
        .update(payload)
        .eq('id', itemId)
        .select()
        .single()

      if (!error && data) {
        return normalizeMenuItem({ ...data, photo_url: photoVal || data.photo_url })
      }
    } catch (e) {}
  } else if (restaurantId) {
    const uuid = await ensureValidRestaurantUUID(restaurantId)
    if (uuid) {
      try {
        const payload = {
          restaurant_id: uuid,
          name: itemData.name,
          description: itemData.description || '',
          price: Number(itemData.price),
          category: itemData.category,
          type: itemData.type || 'VEG',
          is_in_stock: itemData.isInStock ?? true,
          photo_url: photoVal,
        }

        const { data, error } = await supabase
          .from('menu_items')
          .insert(payload)
          .select()
          .single()

        if (!error && data) {
          return normalizeMenuItem({ ...data, photo_url: photoVal || data.photo_url })
        }
      } catch (err) {}
    }
  }
  return updatedItem
}

/** Toggle stock status in Supabase DB */
export const toggleMenuItemStock = async (itemId, isInStock, restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  if (isUUID(itemId)) {
    await ensureAdminSession()
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ is_in_stock: isInStock, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single()
      if (!error && data) {
        return normalizeMenuItem(data)
      }
    } catch (e) {}
  }
  return { id: itemId, _id: itemId, isInStock }
}

/** Delete a menu item directly from Supabase DB and purge local cache */
export const deleteMenuItem = async (itemId, restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('servora_menu_items_')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const items = JSON.parse(raw).filter(item => (item.id !== itemId && item._id !== itemId))
          localStorage.setItem(key, JSON.stringify(items))
        }
      }
    }
  } catch (e) {}

  if (isUUID(itemId)) {
    await ensureAdminSession()
    let retries = 3
    while (retries > 0) {
      try {
        const { error } = await supabase.from('menu_items').delete().eq('id', itemId)
        if (!error) return true
      } catch (err) {}
      retries--
      if (retries > 0) await new Promise(r => setTimeout(r, 400))
    }
  }
  return true
}

export const getMenuItems = async (restaurantId) => {
  return fetchMenuItems(restaurantId)
}

export const getCategories = async (restaurantId) => {
  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid) return []

  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', uuid)
    .order('order_index', { ascending: true })

  if (error) return []
  return data || []
}

export const syncCategories = async (restaurantId, categoryNames) => {
  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid || !categoryNames || categoryNames.length === 0) return

  const payloads = categoryNames.map((name, index) => ({
    restaurant_id: uuid,
    name,
    order_index: index
  }))

  await supabase
    .from('menu_categories')
    .upsert(payloads, { onConflict: 'restaurant_id, name' })
}
