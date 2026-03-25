import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, AlertCircle, RefreshCw, ArrowRight, ShieldAlert, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Logo from '../ui/Logo'

export default function SubscriptionLockOverlay({ planName, expiredSince }) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-2xl w-full"
      >
        <div className="mb-12 flex justify-center">
          <div className="p-6 bg-red-600 rounded-[2.5rem] shadow-2xl shadow-red-500/20 relative group">
             <div className="absolute -top-4 -right-4 w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-12 group-hover:rotate-0 transition-transform">
                <AlertCircle className="w-6 h-6" />
             </div>
             <Logo iconSize={48} showText={false} />
          </div>
        </div>

        <h1 className="text-5xl lg:text-7xl font-black text-slate-950 tracking-tightest leading-tight mb-6 uppercase">
           Cycle <br/> <span className="text-red-600">Expired.</span>
        </h1>
        
        <p className="text-xl text-slate-500 font-medium leading-relaxed mb-12 max-w-lg mx-auto tracking-tighter">
           Your {planName} subscription cycle of 30 days has concluded on {new Date(expiredSince).toLocaleDateString()}. To continue managing your restaurant and tracking live orders, a renewal is required.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
           <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-left">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm mb-4">
                 <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Status: Restricted</h4>
              <p className="text-xs text-slate-500 font-bold">QR Codes and Order Tracking are currently paused.</p>
           </div>
           <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-left">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm mb-4">
                 <Calendar className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Subscription Lock</h4>
              <p className="text-xs text-slate-500 font-bold">Renewal will restore your previous settings instantly.</p>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
           <Button 
              size="lg" 
              className="h-20 px-12 rounded-[1.5rem] bg-slate-950 text-white font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3 group"
              onClick={() => navigate('/pricing')}
           >
              Renew Subscription
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
           </Button>
           <Button 
              size="lg" 
              variant="outline"
              className="h-20 px-12 rounded-[1.5rem] border-slate-200 text-slate-900 font-black text-sm uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
              onClick={() => navigate('/dashboard')} // Attempt retry
           >
              Retry Connection
           </Button>
        </div>
      </motion.div>
    </div>
  )
}
