import { motion } from 'framer-motion'
import { Lock, ArrowRight, ShieldCheck, Users, BarChart3, Crown, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'

const FEATURE_CONFIGS = {
  crm: {
    icon: Users,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    gradientFrom: 'from-blue-500',
    gradientVia: 'via-indigo-500',
    gradientTo: 'to-purple-500',
    badge: 'CRM Module',
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
    perks: [
      'Full Customer Directory & Profiles',
      'Loyalty Score & Visit Tracking',
      'Smart Customer Segmentation (VIP, Regular, At-Risk)',
      'Revenue Per Customer Analytics',
    ]
  },
  analytics: {
    icon: BarChart3,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-50',
    gradientFrom: 'from-violet-500',
    gradientVia: 'via-purple-500',
    gradientTo: 'to-indigo-500',
    badge: 'Advanced Analytics',
    badgeStyle: 'bg-violet-50 text-violet-700 border-violet-200',
    perks: [
      'AI Revenue & Trend Forecasting',
      'Peak Hour & Day Analysis',
      'Menu Item Performance Reports',
      'Multi-Period Comparison Charts',
    ]
  },
  default: {
    icon: Crown,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    gradientFrom: 'from-amber-500',
    gradientVia: 'via-orange-500',
    gradientTo: 'to-rose-500',
    badge: 'Premium Feature',
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
    perks: [
      'Priority 24/7 Support',
      'Advanced Reporting',
      'Full Platform Access',
      'Dedicated Account Manager',
    ]
  }
}

export default function ModuleLockOverlay({ featureName, requiredPlan, price, featureKey = 'default', onUpgradeClick }) {
  const navigate = useNavigate()
  const config = FEATURE_CONFIGS[featureKey] || FEATURE_CONFIGS.default
  const IconComponent = config.icon

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick()
    } else {
      navigate('/pricing')
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 lg:p-12 min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl w-full"
      >
        {/* Main Card */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-900/8">
          {/* Top gradient bar */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradientFrom} ${config.gradientVia} ${config.gradientTo}`} />

          <div className="p-8 lg:p-12">
            <div className="flex flex-col items-center text-center space-y-6">

              {/* Badge */}
              <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border ${config.badgeStyle}`}>
                {config.badge}
              </Badge>

              {/* Icon */}
              <div className={`w-24 h-24 ${config.iconBg} rounded-3xl flex items-center justify-center relative shadow-inner`}>
                <IconComponent className={`w-12 h-12 ${config.iconColor}`} />
                <div className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 shadow-md border border-slate-100">
                  <Lock className="w-4 h-4 text-slate-700 stroke-[2.5]" />
                </div>
              </div>

              {/* Heading */}
              <div className="space-y-3">
                <h2 className="text-3xl lg:text-4xl font-black text-slate-950 tracking-tight leading-none">
                  {featureName} is<br />
                  <span className={`bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} bg-clip-text text-transparent`}>
                    Plan Restricted
                  </span>
                </h2>
                <p className="text-slate-500 font-medium text-base leading-relaxed max-w-md mx-auto">
                  Upgrade to <span className="font-bold text-slate-900">{requiredPlan}</span> or higher to unlock this module and take your restaurant operations to the next level.
                </p>
              </div>

              {/* Feature perks */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 py-6 border-y border-slate-50">
                {config.perks.map((perk, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-left p-3 bg-slate-50/60 rounded-2xl">
                    <div className={`w-5 h-5 ${config.iconBg} ${config.iconColor} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
                      <ShieldCheck className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 leading-tight">{perk}</span>
                  </div>
                ))}
              </div>

              {/* Pricing info + CTA */}
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Required Plan</p>
                    <p className="text-lg font-black text-slate-900">{requiredPlan}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Starting At</p>
                    <p className="text-lg font-black text-slate-900">{price}<span className="text-sm font-bold text-slate-400">/mo</span></p>
                  </div>
                </div>

                <Button
                  onClick={handleUpgrade}
                  className={`w-full h-14 rounded-2xl bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} hover:opacity-90 text-white font-black uppercase tracking-widest text-xs shadow-xl active:scale-[0.98] transition-all group border-0`}
                >
                  <Zap className="w-4 h-4 mr-2 text-yellow-300 fill-yellow-300" />
                  Upgrade to {requiredPlan}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                  Cancel anytime · Instant access · No setup fee
                </p>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
