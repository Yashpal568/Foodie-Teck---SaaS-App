import React, { useMemo, useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, ChefHat, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useOrderManagement } from '@/hooks/useOrderManagement'
import { useTableSessions } from '@/hooks/useTableSessions'
import { getMenuItems } from '@/lib/api'

// Mini sparkline chart (SVG-based, no library needed)
function Sparkline({ data = [], color = '#6366f1', height = 32 }) {
  if (!data || data.length < 2) {
    return <div style={{ height }} />
  }
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const h = height
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot at end */}
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) / (data.length - 1) * w}
          cy={h - ((data[data.length - 1] - min) / range) * h}
          r="3"
          fill={color}
        />
      )}
    </svg>
  )
}

// Animated number counter
function AnimatedNumber({ value, prefix = '', suffix = '', className = '' }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const target = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0
    const start = prev.current
    prev.current = target
    if (start === target) {
      setDisplay(target)
      return
    }
    const duration = 700
    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - elapsed, 3) // ease out cubic
      setDisplay(start + (target - start) * eased)
      if (elapsed < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])

  const formatted = typeof value === 'string' && value.includes('₹')
    ? `₹${Math.round(display).toLocaleString('en-IN')}`
    : String(Math.round(display))

  return <span className={className}>{formatted}{suffix}</span>
}

import { formatLocalDateKey, shiftLocalDateKey, deduplicateOrders } from '@/utils/analyticsHelpers'

const CARD_CONFIGS = [
  {
    key: 'revenue',
    title: "Today's Revenue",
    subtitle: 'Today vs Yesterday',
    icon: DollarSign,
    gradient: 'from-violet-500 to-purple-600',
    lightBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    accent: '#7c3aed',
    border: 'border-violet-100',
  },
  {
    key: 'pending',
    title: 'Pending Orders',
    subtitle: 'Awaiting kitchen action',
    icon: Clock,
    gradient: 'from-rose-500 to-orange-500',
    lightBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    accent: '#e11d48',
    border: 'border-rose-100',
  },
  {
    key: 'tables',
    title: 'Active Tables',
    subtitle: 'Occupied right now',
    icon: Users,
    gradient: 'from-blue-500 to-cyan-600',
    lightBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    accent: '#2563eb',
    border: 'border-blue-100',
  },
  {
    key: 'orders',
    title: "Today's Orders",
    subtitle: 'Orders placed today',
    icon: ShoppingCart,
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    accent: '#059669',
    border: 'border-emerald-100',
  },
  {
    key: 'menu',
    title: 'Menu Items',
    subtitle: 'Active items listed',
    icon: ChefHat,
    gradient: 'from-amber-500 to-orange-600',
    lightBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    accent: '#d97706',
    border: 'border-amber-100',
  },
]

