/**
 * Helpers for dynamic Customer Bill Receipts & POS Invoices.
 * Avoids fabricated placeholder restaurant names, addresses, phones, or GSTINs.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Resolve clean restaurant header fields for receipts.
 * Optional fields (`address`, `phone`, `gstin`) are returned empty when unconfigured
 * so callers omit them rather than printing dummy values.
 */
export function getRestaurantReceiptHeader(profile) {
  const isDemo = profile?.id === 'demo-merchant' || profile?.id === 'demo'
  const rawName = String(profile?.business_name || profile?.name || '').trim()
  const name = rawName || (isDemo ? 'Servora Demo Kitchen' : 'Restaurant')
  const address = String(profile?.address || '').trim()
  const phone = String(profile?.phone || '').trim()
  const gstin = String(profile?.gstin || profile?.gst_number || '').trim().toUpperCase()

  return { name, address, phone, gstin }
}

/**
 * Compute authoritative receipt totals & tax breakdown from saved order fields
 * (or optional active tax config when order only carries grand total).
 * Never invents phantom 5% CGST/SGST lines when zero tax applies.
 */
export function computeReceiptTotals(order = {}, profile = null) {
  const items = order.items || order.order_items || []
  const itemsSum = items.reduce((sum, item) => {
    const qty = Number(item?.quantity || 1)
    const price = Number(item?.price || 0)
    return sum + price * qty
  }, 0)

  const hasSavedSubtotal = order.subtotal !== undefined && order.subtotal !== null
  const hasSavedTax = order.tax !== undefined && order.tax !== null
  const savedTotal = order.total ?? order.total_amount

  let grandTotal = savedTotal !== undefined && savedTotal !== null ? Number(savedTotal) : itemsSum
  let subtotal = hasSavedSubtotal ? Number(order.subtotal) : itemsSum
  let tax = hasSavedTax ? Number(order.tax) : 0

  if (!hasSavedSubtotal && !hasSavedTax && itemsSum > 0 && grandTotal > itemsSum + 0.01) {
    tax = Number((grandTotal - itemsSum).toFixed(2))
    subtotal = Number(itemsSum.toFixed(2))
  } else if (!hasSavedSubtotal && hasSavedTax && savedTotal != null) {
    subtotal = Number(Math.max(0, grandTotal - tax).toFixed(2))
  } else if (hasSavedSubtotal && !hasSavedTax && savedTotal != null) {
    tax = Number(Math.max(0, grandTotal - subtotal).toFixed(2))
  } else if (!hasSavedSubtotal && !hasSavedTax && savedTotal != null) {
    const fallbackRate = Number(order.gst_rate ?? (profile?.gstEnabled ? profile?.gstRate : 0) ?? 0)
    if (fallbackRate > 0) {
      subtotal = Number((grandTotal / (1 + fallbackRate / 100)).toFixed(2))
      tax = Number((grandTotal - subtotal).toFixed(2))
    } else {
      subtotal = Number(grandTotal.toFixed(2))
      tax = 0
    }
  }

  subtotal = Number((Number.isFinite(subtotal) ? subtotal : 0).toFixed(2))
  tax = Number((Number.isFinite(tax) ? tax : 0).toFixed(2))
  grandTotal = Number((Number.isFinite(grandTotal) ? grandTotal : subtotal + tax).toFixed(2))

  let gstRate = Number(order.gst_rate ?? order.gstRate ?? 0)
  if ((!Number.isFinite(gstRate) || gstRate <= 0) && tax > 0 && subtotal > 0) {
    gstRate = Number(((tax / subtotal) * 100).toFixed(2))
  }
  const halfRate = gstRate > 0 ? Number((gstRate / 2).toFixed(2)) : 0
  const cgst = tax > 0 ? Number((tax / 2).toFixed(2)) : 0
  const sgst = tax > 0 ? Number((tax - cgst).toFixed(2)) : 0
  const taxLabel = String(order.gst_label || order.gstLabel || profile?.gstLabel || 'GST').trim() || 'GST'

  return {
    subtotal,
    tax,
    cgst,
    sgst,
    gstRate,
    halfRate,
    taxLabel,
    grandTotal,
    hasTax: tax > 0,
  }
}
