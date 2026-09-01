import React from 'react'
import { 
  Printer, 
  Receipt, 
  X, 
  CreditCard
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function POSBillPreviewModal({
  isOpen,
  onClose,
  restaurantProfile,
  tableNumber = '1',
  customerName = 'Guest Customer',
  cartItems = [],
  calculation,
  discount,
  onProceedToSettle
}) {
  const restaurantName = restaurantProfile?.business_name || restaurantProfile?.name || 'Tiger Bistro'
  const restaurantAddress = restaurantProfile?.address || 'Main Square Mall, Floor 2, Central Market'
  const restaurantPhone = restaurantProfile?.phone || '+91 98765 43210'
  const restaurantGstin = restaurantProfile?.gstin || '07AAAAA0000A1Z5'
  
  const grandTotal = calculation?.pricing?.grandTotal || cartItems.reduce((s, i) => s + (i.price * i.quantity), 0)
  const subtotal = calculation?.pricing?.subtotal || cartItems.reduce((s, i) => s + (i.price * i.quantity), 0)
  const discountAmount = calculation?.pricing?.discount?.amount || 0
  const taxableValue = calculation?.pricing?.taxableValue || (subtotal - discountAmount)
  const cgst = calculation?.pricing?.taxes?.cgst || (taxableValue * 0.025)
  const sgst = calculation?.pricing?.taxes?.sgst || (taxableValue * 0.025)

  const now = new Date()
  const formattedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const orderRef = `#${Date.now().toString().slice(-6).toUpperCase()}`

  // Print Handler: Proportionate, Clean & Zero-Waste Layout
  const handlePrint = () => {
    try {
      const printFrame = document.createElement('iframe')
      printFrame.style.position = 'fixed'
      printFrame.style.right = '0'
      printFrame.style.bottom = '0'
      printFrame.style.width = '0'
      printFrame.style.height = '0'
      printFrame.style.border = '0'
      document.body.appendChild(printFrame)

      const frameDoc = printFrame.contentWindow || printFrame.contentDocument.document || printFrame.contentDocument
      const doc = frameDoc.document || frameDoc

      const itemsHtml = cartItems.map(item => `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; align-items:flex-start;">
          <div style="max-width:260px; word-break:break-word;">
            <span style="font-weight:bold; color:#0f172a;">${item.name}</span>
            ${item.variant && item.variant !== 'full' ? `<span style="font-size:11px; color:#d97706; display:block;">(${item.variant})</span>` : ''}
          </div>
          <span style="white-space:nowrap; margin:0 8px; color:#475569;">${item.quantity} x ₹${Number(item.price).toFixed(2)}</span>
          <span style="font-weight:bold; color:#0f172a; white-space:nowrap; text-align:right;">₹${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      `).join('')

      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${restaurantName} - Bill Receipt</title>
            <style>
              @page {
                size: auto;
                margin: 6mm auto;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              html, body {
                width: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff;
                color: #1e293b;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 13px;
                line-height: 1.45;
              }
              .receipt-box {
                width: 100%;
                max-width: 480px;
                margin: 0 auto;
                padding: 16px 20px;
                background: #fffdfa;
                border: 1.5px dashed #cbd5e1;
                border-radius: 8px;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .uppercase { text-transform: uppercase; }
              .dashed-border {
                border-bottom: 1.5px dashed #cbd5e1;
                padding-bottom: 12px;
                margin-bottom: 12px;
              }
              .grid-2 {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-size: 12.5px;
              }
              .items-header {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                border-bottom: 1.5px solid #0f172a;
                padding-bottom: 5px;
                margin-bottom: 10px;
                font-size: 12.5px;
                color: #0f172a;
              }
              .totals-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
                font-size: 12.5px;
                color: #475569;
              }
              .grand-total-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 17px;
                font-weight: 900;
                color: #0f172a;
                border-top: 2px solid #0f172a;
                border-bottom: 2px solid #0f172a;
                padding: 8px 0;
                margin: 10px 0;
              }
            </style>
          </head>
          <body>
            <div class="receipt-box">
              
              <!-- Brand Header -->
              <div class="text-center dashed-border">
                <h2 style="margin:0; font-size:20px; font-weight:900;" class="uppercase">${restaurantName}</h2>
                <p style="margin:4px 0 2px; font-size:12px; color:#475569;">${restaurantAddress}</p>
                <p style="margin:0; font-size:12px; color:#475569;">Ph: <strong>${restaurantPhone}</strong></p>
                <div style="margin-top:6px;">
                  <span style="display:inline-block; padding:2px 8px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:4px; font-size:11px; font-weight:bold; color:#1e293b;">
                    GSTIN: ${restaurantGstin}
                  </span>
                </div>
              </div>

              <!-- Metadata -->
              <div class="dashed-border">
                <div class="grid-2">
                  <div><span style="color:#64748b;">Table No:</span> <strong style="color:#0f172a; font-size:14px;">Table ${tableNumber}</strong></div>
                  <div class="text-right"><span style="color:#64748b;">Order Ref:</span> <strong style="color:#0f172a;">${orderRef}</strong></div>
                </div>
                <div class="grid-2">
                  <div><span style="color:#64748b;">Date & Time:</span> <span>${formattedDate}, ${formattedTime}</span></div>
                  <div class="text-right"><span style="color:#64748b;">Server / Mode:</span> <span>POS Dine-In</span></div>
                </div>
              </div>

              <!-- Items Table -->
              <div class="dashed-border" style="padding-bottom:8px;">
                <div class="items-header">
                  <span>Item</span>
                  <span>Qty x Price</span>
                  <span>Total</span>
                </div>
                ${itemsHtml}
              </div>

              <!-- Totals Breakdown -->
              <div class="dashed-border" style="padding-bottom:10px;">
                <div class="totals-row">
                  <span>Subtotal:</span>
                  <span style="font-weight:bold; color:#0f172a;">₹${subtotal.toFixed(2)}</span>
                </div>
                ${discountAmount > 0 ? `
                  <div class="totals-row" style="color:#059669; font-weight:bold;">
                    <span>Discount:</span>
                    <span>-₹${discountAmount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="totals-row">
                  <span>CGST (2.5%):</span>
                  <span>₹${cgst.toFixed(2)}</span>
                </div>
                <div class="totals-row">
                  <span>SGST (2.5%):</span>
                  <span>₹${sgst.toFixed(2)}</span>
                </div>
                <div class="grand-total-row">
                  <span>Grand Total:</span>
                  <span>₹${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <!-- Footer -->
              <div class="text-center" style="font-size:11.5px; color:#64748b; line-height:1.5; padding-top:2px;">
                <p style="margin:0; font-weight:bold; color:#0f172a;">Thank you for dining with us!</p>
                <p style="margin:0;">Please visit again soon.</p>
                <p style="margin:4px 0 0; font-size:9.5px; color:#94a3b8;">Powered by Servora POS OS</p>
              </div>

            </div>
          </body>
        </html>
      `)
      doc.close()

      setTimeout(() => {
        printFrame.contentWindow.focus()
        printFrame.contentWindow.print()
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame)
          }
        }, 3000)
      }, 300)

      toast.success('Thermal Bill sent to printer!')
    } catch (err) {
      console.error('Print error:', err)
      window.print()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 overflow-hidden rounded-3xl border-slate-200 shadow-2xl">
        
        {/* Top Header Controls */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-indigo-400" />
            <DialogTitle className="text-base font-black tracking-tight text-white">
              Customer Bill Receipt
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center justify-center transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-6 bg-[#fffdfa] font-mono text-xs text-slate-800 space-y-4 select-text">
          
          {/* Receipt Brand Header */}
          <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
            <h2 className="font-black text-lg text-slate-900 uppercase tracking-wider">{restaurantName}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{restaurantAddress}</p>
            <p className="text-[11px] text-slate-500">Ph: {restaurantPhone}</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
              GSTIN: {restaurantGstin}
            </span>
          </div>

          {/* Order Metadata */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b-2 border-dashed border-slate-300">
            <div>
              <span className="text-slate-400 block">Table No:</span>
              <strong className="text-slate-900 text-sm">Table {tableNumber}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Order Ref:</span>
              <strong className="text-slate-900">{orderRef}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Date & Time:</span>
              <span>{formattedDate}, {formattedTime}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Server / Mode:</span>
              <span>POS Dine-In</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2 py-2">
            <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-[11px]">
              <span>Item</span>
              <span>Qty x Price</span>
              <span>Total</span>
            </div>
            {cartItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <div className="max-w-[160px] truncate">
                  <span className="font-bold">{item.name}</span>
                  {item.variant && item.variant !== 'full' && (
                    <span className="text-[9px] text-amber-600 block">({item.variant})</span>
                  )}
                </div>
                <span>{item.quantity} x ₹{Number(item.price).toFixed(2)}</span>
                <span className="font-bold">₹{Number(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="pt-3 border-t-2 border-dashed border-slate-300 space-y-1.5 text-right">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[11px] text-emerald-600 font-bold">
                <span>Discount:</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>CGST (2.5%):</span>
              <span>₹{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>SGST (2.5%):</span>
              <span>₹{sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-300">
              <span>Grand Total:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
            <p>Thank you for dining with us!</p>
            <p>Please visit again soon.</p>
          </div>

        </div>

        {/* Action Footer */}
        {onProceedToSettle && (
          <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Close
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onClose()
                onProceedToSettle()
              }}
              className="rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              Settle Bill (₹{grandTotal})
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
