import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
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
  Github,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const contactMethods = [
  {
    icon: Mail,
    title: "Support Desk",
    desc: "24/7 dedicated assistance for active partners.",
    value: "support@servora.tech",
    btn: "Email Us",
    color: "blue"
  },
  {
    icon: MessageCircle,
    title: "Enterprise Sales",
    desc: "Book a strategic consultation with our architects.",
    value: "+1 (888) SERVORA",
    btn: "Call Sales",
    color: "indigo"
  },
  {
    icon: MapPin,
    title: "The Culinary Lab",
    desc: "Experience the future in person at our HQ.",
    value: "San Francisco, CA 94103",
    btn: "HQ Location",
    color: "emerald"
  }
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in your name, email and message.')
      return
    }
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      toast.success('Thank you! Your inquiry has been sent to our team.')
      setFormData({ name: '', email: '', subject: '', message: '' })
    }, 800)
  }

  return (
    <div className="pt-24 sm:pt-32 pb-16 sm:pb-24 bg-white overflow-hidden font-sans">
      <Helmet>
        <title>Contact Sales & Support | Servora</title>
        <meta name="description" content="Get in touch with Servora's architecture team for enterprise deployments, custom API integration, and 24/7 technical support." />
        <meta name="keywords" content="contact servora, restaurant tech support, pos sales, enterprise restaurant software" />
      </Helmet>

      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 text-center space-y-4 sm:space-y-6 mb-12 sm:mb-20">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10 blur-3xl opacity-50 pointer-events-none" />
         <Badge variant="outline" className="px-4 py-1.5 rounded-full border-blue-500/40 bg-blue-50/50 text-blue-600 font-bold uppercase tracking-[0.15em] text-[10px]">
            Direct Transmission Hub
         </Badge>
         <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-tight">
            Let's <span className="text-blue-600">Connect.</span>
         </h1>
         <p className="text-base sm:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
            Initiate a direct connection with our architects. We respond within 24 hours.
         </p>
      </section>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
           
           {/* Connection Details (Left 5 Cols) */}
           <div className="lg:col-span-5 space-y-6 sm:space-y-8">
              <div className="space-y-2">
                 <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Direct Channels</h2>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Select the channel that best fits your inquiry or urgency.
                 </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                 {contactMethods.map((m, idx) => (
                    <motion.div
                       key={m.title}
                       initial={{ opacity: 0, y: 10 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       viewport={{ once: true }}
                       transition={{ delay: idx * 0.08 }}
                       className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50/80 border border-slate-100 hover:bg-white hover:shadow-lg hover:border-slate-200 transition-all"
                    >
                       <div className="flex items-center gap-3.5 sm:gap-4">
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                             <m.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">{m.title}</h4>
                             <p className="text-xs text-slate-400 font-medium truncate">{m.desc}</p>
                             <p className="text-xs sm:text-sm font-bold text-blue-600 mt-0.5 truncate">{m.value}</p>
                          </div>
                       </div>
                    </motion.div>
                 ))}
              </div>

              {/* Security & Global Network */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                       <p className="text-xs font-black text-slate-800">Enterprise Security</p>
                       <p className="text-[11px] text-slate-500 font-medium">End-to-End SSL Encrypted</p>
                    </div>
                 </div>
                 <div className="flex gap-3 text-slate-400">
                    <Twitter className="w-4 h-4 hover:text-blue-500 cursor-pointer transition-colors" />
                    <Linkedin className="w-4 h-4 hover:text-blue-700 cursor-pointer transition-colors" />
                    <Github className="w-4 h-4 hover:text-slate-900 cursor-pointer transition-colors" />
                 </div>
              </div>
           </div>

           {/* Contact Form Card (Right 7 Cols) */}
           <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="lg:col-span-7 relative p-6 sm:p-10 md:p-12 rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white shadow-2xl shadow-slate-950/20 border border-slate-800 overflow-hidden"
           >
              {/* Ambient Backlight */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/15 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/15 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 space-y-6 sm:space-y-8">
                 <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-blue-400">
                       <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                       Fast-Track Response
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Direct Transmission</h3>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium">
                       Our engineers are handling live partner integrations. Your inquiry will be prioritized.
                    </p>
                 </div>

                 <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <Label htmlFor="contact-name" className="text-xs font-bold text-slate-300">Your Full Name</Label>
                          <Input 
                             id="contact-name"
                             value={formData.name}
                             onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                             className="h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 font-medium focus:border-blue-500 focus:ring-blue-500/20 px-4 text-sm" 
                             placeholder="e.g. Rahul Sharma" 
                             required
                          />
                       </div>
                       <div className="space-y-1.5">
                          <Label htmlFor="contact-email" className="text-xs font-bold text-slate-300">Email Address</Label>
                          <Input 
                             id="contact-email"
                             type="email"
                             value={formData.email}
                             onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                             className="h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 font-medium focus:border-blue-500 focus:ring-blue-500/20 px-4 text-sm" 
                             placeholder="rahul@bistro.com" 
                             required
                          />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <Label htmlFor="contact-subject" className="text-xs font-bold text-slate-300">Subject</Label>
                       <Input 
                          id="contact-subject"
                          value={formData.subject}
                          onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                          className="h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 font-medium focus:border-blue-500 focus:ring-blue-500/20 px-4 text-sm" 
                          placeholder="Strategic Partnership, Demo, or Custom Deployment" 
                       />
                    </div>

                    <div className="space-y-1.5">
                       <Label htmlFor="contact-message" className="text-xs font-bold text-slate-300">Message & Details</Label>
                       <Textarea 
                          id="contact-message"
                          value={formData.message}
                          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                          className="min-h-[110px] sm:min-h-[130px] rounded-xl sm:rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 font-medium focus:border-blue-500 focus:ring-blue-500/20 p-4 text-sm resize-none" 
                          placeholder="Tell us about your restaurant, tables, or integration requirements..." 
                          required
                       />
                    </div>

                    <Button 
                       type="submit"
                       disabled={isSubmitting}
                       className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                       {isSubmitting ? (
                          <span>Transmitting...</span>
                       ) : (
                          <>
                             <span>Send Message</span>
                             <Send className="w-4 h-4" />
                          </>
                       )}
                    </Button>
                 </form>
              </div>
           </motion.div>
        </div>
      </section>

      {/* ─── Global Readiness ─────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-slate-50/80 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-around gap-6 sm:gap-10 opacity-70">
           <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-blue-600" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Response SLA</p>
                <p className="text-xs font-bold text-slate-900">Under 24 Hours</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-emerald-500" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Global Coverage</p>
                <p className="text-xs font-bold text-slate-900">40+ Countries</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-indigo-500" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fast Onboarding</p>
                <p className="text-xs font-bold text-slate-900">Instant Activation</p>
              </div>
           </div>
        </div>
      </section>
    </div>
  )
}
