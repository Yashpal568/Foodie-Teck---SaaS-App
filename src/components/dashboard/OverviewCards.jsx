import React, { useMemo, useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, ChefHat, ArrowUpRight, ArrowDownRight } from 'lucide-react'
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

export default function OverviewCards({ restaurantId = 'default' }) {
  const { stats: orderStats, orders: activeOrders, orderHistory } = useOrderManagement(restaurantId)
  const { stats: tableStats } = useTableSessions(restaurantId)
  const [menuCount, setMenuCount] = useState(0)

  useEffect(() => {
    if (restaurantId && restaurantId !== 'guest') {
      getMenuItems(restaurantId)
        .then(items => setMenuCount(Array.isArray(items) ? items.length : 0))
        .catch(() => setMenuCount(0))
    } else {
      setMenuCount(0)
    }
  }, [restaurantId])

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA')
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = yesterdayDate.toLocaleDateString('en-CA')

    const allOrders = [...(activeOrders || []), ...(orderHistory || [])]

    const getOrderDateStr = (order) => {
      const raw = order?.created_at || order?.createdAt || order?.date
      if (!raw) return today
      try {
        const d = new Date(raw)
        return isNaN(d.getTime()) ? today : d.toLocaleDateString('en-CA')
      } catch {
        return today
      }
    }

    const getOrderTotal = (order) => {
      return Number(order?.total_amount || order?.total || order?.final_amount || 0)
    }

    // Revenue
    const todayOrdersList = allOrders.filter(o => getOrderDateStr(o) === today)
    const yesterdayOrdersList = (orderHistory || []).filter(o => getOrderDateStr(o) === yesterday)

    const todayRevenue = todayOrdersList.reduce((sum, o) => sum + getOrderTotal(o), 0)
    const yesterdayRevenue = yesterdayOrdersList.reduce((sum, o) => sum + getOrderTotal(o), 0)
    const revenueDiff = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0

    // Orders
    const todayOrders = todayOrdersList.length
    const yesterdayOrders = yesterdayOrdersList.length
    const ordersDiff = yesterdayOrders > 0 
      ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100 
      : 0

    // Tables
    const activeTables = (tableStats?.occupied || 0) + (tableStats?.billing || 0)
    const totalTables = tableStats?.total || 0

    const sparkRevenue = yesterdayRevenue > 0 || todayRevenue > 0
      ? [yesterdayRevenue * 0.6, yesterdayRevenue * 0.8, yesterdayRevenue, todayRevenue * 0.7, todayRevenue * 0.9, todayRevenue]
      : [0, 0, 0, 0, 0]

    const sparkOrders = yesterdayOrders > 0 || todayOrders > 0
      ? [yesterdayOrders * 0.4, yesterdayOrders * 0.7, yesterdayOrders, todayOrders * 0.5, todayOrders * 0.8, todayOrders]
      : [0, 0, 0, 0, 0]

    const sparkTables = activeTables > 0
      ? [0, 1, activeTables * 0.5, activeTables * 0.8, activeTables]
      : [0, 0, 0, 0, 0]

    const sparkMenu = menuCount > 0
      ? [menuCount * 0.5, menuCount * 0.7, menuCount * 0.85, menuCount, menuCount]
      : [0, 0, 0, 0, 0]

    return {
      revenue: {
        value: `₹${Math.round(todayRevenue).toLocaleString('en-IN')}`,
        rawValue: todayRevenue,
        change: revenueDiff,
        detail: yesterdayRevenue > 0 
          ? `₹${Math.round(yesterdayRevenue).toLocaleString('en-IN')} yesterday` 
          : todayRevenue > 0 ? `${todayOrdersList.length} orders placed today` : 'No revenue yet today',
        sparkData: sparkRevenue,
      },
      tables: {
        value: `${activeTables}`,
        rawValue: activeTables,
        change: totalTables > 0 && activeTables > 0 ? Math.round((activeTables / totalTables) * 100) : 0,
        detail: totalTables > 0 ? `${totalTables} tables configured on floor` : 'No tables configured yet',
        sparkData: sparkTables,
      },
      orders: {
        value: `${todayOrders}`,
        rawValue: todayOrders,
        change: ordersDiff,
        detail: yesterdayOrders > 0 
          ? `${yesterdayOrders} orders yesterday` 
          : todayOrders > 0 ? 'Active orders placed today' : 'No orders placed today',
        sparkData: sparkOrders,
      },
      menu: {
        value: `${menuCount}`,
        rawValue: menuCount,
        change: 0,
        detail: menuCount > 0 ? `${menuCount} active items in catalog` : 'Catalog is currently empty',
        sparkData: sparkMenu,
      },
    }
  }, [orderStats, activeOrders, orderHistory, tableStats, menuCount])

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
      {CARD_CONFIGS.map((config) => {
        const stat = stats[config.key]
        const isUp = stat.change >= 0
        const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight

        return (
          <div
            key={config.key}
            className={`group relative bg-white rounded-2xl border ${config.border} px-3.5 py-3.5 sm:p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-default`}
          >
            {/* Background gradient orb */}
            <div className={`absolute -right-5 -top-5 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-linear-to-br ${config.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />

            {/* Top row: Icon + Trend badge */}
            <div className="flex items-start justify-between mb-2.5 sm:mb-4">
              <div className={`p-2 sm:p-2.5 rounded-xl ${config.lightBg}`}>
                <config.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.iconColor}`} />
              </div>

              {stat.change !== 0 && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
                  isUp
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  <TrendIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {Math.abs(stat.change).toFixed(1)}%
                </div>
              )}
            </div>

            {/* Value */}
            <div className="mb-0.5 sm:mb-1">
              <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none truncate">
                {stat.value}
              </p>
            </div>

            {/* Title */}
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mb-2.5 sm:mb-3 truncate">{config.title}</p>

            {/* Sparkline + detail */}
            <div className="flex items-end justify-between gap-1">
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-tight" style={{ maxWidth: '60%' }}>
                {stat.detail}
              </p>
              <Sparkline data={stat.sparkData} color={config.accent} height={22} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
