import { motion } from 'framer-motion'
import { Lock, ArrowRight, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function ModuleLockOverlay({ featureName, requiredPlan, price }) {
  const navigate = useNavigate()

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-[3rem] p-12 shadow-2xl shadow-blue-900/5 border border-slate-100/60 text-center relative overflow-hidden"
      >
        {/* Background Decorative Blur */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10 space-y-8">
          <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto shadow-inner mb-4">
             <div className="relative">
                <Users className="w-12 h-12 text-blue-600" />
                <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md">
                   <Lock className="w-5 h-5 text-indigo-600 stroke-[3]" />
                </div>
             </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-black text-slate-950 tracking-tightest leading-none">
              Elite System <br/> <span className="text-blue-600">Restricted.</span>
            </h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed">
              The <span className="font-bold text-slate-900">{featureName}</span> protocol is exclusively available to our <span className="text-blue-600 font-bold underline underline-offset-4">{requiredPlan}</span> merchants.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-8 border-y border-slate-50">
             <div className="text-left space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Structure</p>
                <p className="text-2xl font-black text-slate-950">{price}<span className="text-sm font-bold opacity-40">/mo</span></p>
             </div>
             <div className="text-left space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entitlement</p>
                <p className="text-sm font-black text-blue-600 uppercase tracking-tighter flex items-center gap-1">
                   <ShieldCheck className="w-4 h-4" /> Priority Access
                </p>
             </div>
          </div>

          <div className="pt-2 flex flex-col gap-4">
            <Button 
               onClick={() => navigate('/pricing')} 
               className="h-16 rounded-2xl bg-slate-950 hover:bg-black text-white font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all group w-full"
            >
               Upgrade to {requiredPlan}
               <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-2 transition-transform" />
            </Button>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unlock 20+ Premium Merchant Protocols</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

