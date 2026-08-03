import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, AlertCircle, RefreshCw, ArrowRight, ShieldAlert, Calendar, QrCode, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Logo from '../ui/Logo'
import UPIPaymentModal from './UPIPaymentModal'

export default function SubscriptionLockOverlay({ 
  planName = 'PRO', 
  expiredSince = new Date(), 
  pendingApproval = false,
  utrNumber = '',
  restaurantId,
  merchantEmail,
  merchantName
}) {
  const navigate = useNavigate()
  const [showUPIModal, setShowUPIModal] = useState(false)

  return (
    <div className="fixed inset-0 z-9999 bg-white flex flex-col items-center justify-center p-6 text-center overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-2xl w-full"
      >
        <div className="mb-8 flex justify-center">
          <div className={`p-6 rounded-[2.5rem] shadow-2xl relative group ${
             pendingApproval ? 'bg-amber-500 shadow-amber-500/20' : 'bg-red-600 shadow-red-500/20'
          }`}>
             <div className="absolute -top-4 -right-4 w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-12 group-hover:rotate-0 transition-transform">
                {pendingApproval ? <Clock className="w-6 h-6 animate-pulse" /> : <AlertCircle className="w-6 h-6" />}
             </div>
             <Logo iconSize={48} showText={false} />
          </div>
        </div>

        {pendingApproval ? (
           <>
              <h1 className="text-4xl lg:text-6xl font-black text-slate-950 tracking-tight leading-tight mb-4 uppercase">
                 Payment <br/> <span className="text-amber-600">Verification Pending</span>
              </h1>
              
              <p className="text-base text-slate-500 font-medium leading-relaxed mb-8 max-w-lg mx-auto tracking-tight">
                 Your UTR transaction reference number <span className="font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">{utrNumber || 'Submitted'}</span> is currently being rechecked by the Admin team. Once verified, your dashboard will unlock automatically!
              </p>
           </>
        ) : (
           <>
              <h1 className="text-4xl lg:text-6xl font-black text-slate-950 tracking-tight leading-tight mb-4 uppercase">
                 Subscription <br/> <span className="text-red-600">Cycle Expired</span>
              </h1>
              
              <p className="text-base text-slate-500 font-medium leading-relaxed mb-8 max-w-lg mx-auto tracking-tight">
                 Your {planName} 30-day subscription cycle concluded on {new Date(expiredSince).toLocaleDateString()}. Scan the UPI QR code below and submit your UTR number to instantly renew your subscription.
              </p>
           </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
           <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl text-left">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm mb-4 border border-slate-100">
                 <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">GateSphere Verification</h4>
              <p className="text-xs text-slate-500 font-bold">UPI ID: yash38687-1@oksbi (Payee: Yash)</p>
           </div>
           <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl text-left">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm mb-4 border border-slate-100">
                 <Calendar className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Instant 30-Day Renewal</h4>
              <p className="text-xs text-slate-500 font-bold">Submit 12-digit UTR to notify Admin team.</p>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
           <Button 
              size="lg" 
              className="h-16 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-3"
              onClick={() => setShowUPIModal(true)}
           >
              <QrCode className="w-5 h-5" />
              Pay via UPI QR & UTR
           </Button>
           <Button 
              size="lg" 
              variant="outline"
              className="h-16 px-10 rounded-2xl border-slate-200 text-slate-900 font-black text-xs uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
              onClick={() => window.location.reload()}
           >
              <RefreshCw className="w-4 h-4 mr-2" /> Check Status
           </Button>
        </div>

        {/* UPI Payment Modal */}
        <UPIPaymentModal 
          open={showUPIModal}
          onOpenChange={setShowUPIModal}
          planName={planName}
          amount={planName === 'PREMIUM' ? 4999 : planName === 'PRO' ? 2499 : 999}
          restaurantId={restaurantId}
          merchantEmail={merchantEmail}
          merchantName={merchantName}
          onPaymentSubmitted={() => setShowUPIModal(false)}
        />
      </motion.div>
    </div>
  )
}
