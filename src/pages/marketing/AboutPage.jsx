import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Heart, 
  ChefHat, 
  Sparkles, 
  Globe, 
  Target, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Award
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Logo from '@/components/ui/Logo'

const values = [
  {
    icon: Sparkles,
    title: "Culinary-First Engineering",
    desc: "We build for the chaos of a Friday night rush, the precision of a Michelin star, and the heart of a local cafe.",
    color: "blue"
  },
  {
    icon: ShieldCheck,
    title: "Unwavering Reliability",
    desc: "A restaurant never rests, and neither does our infrastructure. We guarantee 99.9% uptime for your digital menu.",
    color: "indigo"
  },
  {
    icon: Globe,
    title: "Global Accessibility",
    desc: "Breaking language barriers between kitchens and diners, our platform supports multi-language experiences for every guest.",
    color: "cyan"
  }
]

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="pt-32 pb-24 bg-white overflow-hidden">
      {/* ─── Story Section ─────────────────────────────────────────── */}
      <section className="px-6 mb-40 relative">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50/50 rounded-full blur-[150px] -z-10 translate-x-1/2 -translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <Badge variant="outline" className="px-6 py-2 rounded-full border-blue-500 text-blue-600 font-black uppercase tracking-[0.2em] text-[10px]">Our Genesis</Badge>
            <h1 className="text-6xl lg:text-8xl font-black text-slate-950 tracking-tightest leading-none">
              Engineering <br/> <span className="text-blue-600">Culinary</span> <br/> Precision.
            </h1>
            <p className="text-xl lg:text-2xl text-slate-500 font-medium leading-relaxed max-w-xl">
              Servora was born in the heat of the kitchen, not the comfort of a cubicle. We are a team of chefs, engineers, and designers dedicated to fixing the friction in modern dining.
            </p>
            <div className="flex items-center gap-8">
               <div className="text-center">
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">2023</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Founded</p>
               </div>
               <div className="w-px h-12 bg-slate-200" />
               <div className="text-center">
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">2.4M+</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Orders Processed</p>
               </div>
               <div className="w-px h-12 bg-slate-200" />
               <div className="text-center">
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">48h</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Support SLA</p>
               </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="w-full aspect-square rounded-[4rem] bg-slate-900 p-20 flex items-center justify-center relative overflow-hidden group shadow-2xl shadow-blue-900/10">
               <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-1000" />
               <Logo iconSize={300} className="scale-150 opacity-10 group-hover:scale-[1.6] transition-transform duration-[3s]" />
               <div className="relative z-10 text-center space-y-4">
                  <ChefHat className="w-24 h-24 text-blue-500 mx-auto animate-bounce-subtle" />
                  <p className="text-2xl font-black text-white tracking-[0.2em] opacity-40 uppercase">Servora Intelligence</p>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Mission & Values ───────────────────────────────────────── */}
      <section className="py-40 bg-slate-950 relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
         
         <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-center pb-32 border-b border-white/5">
               <div className="lg:col-span-12 text-center space-y-8">
                  <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
                     Our Mission is <span className="text-blue-500 italic">Seamlessness.</span>
                  </h2>
                  <p className="text-xl lg:text-3xl text-slate-400 font-medium leading-relaxed max-w-4xl mx-auto">
                     We believe technology should be the hidden engine behind great service, not the obstacle. Our goal is to empower every restaurant to offer a high-performance digital experience that feels as natural as the food they serve.
                  </p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-32">
               {values.map((v, idx) => (
                 <motion.div
                    key={v.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-12 rounded-[3.5rem] bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all group"
                 >
                    <div className="w-16 h-16 rounded-3xl bg-blue-600/20 text-blue-500 flex items-center justify-center mb-8 shadow-2xl shadow-blue-900/10 group-hover:scale-110 transition-transform">
                       <v.icon className="w-8 h-8" />
                    </div>
                    <h4 className="text-2xl font-black text-white mb-4 tracking-tighter">{v.title}</h4>
                    <p className="text-slate-400 font-medium leading-relaxed">{v.desc}</p>
                 </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* ─── Recognition ────────────────────────────────────────────── */}
      <section className="py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
           <div className="space-y-8">
              <Badge className="bg-emerald-500 text-white px-5 py-2 font-black uppercase tracking-widest text-[10px]">The Benchmark</Badge>
              <h2 className="text-5xl font-black text-slate-950 tracking-tighter leading-none">
                 Redefining the <br className="hidden lg:block"/> <span className="text-emerald-500 underline underline-offset-8">Gold Standard.</span>
              </h2>
              <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg">
                 Servora has been recognized by top culinary critics and tech architects for its revolutionary approach to floor synchronization. We don't just build software; we build foundations for culinary success.
              </p>
              <div className="grid grid-cols-2 gap-8">
                 <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center space-y-4">
                    <Award className="w-10 h-10 text-amber-500" />
                    <p className="text-sm font-black text-slate-900">BEST DINING UX 2024</p>
                 </div>
                 <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center space-y-4">
                    <ShieldCheck className="w-10 h-10 text-blue-500" />
                    <p className="text-sm font-black text-slate-900">ENTERPRISE SECURED</p>
                 </div>
              </div>
           </div>

           <div className="relative lg:p-20">
              <div className="absolute inset-0 bg-blue-50/50 rounded-full scale-110 blur-3xl opacity-50" />
              <div className="relative p-12 bg-white rounded-[3rem] shadow-2xl border border-slate-100 space-y-10 group overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Target className="w-64 h-64 text-slate-900" />
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black">M</div>
                    <div>
                       <p className="font-bold text-slate-900">Marcus Sterling</p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">CEO, Grande Culinary Group</p>
                    </div>
                 </div>
                 <h4 className="text-4xl font-black text-slate-950 tracking-tight leading-[1.1]">
                    "Servora didn't just digitize our menu; it synchronized our soul. Our floor efficiency is up 40%."
                 </h4>
                 <Separator className="bg-slate-100" />
                 <div className="flex items-center gap-3 text-blue-600 font-black text-xs uppercase tracking-[0.2em] group-hover:translate-x-4 transition-transform duration-500 cursor-pointer">
                    Read Global Case Studies <ArrowRight className="w-4 h-4" />
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* ─── Joint CTA ──────────────────────────────────────────────── */}
      <section className="py-32 bg-slate-50 border-t border-slate-100">
         <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
            <h2 className="text-5xl lg:text-7xl font-black text-slate-950 tracking-tightest leading-none">
               Join the <span className="text-blue-600 italic">Revolution.</span>
            </h2>
            <p className="text-xl text-slate-500 font-medium leading-relaxed">
               Be part of the global movement redefining the future of food service. Your kitchen deserves the precision of Servora.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Button 
                size="lg" 
                onClick={() => navigate('/docs')}
                className="h-16 px-16 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
               >
                  View Documentation
               </Button>
               <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/register')}
                className="h-16 px-16 rounded-2xl border-slate-200 text-slate-900 font-black text-xs uppercase tracking-widest bg-white active:scale-95 transition-all"
               >
                  Initialize System
               </Button>
            </div>
         </div>
      </section>
    </div>
  )
}
