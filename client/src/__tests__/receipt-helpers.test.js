import { describe, it, expect } from 'vitest'
import {
  getRestaurantReceiptHeader,
  computeReceiptTotals,
  escapeHtml,
} from '@/utils/receiptHelpers'

describe('Dynamic Receipt Header & Conditional GSTIN (client/src/utils/receiptHelpers.js)', () => {
  it('omits unconfigured address, phone, and GSTIN instead of using hardcoded placeholders', () => {
    const header = getRestaurantReceiptHeader({
      id: '3a10e567-9e10-4c27-aadd-64e84cd8694c',
      business_name: 'Spice Villa',
      address: '',
      phone: '   ',
      gstin: '',
    })

    expect(header.name).toBe('Spice Villa')
    expect(header.address).toBe('')
    expect(header.phone).toBe('')
    expect(header.gstin).toBe('')
  })

  it('uses clean demo label for demo-merchant without Tiger Bistro / dummy GSTIN', () => {
    const header = getRestaurantReceiptHeader({ id: 'demo-merchant' })
    expect(header.name).toBe('Servora Demo Kitchen')
    expect(header.address).toBe('')
    expect(header.phone).toBe('')
    expect(header.gstin).toBe('')
  })

  it('shows normalized uppercase GSTIN, address, and phone when saved by restaurant', () => {
    const header = getRestaurantReceiptHeader({
      id: '3a10e567-9e10-4c27-aadd-64e84cd8694c',
      business_name: 'Urban Tandoor',
      address: '14 MG Road, Bengaluru',
      phone: '+91 98111 22333',
      gstin: ' 29abcde1234f1z9 ',
    })

    expect(header.name).toBe('Urban Tandoor')
    expect(header.address).toBe('14 MG Road, Bengaluru')
    expect(header.phone).toBe('+91 98111 22333')
    expect(header.gstin).toBe('29ABCDE1234F1Z9')
  })

  it('computes zero tax cleanly without inventing phantom 2.5% CGST/SGST rows', () => {
    const totals = computeReceiptTotals({
      subtotal: 400,
      tax: 0,
      total: 400,
      gst_rate: 0,
      items: [{ name: 'Paneer Tikka', price: 200, quantity: 2 }],
    })

    expect(totals.hasTax).toBe(false)
    expect(totals.cgst).toBe(0)
    expect(totals.sgst).toBe(0)
    expect(totals.subtotal).toBe(400)
    expect(totals.grandTotal).toBe(400)
  })

  it('computes dynamic CGST/SGST split rates for configured GST rates (e.g. 18%)', () => {
    const totals = computeReceiptTotals({
      subtotal: 1000,
      tax: 180,
      total: 1180,
      gst_rate: 18,
    })

    expect(totals.hasTax).toBe(true)
    expect(totals.halfRate).toBe(9)
    expect(totals.cgst).toBe(90)
    expect(totals.sgst).toBe(90)
    expect(totals.grandTotal).toBe(1180)
  })

  it('escapes HTML entities in print templates', () => {
    expect(escapeHtml('<script>"alert"</script>')).toBe('&lt;script&gt;&quot;alert&quot;&lt;/script&gt;')
  })
})
