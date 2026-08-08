// Servora Subscription Plan Limits & Entitlements Engine

export const PLAN_TIERS = {
  Starter: {
    id: 'PLN-1',
    name: 'Starter',
    price: 999,
    formattedPrice: '₹999',
    tableLimit: 10,
    menuItemLimit: 25,
    orderMonthlyLimit: 100,
    crmUnlocked: false,
    advancedAnalytics: false,
    customHardware: false,
    color: 'slate',
    tagline: 'Essential QR Menu & Order Feed for Boutique Cafes',
    features: [
      'Up to 10 Tables / QR Codes',
      'Up to 25 Menu Items',
      'Live Table Serve Telemetry',
      'Real-time Order Notification Feed',
      'Digital POS Check & Cashier Drawer'
    ]
  },
  Professional: {
    id: 'PLN-2',
    name: 'Professional',
    price: 2499,
    formattedPrice: '₹2,499',
    tableLimit: 30,
    menuItemLimit: 100,
    orderMonthlyLimit: 1000,
    crmUnlocked: true,
    advancedAnalytics: true,
    customHardware: false,
    color: 'indigo',
    popular: true,
    tagline: 'High-Volume Dining Rooms & Growing Restaurants',
    features: [
      'Up to 30 Tables / QR Codes',
      'Up to 100 Menu Items',
      'Full CRM & Customer Directory',
      'AI Sales & Revenue Analytics',
      'Live Table Serve Telemetry & Realtime Feed',
      'Priority 24/7 Support'
    ]
  },
  Enterprise: {
    id: 'PLN-3',
    name: 'Enterprise',
    price: 4999,
    formattedPrice: '₹4,999',
    tableLimit: 9999,
    menuItemLimit: 9999,
    orderMonthlyLimit: 999999,
    crmUnlocked: true,
    advancedAnalytics: true,
    customHardware: true,
    color: 'violet',
    tagline: 'Unlimited Scaling & Custom Architecture for Restaurant Chains',
    features: [
      'Unlimited Tables & QR Codes (9,999+)',
      'Unlimited Menu Items (9,999+)',
      'Full CRM & Marketing Engine',
      'Multi-branch Enterprise Analytics',
      'Custom API & Hardware Terminal Integration',
      'Dedicated Account Manager'
    ]
  }
}

/**
 * Normalizes any plan string (e.g. "starter", "PRO", "PREMIUM", "Professional") to standard plan tier object.
 */
export function getPlanDetails(planName) {
  if (!planName) return PLAN_TIERS.Starter

  const normalized = String(planName).trim().toLowerCase()

  if (normalized.includes('enterprise') || normalized.includes('premium') || normalized.includes('pln-3')) {
    return PLAN_TIERS.Enterprise
  }
  if (normalized.includes('pro') || normalized.includes('pln-2')) {
    return PLAN_TIERS.Professional
  }
  return PLAN_TIERS.Starter
}

/**
 * Checks if a specific feature count reaches or exceeds the plan limit.
 */
export function isLimitReached(currentCount, limit) {
  if (limit === undefined || limit === null) return false
  if (limit >= 9999) return false // Unlimited
  return Number(currentCount) >= Number(limit)
}

/**
 * Calculates usage percentage for UI meters.
 */
export function getUsagePercentage(currentCount, limit) {
  if (!limit || limit >= 9999) return 0
  return Math.min(100, Math.round((Number(currentCount) / Number(limit)) * 100))
}
