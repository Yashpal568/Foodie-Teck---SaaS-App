const express = require('express')
const router = express.Router()
const { calculateAuthoritativeBill } = require('../services/billing.engine')
const { generateInvoice, getInvoiceById, getRestaurantInvoices } = require('../services/invoice.service')
const { processPayment } = require('../services/payment.service')
const { getRestaurantTaxRules, setRestaurantTaxRules } = require('../services/tax.engine')
const {
  requireAuth,
  requireRestaurantAccess,
  hasAdminRole,
  createRateLimiter,
  UUID_REGEX,
} = require('../middleware/security')
const { supabase } = require('../lib/supabase')

const billingLimiter = createRateLimiter({ windowMs: 60_000, max: 120, keyPrefix: 'billing' })

router.use(billingLimiter)
router.use(requireAuth)

/* =========================================================================
   1. Server-Side Authoritative Bill Calculation Engine Endpoint
========================================================================= */
router.post(
  '/calculate',
  requireRestaurantAccess((req) => req.body?.restaurantId),
  async (req, res) => {
    try {
      const { items, discount, restaurantId, isInterState, gstSettings } = req.body

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Items array is required to calculate bill',
          requestId: req.requestId,
        })
      }

      const calculation = await calculateAuthoritativeBill({
        items,
        discount,
        restaurantId,
        isInterState: Boolean(isInterState),
        gstSettings: gstSettings || null,
      })

      return res.json({
        success: true,
        data: calculation,
        requestId: req.requestId,
      })
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to calculate bill',
        requestId: req.requestId,
      })
    }
  }
)

/* =========================================================================
   2. Sequential & Immutable Invoice Generation
========================================================================= */
router.post(
  '/invoice/generate',
  requireRestaurantAccess((req) => req.body?.restaurantId),
  async (req, res) => {
    try {
      const invoice = await generateInvoice(req.body)
      return res.status(201).json({
        success: true,
        data: invoice,
        requestId: req.requestId,
      })
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to generate invoice',
        requestId: req.requestId,
      })
    }
  }
)

/* =========================================================================
   3. Multi-Payer Split Payment & Settlement (Idempotent + Tenant Checked)
========================================================================= */
router.post(
  '/payment/settle',
  requireRestaurantAccess((req) => req.body?.restaurantId),
  async (req, res) => {
    try {
      const idempotencyKey = req.headers['x-idempotency-key'] || req.body?.idempotencyKey || null
      const result = await processPayment({
        ...req.body,
        idempotencyKey,
      })
      return res.json({ ...result, requestId: req.requestId })
    } catch (error) {
      const msg = error?.message || 'Payment settlement failed'
      const status = msg.startsWith('Forbidden') ? 403 : 400
      return res.status(status).json({
        success: false,
        error: msg,
        requestId: req.requestId,
      })
    }
  }
)

/* =========================================================================
   4. Invoices Retrieval (Tenant Scoped)
========================================================================= */
router.get(
  '/invoices/:restaurantId',
  requireRestaurantAccess((req) => req.params.restaurantId),
  async (req, res) => {
    try {
      const { restaurantId } = req.params
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50))
      const list = await getRestaurantInvoices(restaurantId, limit)
      return res.json({
        success: true,
        data: list,
        requestId: req.requestId,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        requestId: req.requestId,
      })
    }
  }
)

router.get('/invoice/:id', async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id)
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found', requestId: req.requestId })
    }

    if (!hasAdminRole(req.user)) {
      if (!UUID_REGEX.test(String(invoice.restaurantId || ''))) {
        return res.status(403).json({ success: false, error: 'Forbidden', requestId: req.requestId })
      }
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id, owner_id, status')
        .eq('id', invoice.restaurantId)
        .maybeSingle()
      if (!rest || rest.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Forbidden', requestId: req.requestId })
      }
      if (String(rest.status || '').trim().toLowerCase() === 'suspended') {
        return res.status(403).json({ success: false, error: 'Forbidden: merchant workspace is suspended.', requestId: req.requestId })
      }
    }

    return res.json({
      success: true,
      data: invoice,
      requestId: req.requestId,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      requestId: req.requestId,
    })
  }
})

/* =========================================================================
   5. Configurable Tax Engine Rules (Tenant Scoped)
========================================================================= */
router.get(
  '/tax-rules/:restaurantId',
  requireRestaurantAccess((req) => req.params.restaurantId),
  (req, res) => {
    try {
      const rules = getRestaurantTaxRules(req.params.restaurantId)
      return res.json({
        success: true,
        data: rules,
        requestId: req.requestId,
      })
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message, requestId: req.requestId })
    }
  }
)

router.post(
  '/tax-rules/:restaurantId',
  requireRestaurantAccess((req) => req.params.restaurantId),
  (req, res) => {
    try {
      const { rules } = req.body
      const updated = setRestaurantTaxRules(req.params.restaurantId, rules)
      return res.json({
        success: true,
        data: updated,
        requestId: req.requestId,
      })
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message, requestId: req.requestId })
    }
  }
)

module.exports = router
