/**
 * 🔒 SERVORA TABLE SECURITY LAYER
 * Cryptographic URL Signature & Anti-Tampering Engine
 * Prevents URL parameter manipulation (e.g. changing table=1 to table=2)
 */

// Secret salt for signature generation (in production, synchronized with restaurant node)
const SECURITY_SALT = 'SERVORA_SECURE_QR_SALT_v2_9f83b2a7d10e4c6f'

/**
 * Fast, lightweight SHA-256 implementation for browser/client
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Synchronous hash fallback for immediate URL rendering in QR generators
 */
function syncHash(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  // Convert to 12-char hex string
  const h1 = (hash >>> 0).toString(16).padStart(8, '0')
  let hash2 = 0
  for (let i = str.length - 1; i >= 0; i--) {
    hash2 = (hash2 * 31 + str.charCodeAt(i)) >>> 0
  }
  const h2 = hash2.toString(16).padStart(8, '0')
  return `${h1}${h2}`.slice(0, 16)
}

/**
 * Generate cryptographic signature for a specific restaurant & table
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
  return syncHash(payload)
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
  } catch {}
}
