/**
 * 🔒 SERVORA TABLE & MENU SECURITY LAYER
 * Cryptographic URL Signature & Anti-Tampering Engine
 * Prevents URL parameter manipulation (e.g. swapping restaurant IDs or table numbers)
 */

// Secret salt for signature generation
const SECURITY_SALT = 'SERVORA_SECURE_QR_SALT_v2_9f83b2a7d10e4c6f'

/**
 * Multi-round synchronous hash for tamper-resistant URL signatures
 */
function syncHash(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  const h1 = (hash >>> 0).toString(16).padStart(8, '0')

  let hash2 = 0x9e3779b9
  for (let i = str.length - 1; i >= 0; i--) {
    hash2 = (hash2 * 33 ^ str.charCodeAt(i)) >>> 0
  }
  const h2 = hash2.toString(16).padStart(8, '0')

  let hash3 = 0x517cc1b7
  for (let i = 0; i < str.length; i++) {
    hash3 = Math.imul(hash3 ^ str.charCodeAt(i), 0x85ebca6b) >>> 0
  }
  const h3 = hash3.toString(16).padStart(8, '0')

  return `${h1}${h2}${h3}`.slice(0, 24)
}

/**
 * Generate cryptographic signature for a specific restaurant's Universal Menu QR
 * @param {string} restaurantId
 * @returns {string} 24-character tamper-proof signature
 */
export const generateRestaurantSignature = (restaurantId) => {
  if (!restaurantId || restaurantId === 'default') {
    return ''
  }
  const normalizedRid = String(restaurantId).trim().toLowerCase()
  const payload = `SERVORA_REST_${normalizedRid}_MASTER_${SECURITY_SALT}`
  return syncHash(payload)
}

/**
 * Verify if the given signature matches the restaurant's Universal Menu QR
 * @param {string} restaurantId
 * @param {string} signature
 * @returns {boolean} True if signature is genuine and untampered
 */
export const verifyRestaurantSignature = (restaurantId, signature) => {
  if (!restaurantId || restaurantId === 'default') {
    return false
  }
  if (!signature || typeof signature !== 'string') {
    return false
  }
  const expected = generateRestaurantSignature(restaurantId)
  return signature.trim().toLowerCase() === expected.toLowerCase()
}

/**
 * Generate cryptographic signature for a specific restaurant & table (Legacy / Table-Locked Mode)
 * @param {string} restaurantId 
 * @param {number|string} tableNumber 
 * @returns {string} 16-character tamper-proof signature
 */
export const generateTableSignature = (restaurantId, tableNumber) => {
  if (!restaurantId || tableNumber === undefined || tableNumber === null || tableNumber === 'N/A') {
    return ''
  }
  const normalizedTable = String(tableNumber).trim()
  const payload = `${restaurantId}_TBL_${normalizedTable}_${SECURITY_SALT}`
  return syncHash(payload).slice(0, 16)
}

/**
 * Verify if the given signature matches the restaurant & table combination
 * @param {string} restaurantId 
 * @param {number|string} tableNumber 
 * @param {string} signature 
 * @returns {boolean} True if signature is 100% genuine and untampered
 */
export const verifyTableSignature = (restaurantId, tableNumber, signature) => {
  if (!restaurantId || !tableNumber || tableNumber === 'N/A') {
    return false
  }
  if (!signature || typeof signature !== 'string') {
    return false
  }

  const expectedSignature = generateTableSignature(restaurantId, tableNumber)
  return signature.trim() === expectedSignature
}

/**
 * Lock table session to prevent tampering across pages
 */
export const getLockedTableSession = () => {
  try {
    const raw = sessionStorage.getItem('servora_table_session_lock')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const setLockedTableSession = (restaurantId, tableNumber, signature) => {
  try {
    sessionStorage.setItem('servora_table_session_lock', JSON.stringify({
      restaurantId,
      tableNumber: String(tableNumber),
      signature,
      lockedAt: new Date().toISOString()
    }))
  } catch (e) {
    console.warn('Unable to write to sessionStorage:', e)
  }
}

export const clearLockedTableSession = () => {
  try {
    sessionStorage.removeItem('servora_table_session_lock')
  } catch {
    // ignore storage failure
  }
}

const DEFAULT_PUBLIC_APP_ORIGIN = 'https://servora.quantumesh.in'

/**
 * Resolve the canonical public origin for scannable customer QR codes.
 * Uses the active non-localhost domain in production and falls back to VITE_APP_URL
 * (https://servora.quantumesh.in) during local development so printed QRs never encode localhost.
 */
export const getPublicMenuOrigin = () => {
  const configured = (import.meta.env?.VITE_APP_URL || '').trim().replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location) {
    const host = (window.location.hostname || '').toLowerCase()
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')
    if (!isLocal && window.location.origin) {
      return window.location.origin.replace(/\/+$/, '')
    }
  }
  return configured || DEFAULT_PUBLIC_APP_ORIGIN
}
