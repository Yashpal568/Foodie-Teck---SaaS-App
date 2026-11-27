/**
 * Shared Formatting Utilities
 * Eliminates duplicate formatting logic across components.
 */

/**
 * Format a number to Indian Rupees (INR)
 * Used in Revenue Analytics, Tables, Pricing, etc.
 * @param {number|string} amount 
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  const val = Number(amount);
  if (isNaN(val)) return '₹0';
  
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(1)}Cr`;
  } else if (val >= 100000) {
    return `₹${(val / 100000).toFixed(1)}L`;
  } else if (val >= 1000) {
    return `₹${(val / 1000).toFixed(1)}K`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

/**
 * Basic local currency format without shorthand (K/L/Cr)
 * @param {number|string} amount 
 * @returns {string} Formatted currency string
 */
export const formatCurrencyExact = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/**
 * Format an ISO timestamp into a readable date
 * @param {string} isoString 
 * @returns {string} Formatted date (e.g. Oct 24, 2023)
 */
export const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format an ISO timestamp into a readable time
 * @param {string} isoString 
 * @returns {string} Formatted time (e.g. 10:30 AM)
 */
export const formatTime = (isoString) => {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format an ISO timestamp into a full date and time string
 * @param {string} isoString 
 * @returns {string} Formatted date & time
 */
export const formatDateTime = (isoString) => {
  return `${formatDate(isoString)} at ${formatTime(isoString)}`;
}

/**
 * Format an ISO timestamp into a relative "time ago" string
 * @param {string} isoString 
 * @returns {string} Relative time (e.g. 5m ago, 2h ago)
 */
export const timeAgo = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
