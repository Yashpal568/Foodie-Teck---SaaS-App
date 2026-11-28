/**
 * Pure analytics aggregation helpers.
 * Always excludes CANCELLED orders from revenue, sales trends, AOV, and category metrics
 * while preserving date-window filtering and historical non-cancelled records.
 */

export const isCancelledOrder = (order) =>
  String(order?.status || '').trim().toUpperCase() === 'CANCELLED'

export const filterBillableOrders = (orders = []) =>
  (Array.isArray(orders) ? orders : []).filter((order) => order && !isCancelledOrder(order))

export const getOrderTimestamp = (order) => {
  const raw = order?.created_at || order?.createdAt || order?.date
  if (!raw) return null
  const ms = new Date(raw).getTime()
  return Number.isFinite(ms) ? ms : null
}

export const getOrderTotal = (order) =>
  Number(order?.total_amount ?? order?.total ?? order?.final_amount ?? 0) || 0

export const formatLocalDateKey = (dateInput = new Date()) => {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA')
  } catch {
    return ''
  }
}

export const shiftLocalDateKey = (dateKey, deltaDays = 0) => {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return ''
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + deltaDays)
  return formatLocalDateKey(dt)
}

export const deduplicateOrders = (orders = []) => {
  const seen = new Map()
  ;(Array.isArray(orders) ? orders : []).forEach((o, idx) => {
    if (!o) return
    const key = o.id || `${o.created_at || o.createdAt || idx}_${o.table_number || o.tableNumber || ''}`
    if (!seen.has(key)) seen.set(key, o)
  })
  return Array.from(seen.values())
}

export const filterOrdersByDate = (orders = [], dateKey = '') => {
  if (!dateKey) return Array.isArray(orders) ? orders : []
  return deduplicateOrders(orders).filter((order) => {
    const ts = getOrderTimestamp(order)
    if (ts === null) return false
    return formatLocalDateKey(new Date(ts)) === dateKey
  })
}

export const resolveSelectedDateKey = ({ timeRange = '30days', selectedDate = '', nowMs = Date.now() } = {}) => {
  if (timeRange === 'today') return formatLocalDateKey(new Date(nowMs))
  if (timeRange === 'yesterday') {
    return shiftLocalDateKey(formatLocalDateKey(new Date(nowMs)), -1)
  }
  if (timeRange === 'custom_date' && selectedDate) return selectedDate
  return ''
}

/**
 * Compute headline analytics totals cleanly within the selected day range or exact date,
 * strictly excluding CANCELLED orders.
 */
export function computeAnalyticsSummary({
  orders = [],
  orderHistory = [],
  timeRange = '30days',
  selectedDate = '',
  nowMs = Date.now(),
} = {}) {
  const billableOrders = filterBillableOrders(deduplicateOrders([...(orders || []), ...(orderHistory || [])]))
  const singleDateKey = resolveSelectedDateKey({ timeRange, selectedDate, nowMs })

  let filtered
  if (singleDateKey) {
    filtered = billableOrders.filter((order) => {
      const ts = getOrderTimestamp(order)
      return ts !== null && formatLocalDateKey(new Date(ts)) === singleDateKey
    })
  } else {
    const daysCutoff =
      timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : timeRange === '90days' ? 90 : 3650
    const cutoffMs = nowMs - daysCutoff * 24 * 60 * 60 * 1000

    filtered = billableOrders.filter((order) => {
      const ts = getOrderTimestamp(order)
      if (ts === null) return timeRange === 'all'
      return ts >= cutoffMs
    })
  }

  const totalRevenue = filtered.reduce((sum, order) => sum + getOrderTotal(order), 0)
  const totalOrders = filtered.length
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  return {
    billableOrders: filtered,
    totalRevenue,
    totalOrders,
    avgOrderValue,
  }
}

/**
 * Compute custom date-range revenue stats while excluding CANCELLED orders.
 */
export function computeCustomDateRangeStats(orders = [], startDate = '', endDate = '') {
  if (!startDate && !endDate) {
    return { revenue: 0, orders: 0, avgValue: 0 }
  }

  const startObj = startDate ? new Date(startDate) : new Date(0)
  if (startDate) startObj.setHours(0, 0, 0, 0)

  const endObj = endDate ? new Date(endDate) : new Date()
  if (endDate) endObj.setHours(23, 59, 59, 999)

  const startMs = startObj.getTime()
  const endMs = endObj.getTime()

  const filtered = filterBillableOrders(orders).filter((order) => {
    const ts = getOrderTimestamp(order)
    return ts !== null && ts >= startMs && ts <= endMs
  })

  const revenue = filtered.reduce((sum, order) => sum + getOrderTotal(order), 0)
  const count = filtered.length
  return {
    revenue,
    orders: count,
    avgValue: count > 0 ? revenue / count : 0,
  }
}

/**
 * Compute daily, hourly (for single-date views), or monthly revenue trend excluding CANCELLED orders.
 */
