import { supabase } from '../lib/supabase'

/** Record a manual price change to audit_logs for real-time history tracking */
export const recordPriceChange = async (restaurantId, itemName, oldPrice, newPrice, itemId) => {
  const { error } = await supabase
    .from('audit_logs')
    .insert([{
      action: `PRICE_UPDATE | ${itemName} | ${oldPrice} | ${newPrice} | ${itemId || ''}`,
      type: 'MENU_CHANGE',
      actor: 'system',
      restaurant_id: restaurantId,
      severity: 'NOMINAL'
    }])
  if (error) console.error('Price change log error:', error)
}

/** Fetch Price History Analytics from BOTH sales data and manual audit logs */
export const fetchPriceHistory = async (restaurantId) => {
  const { data: salesData, error: salesError } = await supabase
    .from('order_items')
    .select('name, price, menu_item_id, orders!inner(created_at, restaurant_id)')
    .eq('orders.restaurant_id', restaurantId)

  const { data: logData, error: logError } = await supabase
    .from('audit_logs')
    .select('action, created_at')
    .eq('restaurant_id', restaurantId)
    .eq('type', 'MENU_CHANGE')
    .like('action', 'PRICE_UPDATE%')

  if (salesError) throw salesError
  if (logError) throw logError

  const historyMap = {}

  salesData?.forEach(item => {
    const key = item.menu_item_id || item.name
    if (!historyMap[key]) historyMap[key] = { itemName: item.name, changes: [] }
    const date = item.orders?.created_at || (Array.isArray(item.orders) && item.orders[0]?.created_at)
    historyMap[key].changes.push({ date, price: item.price, type: 'sale' })
  })

  logData?.forEach(log => {
    const parts = log.action.split(' | ')
    if (parts.length >= 4) {
      const name = parts[1]
      const oldPrice = parseFloat(parts[2])
      const newPrice = parseFloat(parts[3])
      const key = parts[4] || name
      if (!historyMap[key]) historyMap[key] = { itemName: name, changes: [] }
      historyMap[key].changes.push({ date: log.created_at, price: newPrice, oldPrice: oldPrice, type: 'setting' })
    }
  })

  Object.values(historyMap).forEach(item => {
    const sorted = item.changes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const processed = []
    for (let i = 0; i < sorted.length; i++) {
       const current = sorted[i]
       const prev = sorted[i-1]
       const oldPrice = current.type === 'setting' ? current.oldPrice : (prev ? prev.price : current.price)
       if (current.price !== oldPrice) {
         processed.unshift({
            date: current.date,
            oldPrice: oldPrice,
            newPrice: current.price,
            change: current.price - oldPrice,
            changePercent: oldPrice !== 0 ? ((current.price - oldPrice) / oldPrice * 100).toFixed(2) : "0.00",
            isSale: current.type === 'sale'
         })
       }
    }
    item.changes = processed
  })
  return historyMap
}

export const fetchGstSettings = async (restaurantId) => {
  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  if (!restaurantId || !isUUID(restaurantId)) {
    return { enabled: false, rate: 0, label: 'GST' }
  }
  try {
    const { data } = await supabase
      .from('gst_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    return data || { enabled: false, rate: 0, label: 'GST' }
  } catch (e) {
    return { enabled: false, rate: 0, label: 'GST' }
  }
}

export const saveGstSettings = async (restaurantId, gstData) => {
  const { error } = await supabase
    .from('gst_settings')
    .upsert({
      restaurant_id: restaurantId,
      enabled: gstData.enabled,
      rate: Number(gstData.rate) || 0,
      label: gstData.label || 'GST',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'restaurant_id' })
  if (error) throw error
  return true
}

export const fetchAllRestaurants = async () => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const fetchRevenueStats = async () => {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      id, business_name, email,
      orders (total, status)
    `)
  if (error) throw error

  return (data || []).map(rest => {
    const validOrders = rest.orders?.filter(o => o.status !== 'CANCELLED') || []
    const totalRev = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    return {
      id: rest.id,
      name: rest.business_name || rest.email,
      totalOrders: validOrders.length,
      totalRevenue: totalRev
    }
  })
}
