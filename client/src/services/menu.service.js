import { supabase } from '../lib/supabase'
import { ensureValidRestaurantUUID } from './restaurant.service'
import { uploadToCloudinary, isBase64Image } from './cloudinary.service'
import { assertMerchantOperational } from '../lib/merchantAuth'

async function uploadPhotoIfBase64(photoVal, _itemId, restaurantId) {
  if (!photoVal) return ''
  if (typeof photoVal === 'string' && !isBase64Image(photoVal)) {
    return photoVal
  }

  const uuid = restaurantId === 'demo-merchant' || restaurantId === 'demo'
    ? 'demo-merchant'
    : await ensureValidRestaurantUUID(restaurantId)

  const cdnUrl = await uploadToCloudinary(photoVal, 'menu', uuid)
  if (!cdnUrl || isBase64Image(cdnUrl)) {
    throw new Error('Failed to upload image to Cloudinary CDN.')
  }
  return cdnUrl
}

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
    quantity: item.quantity !== undefined ? item.quantity : null,
    halfPrice: (item.half_price !== undefined && item.half_price !== null) 
      ? Number(item.half_price) 
      : (item.halfPrice !== undefined && item.halfPrice !== null ? Number(item.halfPrice) : null),
    photo: photo,
    photo_url: photo,
    image_url: photo,
    image: photo,
    imageUrl: photo,
    created_at: item.created_at || item.createdAt || new Date().toISOString()
  }
}

export const DEFAULT_SAMPLE_MENU = [
  {
    id: 'item-sample-1',
    name: 'Steamed Veg Momos',
    category: 'Starters',
    price: 140,
    halfPrice: 80,
    quantity: 12,
    type: 'VEG',
    description: 'Juicy steamed dumplings served with spicy red chutney and garlic mayo dip.',
    isInStock: true,
    photo_url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'item-sample-2',
    name: 'Crispy Paneer Burger',
    category: 'Burgers',
    price: 180,
    halfPrice: 110,
    quantity: 1,
    type: 'VEG',
    description: 'Golden spiced paneer patty with lettuce, tomatoes, and chef secret chipotle sauce.',
    isInStock: true,
    photo_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'item-sample-3',
    name: 'Farmhouse Special Pizza (10")',
    category: 'Pizza',
    price: 340,
    halfPrice: 210,
    quantity: 1,
    type: 'VEG',
    description: 'Hand-stretched pizza topped with bell peppers, olives, mushrooms, and melted mozzarella.',
    isInStock: true,
    photo_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'item-sample-4',
    name: 'Paneer Butter Masala',
    category: 'Main Course',
    price: 280,
    halfPrice: 160,
    quantity: 1,
    type: 'VEG',
    description: 'Fresh cottage cheese simmered in a velvety, rich tomato, butter, and cashew gravy.',
    isInStock: true,
    photo_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'item-sample-5',
    name: 'Butter Garlic Naan',
    category: 'Breads',
    price: 60,
    halfPrice: null,
    quantity: 1,
    type: 'VEG',
    description: 'Tandoor-baked flatbread brushed with roasted garlic and salted butter.',
    isInStock: true,
    photo_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'item-sample-6',
    name: 'Classic Cold Coffee with Ice Cream',
    category: 'Beverages',
    price: 130,
    halfPrice: null,
    quantity: 1,
    type: 'VEG',
    description: 'Chilled brewed espresso blended with rich milk and topped with vanilla ice cream.',
    isInStock: true,
    photo_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80'
  }
]

/** Fetch menu items dynamically from Supabase DB (fallback to sample menu ONLY for isolated demo mode) */
export const fetchMenuItems = async (restaurantId) => {
  if (restaurantId === 'demo-merchant' || restaurantId === 'demo') {
    return DEFAULT_SAMPLE_MENU.map(normalizeMenuItem)
  }

  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid) return []

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, restaurant_id, name, description, price, half_price, quantity, category, type, is_in_stock, photo_url, created_at')
    .eq('restaurant_id', uuid)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchMenuItems Supabase query error:', error)
    throw error
  }

  return (data || []).map(normalizeMenuItem)
}

