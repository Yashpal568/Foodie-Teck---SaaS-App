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

const defaultPlans = [
  { id: 'PLN-1', name: "Starter", price: 999, tableLimit: 10, color: "slate", popular: false, desc: "Essential features for smaller venues." },
  { id: 'PLN-2', name: "Professional", price: 2499, tableLimit: 30, color: "blue", popular: true, desc: "The sweet spot for active dining rooms." },
  { id: 'PLN-3', name: "Enterprise", price: 4999, tableLimit: 9999, color: "indigo", popular: false, desc: "Maximum control for high-volume chains." },
]

const faqs = [
  {
    q: "How many QR codes can I generate?",
    a: "Starter supports up to 10 tables. Professional allows up to 30 tables, and Enterprise provides unlimited table generation and management."
  },
  {
    q: "Is there a setup fee?",
    a: "Absolutely not. Servora is designed to be self-serve. You can sign up, create your menu, and generate QR codes in under 15 minutes without any hardware setup costs."
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. All our plans are month-to-month by default. You can cancel, upgrade, or downgrade your plan at any point from your dashboard settings."
  },
  {
    q: "Does Servora handle payments?",
    a: "We provide the ordering and billing interface. You can integrate with your existing payment processors or use our built-in support for popular gateways like Razorpay and Stripe."
  }
]

