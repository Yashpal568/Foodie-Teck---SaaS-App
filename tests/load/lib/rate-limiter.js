import { sleep } from './supabase-staging.js'

/**
 * Serialized per-HTTP-request rate limiter.
 * Spaces individual network operations at 1000 / maxRps ms intervals across concurrent VUs
 * without window-boundary burst races.
 */
export function createHttpRateLimiter(maxRps, { nowFn = () => performance.now(), sleepFn = sleep } = {}) {
  const rate = Number(maxRps)
  if (!Number.isFinite(rate) || rate <= 0) {
    return async () => {}
  }

  const intervalMs = 1000 / rate
  let nextSlotAt = 0
  let queue = Promise.resolve()

  return function acquireRateSlot() {
    const slotPromise = queue.then(async () => {
      const now = nowFn()
      const scheduledAt = Math.max(now, nextSlotAt)
      nextSlotAt = scheduledAt + intervalMs
      const waitMs = scheduledAt - now
      if (waitMs > 0) {
        await sleepFn(waitMs)
      }
      return scheduledAt
    })

    queue = slotPromise.catch(() => {})
    return slotPromise
  }
}
