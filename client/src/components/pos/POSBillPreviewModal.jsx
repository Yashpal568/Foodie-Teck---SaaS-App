import React, { useMemo, useState } from 'react'
import ThermalReceiptModal from '@/components/receipt/ThermalReceiptModal'

export default function POSBillPreviewModal({
  isOpen,
  onClose,
  restaurantProfile,
  tableNumber = '1',
  customerName = 'Guest Customer',
  cartItems = [],
  calculation,
  discount,
  onProceedToSettle,
}) {
  const [orderRef] = useState(() => `POS-${Date.now().toString().slice(-6).toUpperCase()}`)

  const previewOrder = useMemo(() => {
    const rawCartTotal = cartItems.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0)
    const grandTotal = calculation?.pricing?.grandTotal ?? rawCartTotal
    const subtotal = calculation?.pricing?.subtotal ?? rawCartTotal
    const discountAmount = calculation?.pricing?.discount?.amount ?? Number(discount || 0)
    const cgst = calculation?.pricing?.taxes?.cgst ?? 0
    const sgst = calculation?.pricing?.taxes?.sgst ?? 0
    const totalTax = calculation?.pricing?.taxes?.totalTax ?? cgst + sgst

    return {
      id: orderRef,
      tableNumber,
      customerName,
      order_type: 'DINE-IN',
      items: cartItems,
      subtotal,
      tax: totalTax,
      total: grandTotal,
      discountAmount,
      createdAt: new Date().toISOString(),
    }
  }, [orderRef, tableNumber, customerName, cartItems, calculation, discount])

  return (
    <ThermalReceiptModal
      open={isOpen}
      onClose={onClose}
      order={previewOrder}
      profile={restaurantProfile}
      onProceedToSettle={onProceedToSettle}
    />
  )
}
