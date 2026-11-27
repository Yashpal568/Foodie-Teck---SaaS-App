/**
 * Servora Multi-Method & Split Payment Ledger
 * Includes idempotency key deduplication, integer-paise balance accounting,
 * tenant ownership validation, and persistent invoice/table updates.
 */

const { getInvoiceById, updatePersistedInvoice } = require('./invoice.service')
const { supabase } = require('../lib/supabase')

const VALID_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'WALLET', 'ONLINE', 'SPLIT_PAYMENT']
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const processedIdempotencyResults = new Map()
const toPaise = (v) => Math.round(Number(v) * 100)
const fromPaise = (p) => Number((p / 100).toFixed(2))

async function processPayment(payload) {
  const { invoiceId, payments = [], restaurantId = null, idempotencyKey = null } = payload || {}

  if (!invoiceId) {
    throw new Error('Invoice ID is required for payment settlement')
  }

  const normalizedIdemKey = idempotencyKey ? `${invoiceId}:${String(idempotencyKey).trim()}` : null
  if (normalizedIdemKey && processedIdempotencyResults.has(normalizedIdemKey)) {
    return {
      ...processedIdempotencyResults.get(normalizedIdemKey),
      idempotentReplay: true,
    }
  }

  const invoice = await getInvoiceById(invoiceId)
  if (!invoice) {
    throw new Error(`Invoice with ID "${invoiceId}" not found`)
  }

  if (restaurantId && invoice.restaurantId && String(invoice.restaurantId) !== String(restaurantId)) {
    throw new Error('Forbidden: invoice does not belong to target restaurant')
  }

  if (invoice.status === 'PAID') {
    const existingRes = {
      success: true,
      alreadyPaid: true,
      invoice,
      settlement: {
        grandTotal: invoice.pricing.grandTotal,
        totalPaid: fromPaise((invoice.payments || []).reduce((s, p) => s + toPaise(p.amount), 0)),
        balanceDue: 0,
        isFullyPaid: true,
        paymentCount: (invoice.payments || []).length,
      },
    }
    if (normalizedIdemKey) processedIdempotencyResults.set(normalizedIdemKey, existingRes)
    return existingRes
  }

  if (!Array.isArray(payments) || payments.length === 0) {
    throw new Error('At least one payment record is required')
  }

  const processedPayments = payments.map((p, index) => {
    const method = String(p?.method || '').toUpperCase()
    const amount = Number(p?.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Payment #${index + 1} has an invalid amount: ₹${p?.amount}`)
    }

    if (!VALID_PAYMENT_METHODS.includes(method)) {
      throw new Error(`Invalid payment method "${method}". Allowed: ${VALID_PAYMENT_METHODS.join(', ')}`)
    }

    return {
      paymentId: `pay_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      method,
      amount: fromPaise(toPaise(amount)),
      payerName: String(p.payerName || `Payer ${index + 1}`).slice(0, 80),
      reference: String(p.reference || p.utr || p.last4 || `REF-${Date.now()}`).slice(0, 80),
      notes: String(p.notes || '').slice(0, 200),
      recordedAt: new Date().toISOString(),
    }
  })

  const priorPaidPaise = (invoice.payments || []).reduce((sum, p) => sum + toPaise(p.amount), 0)
  const batchPaidPaise = processedPayments.reduce((sum, p) => sum + toPaise(p.amount), 0)
  const totalPaidPaise = priorPaidPaise + batchPaidPaise
  const grandTotalPaise = toPaise(invoice.pricing.grandTotal)
  const balanceDuePaise = Math.max(0, grandTotalPaise - totalPaidPaise)

  invoice.payments = [...(invoice.payments || []), ...processedPayments]
  invoice.balanceDue = fromPaise(balanceDuePaise)

  if (balanceDuePaise <= 0) {
    invoice.status = 'PAID'
    invoice.paidAt = new Date().toISOString()
  } else {
    invoice.status = 'PARTIALLY_PAID'
  }

  await updatePersistedInvoice(invoice)

  if (invoice.status === 'PAID' && supabase) {
    const targetRid = restaurantId || invoice.restaurantId
    if (UUID_REGEX.test(String(targetRid || ''))) {
      try {
        if (invoice.tableNumber) {
          await supabase
            .from('table_sessions')
            .update({
              status: 'available',
              current_order_id: null,
              customers: 0,
              session_start: null,
              last_activity: new Date().toISOString(),
            })
            .eq('restaurant_id', targetRid)
            .eq('table_number', parseInt(invoice.tableNumber, 10))
        }

        if (UUID_REGEX.test(String(invoice.orderId || ''))) {
          await supabase
            .from('orders')
            .update({
              status: 'FINISHED',
              payment_status: 'PAID',
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoice.orderId)
            .eq('restaurant_id', targetRid)
        }
      } catch (dbErr) {
        console.warn('DB Table/Order settlement notice:', dbErr.message || dbErr)
      }
    }
  }

  const result = {
    success: true,
    invoice,
    settlement: {
      grandTotal: invoice.pricing.grandTotal,
      totalPaid: fromPaise(totalPaidPaise),
      balanceDue: invoice.balanceDue,
      isFullyPaid: balanceDuePaise <= 0,
      paymentCount: invoice.payments.length,
    },
  }

  if (normalizedIdemKey) {
    processedIdempotencyResults.set(normalizedIdemKey, result)
    if (processedIdempotencyResults.size > 500) {
      const oldestKey = processedIdempotencyResults.keys().next().value
      processedIdempotencyResults.delete(oldestKey)
    }
  }

  return result
}

module.exports = {
  VALID_PAYMENT_METHODS,
  processPayment,
}