export function computeRevenueTrend(orders = [], timeRange = '30days', now = new Date(), selectedDate = '') {
  const billable = filterBillableOrders(deduplicateOrders(orders))
  const singleDateKey = resolveSelectedDateKey({ timeRange, selectedDate, nowMs: now.getTime() })

  if (singleDateKey) {
    const dayOrders = filterOrdersByDate(billable, singleDateKey)
    if (dayOrders.length === 0) return []
    const buckets = [
      { label: '8-11 AM', start: 0, end: 12 },
      { label: '12-2 PM', start: 12, end: 15 },
      { label: '3-5 PM', start: 15, end: 18 },
      { label: '6-8 PM', start: 18, end: 21 },
      { label: '9-11 PM', start: 21, end: 24 },
    ]
    return buckets.map((b) => {
      const slotOrders = dayOrders.filter((o) => {
        const h = new Date(getOrderTimestamp(o)).getHours()
        return h >= b.start && h < b.end
      })
      return {
        name: b.label,
        date: b.label,
        revenue: slotOrders.reduce((sum, o) => sum + getOrderTotal(o), 0),
        orders: slotOrders.length,
        fullDate: `${singleDateKey} (${b.label})`,
      }
    })
  }

  if (billable.length === 0) return []

  if (timeRange === 'all') {
    const monthlyStats = {}
    billable.forEach((order) => {
      const ts = getOrderTimestamp(order)
      if (ts === null) return
      const date = new Date(ts)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          name: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          revenue: 0,
          orders: 0,
          fullDate: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          timestamp: date.getTime(),
        }
      }
      monthlyStats[monthKey].revenue += getOrderTotal(order)
      monthlyStats[monthKey].orders += 1
    })
    return Object.values(monthlyStats).sort((a, b) => a.timestamp - b.timestamp)
  }

  const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90
  const trend = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toLocaleDateString('en-CA')

    const dayOrders = billable.filter((order) => {
      const raw = order.createdAt || order.created_at
      if (!raw) return false
      const d = new Date(raw)
      return !isNaN(d.getTime()) && d.toLocaleDateString('en-CA') === dateStr
    })

    trend.push({
      name: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      revenue: dayOrders.reduce((sum, order) => sum + getOrderTotal(order), 0),
      orders: dayOrders.length,
      fullDate: date.toLocaleDateString('en-IN', { dateStyle: 'long' }),
    })
  }
  return trend
}

/**
 * Compute hourly peak bucket distribution excluding CANCELLED orders.
 */
export function computeHourlyPeakData(orders = []) {
  const billable = filterBillableOrders(orders)
  const hourMap = {
    'Morning (8 AM - 12 PM)': { rev: 0, count: 0 },
    'Lunch (12 PM - 3 PM)': { rev: 0, count: 0 },
    'Afternoon (3 PM - 6 PM)': { rev: 0, count: 0 },
    'Dinner Rush (6 PM - 9 PM)': { rev: 0, count: 0 },
    'Late Night (9 PM - 12 AM)': { rev: 0, count: 0 },
  }

  billable.forEach((order) => {
    const ts = getOrderTimestamp(order)
    const h = new Date(ts ?? Date.now()).getHours()
    const total = getOrderTotal(order)
    if (h >= 8 && h < 12) {
      hourMap['Morning (8 AM - 12 PM)'].rev += total
      hourMap['Morning (8 AM - 12 PM)'].count += 1
    } else if (h >= 12 && h < 15) {
      hourMap['Lunch (12 PM - 3 PM)'].rev += total
      hourMap['Lunch (12 PM - 3 PM)'].count += 1
    } else if (h >= 15 && h < 18) {
      hourMap['Afternoon (3 PM - 6 PM)'].rev += total
      hourMap['Afternoon (3 PM - 6 PM)'].count += 1
    } else if (h >= 18 && h < 21) {
      hourMap['Dinner Rush (6 PM - 9 PM)'].rev += total
      hourMap['Dinner Rush (6 PM - 9 PM)'].count += 1
    } else {
      hourMap['Late Night (9 PM - 12 AM)'].rev += total
      hourMap['Late Night (9 PM - 12 AM)'].count += 1
    }
  })

  return Object.entries(hourMap).map(([slot, data]) => ({
    slot,
    revenue: data.rev,
    orders: data.count,
  }))
}

function buildMenuLookup(menuItems = []) {
  const byId = new Map()
  const byName = new Map()
  ;(Array.isArray(menuItems) ? menuItems : []).forEach((m) => {
    if (!m) return
    const id = m.id || m._id
    if (id) byId.set(String(id), m)
    const nameKey = String(m.name || '').trim().toLowerCase()
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, m)
  })
  return { byId, byName }
}

function resolveMenuMatch(item, lookup) {
  const itemId = item?.menu_item_id || item?.id
  if (itemId && lookup.byId.has(String(itemId))) {
    return lookup.byId.get(String(itemId))
  }
  const nameKey = String(item?.name || item?.title || '').trim().toLowerCase()
  return nameKey ? lookup.byName.get(nameKey) || null : null
}

