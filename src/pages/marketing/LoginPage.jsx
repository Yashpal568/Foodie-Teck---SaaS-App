import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle, 
  ShieldCheck,
  Zap,
  LayoutDashboard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Logo from '@/components/ui/Logo'
import { loadWorkspace } from '@/utils/workspace'

export default function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Simple validation
    if (!formData.email || !formData.password) {
      setError('Please provide both email and password.')
      return
    }

    // Check simulated database
    const existingUsers = JSON.parse(localStorage.getItem('servora_db_users') || '[]')
    const user = existingUsers.find(u => u.email === formData.email && u.password === formData.password)

    if (!user) {
      setError('Invalid credentials. Please verify your email and password.')
      return
    }

    setIsAuthenticating(true)
    setError(null)
    
    // Simulate authentication delay
    await new Promise(r => setTimeout(r, 1200))

    // Start active session
    localStorage.setItem('servora_user', JSON.stringify(user))
    
    // Load workspace payload for user
    loadWorkspace(user.email)

    // Redirect to unique merchant console
    navigate(`/console/${user.email}`)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* ─── Left Column: Visuals ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 relative p-20 flex-col justify-between overflow-hidden">
         <div className="absolute top-0 right-0 w-full h-full">
            <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-blue-600 rounded-full blur-[150px] opacity-20" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600 rounded-full blur-[150px] opacity-10" />
         </div>

         <div className="relative z-10">
            <Link to="/">
               <Logo showText={true} iconSize={40} className="text-white" />
            </Link>
         </div>

         <div className="relative z-10 space-y-12 mb-20">
            <div className="space-y-6">
               <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Merchant Auth</Badge>
               <h1 className="text-7xl font-black text-white tracking-tightest leading-[1.1]">
                  Welcome <br/> back, <span className="text-blue-500">Partner.</span>
               </h1>
               <p className="text-xl text-slate-400 font-medium max-w-md leading-relaxed tracking-tighter">
                  Access your command center to oversee operations, analyze performance, and manage your culinary empire.
               </p>
            </div>

            <div className="space-y-6">
               {[
                  { icon: ShieldCheck, text: 'Enterprise-grade encryption' },
                  { icon: Zap, text: 'Real-time performance telemetry' },
                  { icon: LayoutDashboard, text: 'Centralized merchant hub' }
               ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 text-white/80">
                     <item.icon className="w-6 h-6 text-blue-500" />
                     <span className="font-bold tracking-tight text-lg">{item.text}</span>
                  </div>
               ))}
            </div>
         </div>

         <div className="relative z-10 pt-12 border-t border-white/10 flex items-center justify-between">
            <div className="flex -space-x-3">
               {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800" />
               ))}
               <div className="w-10 h-10 rounded-full border-2 border-slate-950 bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">+2k</div>
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Global Merchant Network</p>
         </div>
      </div>

      {/* ─── Right Column: Form ──────────────────────────────────── */}
      {/* ─── Auth Overlay ────────────────────────────────── */}
      <AnimatePresence>
         {isAuthenticating && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 text-center"
            >
               <div className="relative mb-8">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[40px] opacity-20 animate-pulse" />
                  <div className="relative w-20 h-20 bg-emerald-50 border-4 border-emerald-100 rounded-3xl flex items-center justify-center">
                     <ShieldCheck className="w-10 h-10 text-emerald-600" />
                  </div>
               </div>

               <div className="space-y-4 max-w-sm">
                  <h3 className="text-2xl font-black text-slate-950 tracking-tight">Authenticating Session</h3>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                     Verifying merchant credentials...
                  </p>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 bg-white relative">
         <div className="lg:hidden absolute top-8 left-8 z-50">
            <Link to="/">
               <Logo showText={true} iconSize={32} />
            </Link>
         </div>

         <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-10"
         >
            <div className="space-y-2">
               <h2 className="text-4xl font-black text-slate-950 tracking-tightest">Sign In.</h2>
               <p className="text-slate-500 font-medium">Access your Servora merchant dashboard</p>
            </div>

            {error && (
               <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100/50 text-rose-600 flex items-start gap-3">
                  <span className="w-5 h-5 mt-0.5 flex items-center justify-center rounded-full bg-rose-100 text-[10px] font-black shrink-0">!</span>
                  <p className="text-sm font-bold tracking-tight leading-relaxed">{error}</p>
               </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                     <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <Input 
                           required
                           type="email"
                           value={formData.email}
                           onChange={(e) => setFormData({...formData, email: e.target.value})}
                           className="h-16 pl-14 rounded-2xl bg-slate-50 border-slate-100 hover:border-slate-200 transition-all font-bold placeholder:text-slate-300" 
                           placeholder="owner@restaurant.com" 
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Secure Password</label>
                        <a href="#" className="text-xs font-bold text-blue-600 hover:underline">Forgot password?</a>
                     </div>
                     <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <Input 
                           required
                           type="password"
                           value={formData.password}
                           onChange={(e) => setFormData({...formData, password: e.target.value})}
                           className="h-16 pl-14 rounded-2xl bg-slate-50 border-slate-100 hover:border-slate-200 transition-all font-bold placeholder:text-slate-300" 
                           placeholder="••••••••••••" 
                        />
                     </div>
                  </div>

                  <Button 
                     type="submit"
                     className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 group mt-4"
                  >
                     Access Dashboard
                     <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
               </div>
            </form>

            <div className="pt-10 border-t border-slate-100 text-center space-y-4">
               <p className="text-slate-500 font-bold text-sm tracking-tight">
                  New to Servora? <Link to="/register" className="text-blue-600 hover:underline">Initialize a Merchant Account</Link>
               </p>
            </div>
         </motion.div>
      </div>
   </div>
  )
}