export default function OverviewCards({ restaurantId = 'default', selectedDate = '' }) {
  const { stats: orderStats, orders: activeOrders, orderHistory } = useOrderManagement(restaurantId)
  const { stats: tableStats, tables } = useTableSessions(restaurantId)
  const [menuCount, setMenuCount] = useState(0)

  useEffect(() => {
    const loadMenuCount = () => {
      if (restaurantId && restaurantId !== 'guest') {
        getMenuItems(restaurantId)
          .then(items => setMenuCount(Array.isArray(items) ? items.length : 0))
          .catch(() => setMenuCount(0))
      } else {
        setMenuCount(0)
      }
    }
    loadMenuCount()
    window.addEventListener('menuUpdated', loadMenuCount)
    window.addEventListener('storage', loadMenuCount)
    return () => {
      window.removeEventListener('menuUpdated', loadMenuCount)
      window.removeEventListener('storage', loadMenuCount)
    }
  }, [restaurantId])

  const todayKey = formatLocalDateKey()
  const activeDateKey = selectedDate || todayKey
  const yesterdayKey = shiftLocalDateKey(todayKey, -1)
  const prevDateKey = shiftLocalDateKey(activeDateKey, -1)
  const isTodayView = activeDateKey === todayKey
  const isYesterdayView = activeDateKey === yesterdayKey

  const formatShortLabel = (dateKey) => {
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return ''
    const [y, m, d] = dateKey.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const stats = useMemo(() => {
    const allOrders = deduplicateOrders([...(activeOrders || []), ...(orderHistory || [])])

    const getOrderDateStr = (order) => {
      const raw = order?.created_at || order?.createdAt || order?.date
      if (!raw) return null
      try {
        const d = new Date(raw)
        return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-CA')
      } catch {
        return null
      }
    }

    const getOrderTotal = (order) => {
      return Number(order?.total_amount || order?.total || order?.final_amount || 0)
    }

    // Revenue (exclude CANCELLED orders) for selectedDate & previous day comparison
    const selectedOrdersList = allOrders.filter(o => getOrderDateStr(o) === activeDateKey)
    const prevDayOrdersList = allOrders.filter(o => getOrderDateStr(o) === prevDateKey)

    const selectedRevenueOrders = selectedOrdersList.filter(o => String(o.status || '').toUpperCase() !== 'CANCELLED')
    const prevRevenueOrders = prevDayOrdersList.filter(o => String(o.status || '').toUpperCase() !== 'CANCELLED')

    const selectedRevenue = selectedRevenueOrders.reduce((sum, o) => sum + getOrderTotal(o), 0)
    const prevRevenue = prevRevenueOrders.reduce((sum, o) => sum + getOrderTotal(o), 0)
    const revenueDiff = prevRevenue > 0 
      ? Math.round(((selectedRevenue - prevRevenue) / prevRevenue) * 100 * 10) / 10
      : (selectedRevenue > 0 ? 100 : 0)

    // Pending Orders (live queue when Today; settled/open breakdown when viewing past date)
    const pendingList = (activeOrders || []).filter(o => ['PENDING', 'ORDERED'].includes(String(o.status || '').toUpperCase()))
    const preparingList = (activeOrders || []).filter(o => ['PREPARING', 'COOKING', 'READY'].includes(String(o.status || '').toUpperCase()))
    const settledSelectedCount = selectedOrdersList.filter(o => String(o.status || '').toUpperCase() === 'FINISHED').length
    const cancelledSelectedCount = selectedOrdersList.filter(o => String(o.status || '').toUpperCase() === 'CANCELLED').length
    const pendingCount = isTodayView ? pendingList.length : settledSelectedCount
    const activeQueueCount = (activeOrders || []).length

    // Orders
    const selectedOrdersCount = selectedRevenueOrders.length
    const prevOrdersCount = prevRevenueOrders.length
    const ordersDiff = prevOrdersCount > 0 
      ? Math.round(((selectedOrdersCount - prevOrdersCount) / prevOrdersCount) * 100 * 10) / 10
      : (selectedOrdersCount > 0 ? 100 : 0)

    // Tables
    const activeTables = (tableStats?.occupied || 0) + (tableStats?.billing || 0)
    const totalTables = tableStats?.total || (tables?.length || 0)

    const effectiveMenuCount = menuCount || 0
    const prevLabel = isTodayView ? 'yesterday' : formatShortLabel(prevDateKey)
    const shortSelectedLabel = isTodayView ? "Today's" : isYesterdayView ? "Yesterday's" : `${formatShortLabel(activeDateKey)}`

    const sparkRevenue = selectedRevenue > 0
      ? [selectedRevenue * 0.4, selectedRevenue * 0.6, selectedRevenue * 0.8, selectedRevenue * 0.7, selectedRevenue * 0.9, selectedRevenue]
      : (prevRevenue > 0 ? [prevRevenue * 0.5, prevRevenue, 0, 0, 0] : [0, 0, 0, 0, 0])

    const sparkPending = pendingCount > 0
      ? [0, 1, Math.max(1, pendingCount - 1), pendingCount, pendingCount]
      : [0, 0, 0, 0, 0]

    const sparkOrders = selectedOrdersCount > 0
      ? [selectedOrdersCount * 0.4, selectedOrdersCount * 0.7, selectedOrdersCount * 0.6, selectedOrdersCount * 0.8, selectedOrdersCount * 0.9, selectedOrdersCount]
      : (prevOrdersCount > 0 ? [prevOrdersCount * 0.5, prevOrdersCount, 0, 0, 0] : [0, 0, 0, 0, 0])

    const sparkTables = activeTables > 0
      ? [1, 1, activeTables * 0.8, activeTables * 0.9, activeTables]
      : [0, 0, 0, 0, 0]

    const sparkMenu = effectiveMenuCount > 0
      ? [effectiveMenuCount * 0.5, effectiveMenuCount * 0.7, effectiveMenuCount * 0.85, effectiveMenuCount, effectiveMenuCount]
      : [0, 0, 0, 0, 0]

    return {
      revenue: {
        titleOverride: `${shortSelectedLabel} Revenue`,
        value: `₹${Math.round(selectedRevenue).toLocaleString('en-IN')}`,
        rawValue: selectedRevenue,
        change: revenueDiff,
        detail: prevRevenue > 0 
          ? `₹${Math.round(prevRevenue).toLocaleString('en-IN')} ${prevLabel}` 
          : (selectedRevenue > 0 ? `${selectedOrdersCount} billable orders` : `No revenue on ${isTodayView ? 'today' : formatShortLabel(activeDateKey)}`),
        sparkData: sparkRevenue,
      },
      pending: {
        titleOverride: isTodayView ? 'Pending Orders' : 'Settled Bills',
        value: `${pendingCount}`,
        rawValue: pendingCount,
        change: isTodayView && pendingCount > 0 && activeQueueCount > 0 ? Math.round((pendingCount / activeQueueCount) * 100) : 0,
        detail: isTodayView
          ? (pendingCount > 0
              ? `${pendingCount} new · ${preparingList.length} in kitchen`
              : (preparingList.length > 0 ? `${preparingList.length} active in kitchen` : 'No pending orders right now'))
          : `${settledSelectedCount} finished · ${cancelledSelectedCount} cancelled`,
        sparkData: sparkPending,
      },
      tables: {
        value: `${activeTables}`,
        rawValue: activeTables,
        change: totalTables > 0 && activeTables > 0 ? Math.round((activeTables / totalTables) * 100) : 0,
        detail: totalTables > 0 ? `${totalTables} tables configured on floor` : 'No tables configured yet',
        sparkData: sparkTables,
      },
      orders: {
        titleOverride: `${shortSelectedLabel} Orders`,
        value: `${selectedOrdersCount}`,
        rawValue: selectedOrdersCount,
        change: ordersDiff,
        detail: prevOrdersCount > 0 
          ? `${prevOrdersCount} orders ${prevLabel}` 
          : (selectedOrdersCount > 0 ? `Orders placed ${isTodayView ? 'today' : formatShortLabel(activeDateKey)}` : `No orders on ${isTodayView ? 'today' : formatShortLabel(activeDateKey)}`),
        sparkData: sparkOrders,
      },
      menu: {
        value: `${effectiveMenuCount}`,
        rawValue: effectiveMenuCount,
        change: 0,
        detail: effectiveMenuCount > 0 ? `${effectiveMenuCount} active items in catalog` : 'Catalog is currently empty',
        sparkData: sparkMenu,
      },
    }
  }, [orderStats, activeOrders, orderHistory, tableStats, tables, menuCount, activeDateKey, prevDateKey, isTodayView, isYesterdayView])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {CARD_CONFIGS.map((config, idx) => {
        const stat = stats[config.key]
        const isUp = stat.change >= 0
        const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight
        const barWidth =
          config.key === 'revenue'
            ? (stat.rawValue > 0 ? 74 : 0)
            : config.key === 'pending'
              ? Math.min(100, (stat.rawValue || 0) * 20)
              : config.key === 'tables'
                ? Math.min(100, Math.max(0, stat.change || (stat.rawValue > 0 ? 60 : 0)))
                : config.key === 'orders'
                  ? Math.min(100, (stat.rawValue || 0) * 10)
                  : Math.min(100, (stat.rawValue || 0) * 5)

        return (
          <div
            key={config.key}
            className={`bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_-4px_rgba(9,13,31,0.05)] hover:border-[#C7D7FE] p-4 flex flex-col justify-between transition-all duration-200 ${
              idx === 4 ? 'col-span-2 md:col-span-1' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`w-9 h-9 rounded-xl ${config.lightBg} ${config.iconColor} flex items-center justify-center shrink-0`}>
                <config.icon className="w-4 h-4" />
              </span>

              {stat.change !== 0 ? (
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  <TrendIcon className="w-3 h-3" />
                  {Math.abs(stat.change).toFixed(1)}%
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[90px]">
                  {config.key === 'menu' ? 'Live QR' : config.key === 'pending' ? 'KDS' : '0% Cut'}
                </span>
              )}
            </div>

            <div className="mt-3">
              <p className="text-2xl font-extrabold text-[#090D1F] tracking-tight leading-none truncate">
                {stat.value}
              </p>
              <p className="text-xs font-semibold text-slate-600 mt-1 truncate">
                {stat.titleOverride || config.title}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, backgroundColor: config.accent }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate">{stat.detail}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