/** Create a new menu item directly in Supabase DB (fails loudly on real DB errors) */
export const createMenuItem = async (restaurantId, itemData) => {
  const newItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  let photoVal = itemData.photo || itemData.photo_url || itemData.image_url || itemData.image || null
  photoVal = await uploadPhotoIfBase64(photoVal, newItemId, restaurantId)

  if (restaurantId === 'demo-merchant' || restaurantId === 'demo') {
    return normalizeMenuItem({
      id: newItemId,
      name: itemData.name,
      description: itemData.description || '',
      price: Math.max(0, Number(itemData.price) || 0),
      category: itemData.category || 'Main Course',
      type: itemData.type || 'VEG',
      isInStock: itemData.isInStock ?? true,
      quantity: itemData.quantity !== '' && itemData.quantity !== undefined && itemData.quantity !== null ? Number(itemData.quantity) : null,
      halfPrice: itemData.halfPrice !== '' && itemData.halfPrice !== undefined && itemData.halfPrice !== null ? Math.max(0, Number(itemData.halfPrice)) : null,
      photo: photoVal,
      created_at: new Date().toISOString()
    })
  }

  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid) throw new Error('Valid restaurant UUID is required to create menu items.')
  await assertMerchantOperational(uuid)

  const payload = {
    restaurant_id: uuid,
    name: itemData.name,
    description: itemData.description || '',
    price: Math.max(0, Number(itemData.price) || 0),
    category: itemData.category || 'Main Course',
    type: itemData.type || 'VEG',
    is_in_stock: itemData.isInStock ?? true,
    quantity: itemData.quantity !== '' && itemData.quantity !== undefined && itemData.quantity !== null ? Number(itemData.quantity) : null,
    half_price: itemData.halfPrice !== '' && itemData.halfPrice !== undefined && itemData.halfPrice !== null ? Math.max(0, Number(itemData.halfPrice)) : null,
    photo_url: isBase64Image(photoVal) ? null : (photoVal || null),
  }

  const { data, error } = await supabase
    .from('menu_items')
    .insert(payload)
    .select('id, restaurant_id, name, description, price, half_price, quantity, category, type, is_in_stock, photo_url, created_at')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save menu item.')
  }

  return normalizeMenuItem({ ...data, photo_url: photoVal || data.photo_url })
}

