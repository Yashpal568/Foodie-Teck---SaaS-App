/**
 * Servora Email & Gmail Notification Client Service
 * Dispatches password recovery links, purchase summaries with PDF invoices, and subscription expiry alerts.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * Checks backend Gmail SMTP connectivity & status
 */
export async function checkEmailServiceStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/email/status`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    return {
      success: false,
      configured: false,
      status: 'Offline / Standalone Mode',
      error: err.message
    }
  }
}

/**
 * Dispatches branded Password Reset Link email
 * @param {string} email - Recipient email
 * @param {string} merchantName - Merchant business name
 * @param {string} [resetUrl] - Custom reset link
 */
export async function sendForgotPasswordEmail(email, merchantName, resetUrl) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/email/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        merchantName: merchantName || 'Servora Merchant',
        resetUrl: resetUrl || `${window.location.origin}/reset-password`
      })
    })
    return await res.json()
  } catch (err) {
    console.warn('[EmailService] Forgot password email dispatch skipped (Backend unreachable):', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Dispatches Purchase Summary with generated PDF Tax Invoice
 * @param {Object} purchaseData - Details of the purchase/subscription
 */
export async function sendPurchaseSummaryEmail(purchaseData) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/email/purchase-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: purchaseData.email || purchaseData.merchantEmail,
        merchantName: purchaseData.merchantName || purchaseData.businessName || 'Servora Partner',
        planName: purchaseData.planName || purchaseData.plan || 'PRO',
        amount: purchaseData.amount || purchaseData.price || 2499,
        utrNumber: purchaseData.utrNumber || purchaseData.utr || 'N/A',
        startDate: purchaseData.startDate || new Date().toISOString(),
        endDate: purchaseData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        restaurantId: purchaseData.restaurantId || ''
      })
    })
    return await res.json()
  } catch (err) {
    console.warn('[EmailService] Purchase summary email dispatch skipped:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Dispatches single or bulk Subscription Expiry Notification
 * @param {Object} [expiryData] - Target merchant expiry details
 */
export async function sendSubscriptionExpiryEmail(expiryData = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/email/subscription-expiry-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expiryData)
    })
    return await res.json()
  } catch (err) {
    console.warn('[EmailService] Expiry notification dispatch skipped:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Triggers full subscription expiry scan across all Supabase merchant records
 */
export async function runSubscriptionExpiryScan() {
  return sendSubscriptionExpiryEmail({ runBulkScan: true })
}

/**
 * Dispatches test diagnostics email
 * @param {string} email - Target recipient
 */
export async function sendTestEmail(email) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/email/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    return await res.json()
  } catch (err) {
    return { success: false, error: err.message }
  }
}
