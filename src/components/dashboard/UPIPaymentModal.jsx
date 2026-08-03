import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  QrCode, 
  Copy, 
  Check, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  IndianRupee, 
  X,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Lock
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { triggerPushNotification } from '@/lib/pushNotifications'

export default function UPIPaymentModal({ 
  open, 
  onOpenChange, 
  planName = 'PRO', 
  amount = 2499, 
  restaurantId, 
  merchantEmail, 
  merchantName,
  onPaymentSubmitted 
}) {
  const [utrNumber, setUtrNumber] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [generatedQR, setGeneratedQR] = useState('')

  const upiId = 'yash38687-1@oksbi'
  const payeeName = 'Yash'

  useEffect(() => {
    const upiURI = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Servora Plan ${planName}`)}`
    QRCode.toDataURL(upiURI, {
       width: 320,
       margin: 2,
       color: {
          dark: '#0f172a',
          light: '#ffffff'
       }
    })
    .then(url => setGeneratedQR(url))
    .catch(err => console.warn('Failed to generate dynamic UPI QR:', err))
  }, [upiId, payeeName, amount, planName])

  const copyUPI = () => {
    navigator.clipboard.writeText(upiId)
    setCopiedUpi(true)
    toast.success('UPI ID Copied', { description: upiId })
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  const handleSubmitPayment = async (e) => {
    e.preventDefault()
    const cleanedUTR = utrNumber.trim()
    
    if (!cleanedUTR || cleanedUTR.length < 6) {
       toast.error('Invalid Transaction Number', { description: 'Please enter a valid 12-digit UTR or Reference Number.' })
       return
    }

    try {
       setIsSubmitting(true)

       const payload = {
          restaurant_id: restaurantId,
          merchant_name: merchantName || merchantEmail || 'Merchant Node',
          email: merchantEmail,
          plan_name: planName,
          amount: amount,
          utr_number: cleanedUTR,
          status: 'PENDING_APPROVAL',
          created_at: new Date().toISOString()
       }

       const { error: insertErr } = await supabase.from('payment_verifications').insert(payload)
       
       if (insertErr) {
          await supabase.from('subscriptions').upsert({
             restaurant_id: restaurantId,
             plan_name: planName,
             price: amount,
             status: 'PENDING_APPROVAL',
             utr_number: cleanedUTR,
             start_date: new Date().toISOString()
          }, { onConflict: 'restaurant_id' })
       }

       await supabase.from('audit_logs').insert({
          restaurant_id: restaurantId,
          action: `Payment Submitted: UTR #${cleanedUTR} (${planName} - ₹${amount})`,
          actor: merchantEmail || 'Merchant User',
          severity: 'SECURITY',
          type: 'PAYMENT_SUBMITTED'
       })

       setSubmitted(true)
       
       triggerPushNotification({
          title: '💳 Payment Request Submitted',
          body: `UTR #${cleanedUTR} registered. Waiting for Admin verification.`,
          sound: true
       })

       toast.success('Payment Request Submitted', {
          description: `UTR #${cleanedUTR} registered. Waiting for Admin verification.`
       })

       if (onPaymentSubmitted) onPaymentSubmitted(cleanedUTR)
    } catch (err) {
       console.error('Payment submission failed:', err)
       toast.error('Submission Failed', { description: err.message })
    } finally {
       setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-[2.5rem] p-8 bg-white text-slate-950 border-slate-200/80 shadow-2xl overflow-hidden font-sans">
        
        <DialogHeader className="space-y-2 text-left">
           <div className="flex items-center justify-between">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1">
                 Servora Secure Payment
              </Badge>
              <Badge variant="outline" className="text-slate-500 border-slate-200 font-mono text-[10px]">
                 Plan: {planName} &bull; ₹{amount.toLocaleString('en-IN')}
              </Badge>
           </div>
           <DialogTitle className="text-2xl font-black text-slate-950 tracking-tight leading-none">
              UPI QR Code & Verification
           </DialogTitle>
           <DialogDescription className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
              Pay via any UPI App & Submit 12-Digit Reference Number
           </DialogDescription>
        </DialogHeader>

        {submitted ? (
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }} 
             animate={{ opacity: 1, scale: 1 }} 
             className="py-8 text-center space-y-6"
           >
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                 <Clock className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-2">
                 <h3 className="text-xl font-black text-slate-950 tracking-tight">Payment Verification Pending</h3>
                 <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                    Your UTR transaction number <span className="font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{utrNumber}</span> has been submitted to the Admin team. Once verified, your subscription will activate automatically!
                 </p>
              </div>
              <Button 
                onClick={() => onOpenChange(false)} 
                className="rounded-2xl h-12 px-8 font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20"
              >
                 Return to Console
              </Button>
           </motion.div>
        ) : (
           <form onSubmit={handleSubmitPayment} className="space-y-6 pt-2">
              
              {/* QR Code & Payee Display Card */}
              <div className="bg-slate-50 border-2 border-slate-200/80 rounded-3xl p-6 text-center space-y-4 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                 
                 {/* Dynamic & Scannable UPI QR Image */}
                 <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md inline-block max-w-55 mx-auto relative group">
                    {generatedQR ? (
                       <img 
                         src={generatedQR} 
                         alt="Dynamic UPI Payment QR Code" 
                         className="w-48 h-48 object-contain rounded-xl"
                       />
                    ) : (
                       <img 
                         src="/upi_qr.png" 
                         alt="UPI Payment QR Code" 
                         className="w-48 h-48 object-contain rounded-xl"
                         onError={(e) => {
                            const target = e.currentTarget;
                            if (target && target.src.endsWith('.png')) {
                               target.src = '/upi_qr.jpg'
                            } else {
                               target.style.display = 'none';
                            }
                         }}
                       />
                    )}
                 </div>

                 {/* Payee Info & Copy UPI ID */}
                 <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Payee: <span className="text-slate-950 font-black">Yash</span></p>
                    
                    <div 
                      onClick={copyUPI}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-mono font-black text-indigo-700 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all shadow-2xs group"
                    >
                       <span>{upiId}</span>
                       {copiedUpi ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />}
                    </div>
                 </div>
              </div>

              {/* Transaction Number Input */}
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center justify-between">
                    <span>12-Digit UTR / Transaction Reference No.</span>
                    <span className="text-indigo-600 font-bold">Required</span>
                 </label>
                 <input 
                   type="text"
                   required
                   value={utrNumber}
                   onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                   placeholder="e.g. 202688991234 or UTR Ref No."
                   className="w-full h-12 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-4 font-mono font-black text-sm text-slate-900 outline-none transition-all placeholder:font-sans placeholder:font-medium placeholder:text-slate-400"
                 />
                 <p className="text-[10px] font-bold text-slate-400 italic ml-1">
                    Enter the 12-digit UTR/Reference number shown in your Google Pay, PhonePe, Paytm, or UPI app receipt.
                 </p>
              </div>

              <DialogFooter className="gap-3 sm:gap-0">
                 <Button 
                   type="button" 
                   variant="ghost" 
                   onClick={() => onOpenChange(false)}
                   className="rounded-2xl h-12 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-950 hover:bg-slate-100"
                 >
                    Cancel
                 </Button>
                 <Button 
                   type="submit" 
                   disabled={isSubmitting || !utrNumber.trim()}
                   className="rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                 >
                    {isSubmitting ? 'Submitting...' : 'Submit Payment Request'}
                 </Button>
              </DialogFooter>
           </form>
        )}

      </DialogContent>
    </Dialog>
  )
}
