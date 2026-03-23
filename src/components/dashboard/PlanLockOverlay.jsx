import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ShieldCheck, Zap, ArrowRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Logo from '../ui/Logo'

export default function PlanLockOverlay() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-2xl w-full"
      >
        <div className="mb-12 flex justify-center">
          <div className="p-6 bg-slate-950 rounded-[2.5rem] shadow-2xl shadow-blue-500/20 relative group">
             <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-12 group-hover:rotate-0 transition-transform">
                <Lock className="w-6 h-6" />
             </div>
             <Logo iconSize={48} showText={false} />
          </div>
        </div>

        <h1 className="text-5xl lg:text-7xl font-black text-slate-950 tracking-tightest leading-tight mb-6">
           Deployment <br/> <span className="text-blue-600">Locked.</span>
        </h1>
        
        <p className="text-xl text-slate-500 font-medium leading-relaxed mb-12 max-w-lg mx-auto tracking-tighter">
           Your account has been successfully initialized! To deploy your digital floor and access the command center, a one-time activation of your subscription plan is required.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
           <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-left">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm mb-4">
                 <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Verify Business</h4>
              <p className="text-xs text-slate-500 font-bold">Secure your restaurant ID and global menu protocols.</p>
           </div>
           <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-left">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm mb-4">
                 <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Instant Activation</h4>
              <p className="text-xs text-slate-500 font-bold">Deploy your digital floor in under 60 seconds.</p>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
           <Button 
              size="lg" 
              className="h-20 px-12 rounded-[1.5rem] bg-slate-950 text-white font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3 group"
              onClick={() => navigate('/pricing')}
           >
              Choose Active Plan
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
           </Button>
           <Button 
              size="lg" 
              variant="outline"
              className="h-20 px-12 rounded-[1.5rem] border-slate-200 text-slate-900 font-black text-sm uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
              onClick={() => navigate('/docs')}
           >
              View Documentation
           </Button>
        </div>

        <div className="mt-16 flex items-center justify-center gap-8 opacity-40">
           <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-slate-900" />
              <span className="text-[10px] font-black uppercase tracking-widest">Enterprise Ready</span>
           </div>
           <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
           <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-900" />
              <span className="text-[10px] font-black uppercase tracking-widest">PCI-DSS Secure</span>
           </div>
        </div>
      </motion.div>
    </div>
  )
}
