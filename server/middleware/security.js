const crypto = require('crypto')
const { supabase } = require('../lib/supabase')

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'PLATFORM_ADMIN'])

/** Attach correlation request ID and safe non-sensitive request lifecycle logs */
function requestContext(req, res, next) {
  const incomingId = req.headers['x-request-id']
  req.requestId = typeof incomingId === 'string' && incomingId.length <= 64 ? incomingId : crypto.randomUUID()
  res.setHeader('X-Request-Id', req.requestId)

  const startedAt = Date.now()
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'test') {
      const durationMs = Date.now() - startedAt
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs,
      }))
    }
  })
  next()
}

/** In-memory sliding-window rate limiter */
function createRateLimiter({ windowMs = 60_000, max = 60, keyPrefix = 'global' } = {}) {
  const buckets = new Map()

  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of buckets.entries()) {
      if (now >= entry.resetAt) buckets.delete(key)
    }
  }, Math.max(30_000, windowMs))
  cleanup.unref?.()

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown'
    const key = `${keyPrefix}:${ip}`
    const now = Date.now()

    let bucket = buckets.get(key)
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(key, bucket)
    }

    bucket.count += 1
    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)))

    if (bucket.count > max) {
      const retrySec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
      res.setHeader('Retry-After', String(retrySec))
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please slow down and try again shortly.',
        requestId: req.requestId,
      })
    }

    return next()
  }
}

function hasAdminRole(user) {
  const role = String(user?.app_metadata?.role || '').toUpperCase()
  return ADMIN_ROLES.has(role)
}

/** Verify Supabase Auth Bearer JWT on protected API routes */
async function requireAuth(req, res, next) {
  try {
    const authHeader = String(req.headers.authorization || '')
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required (missing Bearer token).',
        requestId: req.requestId,
      })
    }

    const token = authHeader.slice(7).trim()
    if (!token || token.length < 20) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token.',
        requestId: req.requestId,
      })
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Authentication provider unavailable on server.',
        requestId: req.requestId,
      })
    }

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token.',
        requestId: req.requestId,
      })
    }

    req.user = data.user
    req.accessToken = token
    return next()
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Authentication verification failed.',
      requestId: req.requestId,
    })
  }
}

/** Enforce trusted platform admin role from server-controlled app_metadata */
function requireAdmin(req, res, next) {
  if (!req.user || !hasAdminRole(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: administrator privileges required.',
      requestId: req.requestId,
    })
  }
  return next()
}

/** Verify authenticated user owns target restaurantId (or holds admin role) */
function requireRestaurantAccess(extractRestaurantId) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required.', requestId: req.requestId })
      }
      if (hasAdminRole(req.user)) {
        return next()
      }

      const rawId = typeof extractRestaurantId === 'function' ? extractRestaurantId(req) : null
      if (!rawId || !UUID_REGEX.test(String(rawId))) {
        return res.status(400).json({
          success: false,
          error: 'Valid restaurant UUID is required.',
          requestId: req.requestId,
        })
      }

      const { data: rest, error } = await supabase
        .from('restaurants')
        .select('id, owner_id')
        .eq('id', String(rawId))
        .maybeSingle()

      if (error) {
        return res.status(503).json({
          success: false,
          error: 'Unable to verify restaurant ownership.',
          requestId: req.requestId,
        })
      }

      if (!rest || rest.owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: you do not own this restaurant workspace.',
          requestId: req.requestId,
        })
      }

      req.restaurant = rest
      return next()
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Tenant authorization verification failed.',
        requestId: req.requestId,
      })
    }
  }
}

module.exports = {
  UUID_REGEX,
  requestContext,
  createRateLimiter,
  requireAuth,
  requireAdmin,
  requireRestaurantAccess,
  hasAdminRole,
}
