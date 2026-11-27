/**
 * Servora Multi-Tier Tax Engine
 * Integer-paise arithmetic to avoid floating-point drift on GST calculations.
 */

const DEFAULT_TAX_CATEGORIES = [
  {
    taxCategoryId: 'FOOD_5',
    name: 'Food & Non-Alcoholic Beverages (GST 5%)',
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 5.0,
    effectiveFrom: '2020-01-01',
    effectiveTo: null,
    active: true,
    description: 'Standard GST for standalone restaurants (with no ITC)',
  },
  {
    taxCategoryId: 'BEVERAGES_18',
    name: 'Packaged Soft Drinks & Ice Creams (GST 18%)',
    cgstRate: 9.0,
    sgstRate: 9.0,
    igstRate: 18.0,
    effectiveFrom: '2020-01-01',
    effectiveTo: null,
    active: true,
    description: '18% GST rate for carbonated beverages and specific packaged items',
  },
  {
    taxCategoryId: 'EXEMPT_0',
    name: 'Zero-Rated / Exempt (0%)',
    cgstRate: 0.0,
    sgstRate: 0.0,
    igstRate: 0.0,
    effectiveFrom: '2020-01-01',
    effectiveTo: null,
    active: true,
    description: 'Exempt or zero-rated goods',
  },
]

const restaurantTaxRulesCache = new Map()
const fromPaise = (p) => Number((p / 100).toFixed(2))

function getRestaurantTaxRules(restaurantId) {
  if (restaurantTaxRulesCache.has(restaurantId)) {
    return restaurantTaxRulesCache.get(restaurantId)
  }
  return DEFAULT_TAX_CATEGORIES
}

function setRestaurantTaxRules(restaurantId, rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error('Tax rules must be a non-empty array.')
  }
  const sanitized = rules.map((r) => {
    const cgstRate = Number(r.cgstRate ?? 0)
    const sgstRate = Number(r.sgstRate ?? 0)
    const igstRate = Number(r.igstRate ?? cgstRate + sgstRate)
    if (
      !Number.isFinite(cgstRate) || cgstRate < 0 || cgstRate > 50 ||
      !Number.isFinite(sgstRate) || sgstRate < 0 || sgstRate > 50 ||
      !Number.isFinite(igstRate) || igstRate < 0 || igstRate > 100
    ) {
      throw new Error(`Invalid tax rates for rule "${r.taxCategoryId || r.name}".`)
    }
    return {
      taxCategoryId: String(r.taxCategoryId || 'CUSTOM').slice(0, 40),
      name: String(r.name || 'Custom Tax Rule').slice(0, 120),
      cgstRate,
      sgstRate,
      igstRate,
      active: Boolean(r.active ?? true),
    }
  })

  restaurantTaxRulesCache.set(restaurantId, sanitized)
  return getRestaurantTaxRules(restaurantId)
}

function resolveItemTaxRule(item, restaurantId) {
  const rules = getRestaurantTaxRules(restaurantId)
  const categoryStr = String(item.category || '').toLowerCase()
  const nameStr = String(item.name || '').toLowerCase()

  if (item.taxCategoryId) {
    const matched = rules.find((r) => r.taxCategoryId === item.taxCategoryId && r.active)
    if (matched) return matched
  }

  if (
    categoryStr.includes('beverage') ||
    categoryStr.includes('drink') ||
    categoryStr.includes('cocktail') ||
    nameStr.includes('coke') ||
    nameStr.includes('pepsi') ||
    nameStr.includes('red bull')
  ) {
    const bevRule = rules.find((r) => r.taxCategoryId === 'BEVERAGES_18' && r.active)
    if (bevRule) return bevRule
  }

  const foodRule = rules.find((r) => r.taxCategoryId === 'FOOD_5' && r.active)
  if (foodRule) return foodRule

  return rules.find((r) => r.active) || DEFAULT_TAX_CATEGORIES[0]
}

function calculateItemTax(taxableAmount, item, restaurantId, isInterState = false) {
  const rule = resolveItemTaxRule(item, restaurantId)
  const raw = Number(taxableAmount)
  if (!Number.isFinite(raw) || raw < 0) {
    throw new Error('Taxable amount cannot be negative or non-numeric.')
  }
  const amountPaise = Math.round(raw * 100)

  if (isInterState) {
    const igstPaise = Math.round((amountPaise * rule.igstRate) / 100)
    return {
      ruleName: rule.name,
      taxCategoryId: rule.taxCategoryId,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: rule.igstRate,
      igstAmount: fromPaise(igstPaise),
      totalTax: fromPaise(igstPaise),
      _cgstPaise: 0,
      _sgstPaise: 0,
      _igstPaise: igstPaise,
      _totalTaxPaise: igstPaise,
    }
  }

  const cgstPaise = Math.round((amountPaise * rule.cgstRate) / 100)
  const sgstPaise = Math.round((amountPaise * rule.sgstRate) / 100)
  const totalTaxPaise = cgstPaise + sgstPaise

  return {
    ruleName: rule.name,
    taxCategoryId: rule.taxCategoryId,
    cgstRate: rule.cgstRate,
    cgstAmount: fromPaise(cgstPaise),
    sgstRate: rule.sgstRate,
    sgstAmount: fromPaise(sgstPaise),
    igstRate: 0,
    igstAmount: 0,
    totalTax: fromPaise(totalTaxPaise),
    _cgstPaise: cgstPaise,
    _sgstPaise: sgstPaise,
    _igstPaise: 0,
    _totalTaxPaise: totalTaxPaise,
  }
}

module.exports = {
  DEFAULT_TAX_CATEGORIES,
  getRestaurantTaxRules,
  setRestaurantTaxRules,
  resolveItemTaxRule,
  calculateItemTax,
}
