import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowRight, Zap, ShieldCheck, BarChart3, Users, QrCode, Smartphone, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { supabase, getCachedSession } from '@/lib/supabase'
import { parsePlanCycle } from '@/utils/planCycles'
import { toast } from 'sonner'
import UPIPaymentModal from '@/components/dashboard/UPIPaymentModal'

const defaultPlans = [
  {
    id: 'PLN-UNLIMITED',
    name: "All-in-One Unlimited",
    price: 2100,
    tableLimit: 9999,
    color: "blue",
    popular: true,
    billingPeriod: "3 Months",
    monthlyEquivalent: "₹700/mo effective",
    desc: "Complete 3-month operating system with unlimited dining tables, unlimited menu items, and 0% commission direct ordering.",
    features: [
      "Unlimited Tables & High-Res QR Standees",
      "Unlimited Menu Items & Categories",
      "3 Full Months Access (Only ₹700/mo)",
      "0% Commission Direct UPI Payments",
      "Sub-100ms Kitchen Display System (KDS)",
      "Automated GST Invoicing & 80mm/58mm Printing",
      "Multi-Payer Split Bills Engine",
      "Live Table Status & Waiter Call Telemetry",
      "Full Sales, CRM & Margin Analytics",
      "Priority 24/7 Phone & WhatsApp Support"
    ]
  }
]

const faqs = [
  {
    q: "How many tables and QR codes can I generate?",
    a: "You get completely UNLIMITED tables and QR codes! Generate as many table standees, counter QRs, and takeaway QR codes as your restaurant needs without extra charges."
  },
  {
    q: "How many menu items can I add?",
    a: "Unlimited! Add all your appetizers, main courses, beverages, combos, and custom variations with photos and descriptions without any limit."
  },
  {
    q: "What is the duration of this ₹2,100 plan?",
    a: "This plan gives you 3 full months (90 days) of full access, which works out to just ₹700 per month. After 3 months, you can easily renew to keep services active."
  },
  {
    q: "Is there any commission on orders?",
    a: "0% commission! Every rupee your customers pay via UPI (GPay, PhonePe, Paytm, etc.) or cash goes directly to your bank account."
  }
]

