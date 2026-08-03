import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Lock, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  ShieldCheck, 
  Calendar, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Zap,
  ShieldAlert,
  Copy,
  Check,
  Crown,
  Rocket,
  Package,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import Logo from '../ui/Logo'
import UPIPaymentModal from './UPIPaymentModal'
import { supabase } from '@/lib/supabase'

const availablePlans = [
  {
    id: 'PLN-1',
    name: 'Starter',
    price: 999,
    tableLimit: 10,
    desc: 'Essential digital QR ordering for smaller cafes & boutique venues.',
    features: ['Up to 10 Tables', 'Digital QR Menu', 'Real-Time Order Feed', 'Basic Analytics', 'Email Support'],
    popular: false,
    color: 'slate'
  },
  {
    id: 'PLN-2',
    name: 'Professional',
    price: 2499,
    tableLimit: 30,
    desc: 'The sweet spot for active dining rooms and growing restaurants.',
    features: ['Up to 30 Tables', 'Advanced CRM Module', 'AI Sales Telemetry', 'Revenue Tracking', 'Priority 24/7 Support'],
    popular: true,
    color: 'indigo'
  },
  {
    id: 'PLN-3',
    name: 'Enterprise',
    price: 4999,
    tableLimit: 9999,
    desc: 'Maximum control, custom integrations & unlimited table scaling.',
    features: ['Unlimited Tables', 'Full Analytics Suite', 'CRM & Marketing Engine', 'Custom API & Hardware Sync', 'Dedicated Account Manager'],
    popular: false,
    color: 'violet'
  }
]

