import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowRight, 
  ChefHat, 
  CheckCircle, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  QrCode, 
  Users, 
  Smartphone, 
  Play, 
  Star,
  Globe,
  Bell,
  UtensilsCrossed,
  LayoutDashboard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import Logo from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

// Image constants
const HERO_IMAGE = '/servora_hero_premium_1773899069963.png'
const DASHBOARD_PREVIEW = '/servora_dashboard_preview_1773899087007.png'
const MOBILE_MENU_PREVIEW = '/servora_mobile_menu_preview_1773899105637.png'

const features = [
  {
    icon: QrCode,
    title: "Precision QR Ordering",
    desc: "Generate table-specific QR codes instantly. Customers scan, browse, and order without app downloads.",
    color: "blue",
    docsRoute: "/docs?section=getting-started&article=quick-setup"
  },
  {
    icon: BarChart3,
    title: "AI-Powered Analytics",
    desc: "Deep insights into your sales performance, popular dishes, and peak hour trends with real-time forecasting.",
    color: "indigo",
    docsRoute: "/docs?section=analytics&article=dashboard-analytics"
  },
  {
    icon: Zap,
    title: "Instant Kitchen Sync",
    desc: "Orders hit the kitchen dashboard in milliseconds. Zero lag, zero missed orders, maximum efficiency.",
    color: "amber",
    docsRoute: "/docs?section=orders&article=order-workflow"
  },
  {
    icon: Users,
    title: "Customer CRM",
    desc: "Built-in loyalty engine to track guest preferences and reward regular diners automatically.",
    color: "emerald",
    docsRoute: "/docs?section=customer-management&article=customer-overview"
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    desc: "Secure dining protocols ensuring data privacy and secure transactions for every table session.",
    color: "rose",
    docsRoute: "/docs?section=settings&article=payment-settings"
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    desc: "Automatically translate your digital menu into multiple languages for international guests.",
    color: "cyan",
    docsRoute: "/docs?section=menu-management&article=managing-items"
  }
]

