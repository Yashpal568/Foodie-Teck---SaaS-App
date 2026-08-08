import React, { useState, useEffect } from 'react'
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
  ChevronRight,
  MessageSquare,
  ArrowLeft,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [isApproved, setIsApproved] = useState(false)
  
  // View mode state: 'SELECT_PLAN' vs 'WAITING_WINDOW'
  const [viewMode, setViewMode] = useState(pendingApproval ? 'WAITING_WINDOW' : 'SELECT_PLAN')

  // Selected Plan state (defaults to Professional or existing planName)
  const initialPlan = availablePlans.find(p => p.name.toLowerCase() === (planName || '').toLowerCase()) || availablePlans[1]
  const [selectedPlan, setSelectedPlan] = useState(initialPlan)

  const upiId = 'yash38687-1@oksbi'

  // ── Real-Time Listener for Admin Approval ──
  useEffect(() => {
    if (!restaurantId || restaurantId === 'guest') return

    const checkApprovalStatus = () => {
      try {
        const isApprovedFlag = 
          localStorage.getItem(`servora_approved_${restaurantId}`) || 
          (merchantEmail && localStorage.getItem(`servora_approved_${merchantEmail}`))
        
        if (isApprovedFlag === 'true') {
          setIsApproved(true)
          if (onCheckStatus) onCheckStatus()
          toast.success('🎉 Payment Verified & Approved!', {
             description: 'Unlocking your merchant console...'
          })
          return true
        }

        const subs = JSON.parse(localStorage.getItem('servora_subscriptions') || '[]')
        const matched = subs.find(s => 
          s.restaurant_id === restaurantId || 
          s.id === `sub-${restaurantId}` ||
          (merchantEmail && s.restaurant_id === merchantEmail)
        )
        if (matched && (matched.status === 'Approved' || matched.status === 'Active')) {
          setIsApproved(true)
          if (onCheckStatus) onCheckStatus()
          toast.success('🎉 Payment Verified & Approved!', {
             description: 'Unlocking your merchant console...'
          })
          return true
        }
      } catch (e) {}
      return false
    }

    // Check immediately on mount
    if (checkApprovalStatus()) return

    const handleEventSync = () => {
      checkApprovalStatus()
    }

    window.addEventListener('platformConfigUpdated', handleEventSync)
    window.addEventListener('storage', handleEventSync)

    // 3-Second Heartbeat Polling to catch cross-tab admin approvals instantly
    const interval = setInterval(async () => {
      if (checkApprovalStatus()) {
        clearInterval(interval)
        return
      }

      try {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .or(`restaurant_id.eq.${restaurantId}${merchantEmail ? `,restaurant_id.eq.${merchantEmail}` : ''}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (sub && (sub.status === 'Approved' || sub.status === 'Active')) {
          setIsApproved(true)
          if (onCheckStatus) onCheckStatus()
          toast.success('🎉 Payment Verified & Approved!', {
             description: 'Unlocking your merchant console...'
          })
          clearInterval(interval)
        }
      } catch (e) {}
    }, 3000)

    const channel = supabase
      .channel(`public:subscription_approval_${restaurantId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subscriptions'
      }, (payload) => {
        const status = payload?.new ? payload.new['status'] : undefined
        if (status === 'Approved' || status === 'Active') {
          setIsApproved(true)
          if (onCheckStatus) onCheckStatus()
          toast.success('🎉 Payment Verified & Approved!', {
             description: 'Unlocking your merchant console...'
          })
        }
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      window.removeEventListener('platformConfigUpdated', handleEventSync)
      window.removeEventListener('storage', handleEventSync)
      supabase.removeChannel(channel)
    }
  }, [restaurantId])

  const copyUPI = () => {
    navigator.clipboard.writeText(upiId)
    setCopiedUpi(true)
    toast.success('UPI ID Copied', { description: upiId })
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  const handleCheckStatus = async () => {
    try {
      setIsChecking(true)
      setViewMode('WAITING_WINDOW') // Switch to Waiting Window when clicked!
      toast.info('Checking subscription status...', { description: 'Synchronizing with Servora network...' })
      
      // Check Local Storage Sync
      try {
        const subs = JSON.parse(localStorage.getItem('servora_subscriptions') || '[]')
        const matched = subs.find(s => s.restaurant_id === restaurantId || s.id === `sub-${restaurantId}`)
        if (matched && (matched.status === 'Approved' || matched.status === 'Active')) {
          setIsApproved(true)
          toast.success('Subscription Verified & Active!', { description: 'Unlocking your merchant console...' })
          setTimeout(() => window.location.reload(), 600)
          return
        }
      } catch (e) {}

      if (restaurantId && restaurantId !== 'guest') {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .maybeSingle()

        if (sub) {
          if (sub.status === 'Approved' || sub.status === 'Active') {
            setIsApproved(true)
            toast.success('Subscription Verified & Active!', { description: 'Unlocking your merchant console...' })
            setTimeout(() => window.location.reload(), 600)
            return
          }
        }
      }

      if (onCheckStatus) {
        onCheckStatus()
      }
    } catch (err) {
      console.warn('Status check fallback:', err)
    } finally {
      setTimeout(() => setIsChecking(false), 800)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 text-white flex flex-col items-center justify-y-auto p-4 sm:p-8 text-center overflow-y-auto font-sans select-none min-h-screen">
      
      {/* ── Ambient Glow Background Effects ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden max-w-7xl mx-auto">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/20 rounded-full blur-[160px] opacity-70" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] right-[-10%] w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 max-w-5xl w-full my-auto py-8"
      >
        {/* ── Header Badge & Logo Icon ── */}
        <div className="mb-6 flex flex-col items-center justify-center space-y-3">
          <Badge className="bg-slate-900/90 text-blue-400 border border-blue-500/30 px-4 py-1.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            {viewMode === 'WAITING_WINDOW' ? 'Verification Queue Active' : 'Merchant Subscription Gateway'}
          </Badge>

          <div className="relative">
            <div className={`p-5 rounded-[2rem] border shadow-2xl relative transition-transform duration-500 group ${
               viewMode === 'WAITING_WINDOW' 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10' 
                : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400 shadow-indigo-500/20'
            }`}>
               <div className="absolute -top-3 -right-3 w-9 h-9 bg-slate-900 border border-white/20 rounded-xl flex items-center justify-center text-white shadow-xl rotate-12 group-hover:rotate-0 transition-transform">
                  {viewMode === 'WAITING_WINDOW' ? <Clock className="w-4 h-4 animate-spin text-amber-400" /> : <Lock className="w-4 h-4 text-indigo-400" />}
               </div>
               <Logo iconSize={40} showText={false} />
            </div>
          </div>
        </div>

        {/* ── ⏳ REAL-TIME VERIFICATION WAITING WINDOW VIEW ── */}
        {viewMode === 'WAITING_WINDOW' ? (
           <div className="bg-slate-900/95 border border-slate-800 rounded-[2.2rem] p-6 sm:p-8 shadow-2xl backdrop-blur-2xl max-w-lg mx-auto space-y-5 text-center relative overflow-hidden">
              
              {/* ── ✖ Cross Close Button ── */}
              <Button
                 size="icon"
                 variant="ghost"
                 onClick={() => setViewMode('SELECT_PLAN')}
                 className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all z-20 cursor-pointer"
                 title="Close Waiting Window"
              >
                 <X className="w-4 h-4" />
              </Button>

              {/* Ambient Background Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 blur-2xl rounded-full pointer-events-none" />

              {/* Pulsing Status Radar Icon */}
              <div className="flex justify-center pt-1">
                 <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                       {isApproved ? (
                          <CheckCircle2 className="w-7 h-7 text-emerald-400 animate-bounce" />
                       ) : (
                          <Clock className="w-7 h-7 animate-spin text-amber-400" />
                       )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-slate-950"></span>
                    </span>
                 </div>
              </div>

              {/* Waiting Window Header */}
              <div className="space-y-1.5">
                 <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full">
                    {isApproved ? '🎉 APPROVED & UNLOCKED' : 'LIVE VERIFICATION QUEUE'}
                 </Badge>
                 <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight uppercase">
                    {isApproved ? 'Subscription Active!' : 'Payment Verification Pending'}
                 </h2>
                 <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                    {isApproved 
                       ? 'Your dashboard has been unlocked automatically.' 
                       : 'Your 12-digit UTR reference number is registered with Admin team. Auto-unlocks on approval.'
                    }
                 </p>
              </div>

              {/* Telemetry Receipt Box */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2.5 shadow-inner">
                 <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">UTR / Reference No.</span>
                    <span className="font-mono font-black text-amber-300 bg-slate-900 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-xs shadow-inner">
                       {utrNumber || 'Submitted'}
                    </span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Plan Selected</span>
                    <span className="text-xs font-black text-white uppercase">{selectedPlan?.name || planName || 'Professional'}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Verified Payee</span>
                    <span className="text-xs font-mono font-black text-indigo-400">yash38687-1@oksbi (Yash)</span>
                 </div>
                 <div className="flex justify-between items-center pt-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Est. Approval Time</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                       <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" /> Under 15 Mins
                    </span>
                 </div>
              </div>

              {/* Step Progress Timeline */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                 <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] mx-auto mb-1 font-bold">✓</div>
                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">UTR Submitted</p>
                 </div>
                 <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl relative">
                    <div className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] mx-auto mb-1 font-bold animate-pulse">2</div>
                    <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Admin Queue</p>
                 </div>
                 <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl opacity-60">
                    <div className="w-5 h-5 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center text-[10px] mx-auto mb-1 font-bold">3</div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Console Unlock</p>
                 </div>
              </div>

              {/* Waiting Action Controls */}
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
                 <Button 
                    size="lg" 
                    disabled={isChecking}
                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    onClick={handleCheckStatus}
                 >
                    {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Check Live Status
                 </Button>

                 <Button 
                    size="lg" 
                    variant="outline"
                    className="h-12 px-5 rounded-xl border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer flex items-center gap-2"
                    onClick={() => setViewMode('SELECT_PLAN')}
                 >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Plans
                 </Button>
              </div>
           </div>
        ) : (
           <>
              {/* ── Main Headline Typography ── */}
              <div className="space-y-3 mb-10">
                 <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white uppercase">
                    Select Your <br/>
                    <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent italic">
                       Subscription Plan
                    </span>
                 </h1>
                 
                 <p className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed max-w-xl mx-auto tracking-tight">
                    Choose a plan for <span className="text-white font-bold">{merchantName || 'your restaurant'}</span>. Scan the UPI QR code and submit your 12-digit UTR number to activate full 30-day console access.
                 </p>
              </div>

              {/* ── 🌟 Dark Luxe Plan Selection Grid ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-left">
                 {availablePlans.map((plan) => {
                    const isSelected = selectedPlan.name === plan.name
                    return (
                      <div
                        key={plan.id}
                        onClick={() => {
                           setSelectedPlan(plan)
                           setShowUPIModal(true)
                        }}
                        className={`p-8 rounded-[2.5rem] border transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                          isSelected 
                            ? 'bg-gradient-to-b from-indigo-950/70 via-slate-900 to-slate-950 text-white border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20 scale-102 ring-2 ring-indigo-500/40' 
                            : 'bg-slate-900/80 text-white border-slate-800 hover:border-slate-700 hover:bg-slate-900 hover:shadow-xl backdrop-blur-xl'
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-[9px] rounded-bl-2xl uppercase tracking-widest shadow-lg">
                            Most Popular
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black uppercase tracking-wider text-white">
                              {plan.name}
                            </h3>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                               isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-transparent'
                            }`}>
                               <Check className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">₹{plan.price.toLocaleString('en-IN')}</span>
                            <span className="text-xs font-bold text-slate-400">/month</span>
                          </div>

                          <p className="text-xs font-medium text-slate-400 leading-relaxed mb-6">
                            {plan.desc}
                          </p>

                          <div className="space-y-3 mb-8">
                            {plan.features.map(f => (
                              <div key={f} className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-indigo-500'}`} />
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={(e) => {
                             e.stopPropagation()
                             setSelectedPlan(plan)
                             setShowUPIModal(true)
                          }}
                          className={`w-full rounded-2xl font-black text-[10px] uppercase tracking-widest h-12 transition-all flex items-center justify-center gap-2 ${
                             isSelected 
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30' 
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          {isSelected ? 'SELECTED PLAN — TAP TO PAY' : 'SELECT PLAN & PAY'}
                        </Button>
                      </div>
                    )
                 })}
              </div>

              {/* ── Information Cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 text-left">
                 <div className="p-6 bg-slate-900/80 border border-slate-800/80 rounded-3xl text-left backdrop-blur-xl hover:border-indigo-500/30 transition-all shadow-xl group">
                    <div className="w-11 h-11 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                       <ShieldAlert className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1 flex items-center justify-between">
                       <span>Servora Pay Verification</span>
                       <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 text-[9px] font-mono">UPI SECURE</Badge>
                    </h4>
                    
                    <div className="flex items-center justify-between mt-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                       <div className="truncate">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified UPI ID</p>
                          <p className="text-xs font-mono font-black text-indigo-300 truncate">{upiId}</p>
                       </div>
                       <Button 
                         size="icon" 
                         variant="ghost" 
                         className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg shrink-0"
                         onClick={copyUPI}
                       >
                          {copiedUpi ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                       </Button>
                    </div>
                 </div>

                 <div className="p-6 bg-slate-900/80 border border-slate-800/80 rounded-3xl text-left backdrop-blur-xl hover:border-emerald-500/30 transition-all shadow-xl group">
                    <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                       <Zap className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1 flex items-center justify-between">
                       <span>Instant 30-Day Access</span>
                       <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[9px] font-mono">FAST APPROVAL</Badge>
                    </h4>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2">
                       Submit your 12-digit UTR transaction reference number. Admin verification typically takes under 15 minutes.
                    </p>
                 </div>
              </div>

              {/* ── Action Buttons ── */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Button 
                    size="lg" 
                    className="h-16 px-10 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                    onClick={() => setShowUPIModal(true)}
                 >
                    <QrCode className="w-5 h-5" />
                    Pay ₹{selectedPlan.price.toLocaleString('en-IN')} ({selectedPlan.name}) & Submit UTR
                 </Button>
                 
                 <Button 
                    size="lg" 
                    variant="outline"
                    disabled={isChecking}
                    className="h-16 px-10 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-200 font-black text-xs uppercase tracking-widest active:scale-95 transition-all cursor-pointer backdrop-blur-md flex items-center gap-2"
                    onClick={handleCheckStatus}
                 >
                    {isChecking ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-400" /> Verifying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" /> View Verification Status
                      </>
                    )}
                 </Button>
              </div>
           </>
        )}

        {/* ── UPI Payment Modal ── */}
        <UPIPaymentModal 
          open={showUPIModal}
          onOpenChange={setShowUPIModal}
          planName={selectedPlan?.name || planName}
          amount={selectedPlan?.price || 2499}
          restaurantId={restaurantId}
          merchantEmail={merchantEmail}
          merchantName={merchantName}
          onPaymentSubmitted={() => {
             setShowUPIModal(false)
             setViewMode('WAITING_WINDOW') // Immediately open Waiting Window after submission!
          }}
        />
      </motion.div>
    </div>
  )
}
