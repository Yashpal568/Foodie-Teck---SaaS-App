/**
 * Servora Invoicing System
 * Sequential invoice generation with DB lookup & persistence.
 */

const { supabase } = require('../lib/supabase')
const { calculateAuthoritativeBill } = require('./billing.engine')

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const invoiceCounters = new Map()
const invoiceStore = new Map()

function getNextInvoiceNumber(restaurantId, customYear = null) {
  const year = customYear || new Date().getFullYear()
  const key = `${restaurantId}_${year}`

  const currentCount = (invoiceCounters.get(key) || 0) + 1
  invoiceCounters.set(key, currentCount)

  const paddedSequence = String(currentCount).padStart(6, '0')
  return `INV-${year}-${paddedSequence}`
}

async function generateInvoice(payload) {
  const {
    restaurantId = 'default',
    restaurantDetails = {},
    orderId = null,
    tableNumber = '1',
    customer = {},
    items = [],
    discount = null,
    isInterState = false,
    notes = '',
  } = payload || {}

  const calculation = await calculateAuthoritativeBill({
    items,
    discount,
    restaurantId,
    isInterState,
  })

  const invoiceNumber = getNextInvoiceNumber(restaurantId)
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

  const invoiceRecord = {
    id: invoiceId,
    invoiceNumber,
    orderId: UUID_REGEX.test(String(orderId || '')) ? orderId : null,
    restaurantId,
    restaurantDetails: {
      name: restaurantDetails.name || 'Merchant Restaurant',
      address: restaurantDetails.address || '',
      phone: restaurantDetails.phone || '',
      gstin: restaurantDetails.gstin || '',
      fssai: restaurantDetails.fssai || '',
    },
    tableNumber: String(tableNumber || '1'),
    customer: {
      name: customer.name || 'Walk-in Guest',
      phone: customer.phone || '',
      gstin: customer.gstin || '',
      email: customer.email || '',
    },
    items: calculation.items,
    pricing: calculation.pricing,
    status: 'ISSUED',
    payments: [],
    balanceDue: calculation.pricing.grandTotal,
    notes: String(notes || '').slice(0, 300),
    issuedAt: new Date().toISOString(),
    paidAt: null,
  }

  invoiceStore.set(invoiceId, invoiceRecord)
  const restaurantInvoices = invoiceStore.get(`list_${restaurantId}`) || []
  restaurantInvoices.unshift(invoiceRecord)
  invoiceStore.set(`list_${restaurantId}`, restaurantInvoices)

  if (supabase && UUID_REGEX.test(String(restaurantId || ''))) {
    const { error } = await supabase.from('invoices').insert({
      id: invoiceId,
      restaurant_id: restaurantId,
      invoice_number: invoiceNumber,
      order_id: invoiceRecord.orderId,
      table_number: parseInt(tableNumber, 10) || 1,
      customer_name: invoiceRecord.customer.name,
      subtotal: calculation.pricing.subtotal,
      discount_amount: calculation.pricing.discount.amount,
      tax_amount: calculation.pricing.taxes.totalTax,
      total_amount: calculation.pricing.grandTotal,
      status: 'ISSUED',
      payload: invoiceRecord,
    })

    if (error) {
      // Throw explicitly if Supabase invoices table fails when configured, unless table doesn't exist in dev
      if (error.code !== '42P01' && error.code !== 'PGRST205') {
        throw new Error(`Failed to persist invoice to database: ${error.message}`)
      }
      console.warn('Invoices table not yet migrated in DB; keeping in server memory for session:', error.message)
    }
  }

  return invoiceRecord
}

async function getInvoiceById(invoiceId) {
  if (!invoiceId) return null
  const mem = invoiceStore.get(invoiceId)
  if (mem) return mem

  if (supabase) {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('payload')
        .eq('id', invoiceId)
        .maybeSingle()
      if (data?.payload) {
        invoiceStore.set(invoiceId, data.payload)
        return data.payload
      }
    } catch {
      // fallback cleanly
    }
  }
  return null
}

async function updatePersistedInvoice(invoice) {
  invoiceStore.set(invoice.id, invoice)
  if (supabase && UUID_REGEX.test(String(invoice.restaurantId || ''))) {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: invoice.status,
        paid_at: invoice.paidAt || null,
        payload: invoice,
      })
      .eq('id', invoice.id)

    if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
      throw new Error(`Failed to update persisted invoice: ${error.message}`)
    }
  }
}

async function getRestaurantInvoices(restaurantId, limit = 50) {
  if (supabase && UUID_REGEX.test(String(restaurantId || ''))) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('payload')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d) => d.payload).filter(Boolean)
      }
    } catch {
      // fallback to session cache
    }
  }
  const list = invoiceStore.get(`list_${restaurantId}`) || []
  return list.slice(0, limit)
}

module.exports = {
  generateInvoice,
  getInvoiceById,
  updatePersistedInvoice,
  getRestaurantInvoices,
  getNextInvoiceNumber,
}