const plans = [
  {
    name: "Starter",
    price: "₹1,499",
    billing: "per month",
    desc: "Perfect for boutique cafes and small eateries.",
    features: ["Up to 10 Tables", "Digital QR Menu", "Basic Analytics", "Kitchen Display System", "Email Support"],
    cta: "Purchase Starter",
    popular: false
  },
  {
    name: "Professional",
    price: "₹2,999",
    billing: "per month",
    desc: "Ideal for growing restaurants and bustling bars.",
    features: ["Up to 30 Tables", "Advanced CRM", "Real-time AI Analytics", "Staff Management", "Priority Support (24/7)"],
    cta: "Purchase Professional",
    popular: true
  },
  {
    name: "Enterprise",
    price: "₹4,999",
    billing: "per month",
    desc: "Bespoke solutions for large dining chains and hotels.",
    features: ["Unlimited Tables", "Full CRM Suite", "Dedicated Account Manager", "Custom API Integration", "White-label Branding"],
    cta: "Purchase Enterprise",
    popular: false
  }
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden">
      {/* ─── Hero Section ───────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-40 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/20 via-white to-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8 relative z-10 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-blue-50 text-blue-600 rounded-full border border-blue-100 shadow-sm animate-bounce-subtle">
               <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-[11px] font-black uppercase tracking-widest leading-none">AI-Powered Experience Engine</span>
            </div>

            <h1 className="text-6xl lg:text-8xl font-black text-slate-950 tracking-tightest leading-[0.9] lg:leading-[1.1]">
              The <span className="text-blue-600">Future</span> of Modern <br className="hidden lg:block"/> Dining.
            </h1>

            <p className="text-xl lg:text-2xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Servora transforms your restaurant with precision QR ordering, live kitchen synchronization, and deep performance analytics.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-6">
              <Button 
                size="lg" 
                className="h-16 px-10 rounded-[1.5rem] bg-slate-950 hover:bg-black text-white font-bold text-lg shadow-2xl shadow-slate-950/20 active:scale-95 transition-all flex items-center gap-3 group"
                onClick={() => navigate('/register')}
              >
                Initialize System
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="ghost" className="h-16 px-10 rounded-[1.5rem] bg-slate-100/50 hover:bg-slate-100 text-slate-900 font-bold text-lg transition-all flex items-center gap-3">
                <Play className="w-5 h-5 fill-slate-900" />
                Watch Story
              </Button>
            </div>

            {/* Trusted By */}
            <div className="pt-12 space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center lg:text-left">Empowering Global Culinary Giants</p>
               <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 opacity-40 grayscale group hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                  <div className="flex items-center gap-2">
                     <UtensilsCrossed className="w-6 h-6" />
                     <span className="font-black text-lg tracking-tighter">GRANDE'</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <ChefHat className="w-6 h-6" />
                     <span className="font-black text-lg tracking-tighter">BISTRO.IO</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <Globe className="w-6 h-6" />
                     <span className="font-black text-lg tracking-tighter">CUISINE+</span>
                  </div>
               </div>
            </div>
          </motion.div>

          {/* Hero Visuals */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            {/* Main Visual */}
            <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-900/10 border-8 border-white group">
               <img src={HERO_IMAGE} alt="Premium Dining UI" className="w-full h-auto transform group-hover:scale-110 transition-transform duration-[3s]" />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full bg-white/20 backdrop-blur-3xl flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform duration-500">
                  <Play className="w-8 h-8 fill-white ml-1" />
               </div>
            </div>

            {/* Overlapping Stats Card */}
            <motion.div 
               initial={{ opacity: 0, x: 50 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 1, duration: 1 }}
               className="absolute -bottom-10 -right-10 lg:-right-20 z-20 bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 space-y-4"
            >
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                     <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="text-2xl font-black text-slate-950">₹14M+</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue Transacted</p>
                  </div>
               </div>
               <div className="h-px bg-slate-100" />
               <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                       U{i}
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xl shadow-blue-500/20">
                     +2k
                  </div>
               </div>
               <p className="text-[10px] font-bold text-slate-500 leading-none">TRUSTED BY 2,400+ RESTAURANTS</p>
            </motion.div>

            {/* Decorative Pulse */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[80px] animate-pulse" />
          </motion.div>
        </div>
      </section>

      {/* ─── Product Details (Feature Grid) ───────────────────────────── */}
      <section id="features" className="py-32 bg-slate-50/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6 mb-24">
            <h2 className="text-4xl lg:text-6xl font-black text-slate-950 tracking-tightest leading-none">
              The Hub of <span className="text-blue-600 underline underline-offset-8">Precision.</span>
            </h2>
            <p className="text-lg text-slate-500 font-medium leading-relaxed">
              Every feature of Servora is engineered to eliminate friction from your dining floor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, idx) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-10 rounded-[2.5rem] bg-white border border-slate-100/60 shadow-xl shadow-slate-900/5 group hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500"
              >
                <div className={cn(
                  "w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500",
                  `bg-${f.color}-50 text-${f.color}-600 border border-${f.color}-100`
                )}>
                  <f.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-950 mb-4 tracking-tight group-hover:text-blue-600 transition-colors">{f.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                <div 
                   onClick={() => navigate(f.docsRoute)}
                   className="pt-8 flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 cursor-pointer"
                >
                   Explore Documentation <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Experience Showcase (Images) ─────────────────────────────── */}
      <section className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center mb-40">
            <div className="space-y-8">
               <Badge className="bg-slate-900 text-white rounded-full px-4 py-1.5 font-bold uppercase tracking-widest text-[10px]">Command Center</Badge>
               <h2 className="text-5xl lg:text-7xl font-black text-slate-950 tracking-tighter leading-tight">
                  Your Entire Floor, <br/> in <span className="text-indigo-600">Real-Time.</span>
               </h2>
               <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg">
                  Watch as orders populate your dashboard instantly. Track table turnover, billing status, and kitchen efficiency with a single high-performance view.
               </p>
               <ul className="space-y-4">
                  {[
                    "Live Table Status Indicator",
                    "Real-time Revenue Telemetry",
                    "Customer Loyalty Insights",
                    "Instant Inventory Alerts"
                  ].map(item => (
                    <li key={item} className="flex items-center gap-3 font-bold text-slate-700">
                       <CheckCircle className="w-5 h-5 text-emerald-500" />
                       {item}
                    </li>
                  ))}
               </ul>
            </div>
            
            <motion.div 
               initial={{ x: 50, opacity: 0 }}
               whileInView={{ x: 0, opacity: 1 }}
               viewport={{ once: true }}
               className="relative lg:scale-110"
            >
               <div className="absolute inset-0 bg-blue-400/20 blur-[100px] rounded-full" />
               <img src={DASHBOARD_PREVIEW} alt="Dashboard Preview" className="relative z-10 w-full rounded-[2rem] border-8 border-slate-950 shadow-2xl" />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center flex-row-reverse">
            <motion.div 
               initial={{ x: -50, opacity: 0 }}
               whileInView={{ x: 0, opacity: 1 }}
               viewport={{ once: true }}
               className="order-2 lg:order-1 relative lg:scale-110"
            >
               <div className="absolute inset-0 bg-purple-400/20 blur-[100px] rounded-full" />
               <img src={MOBILE_MENU_PREVIEW} alt="Mobile Menu Preview" className="relative z-10 w-full max-w-sm mx-auto rounded-[3rem] border-8 border-slate-950 shadow-2xl" />
            </motion.div>

            <div className="order-1 lg:order-2 space-y-8">
               <Badge className="bg-emerald-500 text-white rounded-full px-4 py-1.5 font-bold uppercase tracking-widest text-[10px]">Contactless Perfection</Badge>
               <h2 className="text-5xl lg:text-7xl font-black text-slate-950 tracking-tighter leading-tight">
                  Digital Menus that <br/> <span className="text-emerald-500 italic">Sell more.</span>
               </h2>
               <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg">
                  Beautiful, high-conversion digital menus designed for mobile. High-resolution food photography and smooth ordering flow that increases average order value by 24%.
               </p>
               <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-6">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
                     <Smartphone className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">+24% Average Bill</h4>
                    <p className="text-sm text-slate-500 font-bold leading-none">Powered by Smart Upsells</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Subscription Plans (Pricing) ────────────────────────────── */}
      <section id="pricing" className="py-32 bg-slate-950 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 blur-[150px] rounded-full" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6 mb-24">
             <Badge variant="outline" className="border-blue-500/50 text-blue-400 font-bold px-4 py-1 rounded-full uppercase tracking-widest text-[10px]">Transparent Billing</Badge>
             <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
                Elevate your <span className="text-blue-500">Service.</span>
             </h2>
             <p className="text-lg text-slate-400 font-medium leading-relaxed">
                Choose a plan that fits your culinary journey. No hidden fees, cancel anytime.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((p, idx) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "p-8 md:p-12 rounded-[3rem] border transition-all duration-500 flex flex-col relative overflow-hidden",
                  p.popular 
                    ? "bg-blue-600 text-white border-blue-400 shadow-2xl shadow-blue-600/20 scale-105" 
                    : "bg-white/5 text-white border-white/5 hover:bg-white/10 hover:border-white/20"
                )}
              >
                {p.popular && (
                  <div className="absolute top-0 right-0 px-6 py-2 bg-white text-blue-600 font-black text-[10px] rounded-bl-3xl uppercase tracking-widest shadow-xl">
                    Most Chosen
                  </div>
                )}
                
                <div className="mb-10">
                  <h3 className="text-xl font-bold uppercase tracking-widest mb-4 opacity-80">{p.name}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-black tracking-tightest">{p.price}</span>
                    <span className="text-sm font-bold opacity-60 tracking-tight">{p.billing}</span>
                  </div>
                  <p className="text-sm font-medium opacity-60 leading-relaxed">{p.desc}</p>
                </div>

                <div className="space-y-5 mb-12 flex-1">
                  {p.features.map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                        p.popular ? "bg-white/20" : "bg-blue-500/20"
                      )}>
                        <CheckCircle className={cn(
                          "w-3 h-3",
                          p.popular ? "text-white" : "text-blue-400"
                        )} />
                      </div>
                      <span className="text-sm font-bold opacity-90">{f}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  className={cn(
                    "w-full h-16 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-2xl",
                    p.popular 
                      ? "bg-white text-blue-600 hover:bg-blue-50 shadow-blue-900/40" 
                      : "bg-blue-600 text-white hover:bg-blue-500 shadow-slate-950/40"
                  )}
                  onClick={() => navigate('/register')}
                >
                  {p.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ───────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-6">
           <div className="relative p-12 lg:p-24 bg-slate-50 rounded-[3rem] overflow-hidden group border border-slate-100 shadow-sm">
              <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-1000" />
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/5 blur-[120px] rounded-full" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                 <div className="space-y-8">
                    <h2 className="text-5xl lg:text-7xl font-black text-slate-950 tracking-tighter leading-[1.1]">
                       Ready to <span className="relative inline-block px-1">
                          <span className="relative z-10 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic">Revolutionize</span>
                          <span className="absolute bottom-2 left-0 w-full h-3 bg-blue-600/10 -rotate-1 rounded-full -z-0" />
                       </span> Your Service?
                    </h2>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-sm">
                       Join 2,400+ world-class dining establishments already using Servora to dominate their market.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                       <Button 
                          size="lg" 
                          className="h-16 px-12 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-2xl active:scale-95 transition-all"
                          onClick={() => navigate('/register')}
                       >
                          Purchase Plan
                       </Button>
                       <Button size="lg" variant="outline" className="h-16 px-12 rounded-2xl border-slate-200 text-slate-900 font-bold text-sm bg-white active:scale-95 transition-all">
                          Talk to Sales
                       </Button>
                    </div>
                 </div>

                 <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 rounded-[4rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="relative w-full aspect-square rounded-[3.5rem] bg-white border-8 border-white shadow-2xl overflow-hidden flex flex-col items-center justify-center space-y-8">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-white" />
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                        
                        <div className="w-32 h-32 rounded-[2rem] bg-blue-50 border border-blue-100 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform duration-700">
                           <Logo iconSize={80} className="scale-110" />
                        </div>
                        <div className="text-center space-y-2 relative z-10">
                           <p className="text-2xl font-black text-slate-950 tracking-tight">Enterprise Core</p>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Version 2.4.0 • Active System</p>
                        </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>
    </div>
  )
}
