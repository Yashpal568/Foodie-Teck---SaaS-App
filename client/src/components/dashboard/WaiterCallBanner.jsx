import { useState, useEffect, useRef, useCallback } from 'react'
import { BellRing, Clock, MapPin, ChevronDown, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { ensureValidRestaurantUUID } from '@/services/restaurant.service'
import {
  getActiveWaiterCalls,
  acknowledgeWaiterCall,
  acknowledgeAllWaiterCalls,
} from '@/services/table.service'
import { playHotelServiceBell, unlockHotelBellAudio } from '@/utils/hotelBellAudio'

const isUUID = (str) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

const formatCallTime = (isoOrDate) => {
  const d = isoOrDate ? new Date(isoOrDate) : new Date()
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getWaitStats = (createdAtMs, nowMs) => {
  const diffSec = Math.max(0, Math.floor((nowMs - createdAtMs) / 1000))
  const waitMinutes = Math.floor(diffSec / 60)
  const waitLabel = waitMinutes >= 1 ? `${waitMinutes}m ago` : 'Just now'
  return { waitMinutes, waitLabel }
}

const formatDbContextLabel = (rawCall) => {
  const parts = []
  const guests = Number(rawCall?.guest_count || rawCall?.guests || 0)
  if (guests > 0) parts.push(`${guests} Guest${guests > 1 ? 's' : ''}`)

  const orderStatus = String(rawCall?.active_order_status || '').trim()
  const tableStatus = String(rawCall?.table_status || '').trim()

  if (orderStatus) {
    const prettyOrder = orderStatus
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
    parts.push(`Order: ${prettyOrder}`)
  } else if (tableStatus) {
    const prettyTable = tableStatus
      .toLowerCase()
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
    parts.push(`Table ${prettyTable}`)
  }

  if (rawCall?.note) parts.unshift(rawCall.note)
  if (rawCall?.server_name) parts.push(`Server: ${rawCall.server_name}`)

  return parts.length > 0 ? parts.join(' • ') : 'Table Service Request'
}

export default function WaiterCallBanner({ restaurantId }) {
  const [resolvedId, setResolvedId] = useState(null)
  const [activeCalls, setActiveCalls] = useState([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Deduplication tracking so Supabase DB, Realtime Broadcast, BroadcastChannel, and Storage don't double-ring
  const seenCallIdsRef = useRef(new Set())
  const recentTableRingRef = useRef(new Map())
  const dismissedIdsRef = useRef(new Set())

  // Unlock Web Audio API on first user gesture so live waiter alerts ring reliably
  useEffect(() => {
    unlockHotelBellAudio()
  }, [])

  // Live 10-second ticker so "Wait: Just now" -> "Wait: 1m ago" stays fresh
  useEffect(() => {
    if (activeCalls.length === 0) return
    const interval = setInterval(() => setNowMs(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [activeCalls.length])

  // Resolve Restaurant Identity (Slug / Email -> UUID)
  useEffect(() => {
    let mounted = true
    async function resolve() {
      if (!restaurantId) return
      try {
        const uuid = await ensureValidRestaurantUUID(restaurantId)
        if (mounted) setResolvedId(uuid || restaurantId)
      } catch {
        if (mounted) setResolvedId(restaurantId)
      }
    }
    resolve()
    return () => {
      mounted = false
    }
  }, [restaurantId])

  const enqueueWaiterCall = useCallback((rawCall, { shouldRing = true } = {}) => {
    if (!rawCall) return

    const id = rawCall.id || `waiter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    if (dismissedIdsRef.current.has(id) || rawCall.is_handled === true) return

    const tableNumber = String(rawCall.table_number ?? rawCall.tableNumber ?? '1').replace(/^#/, '')
    const rawCustomer = rawCall.customer_name || rawCall.customerName || rawCall.active_customer_name || ''
    const customerName =
      rawCustomer && rawCustomer.toLowerCase() !== 'guest'
        ? rawCustomer
        : rawCall.active_customer_name || `Table ${tableNumber} Guest`
    const createdAtIso = rawCall.created_at || rawCall.createdAt || new Date().toISOString()
    const createdAtMs = new Date(createdAtIso).getTime() || Date.now()
    const timestamp = formatCallTime(createdAtIso)
    const metaLabel = formatDbContextLabel(rawCall)
    const tableStatus = rawCall.table_status || null
    const activeOrderStatus = rawCall.active_order_status || null

    // Deduplicate identical call ID or identical table call arriving within 4 seconds across multiple channels
    const now = Date.now()
    const tableKey = `table_${tableNumber}`
    const lastTableTime = recentTableRingRef.current.get(tableKey) || 0

    if (seenCallIdsRef.current.has(id)) {
      return
    }
    seenCallIdsRef.current.add(id)
    if (seenCallIdsRef.current.size > 150) {
      const oldest = seenCallIdsRef.current.values().next().value
      seenCallIdsRef.current.delete(oldest)
    }

    const isNearDuplicateTable = shouldRing && now - lastTableTime < 4000
    if (shouldRing && !isNearDuplicateTable) {
      recentTableRingRef.current.set(tableKey, now)
      playHotelServiceBell({ strikes: 2 })
    }

    setActiveCalls((prev) => {
      // If a DB insert arrives ~1s after the optimistic broadcast for the same table, upgrade its ID instead of duplicating
      const recentMatchIdx = prev.findIndex(
        (c) => c.tableNumber === tableNumber && Math.abs(createdAtMs - c.createdAtMs) < 5000
      )
      if (recentMatchIdx !== -1) {
        const next = [...prev]
        next[recentMatchIdx] = {
          ...next[recentMatchIdx],
          id: isUUID(id) ? id : next[recentMatchIdx].id,
          customerName: customerName || next[recentMatchIdx].customerName,
          metaLabel: metaLabel || next[recentMatchIdx].metaLabel,
          tableStatus: tableStatus ?? next[recentMatchIdx].tableStatus,
          activeOrderStatus: activeOrderStatus ?? next[recentMatchIdx].activeOrderStatus,
        }
        return next
      }

      return [
        ...prev,
        {
          id,
          tableNumber,
          customerName,
          createdAtIso,
          createdAtMs,
          timestamp,
          metaLabel,
          tableStatus,
          activeOrderStatus,
        },
      ]
    })
  }, [])

  // Initial DB Load & Real-Time Reconciliation for active unhandled calls
  useEffect(() => {
    let mounted = true
    async function syncFromDatabase(isInitial = false) {
      const target = resolvedId || restaurantId
      if (!target) return
      const rows = await getActiveWaiterCalls(target)
      if (!mounted || !Array.isArray(rows)) return

      const dbIdSet = new Set(rows.map((r) => r.id))

      if (isInitial) {
        rows.forEach((row) => enqueueWaiterCall(row, { shouldRing: false }))
      } else {
        // Reconcile DB metadata onto existing calls & remove DB calls handled by another staff terminal
        setActiveCalls((prev) =>
          prev
            .filter((call) => !isUUID(call.id) || dbIdSet.has(call.id))
            .map((call) => {
              const match = rows.find(
                (r) => r.id === call.id || String(r.table_number) === String(call.tableNumber)
              )
              if (!match) return call
              return {
                ...call,
                id: isUUID(call.id) ? call.id : match.id,
                metaLabel: formatDbContextLabel(match),
                tableStatus: match.table_status ?? call.tableStatus,
                activeOrderStatus: match.active_order_status ?? call.activeOrderStatus,
              }
            })
        )
        rows.forEach((row) => enqueueWaiterCall(row, { shouldRing: false }))
      }
    }

    syncFromDatabase(true)
    const syncInterval = setInterval(() => syncFromDatabase(false), 15000)

    const onTableOrOrderChange = () => syncFromDatabase(false)
    window.addEventListener('orderStatusUpdated', onTableOrOrderChange)

    return () => {
      mounted = false
      clearInterval(syncInterval)
      window.removeEventListener('orderStatusUpdated', onTableOrOrderChange)
    }
  }, [resolvedId, restaurantId, enqueueWaiterCall])

  // Real-time Listeners (BroadcastChannel + Window + Storage + Supabase DB & Broadcast)
  useEffect(() => {
    const targetId = resolvedId || restaurantId || 'demo-merchant'
    const isDemo = restaurantId === 'demo-merchant' || restaurantId === 'demo' || targetId === 'demo-merchant'

    const matchesRestaurant = (payload) => {
      if (!payload) return false
      const payloadRid = payload.restaurant_id
      if (isDemo) {
        return payloadRid === 'demo-merchant' || payloadRid === 'demo'
      }
      if (!payloadRid) return false
      return (
        payloadRid === targetId ||
        payloadRid === resolvedId ||
        payloadRid === restaurantId
      )
    }

    let broadcastChannel = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('servora_orders_channel')
        broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data || {}
          if (type === 'WAITER_CALL' && matchesRestaurant(payload)) {
            enqueueWaiterCall(payload, { shouldRing: true })
          }
        }
      }
    } catch {}

    const customWaiterListener = (e) => {
      if (e.detail && matchesRestaurant(e.detail)) {
        enqueueWaiterCall(e.detail, { shouldRing: true })
      }
    }

    const storageListener = (e) => {
      if (e.key === 'servora_latest_waiter_call' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (matchesRestaurant(parsed)) {
            enqueueWaiterCall(parsed, { shouldRing: true })
          }
        } catch {}
      }
    }

    window.addEventListener('servora_waiter_call', customWaiterListener)
    window.addEventListener('storage', storageListener)

    const subId = !isDemo ? (isUUID(resolvedId) ? resolvedId : isUUID(restaurantId) ? restaurantId : null) : null
    const activeChannels = []

    if (subId) {
      const dbWaiterChannel = supabase
        .channel(`waiter-banner-pg:rid=${subId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'waiter_calls',
            filter: `restaurant_id=eq.${subId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              enqueueWaiterCall(payload.new, { shouldRing: true })
            } else if (payload.eventType === 'UPDATE' && payload.new?.is_handled) {
              setActiveCalls((prev) => prev.filter((c) => c.id !== payload.new.id))
            }
          }
        )
        .subscribe()
      activeChannels.push(dbWaiterChannel)
    }

    const targetIds = new Set(
      (isDemo ? ['demo-merchant', 'demo'] : [subId, resolvedId, restaurantId, targetId]).filter(Boolean)
    )
    targetIds.forEach((id) => {
      const broadcastCh = supabase
        .channel(`waiter-toasts:rid=${id}`)
        .on('broadcast', { event: 'waiter_call' }, (payload) => {
          if (payload?.payload && matchesRestaurant(payload.payload)) {
            enqueueWaiterCall(payload.payload, { shouldRing: true })
          }
        })
        .subscribe()
      activeChannels.push(broadcastCh)
    })

    return () => {
      if (broadcastChannel) broadcastChannel.close()
      window.removeEventListener('servora_waiter_call', customWaiterListener)
      window.removeEventListener('storage', storageListener)
      activeChannels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [resolvedId, restaurantId, enqueueWaiterCall])

  const handleAcknowledge = async (callId, tableNumber = null) => {
    const target = activeCalls.find((c) => c.id === callId)
    const tbl = tableNumber || target?.tableNumber || null
    const remainingCount = activeCalls.filter((c) => c.id !== callId).length

    dismissedIdsRef.current.add(callId)
    setActiveCalls((prev) => prev.filter((c) => c.id !== callId))
    if (remainingCount === 0) setIsExpanded(false)

    await acknowledgeWaiterCall(callId, resolvedId || restaurantId, tbl)
    window.dispatchEvent(new CustomEvent('waiterCallsUpdated'))
  }

  const handleDismiss = async (callId, tableNumber = null) => {
    await handleAcknowledge(callId, tableNumber)
  }

  const handleAcknowledgeAll = async () => {
    activeCalls.forEach((c) => dismissedIdsRef.current.add(c.id))
    const currentCalls = [...activeCalls]
    setActiveCalls([])
    setIsExpanded(false)
    await Promise.all([
      acknowledgeAllWaiterCalls(resolvedId || restaurantId),
      ...currentCalls.map((c) => acknowledgeWaiterCall(c.id, resolvedId || restaurantId, c.tableNumber)),
    ])
    window.dispatchEvent(new CustomEvent('waiterCallsUpdated'))
  }

  const leadCall = activeCalls[0]
  const totalCount = activeCalls.length

  return (
    <AnimatePresence>
      {leadCall && (
        <motion.section
          key="waiter-assistance-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
          aria-label="Waiter Assistance Requests"
          className="shrink-0 overflow-hidden bg-[#fffbeb] border-b border-amber-200/80 shadow-[0_2px_12px_-4px_rgba(245,158,11,0.16)] z-20"
        >
          {/* Collapsed Summary Banner Bar */}
          <div className="px-3 sm:px-5 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
            {/* Left Identity + Status Summary */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                title="Replay Service Bell"
                onClick={() => playHotelServiceBell({ strikes: 2 })}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-500/25 flex items-center justify-center shrink-0 text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                <BellRing className="w-5 h-5 animate-[wiggle_1.2s_ease-in-out_infinite]" />
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                    WAITER REQUESTED
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow-2xs">
                    {totalCount} Active {totalCount === 1 ? 'Call' : 'Calls'}
                  </span>
                  <span className="hidden sm:inline-block h-3.5 w-px bg-amber-300/75 mx-0.5" />
                  <span className="text-sm font-bold text-slate-900 truncate">
                    Table {leadCall.tableNumber}
                    {totalCount > 1 ? (
                      <span className="font-normal text-slate-500 ml-1">
                        (+{totalCount - 1} {totalCount - 1 === 1 ? 'other' : 'others'} in queue)
                      </span>
                    ) : leadCall.customerName ? (
                      <span className="font-normal text-slate-500 ml-1.5">
                        • {leadCall.customerName}
                      </span>
                    ) : null}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 tabular-nums">
                    <Clock className="w-3 h-3" />
                    {leadCall.timestamp}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/90 border border-amber-200/80 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                    <MapPin className="w-2.5 h-2.5" />
                    CALLING NOW
                  </span>
                </div>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                aria-expanded={isExpanded}
                className="h-8 px-3 rounded-xl bg-amber-100/70 hover:bg-amber-100 border border-amber-300/80 text-amber-900 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Queue ({totalCount})</span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </button>

              <button
                type="button"
                onClick={() => handleAcknowledge(leadCall.id)}
                className="h-8 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                Acknowledge
              </button>

              <button
                type="button"
                onClick={() => handleDismiss(leadCall.id)}
                className="h-8 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Dismiss
              </button>

              <button
                type="button"
                aria-label="Close waiter request alert"
                onClick={() => handleAcknowledgeAll()}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-amber-100/60 inline-flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expandable Assistance Queue Panel */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="waiter-queue-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mx-3 sm:mx-5 lg:mx-6 mb-3 mt-0.5 bg-white rounded-2xl border border-amber-200/70 shadow-sm overflow-hidden">
                  {/* Queue Card Header */}
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-[11px] font-black uppercase tracking-wide text-slate-900">
                        ACTIVE ASSISTANCE QUEUE ({totalCount} {totalCount === 1 ? 'CALL' : 'CALLS'})
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                        • Real-time table requests
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAcknowledgeAll}
                      className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold inline-flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Acknowledge All</span>
                    </button>
                  </div>

                  {/* Queue Item Rows */}
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {activeCalls.map((call, idx) => {
                      const isPrimary = idx === 0
                      const { waitMinutes, waitLabel } = getWaitStats(call.createdAtMs, nowMs)
                      const isUrgent = isPrimary || waitMinutes >= 2

                      return (
                        <div
                          key={call.id}
                          className="px-4 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border',
                                isPrimary
                                  ? 'bg-amber-100/75 text-amber-800 border-amber-200/70'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              )}
                            >
                              T{call.tableNumber}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">
                                  Table {call.tableNumber}
                                </span>
                                <span className="text-xs font-medium text-slate-500 truncate">
                                  {call.customerName}
                                </span>
                                {isUrgent ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-[10px] font-extrabold uppercase tracking-wide">
                                    URGENT • CALLING NOW
                                  </span>
                                ) : call.activeOrderStatus === 'BILL_REQUESTED' || call.tableStatus === 'billing' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold">
                                    Billing / Service Call
                                  </span>
                                ) : waitMinutes >= 1 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold">
                                    Calling Now
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-[10px] font-bold">
                                    Assistance Needed
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] font-medium text-slate-400">
                                <span className="tabular-nums">{call.timestamp}</span>
                                <span>•</span>
                                <span
                                  className={cn(
                                    'font-bold',
                                    waitMinutes >= 1 ? 'text-amber-600' : 'text-emerald-600'
                                  )}
                                >
                                  Wait: {waitLabel}
                                </span>
                                <span>•</span>
                                <span>{call.metaLabel}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(call.id)}
                              className={cn(
                                'h-8 px-3.5 rounded-xl text-white text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer',
                                isPrimary
                                  ? 'bg-amber-500 hover:bg-amber-600'
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              )}
                            >
                              Acknowledge
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismiss(call.id)}
                              className="h-8 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <style>{`
            @keyframes wiggle {
              0%, 100% { transform: rotate(0deg); }
              15% { transform: rotate(12deg); }
              30% { transform: rotate(-10deg); }
              45% { transform: rotate(8deg); }
              60% { transform: rotate(-6deg); }
              75% { transform: rotate(0deg); }
            }
          `}</style>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
