const express = require('express')
const router = express.Router()
const {
  sendWelcomeEmail,
  sendForgotPasswordEmail,
  sendPurchaseSummaryEmail,
  sendSubscriptionExpiryEmail,
  sendTestEmail,
  verifySMTPConnection,
} = require('../services/email.service')
const { runSubscriptionExpiryScan } = require('../jobs/expiryCron')
const {
  requireAuth,
  requireAdmin,
  createRateLimiter,
} = require('../middleware/security')

const emailRateLimiter = createRateLimiter({ windowMs: 60_000, max: 15, keyPrefix: 'email' })
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ALLOWED_REDIRECT_HOSTS = new Set(
  [
    'servora.quantumesh.in',
    'localhost',
    '127.0.0.1',
    (() => {
      try {
        return process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : null
      } catch {
        return null
      }
    })(),
  ].filter(Boolean)
)

function sanitizeTrustedRedirectUrl(rawUrl, fallbackPath) {
  const defaultBase = process.env.FRONTEND_URL || 'https://servora.quantumesh.in'
  if (!rawUrl || typeof rawUrl !== 'string') return `${defaultBase}${fallbackPath}`
  try {
    const parsed = new URL(rawUrl)
    if (!['https:', 'http:'].includes(parsed.protocol) || !ALLOWED_REDIRECT_HOSTS.has(parsed.hostname)) {
      return `${defaultBase}${fallbackPath}`
    }
    return parsed.toString()
  } catch {
    return `${defaultBase}${fallbackPath}`
  }
}

router.use(emailRateLimiter)

/** GET /api/email/status (Admin Only) */
router.get('/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const smtpStatus = await verifySMTPConnection()
    return res.json({
      success: true,
      service: 'Servora Gmail Email Engine',
      configured: smtpStatus.configured,
      status: smtpStatus.status,
      error: smtpStatus.error || null,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

/** POST /api/email/welcome (Authenticated users only; safe loginUrl) */
router.post('/welcome', requireAuth, async (req, res) => {
  try {
    const { email, merchantName, loginUrl } = req.body
    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({ success: false, error: 'Valid recipient email is required.' })
    }

    const safeLoginUrl = sanitizeTrustedRedirectUrl(loginUrl, '/login')
    const result = await sendWelcomeEmail({
      email,
      merchantName: String(merchantName || 'Partner').slice(0, 80),
      loginUrl: safeLoginUrl,
    })

    return res.json({
      success: true,
      message: 'Welcome email processed.',
      details: result,
    })
  } catch (err) {
    console.error('Welcome email route error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

/** POST /api/email/forgot-password (Rate-limited + strict redirect allowlist against phishing) */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, merchantName, resetUrl } = req.body
    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({ success: false, error: 'Valid recipient email is required.' })
    }

    const safeResetUrl = sanitizeTrustedRedirectUrl(resetUrl, '/reset-password')
    const result = await sendForgotPasswordEmail({
      email,
      merchantName: String(merchantName || 'Merchant Partner').slice(0, 80),
      resetUrl: safeResetUrl,
    })

    return res.json({
      success: true,
      message: 'Password reset recovery notification processed.',
      details: result,
    })
  } catch (err) {
    console.error('Forgot password email route error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

/** POST /api/email/purchase-summary (Platform Admin Only) */
router.post('/purchase-summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      email,
      merchantEmail,
      merchantName,
      businessName,
      planName,
      plan,
      amount,
      price,
      utrNumber,
      utr,
      startDate,
      endDate,
      restaurantId,
    } = req.body

    const targetEmail = email || merchantEmail
    if (!targetEmail || !EMAIL_REGEX.test(String(targetEmail).trim())) {
      return res.status(400).json({ success: false, error: 'Valid merchant email is required for invoice delivery.' })
    }

    const result = await sendPurchaseSummaryEmail({
      email: targetEmail,
      merchantName: merchantName || businessName,
      planName: planName || plan || 'PRO',
      amount: Number(amount || price || 0),
      utrNumber: utrNumber || utr || 'N/A',
      startDate,
      endDate,
      restaurantId,
    })

    return res.json({
      success: true,
      message: 'Purchase summary and PDF invoice processed.',
      invoiceNumber: result.invoiceNumber,
      details: result,
    })
  } catch (err) {
    console.error('Purchase summary email route error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

/** POST /api/email/subscription-expiry-notify (Platform Admin Only) */
router.post('/subscription-expiry-notify', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { runBulkScan, email, merchantName, planName, daysRemaining, isExpired, expiryDate, restaurantId } = req.body

    if (runBulkScan) {
      const scanResult = await runSubscriptionExpiryScan()
      return res.json({
        success: true,
        message: 'Subscription expiry bulk scan completed.',
        result: scanResult,
      })
    }

    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({ success: false, error: 'Valid recipient email is required.' })
    }

    const result = await sendSubscriptionExpiryEmail({
      email,
      merchantName,
      planName,
      daysRemaining,
      isExpired,
      expiryDate,
      restaurantId,
    })

    return res.json({
      success: true,
      message: 'Subscription expiry notification processed.',
      details: result,
    })
  } catch (err) {
    console.error('Subscription expiry email route error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

/** POST /api/email/test (Platform Admin Only) */
router.post('/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body
    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({ success: false, error: 'Valid test recipient email is required.' })
    }

    const result = await sendTestEmail({ email })
    return res.json(result)
  } catch (err) {
    console.error('Test email error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
