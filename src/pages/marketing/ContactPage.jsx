import { motion } from 'framer-motion'
import { 
  Mail, 
  Phone, 
  MapPin, 
  MessageCircle, 
  Send, 
  ArrowRight, 
  CheckCircle, 
  Globe, 
  ShieldCheck,
  Zap,
  Twitter,
  Linkedin,
  Github
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'

const contactMethods = [
  {
    icon: Mail,
    title: "Support Desk",
    desc: "24/7 dedicated assistance for active partners.",
    value: "support@servora.tech",
    btn: "Open Ticket",
    color: "blue"
  },
  {
    icon: MessageCircle,
    title: "Enterprise Sales",
    desc: "Book a strategic consultation with our architects.",
    value: "+1 (888) SERVORA",
    btn: "Book Demo",
    color: "indigo"
  },
  {
    icon: MapPin,
    title: "The Culinary Lab",
    desc: "Experience the future in person at our HQ.",
    value: "San Francisco, CA 94103",
    btn: "View Map",
    color: "emerald"
  }
]

export default function ContactPage() {
  return (
    <div className="pt-32 pb-24 bg-white overflow-hidden font-sans">
      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="relative px-6 text-center space-y-8 mb-40">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10 blur-3xl opacity-50" />
         <Badge variant="outline" className="px-6 py-2 rounded-full border-blue-500 text-blue-600 font-bold uppercase tracking-[0.2em] text-[10px]">Open Protocols</Badge>
         <h1 className="text-6xl lg:text-[8.5rem] font-black text-slate-950 tracking-tightest leading-none">
            Let's <span className="text-blue-600">Connect.</span>
         </h1>
         <p className="text-xl lg:text-3xl text-slate-500 font-medium leading-relaxed max-w-4xl mx-auto tracking-tighter">
            Initiate a high-priority connection with our culinary architects. <br className="hidden lg:block"/> We're engineered to respond with precision within 48 hours.
         </p>
      </section>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 mb-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-stretch">
           
           {/* Connection Details */}
           <div className="space-y-16">
              <div className="space-y-4">
                 <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Direct Channels</h2>
                 <p className="text-slate-500 font-medium leading-relaxed max-w-sm">
                    Strategic dining infrastructure requires clear communication. Select the channel that fits your urgency.
                 </p>
              </div>

              <div className="space-y-8">
                 {contactMethods.map((m, idx) => (
                    <motion.div
                       key={m.title}
                       initial={{ opacity: 0, x: -20 }}
                       whileInView={{ opacity: 1, x: 0 }}
                       viewport={{ once: true }}
                       transition={{ delay: idx * 0.1 }}
                       className="group p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200 transition-all cursor-default"
                    >
                       <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl bg-${m.color}-50 text-${m.color}-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                             <m.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                             <h4 className="text-lg font-black text-slate-950 tracking-tight">{m.title}</h4>
                             <p className="text-sm font-bold text-slate-400 leading-none mt-1">{m.desc}</p>
                             <p className="text-xl font-black text-slate-900 mt-3 tracking-tighter">{m.value}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-xl bg-white border border-slate-100 text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all shadow-sm">
                             <ArrowRight className="w-5 h-5" />
                          </Button>
                       </div>
                    </motion.div>
                 ))}
              </div>

              {/* Social Connects */}
              <div className="pt-10 flex items-center gap-8 border-t border-slate-100 opacity-40 hover:opacity-100 transition-opacity">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Network Hub</p>
                 <div className="flex gap-4">
                    <Twitter className="w-5 h-5 cursor-pointer hover:text-blue-500 transition-colors" />
                    <Linkedin className="w-5 h-5 cursor-pointer hover:text-blue-700 transition-colors" />
                    <Github className="w-5 h-5 cursor-pointer hover:text-slate-900 transition-colors" />
                 </div>
              </div>
           </div>

           {/* Contact Form Card */}
           <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative p-12 md:p-16 rounded-[4rem] bg-slate-950 text-white shadow-2xl shadow-blue-900/10 border border-blue-900 overflow-hidden"
           >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full" />

              <div className="relative z-10 space-y-10">
                 <div className="space-y-4">
                    <h3 className="text-4xl font-black tracking-tightest leading-none text-white">Direct Transmission</h3>
                    <p className="text-slate-400 font-medium leading-relaxed max-w-sm">
                       Our architects are currently handling 2,400+ live sessions. Your inquiry will be prioritized.
                    </p>
                 </div>

                 <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Collaborator Path</Label>
                          <Input className="h-16 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 font-bold focus:border-blue-500 focus:ring-blue-500/20 shadow-inner px-6" placeholder="Your Full Name" />
                       </div>
                       <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Communication Node</Label>
                          <Input className="h-16 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 font-bold focus:border-blue-500 focus:ring-blue-500/20 shadow-inner px-6" placeholder="Email Address" />
                       </div>
                    </div>

                    <div className="space-y-3">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Core Subject</Label>
                       <Input className="h-16 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 font-bold focus:border-blue-500 focus:ring-blue-500/20 shadow-inner px-6" placeholder="Strategic Partnership, Sales, Support..." />
                    </div>

                    <div className="space-y-3">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Discovery Details</Label>
                       <Textarea className="min-h-[160px] rounded-3xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 font-bold focus:border-blue-500 focus:ring-blue-500/20 shadow-inner p-6 resize-none" placeholder="Describe your culinary vision or technical inquiry..." />
                    </div>

                    <Button size="lg" className="w-full h-20 rounded-3xl bg-blue-600 hover:bg-white hover:text-blue-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/40 active:scale-95 transition-all flex items-center justify-center gap-4 group">
                       Initialize Connection
                       <Send className="w-5 h-5 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
                    </Button>
                 </form>

                 <div className="flex items-center gap-4 pt-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Secure Encrypted Transmission
                 </div>
              </div>
           </motion.div>
        </div>
      </section>

      {/* ─── Global Readiness ─────────────────────────────────────── */}
      <section className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-16 lg:gap-32 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-1000">
           <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-blue-600" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Infrastructure Speed</p>
                <p className="text-sm font-black text-slate-900 tracking-tighter">GLOBAL CDN NODES READY</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-emerald-500" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Architect Network</p>
                <p className="text-sm font-black text-slate-900 tracking-tighter">SUPPORTED IN 40+ COUNTRIES</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <ArrowRight className="w-8 h-8 text-indigo-500" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Onboarding Flow</p>
                <p className="text-sm font-black text-slate-900 tracking-tighter">NEXT-DAY DEPLOYMENT</p>
              </div>
           </div>
        </div>
      </section>
    </div>
  )
}
