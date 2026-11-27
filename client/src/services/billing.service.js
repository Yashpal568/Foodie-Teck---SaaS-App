import { supabase } from '@/lib/supabase'

/**
 * Servora Client-Side Billing & Invoicing Service
 *
 * All authoritative invoice generation, tax rules, and payment settlement
 * require an authenticated server response. Local preview calculation is
 * explicitly tagged `isPreview: true, authoritative: false`.
 */

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (!isLocal) return null
  }
  return 'http://localhost:5000'
}

const getAuthHeaders = async () => {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch {
    // caller enforces auth errors when server rejects unauthenticated calls
  }
  return headers
}

const toPaise = (val) => Math.round(Number(val) * 100)
const fromPaise = (paise) => Number((paise / 100).toFixed(2))

/**
 * Validate line items & compute a non-authoritative local estimate using integer paise math.
 * Throws immediately on invalid prices, negative quantities, or invalid discounts.
 */
export function calculateBillPreview({ items, discount = null, isInterState = false }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one line item is required for bill calculation.')
  }

  let subtotalPaise = 0
  const processedItems = items.map((item, idx) => {
    const rawQty = Number(item.quantity ?? 1)
    if (!Number.isInteger(rawQty) || rawQty < 1 || rawQty > 999) {
      throw new Error(`Invalid quantity for item #${idx + 1}.`)
    }

    const rawPrice = item.variant === 'half' && item.halfPrice != null
      ? Number(item.halfPrice)
      : Number(item.price)

    if (!Number.isFinite(rawPrice) || rawPrice < 0) {
      throw new Error(`Invalid negative or non-numeric price for item #${idx + 1}.`)
    }

    const unitPaise = toPaise(rawPrice)
    const linePaise = unitPaise * rawQty
    subtotalPaise += linePaise

    return {
      ...item,
      quantity: rawQty,
      unitPrice: fromPaise(unitPaise),
      lineSubtotal: fromPaise(linePaise),
      _linePaise: linePaise,
    }
  })

  let discountPaise = 0
  if (discount && discount.value !== undefined && discount.value !== null && Number(discount.value) !== 0) {
    const dVal = Number(discount.value)
    if (!Number.isFinite(dVal) || dVal < 0) {
      throw new Error('Discount value cannot be negative.')
    }
    if (discount.type === 'PERCENT') {
      if (dVal > 100) throw new Error('Percentage discount cannot exceed 100%.')
      discountPaise = Math.round((subtotalPaise * dVal) / 100)
    } else {
      discountPaise = Math.min(toPaise(dVal), subtotalPaise)
    }
  }

  const taxablePaise = Math.max(0, subtotalPaise - discountPaise)
  const isBeverage = (cat, name) => {
    const s = `${cat || ''} ${name || ''}`.toLowerCase()
    return s.includes('drink') || s.includes('coke') || s.includes('pepsi') || s.includes('beverage')
  }

  let totalCgstPaise = 0
  let totalSgstPaise = 0
  let totalIgstPaise = 0

  processedItems.forEach((item) => {
    const ratio = subtotalPaise > 0 ? item._linePaise / subtotalPaise : 0
    const itemDiscountPaise = Math.round(discountPaise * ratio)
    const itemTaxablePaise = Math.max(0, item._linePaise - itemDiscountPaise)
    const isBev = isBeverage(item.category, item.name)
    if (isInterState) {
      const igstRate = isBev ? 18 : 5
      totalIgstPaise += Math.round((itemTaxablePaise * igstRate) / 100)
    } else {
      const rate = isBev ? 9 : 2.5
      totalCgstPaise += Math.round((itemTaxablePaise * rate) / 100)
      totalSgstPaise += Math.round((itemTaxablePaise * rate) / 100)
    }
  })

  const totalTaxPaise = totalCgstPaise + totalSgstPaise + totalIgstPaise
  const preRoundPaise = taxablePaise + totalTaxPaise
  const grandTotal = Math.round(preRoundPaise / 100)
  const roundOff = Number((grandTotal - preRoundPaise / 100).toFixed(2))

  return {
    isPreview: true,
    authoritative: false,
    itemsCount: processedItems.reduce((sum, i) => sum + i.quantity, 0),
    items: processedItems.map(({ _linePaise, ...rest }) => rest),
    pricing: {
      subtotal: fromPaise(subtotalPaise),
      discount: {
        type: discount?.type || 'NONE',
        value: Number(discount?.value || 0),
        amount: fromPaise(discountPaise),
        reason: discount?.reason || '',
      },
      taxableValue: fromPaise(taxablePaise),
      taxes: {
        isInterState: Boolean(isInterState),
        cgst: fromPaise(totalCgstPaise),
        sgst: fromPaise(totalSgstPaise),
        igst: fromPaise(totalIgstPaise),
        totalTax: fromPaise(totalTaxPaise),
        byCategory: [],
      },
      preRoundTotal: fromPaise(preRoundPaise),
      roundOff,
      grandTotal,
    },
    calculatedAt: new Date().toISOString(),
  }
}