export default function PricingPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState(defaultPlans)
  const [isProcessing, setIsProcessing] = useState(false)
  const [targetPlan, setTargetPlan] = useState(null)

  useEffect(() => {
     const fetchPlans = async () => {
        try {
           const { data: dbPlans } = await supabase.from('subscription_plans').select('*').order('price', { ascending: true })
           if (dbPlans && dbPlans.length > 0) {
              setPlans(dbPlans.map(p => ({
                 id: p.id || `PLN-${p.name}`,
                 name: p.name,
                 price: parseInt(p.price || 999),
                 tableLimit: parseInt(p.table_limit || p.tableLimit || 30),
                 color: p.color || 'blue',
                 popular: p.popular || false,
                 desc: p.description || p.desc || 'Complete feature access for venues.',
                 features: p.features || null
              })))
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

      const { data: { session } } = await getCachedSession()

      if (!session || !session.user) {
        sessionStorage.setItem('intended_plan', JSON.stringify(plan))
        navigate('/register')
        return
      }

      const userEmail = session.user.email
      let rest = null

      const { data: restByOwner } = await supabase.from('restaurants').select('*').eq('owner_id', session.user.id).maybeSingle()
      if (restByOwner) {
        rest = restByOwner
      } else if (userEmail) {
        const { data: restByEmail } = await supabase.from('restaurants').select('*').eq('email', userEmail.toLowerCase()).maybeSingle()
        rest = restByEmail
      }

      const restId = rest?.id || sessionStorage.getItem('servora_restaurant_id') || session.user.id

      if (restId) {
         sessionStorage.setItem('servora_restaurant_id', restId)

         // Check if subscription already exists
         const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('restaurant_id', restId)
            .maybeSingle()

         const subPayload = {
            restaurant_id: restId,
            plan_name: plan.name,
            price: plan.price,
            status: 'PENDING_APPROVAL',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
         }

         if (existingSub?.id) {
            await supabase.from('subscriptions').update(subPayload).eq('id', existingSub.id)
         } else {
            await supabase.from('subscriptions').insert(subPayload)
         }
         navigate(`/console/${restId}`)
      } else {
         navigate(`/console/${userEmail}`)
      }
    } catch (err) {
      console.error('Plan selection failed:', err)
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
      
      {/* ─── Header Section ─────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 text-center space-y-4 sm:space-y-8 mb-12 sm:mb-24 mt-24 sm:mt-32">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-150 bg-linear-to-b from-blue-50/50 to-transparent -z-10 blur-3xl opacity-50 pointer-events-none" />
         <Badge variant="outline" className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border-blue-500 text-blue-600 font-bold uppercase tracking-[0.2em] text-[10px]">Investment Options</Badge>
         <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-tight">
            Scale with <span className="text-blue-600">Precision.</span>
         </h1>
         <p className="text-base sm:text-xl lg:text-2xl text-slate-500 font-medium leading-relaxed max-w-3xl mx-auto">
            Transparent pricing designed for culinary growth. From small cafes to global dining chains, choose the plan that fuels your kitchen's ambition.
         </p>
      </section>

      {/* ─── Pricing Grid ─────────────────────────────────────────── */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 mb-20 lg:mb-40">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 items-stretch">
          {plans.map((p, idx) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className={cn(
                "p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border transition-all duration-500 flex flex-col relative group overflow-hidden",
                p.popular 
                  ? "bg-slate-950 text-white border-blue-900 shadow-xl shadow-blue-950/20 lg:scale-105 z-10" 
                  : "bg-white text-slate-900 border-slate-100 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100"
              )}
            >
              {p.popular && (
                <div className="absolute top-0 right-0 px-6 sm:px-10 py-2 sm:py-3 bg-blue-600 text-white font-black text-[10px] sm:text-xs rounded-bl-2xl sm:rounded-bl-[2.5rem] uppercase tracking-widest shadow-xl flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-white" />
                  Most Elite
                </div>
              )}
              
              <div className="mb-8">
                <h3 className={cn(
                  "text-lg font-bold uppercase tracking-wider mb-2",
                  p.popular ? "text-blue-400" : "text-slate-500"
                )}>{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-2xl font-bold opacity-60 text-slate-400">₹</span>
                  <span className="text-4xl font-black tracking-tight">{String(p.price).replace('₹', '')}</span>
                  <span className={cn(
                    "text-xs font-medium opacity-60",
                    p.popular ? "text-slate-400" : "text-slate-500"
                  )}>per month</span>
                </div>
                <p className={cn(
                  "text-sm font-medium leading-relaxed max-w-60",
                  p.popular ? "text-slate-400" : "text-slate-500"
                )}>{p.desc}</p>
              </div>

              <Separator className={cn(
                "my-6",
                p.popular ? "bg-white/10" : "bg-slate-100"
              )} />

              <div className="space-y-4 mb-8 flex-1">
                {(p.features || [
                  `Up to ${p.tableLimit === 9999 ? 'Unlimited' : p.tableLimit} Tables`,
                  "Digital Menu with QR",
                  "Real-time Order Feed",
                  "Basic Sales Reports",
                  p.price > 2000 ? "Priority 24/7 Support" : "Email Support",
                  p.tableLimit > 50 ? "Multi-Location Hub" : "Manual Table Status",
                  "Daily Backups"
                ]).map(f => (
                  <div key={f} className="flex items-center gap-4">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                      p.popular ? "bg-blue-600/20" : "bg-slate-100"
                    )}>
                      <CheckCircle className={cn(
                        "w-4 h-4",
                        p.popular ? "text-blue-500" : "text-slate-900"
                      )} />
                    </div>
                    <span className="text-sm font-bold opacity-90">{f}</span>
                  </div>
                ))}
              </div>

              <Button 
                className={cn(
                  "w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-95 shadow-md group cursor-pointer",
                  p.popular 
                    ? "bg-blue-600 text-white hover:bg-white hover:text-blue-600" 
                    : "bg-slate-950 text-white hover:bg-black"
                )}
                disabled={isProcessing}
                onClick={() => selectPlan(p)}
              >
                {isProcessing && targetPlan?.name === p.name ? 'Processing...' : `Purchase ${p.name}`}
                <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-2 transition-transform" />
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Frequently Asked Questions ───────────────────────────── */}
      <section className="py-32 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
             <div className="lg:col-span-4 space-y-8">
               <Badge className="bg-slate-950 text-white px-5 py-2 font-black uppercase tracking-widest text-[10px]">The FAQ</Badge>
               <h2 className="text-4xl font-black text-slate-950 tracking-tighter leading-none">
                  Commonly Discussed <br className="hidden lg:block"/> with Our <span className="text-indigo-600">Architects.</span>
               </h2>
               <p className="text-slate-500 font-medium leading-relaxed">
                  Have a specific question about our infrastructure or deployment flow? Our team is available 24/7 for a deep dive.
               </p>
               <Button variant="outline" className="h-14 px-8 rounded-2xl border-slate-200 text-slate-900 font-black text-xs uppercase tracking-widest bg-white flex items-center gap-3">
                  <MessageCircle className="w-5 h-5" />
                  Support Hub
               </Button>
             </div>

             <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                     <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100 mb-6 group-hover:bg-slate-950 group-hover:text-white transition-colors">
                        <span className="font-black">Q</span>
                     </div>
                     <h4 className="text-xl font-black text-slate-950 mb-4 tracking-tight leading-tight">{faq.q}</h4>
                     <p className="text-slate-500 font-medium leading-relaxed text-sm">{faq.a}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* ─── Branding Guarantee ───────────────────────────────────── */}
      <section className="py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-16 lg:gap-32 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-1000">
           <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security Standard</p>
                <p className="text-sm font-black text-slate-900 tracking-tighter">PCI-DSS COMPLIANT</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-amber-500" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Response Speed</p>
                <p className="text-sm font-black text-slate-900 tracking-tighter">99.9% UPTIME SLG</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-indigo-500" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Platform Reach</p>
                <p className="text-sm font-black text-slate-900 tracking-tighter">2.4M+ MONTHLY ACTIVE SCAN</p>
              </div>
           </div>
        </div>
      </section>
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
