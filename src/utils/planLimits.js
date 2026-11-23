// Servora Subscription Plan Limits & Entitlements Engine
// Unified Launch Plan: 3 Months Access @ ₹2,100 with Unlimited Tables & Menu Items

export const PLAN_TIERS = {
  Unlimited: {
    id: 'PLN-UNLIMITED',
    name: 'All-in-One Unlimited',
    price: 2100,
    formattedPrice: '₹2,100',
    billingPeriod: '3 Months',
    durationDays: 90,
    monthlyEquivalent: '₹700/mo',
    tableLimit: 9999, // Unlimited
    menuItemLimit: 9999, // Unlimited
    orderMonthlyLimit: 999999,
    crmUnlocked: true,
    advancedAnalytics: true,
    customHardware: true,
    color: 'indigo',
    popular: true,
    tagline: 'Complete 3-Month Restaurant Operating System with Zero Limitations',
    features: [
      'Unlimited Dining Tables & QR Codes',
      'Unlimited Menu Items & Categories',
      '3 Months Access (Effective ₹700/month)',
      '0% Commission Direct UPI Ordering',
      'Sub-100ms Kitchen Display System (KDS)',
      'Automated GST Invoicing & Thermal Printing',
      'Multi-Payer Split Bills Engine',
      'High-Resolution QR Standee Studio',
      'Real-Time Sales & Revenue Analytics',
      'Priority 24/7 Phone & WhatsApp Support'
    ]
  }
}

// Backward compatibility alias
PLAN_TIERS.Starter = PLAN_TIERS.Unlimited
PLAN_TIERS.Professional = PLAN_TIERS.Unlimited
PLAN_TIERS.Enterprise = PLAN_TIERS.Unlimited

/**
 * Normalizes any plan string to standard plan tier object.
 * All restaurants are entitled to the full Unlimited suite.
 */
export function getPlanDetails(planName) {
  return PLAN_TIERS.Unlimited
}

/**
 * Checks if a specific feature count reaches or exceeds the plan limit.
 * Always returns false because tables and menu items are unlimited.
 */
export function isLimitReached(currentCount, limit) {
  return false
}

/**
 * Calculates usage percentage for UI meters.
 */
export function getUsagePercentage(currentCount, limit) {
  return 0
}