/**
 * Server-authoritative bill calculation.
 * Falls back ONLY to a tagged non-authoritative preview (`isPreview: true, authoritative: false`).
 */
export async function calculateServerBill({ items, discount = null, restaurantId = 'default', isInterState = false }) {
  const apiBase = getApiBaseUrl()
  if (apiBase) {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${apiBase}/api/billing/calculate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items, discount, restaurantId, isInterState }),
      })

      const data = await response.json().catch(() => null)
      if (response.ok && data?.success) {
        return { ...data.data, isPreview: false, authoritative: true }
      }
      if (response.status >= 400 && response.status < 500 && data?.error) {
        throw new Error(data.error)
      }
    } catch (err) {
      if (!String(err?.message || '').includes('fetch')) {
        console.warn('Server billing calculation notice:', err.message)
      }
    }
  }

  return calculateBillPreview({ items, discount, isInterState })
}

/**
 * Generate an official invoice via authoritative backend API.
 * NEVER synthesizes fake authoritative invoices when backend is unavailable.
 */
export async function createServerInvoice(payload) {
  const apiBase = getApiBaseUrl()
  if (!apiBase) {
    throw new Error('Authoritative billing service is not configured for this environment (VITE_API_URL missing).')
  }

  const headers = await getAuthHeaders()
  let response
  try {
    response = await fetch(`${apiBase}/api/billing/invoice/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  } catch (err) {
    throw new Error(`Billing server unreachable: ${err?.message || 'network failure'}. Invoice was NOT issued.`)
  }

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success || !data?.data) {
    throw new Error(data?.error || `Invoice generation rejected by server (HTTP ${response.status}).`)
  }

  return data.data
}

/**
 * Settle an issued invoice via authoritative backend payment ledger.
 * NEVER fabricates `{ success: true, status: 'PAID' }` on network or backend failure.
 */
export async function settleInvoicePayment({ invoiceId, payments, restaurantId, idempotencyKey = null }) {
  if (!invoiceId) {
    throw new Error('Invoice ID is required for payment settlement.')
  }
  if (!Array.isArray(payments) || payments.length === 0) {
    throw new Error('At least one valid payment record is required.')
  }
  for (let i = 0; i < payments.length; i += 1) {
    const amt = Number(payments[i]?.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new Error(`Payment #${i + 1} has an invalid amount.`)
    }
  }

  const apiBase = getApiBaseUrl()
  if (!apiBase) {
    throw new Error('Payment settlement service is not configured (VITE_API_URL missing). Payment was NOT processed.')
  }

  const headers = await getAuthHeaders()
  const stableIdempotencyKey = idempotencyKey || `pay_idem_${invoiceId}_${payments.map((p) => `${p.method}:${p.amount}`).join('|')}`

  let response
  try {
    response = await fetch(`${apiBase}/api/billing/payment/settle`, {
      method: 'POST',
      headers: {
        ...headers,
        'X-Idempotency-Key': stableIdempotencyKey,
      },
      body: JSON.stringify({
        invoiceId,
        payments,
        restaurantId,
        idempotencyKey: stableIdempotencyKey,
      }),
    })
  } catch (err) {
    throw new Error(`Payment server unreachable (${err?.message || 'network failure'}). Invoice remains UNPAID.`)
  }

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Payment settlement failed on server (HTTP ${response.status}).`)
  }

  return data
}