export default function SubscriptionLockOverlay({ 
  planName = 'Professional', 
  expiredSince = new Date(), 
  pendingApproval = false,
  utrNumber = '',
  restaurantId,
  merchantEmail,
  merchantName,
  onCheckStatus
}) {
  const navigate = useNavigate()
  const [showUPIModal, setShowUPIModal] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [copiedUpi, setCopiedUpi] = useState(false)
  
  // Selected Plan state (defaults to Professional or existing planName)
  const initialPlan = availablePlans.find(p => p.name.toLowerCase() === (planName || '').toLowerCase()) || availablePlans[1]
  const [selectedPlan, setSelectedPlan] = useState(initialPlan)

  const upiId = 'yash38687-1@oksbi'

  const copyUPI = () => {
    navigator.clipboard.writeText(upiId)
    setCopiedUpi(true)
    toast.success('UPI ID Copied', { description: upiId })
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  const handleCheckStatus = async () => {
    try {
      setIsChecking(true)
      toast.info('Checking subscription status...', { description: 'Synchronizing with Servora network...' })
      
      if (restaurantId && restaurantId !== 'guest') {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status, plan_name')
          .eq('restaurant_id', restaurantId)
          .maybeSingle()

        if (sub && (sub.status === 'Approved' || sub.status === 'Active')) {
          toast.success('Subscription Verified & Active!', { description: 'Unlocking your merchant console...' })
          setTimeout(() => window.location.reload(), 600)
          return
        }
      }

      if (onCheckStatus) {
        onCheckStatus()
      } else {
        setTimeout(() => window.location.reload(), 800)
      }
    } catch (err) {
      window.location.reload()
    } finally {
      setTimeout(() => setIsChecking(false), 1000)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-50/70 backdrop-blur-md flex flex-col items-center justify-y-auto p-4 sm:p-8 text-center overflow-y-auto font-sans select-none min-h-screen">
      
      {/* ── Ambient SaaS Decorative Orbs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden max-w-7xl mx-auto">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[30%] right-[10%] w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 max-w-5xl w-full my-auto py-8"
      >
        {/* ── Header Badge & Logo Icon ── */}
        <div className="mb-6 flex flex-col items-center justify-center space-y-3">
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200/80 px-4 py-1.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            {pendingApproval ? 'Verification In Progress' : 'Select Subscription Plan'}
          </Badge>

          <div className="relative">
            <div className={`p-5 rounded-[2rem] shadow-xl relative transition-transform duration-500 group ${
               pendingApproval 
                ? 'bg-amber-500 shadow-amber-500/20 text-white' 
                : 'bg-indigo-600 shadow-indigo-600/25 text-white'
            }`}>
               <div className="absolute -top-3 -right-3 w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center text-white shadow-lg rotate-12 group-hover:rotate-0 transition-transform">
                  {pendingApproval ? <Clock className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 text-indigo-300" />}
               </div>
               <Logo iconSize={40} showText={false} />
            </div>
          </div>
        </div>

        {/* ── Main Headline Typography ── */}
        {pendingApproval ? (
           <div className="space-y-2 mb-8">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-950 uppercase">
                 Payment <br/>
                 <span className="text-amber-600 italic">Verification Pending</span>
              </h1>
              
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-lg mx-auto tracking-tight">
                 Your UTR transaction reference number <span className="font-mono font-black text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-xs">{utrNumber || 'Submitted'}</span> is currently being verified by the Admin team. Once approved, your console unlocks automatically!
              </p>
           </div>
        ) : (
           <div className="space-y-2 mb-8">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-950 uppercase">
                 Select Your <br/>
                 <span className="text-indigo-600 italic">Subscription Plan</span>
              </h1>
              
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-lg mx-auto tracking-tight">
                 Choose a plan for <span className="text-slate-950 font-bold">{merchantName || 'your restaurant'}</span>. Scan the UPI QR code and submit your 12-digit UTR number to activate full 30-day dashboard access.
              </p>
           </div>
        )}

        {/* ── 🌟 Interactive Plan Selection Grid ── */}
        {!pendingApproval && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
             {availablePlans.map((plan) => {
                const isSelected = selectedPlan.name === plan.name
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-6 rounded-[2rem] border transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                      isSelected 
                        ? 'bg-slate-900 text-white border-indigo-500 shadow-2xl shadow-indigo-500/20 scale-102 ring-2 ring-indigo-500/50' 
                        : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute top-0 right-0 px-4 py-1 bg-indigo-600 text-white font-black text-[9px] rounded-bl-2xl uppercase tracking-widest shadow-md">
                        Most Popular
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-black uppercase tracking-wider ${isSelected ? 'text-white' : 'text-slate-950'}`}>
                          {plan.name}
                        </h3>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                           isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-100 border-slate-200 text-transparent'
                        }`}>
                           <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight">₹{plan.price.toLocaleString('en-IN')}</span>
                        <span className={`text-xs font-bold ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>/month</span>
                      </div>

                      <p className={`text-xs font-medium leading-relaxed mb-6 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {plan.desc}
                      </p>

                      <div className="space-y-2.5 mb-6">
                        {plan.features.map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs font-bold">
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-indigo-600'}`} />
                            <span className={isSelected ? 'text-slate-200' : 'text-slate-700'}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className={`w-full rounded-xl font-black text-[10px] uppercase tracking-widest h-10 transition-all ${
                         isSelected 
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md' 
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'Selected Plan' : 'Select Plan'}
                    </Button>
                  </div>
                )
             })}
          </div>
        )}

        {/* ── Information Strip ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
           <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-sm hover:shadow-md transition-all group">
              <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-2xs mb-3 group-hover:scale-105 transition-transform">
                 <ShieldAlert className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1 flex items-center justify-between">
                 <span>Servora Verification</span>
                 <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 text-[9px] font-mono">UPI SECURE</Badge>
              </h4>
              
              <div className="flex items-center justify-between mt-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                 <div className="truncate">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Payee: Yash</p>
                    <p className="text-xs font-mono font-black text-indigo-600 truncate">{upiId}</p>
                 </div>
                 <Button 
                   size="icon" 
                   variant="ghost" 
                   className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl shrink-0 border border-slate-200 shadow-2xs"
                   onClick={copyUPI}
                 >
                    {copiedUpi ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                 </Button>
              </div>
           </div>

           <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-sm hover:shadow-md transition-all group">
              <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-2xs mb-3 group-hover:scale-105 transition-transform">
                 <Calendar className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1 flex items-center justify-between">
                 <span>Instant 30-Day Access</span>
                 <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[9px] font-mono">FAST APPROVAL</Badge>
              </h4>
              <p className="text-xs text-slate-500 font-bold leading-relaxed mt-2">
                 Submit your 12-digit UTR reference number. Admin verification typically completes in under 15 minutes.
              </p>
           </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
           <Button 
              size="lg" 
              className="h-16 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
              onClick={() => setShowUPIModal(true)}
           >
              <QrCode className="w-5 h-5" />
              Pay ₹{selectedPlan.price.toLocaleString('en-IN')} ({selectedPlan.name}) & Submit UTR
           </Button>
           
           <Button 
              size="lg" 
              variant="outline"
              disabled={isChecking}
              className="h-16 px-10 rounded-2xl bg-white hover:bg-slate-50 border-slate-200 text-slate-900 font-black text-xs uppercase tracking-widest active:scale-95 transition-all cursor-pointer shadow-xs"
              onClick={handleCheckStatus}
           >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-600" /> Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" /> Check Status
                </>
              )}
           </Button>
        </div>

        {/* ── UPI Payment Modal ── */}
        <UPIPaymentModal 
          open={showUPIModal}
          onOpenChange={setShowUPIModal}
          planName={selectedPlan.name}
          amount={selectedPlan.price}
          restaurantId={restaurantId}
          merchantEmail={merchantEmail}
          merchantName={merchantName}
          onPaymentSubmitted={() => setShowUPIModal(false)}
        />
      </motion.div>
    </div>
  )
}