/** Update an existing menu item in Supabase DB */
export const updateMenuItem = async (itemId, itemData, restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  if (restaurantId === 'demo-merchant' || restaurantId === 'demo') {
    return normalizeMenuItem({ id: itemId, ...itemData })
  }
  if (restaurantId) {
    const checkUuid = isUUID(restaurantId) ? restaurantId : await ensureValidRestaurantUUID(restaurantId)
    if (checkUuid) await assertMerchantOperational(checkUuid)
  } else if (isUUID(itemId)) {
    const { data: existingItem } = await supabase.from('menu_items').select('restaurant_id').eq('id', itemId).maybeSingle()
    if (existingItem?.restaurant_id) await assertMerchantOperational(existingItem.restaurant_id)
  }
  let photoVal = itemData.photo || itemData.photo_url || itemData.image_url || itemData.image || null
  photoVal = await uploadPhotoIfBase64(photoVal, itemId, restaurantId)

  if (isUUID(itemId)) {
    try {
      const payload = {
        name: itemData.name,
        description: itemData.description || '',
        price: Math.max(0, Number(itemData.price) || 0),
        category: itemData.category,
        type: itemData.type || 'VEG',
        is_in_stock: itemData.isInStock ?? true,
        quantity: itemData.quantity !== '' && itemData.quantity !== undefined && itemData.quantity !== null ? Number(itemData.quantity) : null,
        half_price: itemData.halfPrice !== '' && itemData.halfPrice !== undefined && itemData.halfPrice !== null ? Math.max(0, Number(itemData.halfPrice)) : null,
        photo_url: isBase64Image(photoVal) ? null : (photoVal || null),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('menu_items')
        .update(payload)
        .eq('id', itemId)
        .select('id, restaurant_id, name, description, price, half_price, quantity, category, type, is_in_stock, photo_url, created_at')
        .single()

      if (!error && data) {
        return normalizeMenuItem({ ...data, photo_url: photoVal || data.photo_url })
      }
    } catch (e) {
      console.error('updateMenuItem error:', e)
    }
  } else if (restaurantId) {
    const uuid = await ensureValidRestaurantUUID(restaurantId)
    if (uuid) {
      try {
        const payload = {
          restaurant_id: uuid,
          name: itemData.name,
          description: itemData.description || '',
          price: Math.max(0, Number(itemData.price) || 0),
          category: itemData.category,
          type: itemData.type || 'VEG',
          is_in_stock: itemData.isInStock ?? true,
          quantity: itemData.quantity !== '' && itemData.quantity !== undefined && itemData.quantity !== null ? Number(itemData.quantity) : null,
          half_price: itemData.halfPrice !== '' && itemData.halfPrice !== undefined && itemData.halfPrice !== null ? Math.max(0, Number(itemData.halfPrice)) : null,
          photo_url: isBase64Image(photoVal) ? null : (photoVal || null),
        }

        const { data, error } = await supabase
          .from('menu_items')
          .insert(payload)
          .select('id, restaurant_id, name, description, price, half_price, quantity, category, type, is_in_stock, photo_url, created_at')
          .single()

        if (!error && data) {
          return normalizeMenuItem({ ...data, photo_url: photoVal || data.photo_url })
        }
        throw new Error(error?.message || 'Failed to add menu item.')
      } catch (err) {
        console.error('addMenuItem DB error:', err)
        throw err
      }
    }
  }

  return normalizeMenuItem({
    id: itemId,
    name: itemData.name,
    description: itemData.description || '',
    price: Number(itemData.price),
    category: itemData.category,
    type: itemData.type || 'VEG',
    isInStock: itemData.isInStock ?? true,
    quantity: itemData.quantity !== '' && itemData.quantity !== undefined && itemData.quantity !== null ? Number(itemData.quantity) : null,
    halfPrice: itemData.halfPrice !== '' && itemData.halfPrice !== undefined && itemData.halfPrice !== null ? Math.max(0, Number(itemData.halfPrice)) : null,
    photo: photoVal,
  })
}

/** Toggle stock status directly in Supabase DB (scoped by restaurantId when supplied) */
export const toggleMenuItemStock = async (itemId, isInStock, restaurantId = null) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  if (restaurantId === 'demo-merchant' || restaurantId === 'demo' || !isUUID(itemId)) {
    return { id: itemId, _id: itemId, isInStock }
  }

  let q = supabase
    .from('menu_items')
    .update({ is_in_stock: isInStock, updated_at: new Date().toISOString() })
    .eq('id', itemId)

  if (restaurantId && isUUID(restaurantId)) {
    await assertMerchantOperational(restaurantId)
    q = q.eq('restaurant_id', restaurantId)
  }

  const { data, error } = await q.select().single()
  if (error || !data) {
    throw new Error(error?.message || 'Failed to update stock status.')
  }
  return normalizeMenuItem(data)
}

/** Delete a menu item directly from Supabase DB (scoped by restaurantId when supplied) */
export const deleteMenuItem = async (itemId, restaurantId = null) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  if (restaurantId === 'demo-merchant' || restaurantId === 'demo' || !isUUID(itemId)) {
    return true
  }

  let q = supabase.from('menu_items').delete().eq('id', itemId)
  if (restaurantId && isUUID(restaurantId)) {
    await assertMerchantOperational(restaurantId)
    q = q.eq('restaurant_id', restaurantId)
  } else {
    const { data: existingItem } = await supabase.from('menu_items').select('restaurant_id').eq('id', itemId).maybeSingle()
    if (existingItem?.restaurant_id) await assertMerchantOperational(existingItem.restaurant_id)
  }
  const { error } = await q
  if (error) {
    throw new Error(error.message || 'Failed to delete menu item.')
  }
  return true
}

