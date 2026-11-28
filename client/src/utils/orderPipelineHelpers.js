export const AUTO_PREP_STAGE_DURATION_MS = 5 * 60 * 1000 // 5 minutes per kitchen stage

const AUTO_STAGE_TRANSITIONS = {
  PREPARING: {
    nextStatus: 'READY',
    nextLabel: 'Plated & Ready',
  },
  READY: {
    nextStatus: 'SERVED',
    nextLabel: 'Served at Table',
  },
}

/**
 * Determine when an order entered its current kitchen status.
 * Uses statusHistory matching current status first, then falls back to updated_at / created_at.
 */
export function getStageEnteredTimestamp(order, fallbackNowMs = Date.now()) {
  if (!order) return fallbackNowMs
  const currentStatus = String(order.status || 'PENDING').toUpperCase()
  const history = Array.isArray(order.statusHistory)
    ? order.statusHistory
    : Array.isArray(order.status_history)
      ? order.status_history
      : []

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i]
    if (String(entry?.status || '').toUpperCase() === currentStatus && entry?.timestamp) {
      const parsed = new Date(entry.timestamp).getTime()
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }

  const rawTs = order.updated_at || order.updatedAt || order.created_at || order.createdAt
  if (rawTs) {
    const parsed = new Date(rawTs).getTime()
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return fallbackNowMs
}

/**
 * Format remaining milliseconds as m:ss for KDS countdown pills.
 */
export function formatStageCountdown(remainingMs) {
  const safeSecs = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000))
  const mins = Math.floor(safeSecs / 60)
  const secs = safeSecs % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * Compute 5-minute auto-progression state for a KDS order.
 * Intentionally stops at SERVED — never auto-advances to BILL_REQUESTED or FINISHED
 * while customers are still seated at the table.
 */
export function getAutoAdvanceInfo(
  order,
  nowMs = Date.now(),
  { autoEnabled = true, durationMs = AUTO_PREP_STAGE_DURATION_MS } = {}
) {
  if (!order || !autoEnabled) {
    return {
      canAutoAdvance: false,
      nextStatus: null,
      nextLabel: null,
      remainingMs: 0,
      formattedCountdown: '0:00',
      isDue: false,
    }
  }

  const status = String(order.status || '').toUpperCase()
  const rule = AUTO_STAGE_TRANSITIONS[status]
  if (!rule) {
    return {
      canAutoAdvance: false,
      nextStatus: null,
      nextLabel: null,
      remainingMs: 0,
      formattedCountdown: '0:00',
      isDue: false,
    }
  }

  const enteredAt = getStageEnteredTimestamp(order, nowMs)
  const elapsedMs = Math.max(0, nowMs - enteredAt)
  const remainingMs = Math.max(0, durationMs - elapsedMs)

  return {
    canAutoAdvance: true,
    nextStatus: rule.nextStatus,
    nextLabel: rule.nextLabel,
    remainingMs,
    formattedCountdown: formatStageCountdown(remainingMs),
    isDue: remainingMs <= 0,
  }
}

/**
 * Normalize a table identifier ("5", "05", "T-5", "Table 5") for strict tenant-table matching.
 */
export function normalizeTableKey(val) {
  if (val === null || val === undefined) return ''
  const raw = String(val).trim()
  if (!raw || raw.toUpperCase() === 'N/A') return ''
  const stripped = raw
    .replace(/^table\s*#?/i, '')
    .replace(/^t-/i, '')
    .trim()
    .replace(/^0+(?=[1-9])/, '')
  return stripped.toLowerCase()
}

/**
 * Enforce strict table isolation so a customer at Table A never sees Table B's order.
 */
export function doesOrderBelongToTable(order, tableNumber) {
  if (!order) return false
  const targetKey = normalizeTableKey(tableNumber)
  if (!targetKey) return true
  const orderKey = normalizeTableKey(order.tableNumber ?? order.table_number)
  return Boolean(orderKey) && orderKey === targetKey
}

/**
 * Compute synchronized waiter call cooldown state from sessionStorage or props.
 */
export function readWaiterCooldownRemaining(restaurantId, nowMs = Date.now()) {
  if (!restaurantId || typeof window === 'undefined') return 0
  try {
    const until = Number(window.sessionStorage?.getItem(`servora_waiter_until_${restaurantId}`) || 0)
    if (!Number.isFinite(until) || until <= nowMs) return 0
    return Math.ceil((until - nowMs) / 1000)
  } catch {
    return 0
  }
}
