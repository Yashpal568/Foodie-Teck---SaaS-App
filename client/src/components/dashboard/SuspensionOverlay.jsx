import React from 'react'
import { ShieldOff, MessageCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Logo from '../ui/Logo'

export default function SuspensionOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-100 rounded-full blur-[120px] opacity-60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-2xl w-full"
      >
        <div className="mb-12 flex justify-center">
          <div className="p-6 bg-slate-950 rounded-[2.5rem] shadow-2xl relative group">
             <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-12 group-hover:rotate-0 transition-transform">
                <ShieldOff className="w-6 h-6" />
             </div>
             <Logo iconSize={48} showText={false} />
          </div>
        </div>

        <h1 className="text-5xl lg:text-7xl font-black text-slate-950 tracking-tightest leading-tight mb-6">
           Node <br/> <span className="text-red-600">Suspended.</span>
        </h1>
        
        <p className="text-xl text-slate-500 font-medium leading-relaxed mb-12 max-w-lg mx-auto tracking-tighter">
           Your merchant node has been temporarily restricted by the System Administrator. Access to QR nodes, live orders, and your digital floor is currently paused.
        </p>

        <div className="p-10 bg-slate-50 border border-slate-200 rounded-[3rem] mb-12 text-left space-y-6">
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
               </div>
               <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Reason for Action</h4>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">System-wide suspension check. Please contact support for identity verification or compliance resolution.</p>
               </div>
            </div>
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
               </div>
               <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Data Preservation</h4>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">Your menu data and business settings are securely encrypted and preserved during this downtime.</p>
               </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
           <Button 
              size="lg" 
              className="h-20 px-12 rounded-[1.5rem] bg-slate-950 text-white font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3 group"
              onClick={() => window.location.href = 'mailto:support@servora.tech'}
           >
              Contact Support
              <MessageCircle className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
           </Button>
           <Button 
              size="lg" 
              variant="outline"
              className="h-20 px-12 rounded-[1.5rem] border-slate-200 text-slate-900 font-black text-sm uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
              onClick={() => window.location.reload()}
           >
              Retry Connection
           </Button>
        </div>
      </motion.div>
    </div>
  )
}
