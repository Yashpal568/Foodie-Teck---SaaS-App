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

/**
 * Compute headline analytics totals cleanly within the selected day range,
 * strictly excluding CANCELLED orders.
 */
export function computeAnalyticsSummary({
  orders = [],
  orderHistory = [],
  timeRange = '30days',
  nowMs = Date.now(),
} = {}) {
  const billableOrders = filterBillableOrders([...(orders || []), ...(orderHistory || [])])

  const daysCutoff =
    timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : timeRange === '90days' ? 90 : 3650
  const cutoffMs = nowMs - daysCutoff * 24 * 60 * 60 * 1000

  const filtered = billableOrders.filter((order) => {
    const ts = getOrderTimestamp(order)
    if (ts === null) return timeRange === 'all'
    return ts >= cutoffMs
  })

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
 * Compute daily or monthly revenue trend excluding CANCELLED orders.
 */
export function computeRevenueTrend(orders = [], timeRange = '30days', now = new Date()) {
  const billable = filterBillableOrders(orders)
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
