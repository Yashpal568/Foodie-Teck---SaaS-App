import { supabase } from '@/lib/supabase'

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (!isLocal) return null // Production Cloudflare Pages: do not attempt dead connection to localhost:5000
  }
  return 'http://localhost:5000'
}

const API_BASE_URL = getApiBaseUrl()

const getAuthHeaders = async () => {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch {
    // ignore session lookup issue
  }
  return headers
}

/**
 * Checks backend Gmail SMTP connectivity & status honestly (no fake online claims)
 */
export async function checkEmailServiceStatus() {
  if (!API_BASE_URL) {
    return {
      success: false,
      configured: false,
      status: 'Backend API Unconfigured',
      sender: null
    }
  }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1500)
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/email/status`, {
      signal: controller.signal,
      headers,
    })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    return {
      success: false,
      configured: false,
      status: 'Service Unreachable',
      error: err?.message || 'Unable to connect to email service',
      sender: null
    }
  }
}

/**
 * Dispatches branded Password Reset Link email
 */
export async function sendForgotPasswordEmail(email, merchantName, resetUrl) {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: 'Email service backend is not configured in this environment'
    }
  }
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
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: payload.error || `HTTP ${res.status}` }
    }
    return payload
  } catch (err) {
    return {
      success: false,
      error: err?.message || 'Unable to reach email service'
    }
  }
}

/**
 * Dispatches Purchase Summary with generated PDF Tax Invoice
 */
export async function sendPurchaseSummaryEmail(purchaseData) {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: 'Email service backend is not configured in this environment'
    }
  }
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/email/purchase-summary`, {
      method: 'POST',
      headers,
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
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: payload.error || `HTTP ${res.status}` }
    }
    return payload
  } catch (err) {
    return {
      success: false,
      error: err?.message || 'Failed to dispatch purchase summary email'
    }
  }
}

/**
 * Dispatches single or bulk Subscription Expiry Notification
 */
export async function sendSubscriptionExpiryEmail(expiryData = {}) {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: 'Email service backend is not configured in this environment'
    }
  }
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/email/subscription-expiry-notify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(expiryData)
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: payload.error || `HTTP ${res.status}` }
    }
    return payload
  } catch (err) {
    return {
      success: false,
      error: err?.message || 'Failed to dispatch subscription expiry email'
    }
  }
}

/**
 * Triggers full subscription expiry scan across all Supabase merchant records
 */
export async function runSubscriptionExpiryScan() {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: 'Email service backend is not configured in this environment'
    }
  }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/email/subscription-expiry-notify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ runBulkScan: true }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: payload.error || `HTTP ${res.status}` }
    }
    return payload
  } catch (err) {
    return {
      success: false,
      error: err?.message || 'Subscription expiry scan failed: backend email service unreachable'
    }
  }
}

/**
 * Dispatches test diagnostics email
 */
export async function sendTestEmail(email) {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: 'Email service backend is not configured in this environment'
    }
  }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/email/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: payload.error || `HTTP ${res.status}` }
    }
    return payload
  } catch (err) {
    return {
      success: false,
      error: err?.message || 'Failed to reach email diagnostics endpoint'
    }
  }
}
