import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Building2, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle, 
  ChefHat,
  Users,
  MapPin,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Logo from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
    restaurantType: 'fine-dining'
  })

  const [isInitializing, setIsInitializing] = useState(false)
  const [initStatus, setInitStatus] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.businessName || !formData.email || (step === 2 && !formData.password)) {
      setError('Please complete all fields to initialize your system.')
      return
    }

    setIsInitializing(true)
    setError(null)
    
    const statuses = [
       "Allocating merchant nodes...",
       "Constructing neural floor plan...",
       "Synchronizing kitchen telemetry...",
       "Securing administrative layer...",
       "Finalizing merchant environment..."
    ]

    // Animate status messages
    for (let i = 0; i < statuses.length - 1; i++) {
       setInitStatus(statuses[i])
       await new Promise(r => setTimeout(r, 700))
    }
    setInitStatus(statuses[statuses.length - 1])

    // ── Real Supabase Auth ──
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          business_name: formData.businessName,
          restaurant_type: formData.restaurantType
        }
      }
    })

    if (signUpError) {
      setIsInitializing(false)
      setError(signUpError.message) // Show exact Supabase error
      return
    }

    // Wait a brief moment for the DB trigger to finish creating the restaurant
    await new Promise(r => setTimeout(r, 1000))

    // Fetch the auto-created restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, business_name')
      .eq('owner_id', data.user.id)
      .single()

    // Store full session info including the real database ID
    localStorage.setItem('servora_user', JSON.stringify({
      email: formData.email,
      businessName: restaurant?.business_name || formData.businessName,
      restaurantType: formData.restaurantType,
      id: data.user?.id,
      restaurantId: restaurant?.id // THIS IS CRITICAL FOR FETCHING MENU
    }))

    // Redirect to merchant console
    navigate(`/console/${formData.email}`)
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
               <Badge className="bg-blue-500 text-white border-none px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Merchant Protocol v2.4</Badge>
               <h1 className="text-7xl font-black text-white tracking-tightest leading-[1.1]">
                  Build your <br/> digital <span className="text-blue-500">Empire.</span>
               </h1>
               <p className="text-xl text-slate-400 font-medium max-w-md leading-relaxed tracking-tighter">
                  Join 2,400+ world-class dining establishments optimizing their floor with Servora's neural engine.
               </p>
            </div>

            <div className="space-y-6">
               {[
                  { icon: CheckCircle, text: 'Real-time kitchen synchronization' },
                  { icon: CheckCircle, text: 'Neural menu optimization' },
                  { icon: CheckCircle, text: 'Architect-grade analytics' }
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
      {/* ─── Initialization Overlay ────────────────────────────────── */}
      <AnimatePresence>
         {isInitializing && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 text-center"
            >
               <div className="absolute inset-x-0 top-0 h-1.5 bg-slate-100">
                  <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: "100%" }}
                     transition={{ duration: 4.5, ease: "linear" }}
                     className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                  />
               </div>
               
               <div className="relative mb-12">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-[60px] opacity-20 animate-pulse" />
                  <div className="relative w-24 h-24 bg-white border-4 border-slate-50 rounded-[2.5rem] shadow-2xl flex items-center justify-center">
                     <Logo iconSize={60} />
                  </div>
               </div>

               <div className="space-y-4 max-w-sm">
                  <h3 className="text-3xl font-black text-slate-950 tracking-tightest">Initializing Protocol.</h3>
                  <div className="flex items-center justify-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                     <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '200ms' }} />
                     <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '400ms' }} />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] min-h-[1.5rem]">
                     {initStatus}
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
               <h2 className="text-4xl font-black text-slate-950 tracking-tightest">Initialize Merchant.</h2>
               <p className="text-slate-500 font-medium">Step {step} of 2: Create your restaurant environment</p>
            </div>

            {error && (
               <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100/50 text-rose-600 flex items-start gap-3">
                  <span className="w-5 h-5 mt-0.5.5 flex items-center justify-center rounded-full bg-rose-100 text-[10px] font-black shrink-0">!</span>
                  <p className="text-sm font-bold tracking-tight leading-relaxed">{error}</p>
               </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
               {step === 1 ? (
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Business Name</label>
                        <div className="relative group">
                           <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                           <Input 
                              required
                              value={formData.businessName}
                              onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                              className="h-16 pl-14 rounded-2xl bg-slate-50 border-slate-100 hover:border-slate-200 transition-all font-bold placeholder:text-slate-300" 
                              placeholder="e.g. Nocturne Bistro & Grill" 
                           />
                        </div>
                     </div>

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

                     <Button 
                        type="button"
                        onClick={() => setStep(2)}
                        className="w-full h-16 rounded-2xl bg-slate-950 text-white font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group"
                     >
                        Next Configuration
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                     </Button>
                  </div>
               ) : (
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Secure Password</label>
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

                     <div className="grid grid-cols-2 gap-4">
                        {['Fine Dining', 'Quick Service', 'Bar & Lounge', 'Cafe'].map(type => (
                           <button
                              key={type}
                              type="button"
                              onClick={() => setFormData({...formData, restaurantType: type})}
                              className={`p-5 rounded-2xl border-2 transition-all text-left space-y-2 ${
                                 formData.restaurantType === type 
                                 ? 'border-blue-600 bg-blue-50/50 shadow-inner' 
                                 : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                              }`}
                           >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.restaurantType === type ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>
                                 <ChefHat className="w-4 h-4" />
                              </div>
                              <p className={`text-xs font-black uppercase tracking-tight ${formData.restaurantType === type ? 'text-blue-900' : 'text-slate-500'}`}>{type}</p>
                           </button>
                        ))}
                     </div>

                     <div className="flex gap-4">
                        <Button 
                           type="button"
                           variant="outline"
                           onClick={() => setStep(1)}
                           className="flex-1 h-16 rounded-2xl border-slate-200 font-black uppercase tracking-widest text-xs"
                        >
                           Back
                        </Button>
                        <Button 
                           type="submit"
                           disabled={isInitializing}
                           className="flex-[2] h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isInitializing ? 'Processing...' : 'Initialize System'}
                        </Button>
                     </div>
                  </div>
               )}
            </form>

            <div className="pt-10 border-t border-slate-100 text-center space-y-4">
               <p className="text-slate-500 font-bold text-sm tracking-tight">
                  Already managing with Servora? <Link to="/login" className="text-blue-600 hover:underline">Sign In</Link>
               </p>
               <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-10">
                  By initializing system, you agree to our <span className="underline">Terms of Service</span> and acknowledge <span className="underline">Neural Data Processing Protocols</span>.
               </p>
            </div>
         </motion.div>
      </div>
   </div>
  )
}
