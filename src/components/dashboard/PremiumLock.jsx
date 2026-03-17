import React from 'react'
import { motion } from 'framer-motion'
import { Crown, CheckCircle2, ArrowRight, Lock, Users, Zap, BarChart3, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PremiumLock = ({ navigate, setActiveItem }) => {
  const benefits = [
    {
      icon: Users,
      title: "Advanced CRM & VIP Tracking",
      desc: "Identify your top 1% customers and track their dining patterns automatically."
    },
    {
      icon: Zap,
      title: "Smart Segmentation",
      desc: "Auto-categorize guests into New, Regular, and VIP tiers based on visit history."
    },
    {
      icon: BarChart3,
      title: "Spending Analytics",
      desc: "Detailed revenue breakdown per customer to optimize your menu for high-spenders."
    }
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Animated Background Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-white/40 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-lg bg-white/80 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-[0_22px_70px_4px_rgba(0,0,0,0.1)] overflow-hidden"
      >
        {/* Premium Header Decoration */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
        
        <div className="relative p-8 md:p-10 flex flex-col items-center text-center">
          {/* Animated Icon Container */}
          <motion.div
            initial={{ rotate: -10, scale: 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
            className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/40 mb-8 relative"
          >
            <Crown className="w-10 h-10 text-white" />
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
            >
              <Lock className="w-3 h-3 text-amber-900" />
            </motion.div>
          </motion.div>

          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Premium Access Required</h2>
            <p className="text-gray-500 font-medium max-w-[280px] mx-auto text-sm">Unlock Customer Insights to grow your restaurant's loyalty.</p>
          </div>

          {/* Benefits Grid */}
          <div className="w-full space-y-4 mb-10 text-left">
            {benefits.map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 border border-white/50 hover:bg-white transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <benefit.icon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{benefit.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">{benefit.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="w-full flex flex-col gap-3">
            <Button className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/20 active:scale-[0.98] transition-all group">
              Upgrade to Premium
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
                variant="ghost" 
                onClick={() => {
                  if (setActiveItem) setActiveItem('dashboard')
                  navigate('/dashboard')
                }}
                className="w-full h-12 text-gray-400 hover:text-gray-900 font-bold text-sm tracking-tight rounded-xl group"
            >
              <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default PremiumLock