export default function PricingPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState(defaultPlans)
  const [isProcessing, setIsProcessing] = useState(false)
  const [targetPlan, setTargetPlan] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentSubmitted, setPaymentSubmitted] = useState(false)
  const [checkoutRestaurant, setCheckoutRestaurant] = useState(null)
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [intendedPlanName, setIntendedPlanName] = useState('')

  useEffect(() => {
     const initSessionState = async () => {
        try {
           const { data: { session } } = await getCachedSession()
           setHasActiveSession(Boolean(session?.user))
           const saved = sessionStorage.getItem('intended_plan')
           if (saved) {
              const parsed = JSON.parse(saved)
              if (parsed?.name) setIntendedPlanName(parsed.name)
           }
        } catch {
           // ignore storage parse failure
        }
     }
     initSessionState()

     const fetchPlans = async () => {
        try {
           const { data: dbPlans } = await supabase.from('subscription_plans').select('*').order('price', { ascending: true })
           if (dbPlans && dbPlans.length > 0) {
              setPlans(dbPlans.map(p => {
                 const parsed = parsePlanCycle(p)
                 return {
                    id: p.id || `PLN-${p.name}`,
                    name: p.name,
                    price: parseInt(p.price || 2100),
                    durationDays: parsed.durationDays,
                    cycleId: parsed.cycleId,
                    cycle: parsed.cycle,
                    unitText: parsed.unitText,
                    monthlyEquivalent: parsed.monthlyEquivalent,
                    tableLimit: parseInt(p.table_limit || p.tableLimit || 9999),
                    color: p.color || 'blue',
                    popular: p.popular || false,
                    desc: parsed.cleanDescription || 'Complete feature access for venues.',
                    features: p.features || null
                 }
              }))
           }
        } catch (err) {
           console.warn('Fallback to default plans:', err)
        }
     }
     fetchPlans()

     const channel = supabase
       .channel('public:marketing_subscription_plans_realtime')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_plans' }, () => {
          fetchPlans()
       })
       .subscribe()

     return () => {
       supabase.removeChannel(channel)
     }
  }, [])

  const selectPlan = async (plan) => {
    try {
      setIsProcessing(true)
      setTargetPlan(plan)

      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        try {
          sessionStorage.setItem('intended_plan', JSON.stringify(plan))
        } catch {
          // ignore storage quota error
        }
        navigate('/register')
        return
      }

      const userEmail = (user.email || '').toLowerCase()
      let rest = null

      const { data: restByOwner } = await supabase
        .from('restaurants')
        .select('id, business_name, email, owner_id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (restByOwner) {
        rest = restByOwner
      } else if (userEmail) {
        const { data: restByEmail } = await supabase
          .from('restaurants')
          .select('id, business_name, email, owner_id')
          .eq('email', userEmail)
          .maybeSingle()
        if (restByEmail) {
          if (!restByEmail.owner_id) {
            await supabase.from('restaurants').update({ owner_id: user.id }).eq('id', restByEmail.id)
          }
          rest = restByEmail
        }
      }

      if (!rest?.id) {
        const fallbackName = (user.user_metadata?.business_name || '').trim() || userEmail.split('@')[0] || 'Servora Merchant'
        const { data: createdRest, error: insertErr } = await supabase
          .from('restaurants')
          .insert({
            owner_id: user.id,
            business_name: fallbackName,
            email: userEmail,
            status: 'Pending',
            created_at: new Date().toISOString()
          })
          .select('id, business_name, email, owner_id')
          .maybeSingle()

        if (insertErr || !createdRest?.id) {
          toast.error('Workspace Setup Required', {
            description: insertErr?.message || 'Unable to locate your restaurant workspace. Please sign in again.'
          })
          return
        }
        rest = createdRest
      }

      try {
        sessionStorage.setItem('servora_restaurant_id', rest.id)
        sessionStorage.removeItem('intended_plan')
      } catch {
        // ignore storage error
      }

      setCheckoutRestaurant(rest)
      setPaymentSubmitted(false)
      setShowPaymentModal(true)
    } catch (err) {
      console.error('Plan selection failed:', err)
      toast.error('Checkout Failed', { description: err?.message || 'Unable to open payment modal. Please try again.' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="overflow-hidden">
      <Helmet>
        <title>Pricing & Plans | Servora</title>
        <meta name="description" content="Transparent, scalable pricing for restaurants of all sizes. Find the perfect plan to deploy your digital menu, POS, and kitchen display system." />
        <meta name="keywords" content="restaurant software pricing, pos system cost, qr menu price, servora pricing, digital menu subscription" />
      </Helmet>
      
      {/* ─── Hero + Onboarding Stepper ───────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-linear-to-b from-blue-50/70 to-transparent -z-10 blur-3xl opacity-70 pointer-events-none" />

        <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/80 text-[11px] font-bold text-slate-600 mb-4">
          <span className={cn("inline-flex items-center gap-1.5", hasActiveSession ? "text-emerald-600" : "text-slate-900")}>
            <span className={cn("w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center", hasActiveSession ? "bg-emerald-100 text-emerald-700" : "bg-slate-900 text-white")}>
              {hasActiveSession ? '✓' : '1'}
            </span>
            Account Setup
          </span>
          <span className="text-slate-300">→</span>
          <span className="inline-flex items-center gap-1.5 text-blue-600 font-black">
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
            Select Plan
          </span>
          <span className="text-slate-300">→</span>
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center">3</span>
            UPI Payment &amp; Verification
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
          Choose Your <span className="text-blue-600">Restaurant Plan.</span>
        </h1>
        <p className="mt-2.5 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
          Transparent 0%-commission pricing built for dining rooms, cafes, and quick-service kitchens.
        </p>

        {hasActiveSession && (
          <div className="max-w-xl mx-auto mt-4 rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-2.5 text-xs sm:text-sm font-bold text-indigo-900">
            Account ready — pick a plan below to open instant UPI Payment &amp; UTR Verification
            {intendedPlanName ? ` (Selected: ${intendedPlanName})` : ''}.
          </div>
        )}
      </section>

      {/* ─── Responsive Pricing Grid ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        {plans.length === 1 ? (
          plans.map((p) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 overflow-hidden grid grid-cols-1 lg:grid-cols-12"
            >
              {/* Left Summary & Primary Action */}
              <div className="lg:col-span-5 bg-slate-950 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-blue-400">{p.name}</span>
                    {p.popular && (
                      <Badge className="bg-blue-600 text-white border-none text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" />
                        Most Popular
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1.5 pt-1">
                    <span className="text-xl sm:text-2xl font-bold text-slate-400">₹</span>
                    <span className="text-4xl sm:text-5xl font-black tracking-tight">{String(p.price).replace('₹', '')}</span>
                    <div className="ml-1.5">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">{p.unitText || '/ 3 Months'}</p>
                      <p className="text-[11px] font-semibold text-emerald-400">
                        ₹{p.monthlyEquivalent || Math.round(p.price / Math.max(1, (p.durationDays || 90) / 30))}/mo effective
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                    {p.desc}
                  </p>
                </div>

                <div className="relative z-10 mt-6 pt-5 border-t border-white/10 space-y-3">
                  <Button
                    className="w-full h-12 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-98 shadow-lg shadow-blue-600/30 group cursor-pointer"
                    disabled={isProcessing}
                    onClick={() => selectPlan(p)}
                  >
                    {isProcessing && targetPlan?.name === p.name ? 'Opening Payment...' : `Purchase ${p.name}`}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <p className="text-[11px] text-slate-400 font-semibold text-center">
                    Instant UPI QR + UTR verification · 0% order commission
                  </p>
                </div>
              </div>

              {/* Right 2-Column Features */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center bg-white">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                  Everything Included
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {(p.features || defaultPlans[0].features).map((f) => (
                    <div key={f} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                      <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch",
            plans.length >= 3 && "lg:grid-cols-3"
          )}>
            {plans.map((p, idx) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className={cn(
                  "p-6 sm:p-7 rounded-3xl border transition-all duration-300 flex flex-col relative overflow-hidden",
                  p.popular
                    ? "bg-slate-950 text-white border-blue-800 shadow-xl shadow-blue-950/15"
                    : "bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:shadow-lg"
                )}
              >
                {p.popular && (
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-blue-600 text-white font-black text-[10px] rounded-bl-2xl uppercase tracking-widest flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-white" />
                    Most Popular
                  </div>
                )}

                <div className="mb-5">
                  <h3 className={cn(
                    "text-sm font-black uppercase tracking-wider mb-2",
                    p.popular ? "text-blue-400" : "text-slate-500"
                  )}>{p.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-xl font-bold text-slate-400">₹</span>
                    <span className="text-4xl font-black tracking-tight">{String(p.price).replace('₹', '')}</span>
                    <div className="flex flex-col ml-1.5">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{p.unitText || '/ 3 Months'}</span>
                      <span className="text-[10px] font-semibold text-emerald-400">
                        ₹{p.monthlyEquivalent || Math.round(p.price / Math.max(1, (p.durationDays || 90) / 30))}/mo effective
                      </span>
                    </div>
                  </div>
                  <p className={cn(
                    "text-xs sm:text-sm font-medium leading-relaxed",
                    p.popular ? "text-slate-400" : "text-slate-500"
                  )}>{p.desc}</p>
                </div>

                <Separator className={cn("my-4", p.popular ? "bg-white/10" : "bg-slate-100")} />

                <div className="space-y-2.5 mb-6 flex-1">
                  {(p.features || [
                    `Up to ${p.tableLimit === 9999 ? 'Unlimited' : p.tableLimit} Tables`,
                    "Digital Menu with QR",
                    "Real-time Order Feed",
                    "Basic Sales Reports",
                    p.price > 2000 ? "Priority 24/7 Support" : "Email Support",
                  ]).map((f) => (
                    <div key={f} className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                        p.popular ? "bg-blue-600/20" : "bg-slate-100"
                      )}>
                        <CheckCircle className={cn("w-3.5 h-3.5", p.popular ? "text-blue-400" : "text-slate-900")} />
                      </div>
                      <span className="text-xs sm:text-sm font-bold opacity-90">{f}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className={cn(
                    "w-full h-11 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wide transition-all active:scale-95 shadow-md group cursor-pointer",
                    p.popular
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-slate-950 text-white hover:bg-black"
                  )}
                  disabled={isProcessing}
                  onClick={() => selectPlan(p)}
                >
                  {isProcessing && targetPlan?.name === p.name ? 'Opening Payment...' : `Purchase ${p.name}`}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Responsive FAQ Section ──────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="space-y-3">
              <Badge className="bg-slate-950 text-white px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">FAQ</Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight">
                Frequently Asked <span className="text-blue-600">Questions.</span>
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/contact')}
              className="h-11 px-6 rounded-xl border-slate-200 text-slate-900 font-bold text-xs uppercase tracking-wider bg-white self-start lg:self-auto flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Contact Support
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-6 sm:p-7 bg-white rounded-2xl border border-slate-200/70 shadow-xs hover:shadow-md transition-all">
                <h4 className="text-base sm:text-lg font-black text-slate-950 mb-2 tracking-tight leading-snug">{faq.q}</h4>
                <p className="text-slate-600 font-medium leading-relaxed text-xs sm:text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust Strip ─────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-14 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-center gap-8 sm:gap-16 opacity-75">
           <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security Standard</p>
                <p className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">TENANT-ISOLATED RLS</p>
              </div>
           </div>
           <div className="flex items-center gap-2.5">
              <Zap className="w-6 h-6 text-amber-500" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Response Speed</p>
                <p className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">REAL-TIME KDS SYNC</p>
              </div>
           </div>
           <div className="flex items-center gap-2.5">
              <Smartphone className="w-6 h-6 text-indigo-500" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">QR Commerce</p>
                <p className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">0% ORDER COMMISSION</p>
              </div>
           </div>
        </div>
      </section>

      {targetPlan && checkoutRestaurant?.id && (
        <UPIPaymentModal
          open={showPaymentModal}
          onOpenChange={(isOpen) => {
            setShowPaymentModal(isOpen)
            if (!isOpen && paymentSubmitted && checkoutRestaurant?.id) {
              navigate(`/console/${checkoutRestaurant.id}`)
            }
          }}
          planName={targetPlan.name}
          amount={Number(targetPlan.price || 2100)}
          restaurantId={checkoutRestaurant.id}
          merchantEmail={checkoutRestaurant.email}
          merchantName={checkoutRestaurant.business_name}
          onPaymentSubmitted={() => setPaymentSubmitted(true)}
        />
      )}
    </div>
  )
}

function Star({ className }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
