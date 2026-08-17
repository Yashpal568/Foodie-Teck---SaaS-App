import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Lock, 
  RefreshCw, 
  ShieldCheck, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Copy, 
  Check, 
  Crown, 
  Rocket, 
  Package, 
  ArrowLeft, 
  X, 
  Shield, 
  Layers, 
  Fingerprint,
  Building2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  MessageCircle,
  TrendingUp,
  UtensilsCrossed,
  ChefHat,
  MonitorSmartphone,
  CheckCircle,
  HelpCircle,
  Flame,
  Star,
  Award,
  PhoneCall,
  LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Logo, { LogoIcon } from '../ui/Logo'
import UPIPaymentModal from './UPIPaymentModal'
import { supabase } from '@/lib/supabase'

const availablePlans = [
  {
    id: 'PLN-1',
    name: 'Starter',
    price: 999,
    tableLimit: 10,
    desc: 'Essential digital QR ordering for smaller cafes & boutique venues.',
    features: [
      'Up to 10 Tables / QR Codes',
      'Digital QR Menu Catalog',
      'Live Kitchen Order Feed',
      'Basic Sales Analytics',
      'Standard Email Support'
    ],
    highlights: ['⚡ Instant 5-Min Setup', '📱 Contactless Dining'],
    popular: false,
    icon: Package,
    color: 'slate',
    tag: 'Boutique Cafes',
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  {
    id: 'PLN-2',
    name: 'Professional',
    price: 2499,
    tableLimit: 30,
    desc: 'Complete suite for active dining rooms and high-volume restaurants.',
    features: [
      'Up to 30 Tables / QR Codes',
      'Full CRM & Customer Directory',
      'Live Floor Table Telemetry',
      'AI Revenue & Trend Forecasting',
      'Priority 24/7 Phone & Chat Support'
    ],
    highlights: ['🔥 3x Faster Table Turns', '💎 Most Popular Choice', '📈 Full CRM Module'],
    popular: true,
    icon: Rocket,
    color: 'indigo',
    tag: 'Recommended Choice',
    badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'PLN-3',
    name: 'Enterprise',
    price: 4999,
    tableLimit: 9999,
    desc: 'Unlimited scaling, custom integrations & multi-branch reporting.',
    features: [
      'Unlimited Tables & QR Codes (9,999+)',
      'Multi-Branch Consolidated Dashboard',
      'Automated SMS & WhatsApp Marketing',
      'Custom Hardware & API Sync',
      'Dedicated Account Manager'
    ],
    highlights: ['👑 Unlimited Scaling', '🌐 Multi-Outlet Support', '🛡️ VIP Dedicated Manager'],
    popular: false,
    icon: Crown,
    color: 'purple',
    tag: 'Multi-Outlet Chains',
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200'
  }
]

export default function SubscriptionLockOverlay({ 
  planName = 'Professional', 
  expiredSince = new Date(), 
  pendingApproval = false,
  utrNumber = '',
  restaurantId = '',
  merchantEmail = '',
  merchantName = '',
  onCheckStatus = () => {}
}) {
  const navigate = useNavigate()
  const [showUPIModal, setShowUPIModal] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [copiedUtr, setCopiedUtr] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [heartbeatTime, setHeartbeatTime] = useState(15)
  
  // View mode state: 'WAITING_WINDOW' vs 'SELECT_PLAN'
  const [viewMode, setViewMode] = useState(pendingApproval ? 'WAITING_WINDOW' : 'SELECT_PLAN')

  // Selected Plan state (Defaults to Professional)
  const [selectedPlan, setSelectedPlan] = useState(() => {
    const found = availablePlans.find(p => p.name.toLowerCase() === (planName || '').toLowerCase())
    return found || availablePlans[1]
  })

  const upiId = 'yash38687-1@oksbi'

  // Heartbeat countdown timer
  useEffect(() => {
    if (viewMode !== 'WAITING_WINDOW' || isApproved) return
    const timer = setInterval(() => {
      setHeartbeatTime(prev => {
        if (prev <= 1) {
          silentCheckStatus()
          return 15
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [viewMode, isApproved, restaurantId])

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
             description: 'Unlocking restaurant dashboard...'
          })
          setTimeout(() => window.location.reload(), 1000)
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
             description: 'Unlocking restaurant dashboard...'
          })
          setTimeout(() => window.location.reload(), 1000)
          return true
        }
      } catch (e) {}
      return false
    }

    if (checkApprovalStatus()) return

    const handleEventSync = () => {
      checkApprovalStatus()
    }

    window.addEventListener('platformConfigUpdated', handleEventSync)
    window.addEventListener('storage', handleEventSync)

    const interval = setInterval(async () => {
      if (checkApprovalStatus()) {
        clearInterval(interval)
        return
      }

      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId || '')
        let subData = null

        if (isUUID) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          subData = sub
        }

        if (!subData && merchantEmail) {
          const { data: pv } = await supabase
            .from('payment_verifications')
            .select('status')
            .eq('email', merchantEmail)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (pv && (pv.status === 'Approved' || pv.status === 'Active')) {
            subData = pv
          }
        }

        if (subData && (subData.status === 'Approved' || subData.status === 'Active')) {
          setIsApproved(true)
          if (onCheckStatus) onCheckStatus()
          toast.success('🎉 Payment Verified & Approved!', {
             description: 'Unlocking restaurant dashboard...'
          })
          setTimeout(() => window.location.reload(), 1000)
          clearInterval(interval)
        }
      } catch (e) {}
    }, 3500)

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId || '')
    const channelName = isUUID ? `subscription_lock_${restaurantId}` : `subscription_lock_${Date.now()}`
    const channel = supabase
      .channel(channelName)
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
             description: 'Unlocking restaurant dashboard...'
          })
          setTimeout(() => window.location.reload(), 1000)
        }
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      window.removeEventListener('platformConfigUpdated', handleEventSync)
      window.removeEventListener('storage', handleEventSync)
      supabase.removeChannel(channel)
    }
  }, [restaurantId, merchantEmail, onCheckStatus])

  const copyUPI = () => {
    navigator.clipboard.writeText(upiId)
    setCopiedUpi(true)
    toast.success('UPI ID Copied', { description: upiId })
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  const copyUTR = () => {
    if (!utrNumber) return
    navigator.clipboard.writeText(utrNumber)
    setCopiedUtr(true)
    toast.success('UTR Number Copied', { description: utrNumber })
    setTimeout(() => setCopiedUtr(false), 2000)
  }

  const silentCheckStatus = async () => {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId || '')
      if (isUUID) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('restaurant_id', restaurantId)
          .maybeSingle()

        if (sub && (sub.status === 'Approved' || sub.status === 'Active')) {
          setIsApproved(true)
          toast.success('Subscription Verified & Active!', { description: 'Opening restaurant dashboard...' })
          setTimeout(() => window.location.reload(), 800)
        }
      }
    } catch (e) {}
  }

  const handleCheckStatus = async () => {
    try {
      setIsChecking(true)
      setViewMode('WAITING_WINDOW')
      
      try {
        const subs = JSON.parse(localStorage.getItem('servora_subscriptions') || '[]')
        const matched = subs.find(s => s.restaurant_id === restaurantId || s.id === `sub-${restaurantId}` || (merchantEmail && s.restaurant_id === merchantEmail))
        if (matched && (matched.status === 'Approved' || matched.status === 'Active')) {
          setIsApproved(true)
          toast.success('Subscription Verified & Active!', { description: 'Opening restaurant dashboard...' })
          setTimeout(() => window.location.reload(), 600)
          return
        }
      } catch (e) {}

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId || '')
      if (isUUID) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .maybeSingle()

        if (sub && (sub.status === 'Approved' || sub.status === 'Active')) {
          setIsApproved(true)
          toast.success('Subscription Verified & Active!', { description: 'Opening restaurant dashboard...' })
          setTimeout(() => window.location.reload(), 600)
          return
        }
      }

      if (merchantEmail) {
        const { data: pv } = await supabase
          .from('payment_verifications')
          .select('*')
          .eq('email', merchantEmail)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (pv && (pv.status === 'Approved' || pv.status === 'Active')) {
          setIsApproved(true)
          toast.success('Subscription Verified & Active!', { description: 'Opening restaurant dashboard...' })
          setTimeout(() => window.location.reload(), 600)
          return
        }
      }

      if (onCheckStatus) {
        onCheckStatus()
      }
      toast.info('Verification In Progress', { description: 'Admin team is reviewing your transaction.' })
    } catch (err) {
      console.warn('Status check fallback:', err)
    } finally {
      setTimeout(() => setIsChecking(false), 600)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col justify-between overflow-y-auto font-sans select-none">
      
      {/* ── Layer 1: Nano Restaurant Photography Backdrop with Vignette ── */}
      <div 
        className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-[0.24] mix-blend-multiply transition-all duration-700"
        style={{ 
          backgroundImage: `url('/backgrounds/nano_restaurant_bg.png')`,
          maskImage: 'radial-gradient(ellipse 95% 85% at 50% 35%, black 55%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 95% 85% at 50% 35%, black 55%, transparent 100%)'
        }}
      />

      {/* ── Layer 2: Subtle Dot Grid Engineering Matrix ── */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] bg-size-[24px_24px] opacity-35" />

      {/* ── Layer 3: Warm Ambient Glow Lighting Aura ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-250 h-137.5 bg-linear-to-b from-indigo-200/50 via-blue-100/30 to-transparent rounded-full blur-3xl opacity-80" />
        <div className="absolute top-1/3 -right-20 w-150 h-150 bg-amber-100/45 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-137.5 h-137.5 bg-indigo-100/35 rounded-full blur-3xl" />
      </div>

      {/* ── Executive Top Navbar Bar ── */}
      <header className="w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/90 px-4 sm:px-10 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        
        {/* Left Brand & Restaurant Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <LogoIcon size={30} className="shrink-0 rounded-xl shadow-xs" />
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 leading-tight">Servora</span>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 leading-none">Restaurant Management</p>
            </div>
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-200" />

          {/* Restaurant Pill Badge */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs font-semibold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>{merchantName || 'Restaurant Console'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Center Portal Info (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-0.5 rounded-full bg-white border border-slate-200/90 shadow-2xs text-[11px] font-medium text-slate-600">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Merchant Subscription & Activation Gate</span>
        </div>

        {/* Right Telemetry & Help Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>GATEWAY ONLINE</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('https://wa.me/919999999999', '_blank')}
            className="h-7 px-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Support Desk</span>
          </Button>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 my-auto flex flex-col items-center justify-center relative z-20">
        
        <AnimatePresence mode="wait">
          {viewMode === 'WAITING_WINDOW' ? (
            
            /* ═════════════════════════════════════════════════════════════════
               COMPACT PC FIT: LIVE VERIFICATION TRACKING CONSOLE
               ═════════════════════════════════════════════════════════════════ */
            <motion.div 
              key="waiting-window"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-lg bg-white/95 border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-200/80 backdrop-blur-xl text-center relative"
            >
              
              {/* Top Close / Return Action */}
              <button
                onClick={() => setViewMode('SELECT_PLAN')}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title="Change Plan"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Icon with Dynamic Ring */}
              <div className="relative mx-auto w-12 h-12 mb-2.5 flex items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-xs">
                  {isApproved ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-bounce" />
                  ) : (
                    <Clock className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-white"></span>
                </span>
              </div>

              {/* Title Block */}
              <div className="space-y-1 mb-4">
                <Badge className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full transition-all ${
                  isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {isApproved ? '● Approved & Active' : '● Live Admin Queue'}
                </Badge>
                
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {isApproved ? 'Subscription Activated' : 'Payment Verification Pending'}
                </h2>
                
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {isApproved
                    ? 'Your transaction has been confirmed. Unlocking dashboard.'
                    : 'Your 12-digit UTR reference is logged with verification desk. Access unlocks upon confirmation.'
                  }
                </p>
              </div>

              {/* 3-Step Progress Timeline */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 mb-3.5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {/* Step 1 */}
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center mb-0.5">
                      ✓
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">UTR Sent</span>
                    <span className="text-[8px] text-emerald-600 font-medium">Recorded</span>
                  </div>

                  {/* Step 2 */}
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 shadow-xs flex flex-col items-center ring-1 ring-amber-300/40">
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center mb-0.5">
                      2
                    </div>
                    <span className="text-[10px] font-bold text-amber-900">Admin Queue</span>
                    <span className="text-[8px] text-amber-700 font-medium">Reviewing</span>
                  </div>

                  {/* Step 3 */}
                  <div className={`p-2 rounded-lg border shadow-xs flex flex-col items-center ${
                    isApproved ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 opacity-60'
                  }`}>
                    <div className={`w-5 h-5 rounded-full font-bold text-[9px] flex items-center justify-center mb-0.5 ${
                      isApproved ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      3
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">Dashboard</span>
                    <span className="text-[8px] text-slate-500 font-medium">Auto-Unlock</span>
                  </div>
                </div>
              </div>

              {/* Details Table Bento */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-left space-y-2 mb-3.5 shadow-xs text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="font-medium text-slate-500 flex items-center gap-1">
                    <Fingerprint className="w-3.5 h-3.5 text-slate-400" /> UTR / Reference
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {utrNumber || '12-Digit Reference'}
                    </span>
                    {utrNumber && (
                      <button 
                        onClick={copyUTR}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all cursor-pointer"
                        title="Copy UTR"
                      >
                        {copiedUtr ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Plan Selected</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-600" /> {selectedPlan?.name || planName} (₹{(selectedPlan?.price || 2499).toLocaleString('en-IN')}/mo)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-500">Official UPI Payee</span>
                  <span className="font-mono text-slate-700 font-medium">{upiId}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Est. Verification Time</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" /> Under 15 Minutes
                  </span>
                </div>
              </div>

              {/* Feature Unlock Preview Chips */}
              <div className="mb-4 p-2.5 bg-slate-50/90 border border-slate-200/80 rounded-xl text-left">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Unlocking for {merchantName || 'Your Restaurant'}:</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-3 h-3 text-indigo-600" />
                    <span>Digital QR Codes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3 h-3 text-indigo-600" />
                    <span>Floor Table Management</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ChefHat className="w-3 h-3 text-indigo-600" />
                    <span>Kitchen KDS Feed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-indigo-600" />
                    <span>AI Revenue Reports</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <Button 
                    size="sm" 
                    disabled={isChecking}
                    onClick={handleCheckStatus}
                    className="w-full sm:w-auto h-10 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Checking Status...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Check Live Status</span>
                      </>
                    )}
                  </Button>

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setViewMode('SELECT_PLAN')}
                    className="w-full sm:w-auto h-10 px-5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Change Plan</span>
                  </Button>
                </div>

                {/* Silent Polling Heartbeat Indicator */}
                <p className="text-[9px] font-mono text-slate-400 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span>Auto-refreshing in <span className="font-bold text-slate-700">{heartbeatTime}s</span></span>
                </p>
              </div>

            </motion.div>
          ) : (
            
            /* ═════════════════════════════════════════════════════════════════
               RICH & HIGH-IMPACT: 3-TIER DESKTOP PLAN SELECTOR
               (CENTER CARD ELEVATED & PROMINENT)
               ═════════════════════════════════════════════════════════════════ */
            <motion.div 
              key="plan-selector"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full space-y-10"
            >
              
              {/* Header Title with Floating Highlights */}
              <div className="text-center space-y-3 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Transparent Restaurant SaaS Pricing</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Select Your Subscription Plan
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Choose a plan for <span className="font-semibold text-slate-800">{merchantName || 'your restaurant'}</span> to unlock digital QR ordering, floor table maps, and kitchen operations.
                </p>
              </div>

              {/* 3-Tier Grid: Center Card Elevated & Enlarged */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center text-left w-full pt-4">
                {availablePlans.map((plan) => {
                  const isSelected = selectedPlan?.id === plan.id || selectedPlan?.name?.toLowerCase() === plan.name.toLowerCase()
                  const isFeatured = plan.popular
                  const Icon = plan.icon || Rocket
                  
                  return (
                    <motion.div
                      key={plan.id}
                      whileHover={{ y: isFeatured ? -8 : -4 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onClick={() => {
                        setSelectedPlan(plan)
                      }}
                      className={`rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative bg-white/95 backdrop-blur-xl group ${
                        isFeatured
                          ? isSelected
                            ? 'p-8 lg:py-10 -mt-2 lg:-mt-6 border-2 border-indigo-600 ring-4 ring-indigo-500/20 shadow-2xl shadow-indigo-500/25 z-10'
                            : 'p-8 lg:py-10 -mt-2 lg:-mt-6 border-2 border-slate-300 shadow-xl shadow-slate-200/80 hover:border-indigo-400 z-10'
                          : isSelected
                            ? 'p-7 border-2 border-indigo-600 ring-4 ring-indigo-500/15 shadow-xl shadow-indigo-500/15'
                            : 'p-7 border border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      {/* Featured Center Card Top Floating Ribbon */}
                      {isFeatured && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-linear-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white font-extrabold text-[10px] rounded-full uppercase tracking-wider shadow-md shadow-indigo-500/30 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 fill-current text-amber-300" />
                          <span>MOST POPULAR &bull; BEST VALUE</span>
                        </div>
                      )}

                      <div className="space-y-5">
                        {/* Plan Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 duration-200 ${
                              isFeatured
                                ? 'bg-linear-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                                : isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                            }`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className={`text-base sm:text-lg font-extrabold transition-colors ${
                                isFeatured ? 'text-slate-950' : 'text-slate-900 group-hover:text-indigo-600'
                              }`}>
                                {plan.name}
                              </h3>
                              <Badge variant="outline" className={`text-[9px] font-bold tracking-wider px-2.5 py-0.5 mt-0.5 ${plan.badgeStyle}`}>
                                {plan.tag}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-xs' 
                              : 'bg-slate-100 border-slate-300 text-transparent group-hover:border-indigo-400'
                          }`}>
                            <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          </div>
                        </div>

                        {/* Pricing Block */}
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-extrabold text-slate-400">₹</span>
                            <span className={`font-black text-slate-900 tracking-tight ${
                              isFeatured ? 'text-4xl sm:text-5xl text-indigo-950' : 'text-3xl sm:text-4xl'
                            }`}>
                              {plan.price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">/ month</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Billed monthly &bull; Cancel anytime</p>
                        </div>

                        {/* Highlight Tag Strip */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {plan.highlights.map((h, i) => (
                            <span 
                              key={i} 
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border transition-colors ${
                                isFeatured 
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                                  : 'bg-slate-100 text-slate-700 border-slate-200/80 group-hover:bg-indigo-50/70 group-hover:border-indigo-200/60 group-hover:text-indigo-800'
                              }`}
                            >
                              {h}
                            </span>
                          ))}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                          {plan.desc}
                        </p>

                        {/* Features with Hover Transition */}
                        <div className="space-y-2.5 pt-1">
                          {plan.features.map((f, fi) => (
                            <div 
                              key={fi} 
                              className="flex items-center gap-2 text-xs font-medium text-slate-700 group/item hover:translate-x-1 transition-transform"
                            >
                              <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors">
                                <Check className="w-2.5 h-2.5 stroke-[3px]" />
                              </div>
                              <span className="group-hover/item:text-slate-900 transition-colors">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pay Button with High Prominence on Center Card */}
                      <div className="pt-6">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPlan(plan)
                            setShowUPIModal(true)
                          }}
                          className={`w-full rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                            isFeatured
                              ? 'h-12 bg-linear-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-600/30'
                              : isSelected 
                                ? 'h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20' 
                                : 'h-11 bg-slate-900 hover:bg-indigo-600 text-white'
                          }`}
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Pay ₹{plan.price.toLocaleString('en-IN')} & Activate</span>
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Bottom Status Help Strip */}
              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Already submitted a UPI UTR reference?</h4>
                    <p className="text-[11px] text-slate-500">Track your verification progress in real-time or check approval.</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckStatus}
                  className="h-10 px-5 rounded-xl border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 font-bold text-xs cursor-pointer active:scale-95 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Open Verification Tracking</span>
                </Button>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* ── Footer ── */}
      <footer className="w-full bg-white/85 backdrop-blur-xl border-t border-slate-200/80 px-6 py-3.5 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 relative z-20">
        <span>&copy; {new Date().getFullYear()} Servora SaaS. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-600" /> Instant UPI 256-Bit Protocol</span>
          <span className="text-slate-300">&bull;</span>
          <span>Support: contact@servora.app</span>
        </div>
      </footer>

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
           setViewMode('WAITING_WINDOW')
        }}
      />

    </div>
  )
}