/**
 * Compute Menu Engineering item rankings strictly from real billable orders.
 * Never fabricates placeholder sales or views when no orders exist.
 */
export function computeMenuEngineeringItems({
  billableOrders = [],
  menuItems = [],
  sortBy = 'orders',
  limit = 5,
} = {}) {
  const orders = filterBillableOrders(billableOrders)
  if (orders.length === 0) return []

  const lookup = buildMenuLookup(menuItems)
  const itemMap = new Map()

  orders.forEach((order, orderIdx) => {
    const orderKey = order.id || `ord-${orderIdx}`
    const items = order.items || order.order_items || []
    items.forEach((line) => {
      const matchMenu = resolveMenuMatch(line, lookup)
      const displayName = String(matchMenu?.name || line?.name || line?.title || '').trim()
      if (!displayName) return

      const key = matchMenu?.id ? `id:${matchMenu.id}` : `name:${displayName.toLowerCase()}`
      const qty = Math.max(1, Number(line?.quantity) || 1)
      const unitPrice = Number(line?.price ?? matchMenu?.price ?? 0) || 0
      const lineRevenue = unitPrice * qty

      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item: {
            id: matchMenu?.id || line?.menu_item_id || line?.id || null,
            name: displayName,
            category: matchMenu?.category || line?.category || 'Other',
            price: Number(matchMenu?.price ?? unitPrice) || 0,
            photo: matchMenu?.photo_url || matchMenu?.photo || matchMenu?.image_url || null,
          },
          count: 0,
          revenue: 0,
          orderKeys: new Set(),
        })
      }

      const entry = itemMap.get(key)
      entry.count += qty
      entry.revenue += lineRevenue
      entry.orderKeys.add(orderKey)
    })
  })

  const allEntries = Array.from(itemMap.values())
  if (allEntries.length === 0) return []

  const totalUnits = allEntries.reduce((sum, e) => sum + e.count, 0) || 1
  const totalRevenue = allEntries.reduce((sum, e) => sum + e.revenue, 0) || 1

  const sorted = allEntries
    .sort((a, b) => {
      if (sortBy === 'revenue') {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue
        if (b.count !== a.count) return b.count - a.count
      } else {
        if (b.count !== a.count) return b.count - a.count
        if (b.revenue !== a.revenue) return b.revenue - a.revenue
      }
      return a.item.name.localeCompare(b.item.name)
    })
    .slice(0, limit)

  return sorted.map((entry) => ({
    item: entry.item,
    count: entry.count,
    orderCount: entry.orderKeys.size,
    revenue: entry.revenue,
    percentage:
      sortBy === 'revenue'
        ? ((entry.revenue / totalRevenue) * 100).toFixed(1)
        : ((entry.count / totalUnits) * 100).toFixed(1),
  }))
}

/**
 * Compute Category Velocity Breakdown strictly from active menuItems and scoped billableOrders.
 */
export function computeCategoryVelocity({ billableOrders = [], menuItems = [] } = {}) {
  const orders = filterBillableOrders(billableOrders)
  const lookup = buildMenuLookup(menuItems)
  const catMap = new Map()

  const ensureCategory = (catName) => {
    const label = String(catName || 'Other').trim() || 'Other'
    if (!catMap.has(label)) {
      catMap.set(label, {
        category: label,
        items: 0,
        orders: 0,
        revenue: 0,
        totalPrice: 0,
        avgPrice: 0,
      })
    }
    return catMap.get(label)
  }

  ;(Array.isArray(menuItems) ? menuItems : []).forEach((m) => {
    if (!m) return
    const bucket = ensureCategory(m.category)
    bucket.items += 1
    bucket.totalPrice += Number(m.price) || 0
  })

  orders.forEach((order) => {
    const items = order.items || order.order_items || []
    items.forEach((line) => {
      const matchMenu = resolveMenuMatch(line, lookup)
      const catName = matchMenu?.category || line?.category || 'Other'
      const bucket = ensureCategory(catName)
      const qty = Math.max(1, Number(line?.quantity) || 1)
      const unitPrice = Number(line?.price ?? matchMenu?.price ?? 0) || 0
      bucket.orders += qty
      bucket.revenue += unitPrice * qty
    })
  })

  let totalOrders = 0
  let totalRevenue = 0
  const categories = Array.from(catMap.values()).map((cat) => {
    const avgPrice = cat.items > 0 ? cat.totalPrice / cat.items : 0
    totalOrders += cat.orders
    totalRevenue += cat.revenue
    return {
      category: cat.category,
      items: cat.items,
      orders: cat.orders,
      revenue: cat.revenue,
      avgPrice,
    }
  })

  categories.sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue
    if (b.orders !== a.orders) return b.orders - a.orders
    return b.items - a.items
  })

  return {
    categories,
    totalOrders,
    totalRevenue,
  }
}
