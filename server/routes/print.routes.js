const express = require('express')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { supabase } = require('../lib/supabase')
const { requireAuth, createRateLimiter } = require('../middleware/security')

const router = express.Router()

const signLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  keyPrefix: 'qz-sign',
})

const configLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  keyPrefix: 'printer-config',
})

const CONFIG_STORE_PATH = path.join(__dirname, '..', 'data', 'printer-configs.json')
const IN_MEMORY_CONFIGS = new Map()

function readConfigStore() {
  try {
    if (fs.existsSync(CONFIG_STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_STORE_PATH, 'utf8'))
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => IN_MEMORY_CONFIGS.set(k, v))
      }
    }
  } catch {
    // Non-fatal; continue with in-memory store
  }
}
readConfigStore()

function persistConfigStore() {
  try {
    const dir = path.dirname(CONFIG_STORE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      CONFIG_STORE_PATH,
      JSON.stringify(Object.fromEntries(IN_MEMORY_CONFIGS.entries()), null, 2),
      'utf8'
    )
  } catch {
    // Non-fatal in read-only serverless environments
  }
}

function makeConfigKey(restaurantId, terminalId) {
  return `${String(restaurantId)}::${String(terminalId || 'terminal-default')}`
}

/**
 * Verify the authenticated user owns the target restaurant or holds an admin role.
 * Prevents cross-tenant access to printer configs or QZ silent-print signatures.
 */
async function requireMerchantSigner(req, res, next) {
  try {
    const role = String(req.user?.app_metadata?.role || '').toUpperCase()
    if (['SUPER_ADMIN', 'ADMIN', 'PLATFORM_ADMIN'].includes(role)) {
      return next()
    }
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Tenant authorization provider unavailable.',
        requestId: req.requestId,
      })
    }

    const restaurantId = String(
      req.body?.restaurantId || req.query?.restaurantId || ''
    ).trim()

    let query = supabase
      .from('restaurants')
      .select('id, owner_id, status')
      .eq('owner_id', req.user.id)

    if (restaurantId) {
      query = query.eq('id', restaurantId)
    }

    const { data, error } = await query.limit(1)

    if (error) {
      return res.status(503).json({
        success: false,
        error: 'Failed to verify merchant printing authorization.',
        requestId: req.requestId,
      })
    }

    const restaurant = Array.isArray(data) ? data[0] : data
    if (!restaurant || (restaurantId && restaurant.owner_id !== req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Only authorized restaurant merchants may access printing configuration.',
        requestId: req.requestId,
      })
    }

    if (String(restaurant.status || '').toLowerCase() === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Restaurant workspace is suspended.',
        requestId: req.requestId,
      })
    }

    req.authorizedRestaurantId = restaurant.id
    return next()
  } catch {
    return res.status(503).json({
      success: false,
      error: 'Merchant authorization check failed.',
      requestId: req.requestId,
    })
  }
}

/**
 * Expose only the public QZ Tray X.509 certificate (never any private key).
 */
router.get('/qz-certificate', (req, res) => {
  const certPem = process.env.QZ_CERT_PEM
    ? String(process.env.QZ_CERT_PEM).replace(/\\n/g, '\n').trim()
    : ''

  if (!certPem) {
    return res.status(503).json({
      success: false,
      configured: false,
      error: 'QZ Tray certificate is not configured on this server.',
      requestId: req.requestId,
    })
  }

  return res.type('text/plain').send(certPem)
})

/**
 * Digitally sign QZ Tray silent-print challenge payloads using server-side private key.
 */
router.post('/qz-sign', requireAuth, requireMerchantSigner, signLimiter, (req, res) => {
  const privateKeyPem = process.env.QZ_PRIVATE_KEY
    ? String(process.env.QZ_PRIVATE_KEY).replace(/\\n/g, '\n').trim()
    : ''

  if (!privateKeyPem) {
    return res.status(503).json({
      success: false,
      configured: false,
      error: 'QZ Tray signing key is not configured on this server.',
      requestId: req.requestId,
    })
  }

  const toSign = req.body?.toSign
  if (
    typeof toSign !== 'string' ||
    !toSign.trim() ||
    toSign.length > 4096 ||
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(toSign)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or oversized signing payload.',
      requestId: req.requestId,
    })
  }

  try {
    const signer = crypto.createSign('RSA-SHA512')
    signer.update(toSign)
    signer.end()
    const signature = signer.sign(privateKeyPem, 'base64')

    return res.json({
      success: true,
      algorithm: 'RSA-SHA512',
      signature,
      requestId: req.requestId,
    })
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Failed to sign QZ Tray payload.',
      requestId: req.requestId,
    })
  }
})

/**
 * Load durable printer configuration scoped by restaurantId + terminalId.
 */
router.get('/config', requireAuth, requireMerchantSigner, configLimiter, (req, res) => {
  const restaurantId = String(req.query?.restaurantId || req.authorizedRestaurantId || '').trim()
  const terminalId = String(req.query?.terminalId || 'terminal-default').trim()
  if (!restaurantId) {
    return res.status(400).json({
      success: false,
      error: 'restaurantId is required.',
      requestId: req.requestId,
    })
  }

  const config = IN_MEMORY_CONFIGS.get(makeConfigKey(restaurantId, terminalId)) || null
  return res.json({
    success: true,
    config,
    requestId: req.requestId,
  })
})

/**
 * Save durable printer configuration scoped by restaurantId + terminalId.
 */
router.put('/config', requireAuth, requireMerchantSigner, configLimiter, (req, res) => {
  const restaurantId = String(req.body?.restaurantId || req.authorizedRestaurantId || '').trim()
  const terminalId = String(req.body?.terminalId || 'terminal-default').trim()
  const stations = req.body?.stations

  if (!restaurantId || !stations || typeof stations !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'restaurantId and stations configuration are required.',
      requestId: req.requestId,
    })
  }

  const sanitized = {
    restaurantId,
    terminalId,
    terminalLabel: String(req.body?.terminalLabel || 'Main Billing Counter')
      .replace(/[\x00-\x1F\x7F<>]/g, '')
      .trim()
      .slice(0, 96),
    stations,
    updatedAt: new Date().toISOString(),
  }

  IN_MEMORY_CONFIGS.set(makeConfigKey(restaurantId, terminalId), sanitized)
  persistConfigStore()

  return res.json({
    success: true,
    config: sanitized,
    requestId: req.requestId,
  })
})

module.exports = router
