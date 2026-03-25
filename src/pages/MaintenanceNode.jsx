import { motion } from 'framer-motion'
import { Hammer, AlertTriangle, RefreshCw, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function MaintenanceNode() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 text-center space-y-10 relative z-10 shadow-2xl"
      >
        <div className="flex justify-center">
           <div className="w-24 h-24 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center relative">
              <Hammer className="w-10 h-10 text-amber-500 animate-bounce" />
              <div className="absolute -top-2 -right-2 px-3 py-1 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                 503
              </div>
           </div>
        </div>

        <div className="space-y-4">
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none uppercase">System Synchronizing</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocol: Critical Maintenance Active</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 text-left">
           <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
           <p className="text-sm font-medium text-slate-300">
              The platform is currently undergoing a core infrastructure migration. Navigation to user consoles is temporarily restricted to prevent database desynchronization.
           </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
           <Button 
             variant="outline"
             onClick={() => window.location.reload()}
             className="h-14 px-8 rounded-2xl bg-white/5 border-white/10 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all flex gap-3"
           >
              <RefreshCw className="w-4 h-4" /> RE-SYNC NODE
           </Button>
           <Button 
              variant="ghost"
              onClick={() => {
                localStorage.removeItem('servora_user')
                window.location.href = '/'
              }}
              className="text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest flex gap-2"
           >
              <LogOut className="w-4 h-4" /> Terminate Global Session
           </Button>
        </div>

        <div className="pt-8 border-t border-white/5 flex items-center justify-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Admin Access Permitted</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-700" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">v2.4 Deployed</span>
           </div>
        </div>
      </motion.div>
    </div>
  )
}
