/**
 * Servora Server-Side Billing Engine
 * Authoritative integer-paise calculation pipeline with strict input validation
 * and DB price resolution when menu item UUIDs belong to a Supabase tenant.
 */

const { calculateItemTax } = require('./tax.engine')
const { supabase } = require('../lib/supabase')

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const toPaise = (v) => Math.round(Number(v) * 100)
const fromPaise = (p) => Number((p / 100).toFixed(2))

/**
 * Optionally hydrate authoritative prices from DB `menu_items` for valid UUID items
 */
async function resolveAuthoritativePrices(items, restaurantId) {
  if (!supabase || !UUID_REGEX.test(String(restaurantId || ''))) {
    return new Map()
  }

  const uuids = items
    .map((i) => i.id || i._id || i.menu_item_id)
    .filter((id) => UUID_REGEX.test(String(id || '')))

  if (uuids.length === 0) return new Map()

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, price, half_price, category, is_in_stock')
    .eq('restaurant_id', restaurantId)
    .in('id', uuids)

  if (error || !Array.isArray(data)) return new Map()
  return new Map(data.map((row) => [row.id, row]))
}

/**
 * Main Calculation Engine (synchronous validation + tax computation)
 */
function calculateBill(payload, dbPriceMap = new Map()) {
  const {
    items = [],
    discount = null,
    restaurantId = 'default',
    isInterState = false,
    gstSettings = null,
  } = payload || {}

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one line item is required for bill calculation.')
  }

  let subtotalPaise = 0
  const pricedItems = items.map((rawItem, index) => {
    const rawQty = Number(rawItem?.quantity)
    if (!Number.isInteger(rawQty) || rawQty < 1 || rawQty > 999) {
      throw new Error(`Item #${index + 1} has an invalid quantity: ${rawItem?.quantity}`)
    }

    const itemId = rawItem.id || rawItem._id || rawItem.menu_item_id || `item-${index}`
    const dbRow = dbPriceMap.get(itemId)
    const variant = String(rawItem.variant || 'full').toLowerCase()

    let unitPriceNum
    if (dbRow) {
      if (dbRow.is_in_stock === false) {
        throw new Error(`Item "${dbRow.name}" is currently out of stock.`)
      }
      unitPriceNum = variant === 'half' && dbRow.half_price != null ? Number(dbRow.half_price) : Number(dbRow.price)
    } else {
      unitPriceNum = variant === 'half' && rawItem.halfPrice != null
        ? Number(rawItem.halfPrice)
        : variant === 'half' && rawItem.half_price != null
          ? Number(rawItem.half_price)
          : Number(rawItem.price)
    }

    if (!Number.isFinite(unitPriceNum) || unitPriceNum < 0 || unitPriceNum > 1_000_000) {
      throw new Error(`Item #${index + 1} ("${rawItem?.name || 'Item'}") has an invalid price: ${unitPriceNum}`)
    }

    const unitPaise = toPaise(unitPriceNum)
    const linePaise = unitPaise * rawQty
    subtotalPaise += linePaise

    return {
      itemId,
      name: String(dbRow?.name || rawItem.name || 'Dish Item').slice(0, 120),
      category: String(dbRow?.category || rawItem.category || 'Main Course').slice(0, 60),
      variant,
      quantity: rawQty,
      unitPrice: fromPaise(unitPaise),
      lineSubtotal: fromPaise(linePaise),
      _linePaise: linePaise,
      notes: String(rawItem.notes || '').slice(0, 200),
    }
  })

  // 2. Discount Engine with strict validation
  let discountPaise = 0
  let discountType = 'NONE'
  let discountValue = 0
  let discountReason = ''

  if (discount && typeof discount === 'object' && discount.value !== undefined && discount.value !== null && Number(discount.value) !== 0) {
    const rawVal = Number(discount.value)
    if (!Number.isFinite(rawVal) || rawVal < 0) {
      throw new Error('Discount value cannot be negative or non-numeric.')
    }

    discountType = discount.type === 'PERCENT' ? 'PERCENT' : 'FLAT'
    discountValue = rawVal
    discountReason = String(discount.reason || 'Management Courtesy').slice(0, 120)

    if (discountType === 'PERCENT') {
      if (discountValue > 100) {
        throw new Error('Percentage discount cannot exceed 100%.')
      }
      discountPaise = Math.round((subtotalPaise * discountValue) / 100)
    } else {
      discountPaise = Math.min(toPaise(discountValue), subtotalPaise)
    }
  }

  discountPaise = Math.min(discountPaise, subtotalPaise)
  const taxableValuePaise = Math.max(0, subtotalPaise - discountPaise)

  // 3. Tax Engine
  let totalCgstPaise = 0
  let totalSgstPaise = 0
  let totalIgstPaise = 0
  let totalTaxPaise = 0
  const taxSummaryByCategory = {}

  const hasExplicitGstConfig = Boolean(gstSettings && typeof gstSettings === 'object')
  const isGstEnabled = hasExplicitGstConfig
    ? (Boolean(gstSettings.enabled) && Number(gstSettings.rate || 0) > 0)
    : true
  const configuredRate = hasExplicitGstConfig ? Number(gstSettings.rate || 0) : null
  const configuredLabel = hasExplicitGstConfig ? String(gstSettings.label || 'GST') : 'GST'

  const taxedItems = pricedItems.map((item) => {
    const itemDiscountRatio = subtotalPaise > 0 ? item._linePaise / subtotalPaise : 0
    const itemDiscountPaise = Math.round(discountPaise * itemDiscountRatio)
    const itemTaxablePaise = Math.max(0, item._linePaise - itemDiscountPaise)

    let taxResult
    if (hasExplicitGstConfig) {
      if (!isGstEnabled || !Number.isFinite(configuredRate) || configuredRate <= 0) {
        taxResult = {
          ruleName: `${configuredLabel} Disabled (0%)`,
          taxCategoryId: 'EXEMPT_0',
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0,
          totalTax: 0,
          _cgstPaise: 0,
          _sgstPaise: 0,
          _igstPaise: 0,
          _totalTaxPaise: 0,
        }
      } else if (isInterState) {
        const igstPaise = Math.round((itemTaxablePaise * configuredRate) / 100)
        taxResult = {
          ruleName: `${configuredLabel} (${configuredRate}%)`,
          taxCategoryId: `CUSTOM_${configuredRate}`,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: configuredRate,
          igstAmount: fromPaise(igstPaise),
          totalTax: fromPaise(igstPaise),
          _cgstPaise: 0,
          _sgstPaise: 0,
          _igstPaise: igstPaise,
          _totalTaxPaise: igstPaise,
        }
      } else {
        const halfRate = configuredRate / 2
        const cgstPaise = Math.round((itemTaxablePaise * halfRate) / 100)
        const sgstPaise = Math.round((itemTaxablePaise * halfRate) / 100)
        const totalLineTaxPaise = cgstPaise + sgstPaise
        taxResult = {
          ruleName: `${configuredLabel} (${configuredRate}%)`,
          taxCategoryId: `CUSTOM_${configuredRate}`,
          cgstRate: halfRate,
          cgstAmount: fromPaise(cgstPaise),
          sgstRate: halfRate,
          sgstAmount: fromPaise(sgstPaise),
          igstRate: 0,
          igstAmount: 0,
          totalTax: fromPaise(totalLineTaxPaise),
          _cgstPaise: cgstPaise,
          _sgstPaise: sgstPaise,
          _igstPaise: 0,
          _totalTaxPaise: totalLineTaxPaise,
        }
      }
    } else {
      taxResult = calculateItemTax(fromPaise(itemTaxablePaise), item, restaurantId, Boolean(isInterState))
    }
    const { _cgstPaise, _sgstPaise, _igstPaise, _totalTaxPaise, ...publicTax } = taxResult

    totalCgstPaise += _cgstPaise
    totalSgstPaise += _sgstPaise
    totalIgstPaise += _igstPaise
    totalTaxPaise += _totalTaxPaise

    const catKey = publicTax.taxCategoryId
    if (!taxSummaryByCategory[catKey]) {
      taxSummaryByCategory[catKey] = {
        name: publicTax.ruleName,
        taxCategoryId: catKey,
        _taxablePaise: 0,
        cgstRate: publicTax.cgstRate,
        _cgstPaise: 0,
        sgstRate: publicTax.sgstRate,
        _sgstPaise: 0,
        igstRate: publicTax.igstRate,
        _igstPaise: 0,
        _totalTaxPaise: 0,
      }
    }
    taxSummaryByCategory[catKey]._taxablePaise += itemTaxablePaise
    taxSummaryByCategory[catKey]._cgstPaise += _cgstPaise
    taxSummaryByCategory[catKey]._sgstPaise += _sgstPaise
    taxSummaryByCategory[catKey]._igstPaise += _igstPaise
    taxSummaryByCategory[catKey]._totalTaxPaise += _totalTaxPaise

    const { _linePaise, ...cleanItem } = item
    return {
      ...cleanItem,
      discount: fromPaise(itemDiscountPaise),
      taxableAmount: fromPaise(itemTaxablePaise),
      tax: publicTax,
      itemTotal: fromPaise(itemTaxablePaise + _totalTaxPaise),
    }
  })

  const preRoundPaise = taxableValuePaise + totalTaxPaise
  const grandTotal = Math.round(preRoundPaise / 100)
  const roundOff = Number((grandTotal - preRoundPaise / 100).toFixed(2))

  return {
    itemsCount: taxedItems.reduce((sum, i) => sum + i.quantity, 0),
    items: taxedItems,
    pricing: {
      subtotal: fromPaise(subtotalPaise),
      discount: {
        type: discountType,
        value: discountValue,
        amount: fromPaise(discountPaise),
        reason: discountReason,
      },
      taxableValue: fromPaise(taxableValuePaise),
      taxes: {
        isInterState: Boolean(isInterState),
        cgst: fromPaise(totalCgstPaise),
        sgst: fromPaise(totalSgstPaise),
        igst: fromPaise(totalIgstPaise),
        totalTax: fromPaise(totalTaxPaise),
        byCategory: Object.values(taxSummaryByCategory).map((c) => ({
          name: c.name,
          taxCategoryId: c.taxCategoryId,
          taxableAmount: fromPaise(c._taxablePaise),
          cgstRate: c.cgstRate,
          cgstAmount: fromPaise(c._cgstPaise),
          sgstRate: c.sgstRate,
          sgstAmount: fromPaise(c._sgstPaise),
          igstRate: c.igstRate,
          igstAmount: fromPaise(c._igstPaise),
          totalTax: fromPaise(c._totalTaxPaise),
        })),
      },
      preRoundTotal: fromPaise(preRoundPaise),
      roundOff,
      grandTotal,
    },
    calculatedAt: new Date().toISOString(),
  }
}

async function resolveRestaurantGstSettings(restaurantId) {
  if (!supabase || !UUID_REGEX.test(String(restaurantId || ''))) {
    return null
  }
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('gst_settings')
      .eq('id', restaurantId)
      .maybeSingle()
    if (error || !data || !data.gst_settings || typeof data.gst_settings !== 'object') {
      return null
    }
    return data.gst_settings
  } catch {
    return null
  }
}

async function calculateAuthoritativeBill(payload) {
  const dbPriceMap = await resolveAuthoritativePrices(payload?.items || [], payload?.restaurantId)
  const resolvedGstSettings = payload?.gstSettings && typeof payload.gstSettings === 'object'
    ? payload.gstSettings
    : await resolveRestaurantGstSettings(payload?.restaurantId)
  return calculateBill({ ...payload, gstSettings: resolvedGstSettings }, dbPriceMap)
}

module.exports = {
  calculateBill,
  calculateAuthoritativeBill,
}
