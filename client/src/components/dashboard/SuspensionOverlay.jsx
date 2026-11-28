import React from 'react'
import { ShieldOff, MessageCircle, AlertTriangle, ShieldCheck, CreditCard, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Logo from '../ui/Logo'

export default function SuspensionOverlay({
  restaurantName = '',
  onOpenSupport = null,
  onOpenAccount = null,
  onSignOut = null,
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-4 sm:p-6 text-center overflow-y-auto">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-100 rounded-full blur-[120px] opacity-60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-2xl w-full py-6"
      >
        <div className="mb-8 flex justify-center">
          <div className="p-5 sm:p-6 bg-slate-950 rounded-[2.5rem] shadow-2xl relative group">
             <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-12 group-hover:rotate-0 transition-transform">
                <ShieldOff className="w-6 h-6" />
             </div>
             <Logo iconSize={48} showText={false} />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tightest leading-tight mb-4">
           Node <br/> <span className="text-red-600">Suspended.</span>
        </h1>
        
        <p className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed mb-8 max-w-lg mx-auto tracking-tight">
           {restaurantName ? `${restaurantName}'s` : 'Your'} merchant workspace has been restricted by the System Administrator. Live QR ordering, menu editing, and floor operations are paused.
        </p>

        <div className="p-6 sm:p-8 bg-slate-50 border border-slate-200 rounded-[2rem] mb-8 text-left space-y-5">
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
               </div>
               <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Reason for Action</h4>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">Administrative account hold. Operational dashboard routes and public QR ordering are locked until review completes.</p>
               </div>
            </div>
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
               </div>
               <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Data Preservation & Account Access</h4>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">Your menu and historical records remain preserved. You can still submit a support ticket or check your subscription status below.</p>
               </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
           <Button 
              size="lg" 
              className="h-14 px-8 rounded-2xl bg-slate-950 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer"
              onClick={() => {
                if (typeof onOpenSupport === 'function') onOpenSupport()
                else window.location.href = 'mailto:support@servora.tech'
              }}
           >
              <MessageCircle className="w-4 h-4" />
              Contact Support
           </Button>
           {typeof onOpenAccount === 'function' && (
             <Button 
                size="lg" 
                variant="outline"
                className="h-14 px-7 rounded-2xl border-slate-200 text-slate-900 font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                onClick={onOpenAccount}
             >
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Account & Payment Status
             </Button>
           )}
           <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-7 rounded-2xl border-slate-200 text-slate-700 font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              onClick={() => window.location.reload()}
           >
              Retry Status Check
           </Button>
           {typeof onSignOut === 'function' && (
             <Button 
                size="lg" 
                variant="ghost"
                className="h-14 px-6 rounded-2xl text-rose-600 hover:bg-rose-50 font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                onClick={onSignOut}
             >
                <LogOut className="w-4 h-4" />
                Sign Out
             </Button>
           )}
        </div>
      </motion.div>
    </div>
  )
}