export const getMenuItems = async (restaurantId) => {
  return fetchMenuItems(restaurantId)
}

/** Bulk add menu items directly in Supabase */
export const bulkAddMenuItems = async (restaurantId, items) => {
  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid) return items.map(normalizeMenuItem)
  await assertMerchantOperational(uuid)

  const formattedItems = await Promise.all(items.map(async (item) => {
    const norm = normalizeMenuItem(item)
    let photoUrl = norm.photo || norm.photo_url || ''
    if (photoUrl && isBase64Image(photoUrl)) {
      try {
        const cdnUrl = await uploadToCloudinary(photoUrl, 'servora_menu', uuid)
        if (cdnUrl) photoUrl = cdnUrl
      } catch (uploadErr) {
        console.warn('Menu item photo upload skipped:', uploadErr?.message || uploadErr)
      }
    }
    return {
      restaurant_id: uuid,
      name: norm.name,
      description: norm.description || '',
      price: norm.price || 0,
      half_price: norm.halfPrice ?? null,
      quantity: norm.quantity ?? null,
      category: norm.category || 'Main Course',
      type: norm.type || 'VEG',
      is_in_stock: norm.isInStock ?? true,
      photo_url: isBase64Image(photoUrl) ? null : (photoUrl || null)
    }
  }))

  try {
    const { data, error } = await supabase
      .from('menu_items')
      .insert(formattedItems)
      .select('id, restaurant_id, name, description, price, half_price, quantity, category, type, is_in_stock, photo_url, created_at')

    if (!error && data) {
      return data.map(normalizeMenuItem)
    }
  } catch (err) {
    console.error('bulkAddMenuItems error:', err)
  }

  return items.map(normalizeMenuItem)
}

/** Bulk replace menu items directly in Supabase */
export const bulkReplaceMenuItems = async (restaurantId, items) => {
  const uuid = await ensureValidRestaurantUUID(restaurantId)
  if (!uuid) return []
  await assertMerchantOperational(uuid)

  const formattedItems = await Promise.all(items.map(async (item) => {
    const norm = normalizeMenuItem(item)
    let photoUrl = norm.photo || norm.photo_url || ''
    if (photoUrl && isBase64Image(photoUrl)) {
      try {
        const cdnUrl = await uploadToCloudinary(photoUrl, 'servora_menu', uuid)
        if (cdnUrl) photoUrl = cdnUrl
      } catch (uploadErr) {
        console.warn('Menu item photo upload skipped:', uploadErr?.message || uploadErr)
      }
    }
    return {
      restaurant_id: uuid,
      name: norm.name,
      description: norm.description || '',
      price: norm.price || 0,
      category: norm.category || 'Main Course',
      type: norm.type || 'VEG',
      is_in_stock: norm.isInStock ?? true,
      photo_url: isBase64Image(photoUrl) ? null : (photoUrl || null)
    }
  }))

  const { data, error } = await supabase
    .from('menu_items')
    .insert(formattedItems)
    .select('id, restaurant_id, name, description, price, half_price, quantity, category, type, is_in_stock, photo_url, created_at')

  if (error) {
    console.error('bulkReplaceMenuItems error:', error)
    throw error
  }

  return (data || []).map(normalizeMenuItem)
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
  await assertMerchantOperational(uuid)

  const payloads = categoryNames.map((name, index) => ({
    restaurant_id: uuid,
    name,
    order_index: index
  }))

  await supabase
    .from('menu_categories')
    .upsert(payloads, { onConflict: 'restaurant_id, name' })
}
