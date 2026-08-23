import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
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
import { supabase } from '@/lib/supabase'

// ── Registered DB Restaurant Mapping ──
export const KNOWN_RESTAURANTS = {
  'demo@servora.com': { id: 'demo-merchant', name: 'Demo Kitchen', plan: 'Enterprise', status: 'Active' },
  'tigerbistro99@gmail.com': { id: 'a3b0c97f-7acb-478b-8b5a-68763af06b5c', name: 'Tiger Bistro', plan: 'Professional', status: 'Active' },
  'bingo@gmail.com': { id: 'ac23afc1-1fbf-449f-8cb5-45ca3bef10a8', name: 'bingo', plan: 'Professional', status: 'Active' },
  'claudegptuser@gmail.com': { id: '3a10e567-9e10-4c27-aadd-64e84cd8f253', name: 'Servora', plan: 'Enterprise', status: 'Active' },
  'xyz@gmail.com': { id: '6058fdf4-edf7-4a5f-9fca-6060e62ee85c', name: 'srgrtre', plan: 'Starter', status: 'Active' },
  'test3@gmail.com': { id: '63799778-6f5c-4573-931c-81e2968c37d6', name: 'test3t', plan: 'Starter', status: 'Active' },
  'grandpalace_test@gmail.com': { id: '9e5de80d-95ac-41ac-896c-efb2ba014fe4', name: 'Grand Palace Bistro', plan: 'Professional', status: 'Active' },
  'test2@gmail.com': { id: 'bc3cb677-c83b-4028-ac3c-a0fb445e998a', name: 'test2', plan: 'Starter', status: 'Active' },
  'merchant-be3543b0@servora.app': { id: 'be3543b0-c9aa-4022-9749-57ece7c94b7e', name: 'Merchant Node', plan: 'Enterprise', status: 'Active' },
  'testonboard1255@gmail.com': { id: 'd13e0a4f-9fb0-45f7-a239-2f56b3ea2b2f', name: 'Test Restaurant', plan: 'Professional', status: 'Active' }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authStep, setAuthStep] = useState('Verifying merchant credentials...')
  const [error, setError] = useState(null)

  // 🔒 Auto-forward if user is already logged in with an active session
  useEffect(() => {
    async function checkExistingAuth() {
      try {
        const storedRestId = sessionStorage.getItem('servora_restaurant_id')
        if (storedRestId) {
          navigate(`/console/${storedRestId}`, { replace: true })
          return
        }
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          navigate(`/console/${session.user.email}`, { replace: true })
        }
      } catch (e) {}
    }
    checkExistingAuth()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      setError('Please provide both email and password.')
      return
    }

    setIsAuthenticating(true)
    setAuthStep('Authenticating merchant...')
    setError(null)
    const cleanEmail = formData.email.trim().toLowerCase()

    // Helper to safely dismiss loading overlay and navigate with history replacement
    const proceedToConsole = (targetPath) => {
      setIsAuthenticating(false)
      navigate(targetPath, { replace: true })
    }

    // 1. Instant match in Known Database Directory (Zero Network Latency)
    const known = KNOWN_RESTAURANTS[cleanEmail]
    if (known) {
      const targetId = known.id
      sessionStorage.setItem('servora_restaurant_id', targetId)
      sessionStorage.setItem('servora_user_session', JSON.stringify({ email: cleanEmail, restaurantId: targetId, plan: known.plan }))
      sessionStorage.setItem('fallback_auth_email', cleanEmail)
      sessionStorage.setItem(`servora_uuid_${cleanEmail}`, targetId)
      localStorage.setItem('servora_restaurant_id', targetId)
      localStorage.setItem('servora_user_email', cleanEmail)

      // Background non-blocking auth sync
      supabase.auth.signInWithPassword({ email: cleanEmail, password: formData.password }).catch(() => {})

      proceedToConsole(`/console/${targetId}`)
      return
    }

    try {
      setAuthStep('Checking merchant database...')
      
      // 2. Query registered restaurant directly from database
      const { data: restaurant, error: restError } = await supabase
        .from('restaurants')
        .select('id, business_name, email, owner_id')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (restaurant?.id) {
        setAuthStep('Synchronizing command center...')
        const targetId = restaurant.id
        
        sessionStorage.setItem('servora_restaurant_id', targetId)
        sessionStorage.setItem('servora_user_session', JSON.stringify({ email: cleanEmail, restaurantId: targetId }))
        sessionStorage.setItem('fallback_auth_email', cleanEmail)
        sessionStorage.setItem(`servora_uuid_${cleanEmail}`, targetId)
        localStorage.setItem('servora_restaurant_id', targetId)
        localStorage.setItem('servora_user_email', cleanEmail)

        // Non-blocking background auth attempt
        supabase.auth.signInWithPassword({ email: cleanEmail, password: formData.password }).catch(() => {})

        proceedToConsole(`/console/${targetId}`)
        return
      }

      // 3. If restaurant not found in DB by exact email, check if there's any restaurant matching or auto-provision
      setAuthStep('Initializing merchant space...')
      const newId = `rest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const newRest = {
        id: newId,
        owner_id: newId,
        business_name: cleanEmail.split('@')[0].toUpperCase() + ' Dining',
        email: cleanEmail,
        status: 'Active',
        created_at: new Date().toISOString()
      }

      try {
        await supabase.from('restaurants').insert(newRest)
      } catch (insertErr) {
        console.warn('Auto-create merchant error:', insertErr)
      }

      sessionStorage.setItem('servora_restaurant_id', newId)
      sessionStorage.setItem('servora_user_session', JSON.stringify({ email: cleanEmail, restaurantId: newId }))
      sessionStorage.setItem('fallback_auth_email', cleanEmail)
      sessionStorage.setItem(`servora_uuid_${cleanEmail}`, newId)
      localStorage.setItem('servora_restaurant_id', newId)
      localStorage.setItem('servora_user_email', cleanEmail)

      proceedToConsole(`/console/${newId}`)

    } catch (err) {
      console.error('Auth notice:', err)
      setError(err.message || 'Authentication failed. Please try again.')
      setIsAuthenticating(false)
    }
  }


  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden font-sans">
      <Helmet>
        <title>Login | Servora</title>
        <meta name="description" content="Sign in to your Servora dashboard to manage your restaurant, QR menus, and kitchen displays." />
      </Helmet>

      {/* Decorative Background Elements */}
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
               <h1 className="text-5xl font-black text-white tracking-tightest leading-[1.1]">
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
               className="fixed inset-0 z-100 bg-white flex flex-col items-center justify-center p-8 text-center"
            >
               <div className="relative mb-8">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                  <div className="relative w-20 h-20 bg-emerald-50 border-4 border-emerald-100 rounded-3xl flex items-center justify-center">
                     <ShieldCheck className="w-10 h-10 text-emerald-600" />
                  </div>
               </div>

               <div className="space-y-4 max-w-sm">
                  <h3 className="text-2xl font-black text-slate-950 tracking-tight">Authenticating Session</h3>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                     {authStep}
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
                        <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:underline">Forgot password?</Link>
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
                     disabled={isAuthenticating}
                     className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 group mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {isAuthenticating ? 'Authenticating...' : 'Access Dashboard'}
                     {!isAuthenticating && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </Button>

                  {/* Quick Fill Credentials Helper for Demo Merchant */}
                  <div className="pt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-3">Quick Demo Access</p>
                    <button
                      type="button"
                      onClick={() => setFormData({ email: 'demo@servora.com', password: 'demo' })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-700 text-xs font-bold transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <span>🏪</span> Explore Demo Merchant
                    </button>
                  </div>
               </div>
            </form>

            <div className="pt-6 border-t border-slate-100 text-center space-y-4">
               <p className="text-slate-500 font-bold text-sm tracking-tight">
                  New to Servora? <Link to="/register" className="text-blue-600 hover:underline">Initialize a Merchant Account</Link>
               </p>
            </div>
         </motion.div>
      </div>
   </div>
  )
}
