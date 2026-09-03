import React, { useState, useEffect, useMemo } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CreditCard, 
  QrCode, 
  Banknote, 
  Wallet, 
  Split, 
  CheckCircle, 
  Printer, 
  Receipt, 
  UserPlus, 
  Trash2, 
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Smartphone
} from 'lucide-react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { createServerInvoice, settleInvoicePayment } from '@/services/billing.service'
import { createOrder } from '@/services/order.service'

export default function SplitPaymentModal({
  isOpen,
  onClose,
  restaurantId,
  restaurantProfile,
  tableNumber,
  cartItems = [],
  calculation,
  discount,
  customerName = 'Walk-in Guest',
  onSuccessSettlement
}) {
  const grandTotal = calculation?.pricing?.grandTotal || 0

  // Payment Mode: 'single' | 'split'
  const [paymentMode, setPaymentMode] = useState('single')

  // Single Pay States
  const [singleMethod, setSingleMethod] = useState('UPI') // 'CASH' | 'UPI' | 'CARD' | 'WALLET'
  const [cashTendered, setCashTendered] = useState(grandTotal)
  const [singleRef, setSingleRef] = useState('')

  // Split Pay States: Array of { id, payerName, method, amount, reference }
  const [splitPayers, setSplitPayers] = useState([
    { id: '1', payerName: 'Person A', method: 'UPI', amount: Math.ceil(grandTotal / 2), reference: '' },
    { id: '2', payerName: 'Person B', method: 'CASH', amount: Math.floor(grandTotal / 2), reference: '' }
  ])

  // Settlement Result State
  const [isProcessing, setIsProcessing] = useState(false)
  const [settledInvoice, setSettledInvoice] = useState(null)

  // Real Dynamic UPI QR Code Generation for Restaurant Merchant
  const payeeName = restaurantProfile?.business_name || restaurantProfile?.name || 'Tiger Bistro'
  const defaultMerchantUpi = useMemo(() => {
    return (payeeName || 'tigerbistro').toLowerCase().replace(/[^a-z0-9]/g, '') + '@okaxis'
  }, [payeeName])

  const [merchantUpi, setMerchantUpi] = useState(() => {
    const saved = localStorage.getItem(`servora_merchant_upi_${restaurantId || 'default'}`)
    return saved || restaurantProfile?.upi_id || restaurantProfile?.upiId || defaultMerchantUpi
  })
  
  const [isEditingUpi, setIsEditingUpi] = useState(false)
  const [tempUpiInput, setTempUpiInput] = useState(merchantUpi)
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)

  // Sync if profile updates
  useEffect(() => {
    const saved = localStorage.getItem(`servora_merchant_upi_${restaurantId || 'default'}`)
    if (saved) {
      setMerchantUpi(saved)
      setTempUpiInput(saved)
    } else if (restaurantProfile?.upi_id || restaurantProfile?.upiId) {
      const pUpi = restaurantProfile.upi_id || restaurantProfile.upiId
      setMerchantUpi(pUpi)
      setTempUpiInput(pUpi)
    }
  }, [restaurantId, restaurantProfile])

  // Generate dynamic scan-ready UPI QR code directly for restaurant merchant account
  useEffect(() => {
    if (!isOpen || grandTotal <= 0) return
    const activeUpi = merchantUpi || defaultMerchantUpi
    const upiURI = `upi://pay?pa=${activeUpi}&pn=${encodeURIComponent(payeeName)}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(`Table ${tableNumber} Bill - ${payeeName}`)}`
    QRCode.toDataURL(upiURI, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setUpiQrDataUrl(url))
      .catch(err => console.warn('Failed to generate dynamic UPI QR:', err))
  }, [isOpen, merchantUpi, defaultMerchantUpi, payeeName, grandTotal, tableNumber])

  const saveMerchantUpi = () => {
    const trimmed = tempUpiInput.trim()
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Please enter a valid UPI ID (e.g. restaurant@okaxis or 9876543210@paytm)')
      return
    }
    setMerchantUpi(trimmed)
    localStorage.setItem(`servora_merchant_upi_${restaurantId || 'default'}`, trimmed)
    setIsEditingUpi(false)
    toast.success(`✅ Restaurant UPI ID updated to "${trimmed}"! QR code updated.`)
  }

  const copyUPI = () => {
    navigator.clipboard.writeText(merchantUpi)
    setCopiedUpi(true)
    toast.success('Restaurant UPI ID Copied', { description: merchantUpi })
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setSettledInvoice(null)
      setCashTendered(grandTotal)
      setSingleRef('')
      setSplitPayers([
        { id: '1', payerName: 'Person A', method: 'UPI', amount: Math.ceil(grandTotal / 2), reference: '' },
        { id: '2', payerName: 'Person B', method: 'CASH', amount: Math.floor(grandTotal / 2), reference: '' }
      ])
    }
  }, [isOpen, grandTotal])

  // Single Pay Change calculation
  const cashChange = useMemo(() => {
    const tendered = Number(cashTendered) || 0
    return Math.max(0, tendered - grandTotal)
  }, [cashTendered, grandTotal])

  // Split Pay Calculations
  const splitTotalPaid = useMemo(() => {
    return splitPayers.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  }, [splitPayers])

  const splitRemainingBalance = useMemo(() => {
    return Number((grandTotal - splitTotalPaid).toFixed(2))
  }, [grandTotal, splitTotalPaid])

  // Add new split payer row
  const addSplitPayer = () => {
    const nextChar = String.fromCharCode(65 + splitPayers.length)
    const defaultAmt = Math.max(0, splitRemainingBalance)
    setSplitPayers(prev => [
      ...prev,
      {
        id: String(Date.now()),
        payerName: `Person ${nextChar}`,
        method: 'UPI',
        amount: defaultAmt,
        reference: ''
      }
    ])
  }

  // Remove split payer row
  const removeSplitPayer = (id) => {
    if (splitPayers.length <= 1) {
      toast.error('At least one payer is required for split payment')
      return
    }
    setSplitPayers(prev => prev.filter(p => p.id !== id))
  }

  // Update specific split payer
  const updateSplitPayer = (id, field, value) => {
    setSplitPayers(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value }
      }
      return p
    }))
  }

  // Split Equally Helper
  const splitEqually = () => {
    const count = splitPayers.length
    if (count <= 0) return
    const equalShare = Math.floor(grandTotal / count)
    const remainder = grandTotal - (equalShare * count)

    setSplitPayers(prev => prev.map((p, idx) => ({
      ...p,
      amount: idx === 0 ? equalShare + remainder : equalShare
    })))
    toast.success(`Split equally across ${count} payers (₹${equalShare} each)`)
  }

  // Execute Complete Settlement
  const handleCompleteSettlement = async () => {
    try {
      setIsProcessing(true)

      // 1. Validate Payments
      let finalPayments = []

      if (paymentMode === 'single') {
        if (singleMethod === 'CASH' && Number(cashTendered) < grandTotal) {
          toast.error(`Cash tendered (₹${cashTendered}) cannot be less than Grand Total (₹${grandTotal})`)
          setIsProcessing(false)
          return
        }

        finalPayments = [
          {
            method: singleMethod,
            amount: grandTotal,
            payerName: customerName || 'Primary Guest',
            reference: singleRef || (singleMethod === 'CASH' ? 'CASH_REGISTER' : `TXN_${Date.now()}`)
          }
        ]
      } else {
        // Split Mode validation
        if (splitRemainingBalance !== 0) {
          toast.error(`Split payments must equal total bill (Remaining balance: ₹${splitRemainingBalance})`)
          setIsProcessing(false)
          return
        }

        finalPayments = splitPayers.map(p => ({
          method: p.method,
          amount: Number(p.amount),
          payerName: p.payerName || 'Guest',
          reference: p.reference || `SPLIT_${Date.now()}`
        }))
      }

      // 2. Generate Official Sequential Invoice on Backend
      const invoice = await createServerInvoice({
        restaurantId,
        restaurantDetails: {
          name: restaurantProfile?.name || 'Tiger Bistro',
          address: restaurantProfile?.address || 'Main Square Mall, Floor 2',
          phone: restaurantProfile?.phone || '+91 98765 43210',
          gstin: restaurantProfile?.gstin || '07AAAAA0000A1Z5'
        },
        tableNumber: String(tableNumber),
        customer: { name: customerName },
        items: cartItems,
        discount
      })

      // 3. Settle Payments against the Invoice
      const settlementResult = await settleInvoicePayment({
        invoiceId: invoice.id,
        payments: finalPayments,
        restaurantId
      })

      // 4. Auto-fire Order to Kitchen with Prepaid / Billing Done Remark
      try {
        const orderNumberTable = String(tableNumber || '1').replace(/^Table\s*/i, '')
        const paymentMethodSummary = finalPayments.map(p => p.method).join(' + ') || singleMethod
        await createOrder({
          restaurantId,
          tableNumber: orderNumberTable,
          customerName: customerName || 'Walk-in Guest',
          items: cartItems.map(i => ({
            id: i.id || i._id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            variant: i.variant,
            notes: i.notes || ''
          })),
          subtotal: calculation?.pricing?.subtotal || grandTotal,
          tax: calculation?.pricing?.taxes?.totalTax || 0,
          total: grandTotal,
          status: 'PREPARING',
          payment_status: 'PAID',
          payment_method: paymentMethodSummary,
          is_prepaid: true,
          notes: `BILLING DONE / PAID IN ADVANCE (${paymentMethodSummary}) ✅`,
          specialInstructions: `BILLING DONE / PAID IN ADVANCE (${paymentMethodSummary}) ✅`
        })
      } catch (errKOT) {
        console.warn('Auto-KOT creation notice:', errKOT)
      }

      setSettledInvoice(invoice)
      toast.success(`🎉 Bill Settled & KOT Sent to Kitchen (PAID ✅)!`)
      if (onSuccessSettlement) {
        onSuccessSettlement(invoice)
      }
    } catch (err) {
      console.error('Settlement error:', err)
      toast.error(err.message || 'Payment settlement failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // Thermal Print Receipt (Iframe-Isolated)
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

      const now = new Date()
      const formattedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      const invNum = settledInvoice?.invoiceNumber || `INV-${now.getFullYear()}-${Date.now().toString().slice(-6)}`

      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${payeeName} - Paid Receipt</title>
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
                <h2 style="margin:0; font-size:20px; font-weight:900;" class="uppercase">${payeeName}</h2>
                <p style="margin:4px 0 2px; font-size:12px; color:#475569;">${restaurantProfile?.address || 'Main Square Mall, Floor 2'}</p>
                <p style="margin:0; font-size:12px; color:#475569;">Ph: <strong>${restaurantProfile?.phone || '+91 98765 43210'}</strong></p>
                <div style="margin-top:6px;">
                  <span style="display:inline-block; padding:2px 8px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:4px; font-size:11px; font-weight:bold; color:#1e293b;">
                    GSTIN: ${restaurantProfile?.gstin || '07AAAAA0000A1Z5'}
                  </span>
                </div>
              </div>

              <!-- Metadata -->
              <div class="dashed-border">
                <div class="grid-2">
                  <div><span style="color:#64748b;">Invoice No:</span> <strong style="color:#0f172a; font-size:13px;">${invNum}</strong></div>
                  <div class="text-right"><span style="color:#64748b;">Table:</span> <strong style="color:#0f172a; font-size:14px;">Table ${tableNumber}</strong></div>
                </div>
                <div class="grid-2">
                  <div><span style="color:#64748b;">Date & Time:</span> <span>${formattedDate}, ${formattedTime}</span></div>
                  <div class="text-right"><span style="color:#64748b;">Status:</span> <strong style="color:#059669;">PAID</strong></div>
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
                  <span style="font-weight:bold; color:#0f172a;">₹${calculation?.pricing?.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                ${calculation?.pricing?.discount?.amount > 0 ? `
                  <div class="totals-row" style="color:#059669; font-weight:bold;">
                    <span>Discount:</span>
                    <span>-₹${calculation?.pricing?.discount?.amount?.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="totals-row">
                  <span>CGST (2.5%):</span>
                  <span>₹${calculation?.pricing?.taxes?.cgst?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="totals-row">
                  <span>SGST (2.5%):</span>
                  <span>₹${calculation?.pricing?.taxes?.sgst?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="grand-total-row">
                  <span>Total Paid:</span>
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

      toast.success('Paid Receipt sent to printer!')
    } catch (err) {
      console.error('Print error:', err)
      window.print()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-3xl border-slate-200 shadow-2xl bg-white">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <span>Table {tableNumber} Bill Settlement</span>
                <Badge className="bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5">
                  ₹{grandTotal} Due
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400">
                Authoritative GST Billing Engine & Multi-Payer Split Payment
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Settled Success Screen */}
        {settledInvoice ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-center bg-[#fffdfa] font-mono">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Official Invoice Generated</span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">{settledInvoice.invoiceNumber}</h2>
              <p className="text-xs text-emerald-700 font-bold mt-1 bg-emerald-50 inline-block px-3 py-0.5 rounded-full border border-emerald-200">
                ✅ Paid & Settled (₹{grandTotal})
              </p>
            </div>

            {/* Bill Summary Breakdown */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-left space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{calculation?.pricing?.subtotal?.toFixed(2)}</span>
              </div>
              {calculation?.pricing?.discount?.amount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount:</span>
                  <span>-₹{calculation?.pricing?.discount?.amount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Taxable Value:</span>
                <span>₹{calculation?.pricing?.taxableValue?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST (2.5%):</span>
                <span>₹{calculation?.pricing?.taxes?.cgst?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST (2.5%):</span>
                <span>₹{calculation?.pricing?.taxes?.sgst?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 pt-2 border-t text-sm">
                <span>Grand Total Paid:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-xl font-bold text-xs"
              >
                Close & Next Order
              </Button>
              <Button
                onClick={handlePrint}
                className="rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-5 shadow-md shadow-indigo-500/20"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Thermal Receipt
              </Button>
            </div>
          </div>
        ) : (
          
          /* Payment Processing Screen */
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Bill Summary Strip */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Subtotal & Taxes</span>
                  <span className="text-slate-700 font-medium">Subtotal ₹{calculation?.pricing?.subtotal} • GST ₹{calculation?.pricing?.taxes?.totalTax}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Payable</span>
                  <span className="text-base font-black text-slate-900">₹{grandTotal}</span>
                </div>
              </div>

              {/* Mode Tabs (Single Pay vs Multi-Payer Split) */}
              <Tabs value={paymentMode} onValueChange={setPaymentMode}>
                <TabsList className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                  <TabsTrigger value="single" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    ⚡ Single Payment
                  </TabsTrigger>
                  <TabsTrigger value="split" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    👥 Multi-Payer Split
                  </TabsTrigger>
                </TabsList>

                {/* ── 1. Single Payment Tab ── */}
                <TabsContent value="single" className="space-y-3 mt-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                      { id: 'CASH', label: 'Cash', icon: Banknote },
                      { id: 'CARD', label: 'Card / POS', icon: CreditCard },
                      { id: 'WALLET', label: 'Wallet', icon: Wallet }
                    ].map(m => {
                      const isSelected = singleMethod === m.id
                      const Icon = m.icon
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSingleMethod(m.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            isSelected 
                              ? `border-slate-900 bg-slate-900 text-white shadow-sm` 
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                          <span className="text-[11px] font-bold">{m.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Method Specific Inputs */}
                  {singleMethod === 'CASH' && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-950">Cash Tendered by Customer</label>
                        <span className="text-xs font-mono font-black text-emerald-700">Due: ₹{grandTotal}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">₹</span>
                        <Input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          className="pl-7 h-9 rounded-xl bg-white text-sm font-black"
                        />
                      </div>
                      {cashChange > 0 && (
                        <div className="flex justify-between items-center text-xs font-bold text-emerald-800 pt-1">
                          <span>Return Change to Customer:</span>
                          <span className="text-sm font-black bg-emerald-200/80 px-2 py-0.5 rounded-md">₹{cashChange}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {singleMethod === 'UPI' && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                        
                        {/* Left Column: Compact Scannable UPI QR Image */}
                        <div className="sm:col-span-5 text-center">
                          <div className="bg-white p-2.5 rounded-2xl shadow-xs border border-indigo-100 inline-block">
                            {upiQrDataUrl ? (
                              <img 
                                src={upiQrDataUrl} 
                                alt={`${payeeName} UPI Payment QR Code`} 
                                className="w-36 h-36 mx-auto rounded-xl object-contain"
                              />
                            ) : (
                              <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                                Generating QR...
                              </div>
                            )}
                            
                            <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-center gap-1 text-[10px] font-black text-indigo-950">
                              <span>Scan & Pay:</span>
                              <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">₹{grandTotal}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Payee, UPI ID, Copy/Edit, Badges & UTR */}
                        <div className="sm:col-span-7 space-y-2 text-left">
                          
                          {/* Trust Banner */}
                          <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-white border border-indigo-100 text-[11px] font-bold text-indigo-950">
                            <div className="flex items-center gap-1.5 truncate">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{payeeName}</span>
                            </div>
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 font-extrabold">
                              Direct Bank
                            </span>
                          </div>

                          {/* UPI ID Row */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs truncate max-w-40">
                              {merchantUpi}
                            </span>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={copyUPI}
                              className="h-6 px-2 rounded-lg text-[10px] font-bold border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50"
                            >
                              {copiedUpi ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                              <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setTempUpiInput(merchantUpi)
                                setIsEditingUpi(!isEditingUpi)
                              }}
                              className="h-6 px-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:text-indigo-600"
                            >
                              {isEditingUpi ? 'Cancel' : '✏️ Edit'}
                            </Button>
                          </div>

                          {/* Inline Edit Restaurant UPI Drawer */}
                          {isEditingUpi && (
                            <div className="p-2 rounded-xl bg-white border border-indigo-200 shadow-xs space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-700 block">
                                Set Restaurant Bank UPI ID
                              </label>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  placeholder="e.g. yourrestaurant@okaxis"
                                  value={tempUpiInput}
                                  onChange={(e) => setTempUpiInput(e.target.value)}
                                  className="h-7 text-xs font-mono"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={saveMerchantUpi}
                                  className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0"
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Supported UPI Apps Badges */}
                          <div className="flex flex-wrap items-center gap-1 text-[9px] font-extrabold text-slate-500">
                            <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">GPay</span>
                            <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">PhonePe</span>
                            <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">Paytm</span>
                            <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">BHIM</span>
                            <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200">Cred</span>
                          </div>

                          {/* UTR Input */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Optional UTR / Bank Ref No.</label>
                            <Input
                              placeholder="e.g. 423456789012 (12-digit UTR)"
                              value={singleRef}
                              onChange={(e) => setSingleRef(e.target.value)}
                              className="h-7 text-xs bg-white rounded-lg font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {singleMethod === 'CARD' && (
                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                      <label className="text-xs font-bold text-blue-950 block">Card Reference / Last 4 Digits</label>
                      <Input
                        placeholder="e.g. 4242 or Swipe Ref #1098"
                        value={singleRef}
                        onChange={(e) => setSingleRef(e.target.value)}
                        className="h-8 text-xs bg-white rounded-xl"
                      />
                    </div>
                  )}
                </TabsContent>

                {/* ── 2. Multi-Payer Split Payment Tab ── */}
                <TabsContent value="split" className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Split Bill Payers ({splitPayers.length})</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={splitEqually}
                        className="h-7 text-[11px] font-bold rounded-lg"
                      >
                        <Split className="w-3 h-3 mr-1" /> Split Equally
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addSplitPayer}
                        className="h-7 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <UserPlus className="w-3 h-3 mr-1" /> + Add Payer
                      </Button>
                    </div>
                  </div>

                  {/* Payer Rows */}
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {splitPayers.map((payer) => (
                      <div key={payer.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2">
                        <Input
                          value={payer.payerName}
                          onChange={(e) => updateSplitPayer(payer.id, 'payerName', e.target.value)}
                          placeholder="Guest Name"
                          className="h-7 text-xs bg-white rounded-lg w-28 shrink-0 font-bold"
                        />

                        <Select value={payer.method} onValueChange={(val) => updateSplitPayer(payer.id, 'method', val)}>
                          <SelectTrigger className="h-7 text-xs bg-white rounded-lg w-24 shrink-0 font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl text-xs font-medium">
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="CARD">Card</SelectItem>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="WALLET">Wallet</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <Input
                            type="number"
                            value={payer.amount}
                            onChange={(e) => updateSplitPayer(payer.id, 'amount', e.target.value)}
                            className="pl-6 h-7 text-xs bg-white rounded-lg font-black text-slate-900"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSplitPayer(payer.id)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Balance Status Banner */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    splitRemainingBalance === 0 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <span>{splitRemainingBalance === 0 ? '✅ Total Allocated' : '⚠️ Remaining Balance:'}</span>
                    <span className="text-sm font-black">
                      {splitRemainingBalance === 0 ? `₹${grandTotal} Settled` : `₹${splitRemainingBalance}`}
                    </span>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="rounded-xl font-bold text-xs"
              >
                Cancel
              </Button>

              <Button
                onClick={handleCompleteSettlement}
                disabled={isProcessing || (paymentMode === 'split' && splitRemainingBalance !== 0)}
                className="rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
              >
                {isProcessing ? 'Generating Invoice...' : `Settle & Generate Bill (₹${grandTotal})`}
              </Button>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}
