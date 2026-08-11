import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  ArrowRight,
  Zap,
  Crown,
  X,
  QrCode,
  Table,
  Utensils,
  Rocket,
  TrendingUp,
  Star,
  Shield
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import UPIPaymentModal from './UPIPaymentModal'
import { PLAN_TIERS, getPlanDetails } from '@/utils/planLimits'

export default function UpgradePlanModal({
  open,
  onOpenChange,
  currentPlanName = 'Starter',
  limitType = 'menu',
  currentUsage = 0,
  maxLimit = 0,
  restaurantId,
  merchantEmail,
  merchantName,
  onUpgradeSuccess
}) {
  const [showUPIModal, setShowUPIModal] = useState(false)
  const currentPlan = getPlanDetails(currentPlanName)
  const [targetUpgradePlan, setTargetUpgradePlan] = useState(
    currentPlan.name === 'Starter' ? PLAN_TIERS.Professional : PLAN_TIERS.Enterprise
  )

  const getLimitDetails = () => {
    switch (limitType) {
      case 'menu':
        return {
          title: 'Menu Item Limit Reached',
          badge: 'Catalog Limit',
          badgeColor: 'bg-orange-50 text-orange-600 border-orange-200',
          icon: <Utensils className="w-5 h-5 text-orange-500" />,
          iconBg: 'bg-orange-50 border-orange-100',
          desc: `You've used ${currentUsage} of ${maxLimit || currentPlan.menuItemLimit} menu items on your ${currentPlan.name} plan. Upgrade to expand your catalog and serve more varieties.`,
          usagePct: Math.min(100, Math.round((currentUsage / (maxLimit || currentPlan.menuItemLimit || 1)) * 100)),
        }
      case 'tables':
        return {
          title: 'Table & QR Limit Reached',
          badge: 'Seating Limit',
          badgeColor: 'bg-blue-50 text-blue-600 border-blue-200',
          icon: <Table className="w-5 h-5 text-blue-500" />,
          iconBg: 'bg-blue-50 border-blue-100',
          desc: `You've reached the limit of ${maxLimit || currentPlan.tableLimit} tables on your ${currentPlan.name} plan. Upgrade for more tables, QR codes, and seating capacity.`,
          usagePct: 100,
        }
      case 'crm':
        return {
          title: 'CRM & Directory Locked',
          badge: 'Pro Feature',
          badgeColor: 'bg-violet-50 text-violet-600 border-violet-200',
          icon: <Crown className="w-5 h-5 text-violet-500" />,
          iconBg: 'bg-violet-50 border-violet-100',
          desc: `Customer tracking and marketing tools are exclusive to Professional & Enterprise plans. Upgrade to turn one-time diners into loyal regulars.`,
          usagePct: null,
        }
      default:
        return {
          title: 'Upgrade Your Plan',
          badge: 'Growth',
          badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
          icon: <Rocket className="w-5 h-5 text-emerald-500" />,
          iconBg: 'bg-emerald-50 border-emerald-100',
          desc: `Scale with higher capacity, expanded menus, full CRM, and live analytics.`,
          usagePct: null,
        }
    }
  }

  const limitInfo = getLimitDetails()

  const plans = [
    {
      key: 'Professional',
      plan: PLAN_TIERS.Professional,
      badge: 'Most Popular',
      badgeStyle: 'bg-indigo-600 text-white border-0',
      selectedBorder: 'border-indigo-500 ring-2 ring-indigo-500/20',
      unselectedBorder: 'border-slate-200 hover:border-indigo-300',
      selectedBg: 'bg-gradient-to-br from-indigo-50/80 to-white',
      unselectedBg: 'bg-white',
      checkColor: 'text-indigo-500',
      priceColor: 'text-indigo-700',
      icon: <Zap className="w-4 h-4 text-indigo-500" />,
      features: [
        'Up to 30 Tables & QR Codes',
        'Up to 100 Menu Items',
        'Full CRM & Customer Management',
        'Revenue & Sales Analytics',
      ]
    },
    {
      key: 'Enterprise',
      plan: PLAN_TIERS.Enterprise,
      badge: 'Unlimited',
      badgeStyle: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0',
      selectedBorder: 'border-violet-500 ring-2 ring-violet-500/20',
      unselectedBorder: 'border-slate-200 hover:border-violet-300',
      selectedBg: 'bg-gradient-to-br from-violet-50/80 to-white',
      unselectedBg: 'bg-white',
      checkColor: 'text-violet-500',
      priceColor: 'text-violet-700',
      icon: <Crown className="w-4 h-4 text-violet-500" />,
      features: [
        'Unlimited Tables & QR Codes',
        'Unlimited Menu Items',
        'Full CRM & Marketing Engine',
        'Custom Hardware & API Webhooks',
      ]
    }
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[580px] p-0 gap-0 bg-white border-0 shadow-2xl shadow-slate-900/15 rounded-3xl overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">Upgrade Plan</DialogTitle>
          <DialogDescription className="sr-only">Upgrade your current Servora plan.</DialogDescription>
          {/* Top gradient accent bar */}
          <div className="h-[3px] w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

          <div className="p-6 sm:p-7">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${limitInfo.iconBg}`}>
                  {limitInfo.icon}
                </div>
                <div>
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-lg mb-1.5 border ${limitInfo.badgeColor}`}>
                    {limitInfo.badge}
                  </Badge>
                  <h2 className="text-[18px] font-black text-slate-900 tracking-tight leading-tight">
                    {limitInfo.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all shrink-0 cursor-pointer mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-[13px] text-slate-500 leading-relaxed font-medium mb-4">
              {limitInfo.desc}
            </p>

            {/* Usage bar */}
            {limitInfo.usagePct !== null && (
              <div className="mb-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Usage</span>
                  <span className="text-[11px] font-black text-slate-700">{currentUsage} / {maxLimit || currentPlan.menuItemLimit} items</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${limitInfo.usagePct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">{limitInfo.usagePct}% of limit used — upgrade to unlock more</p>
              </div>
            )}

            {/* Plan Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {plans.map((p) => {
                const isSelected = targetUpgradePlan.name === p.key
                return (
                  <motion.div
                    key={p.key}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setTargetUpgradePlan(p.plan)}
                    className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 select-none ${
                      isSelected
                        ? `${p.selectedBorder} ${p.selectedBg}`
                        : `${p.unselectedBorder} ${p.unselectedBg}`
                    }`}
                  >
                    {/* Selected indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute top-3.5 right-3.5"
                      >
                        <CheckCircle2 className={`w-4 h-4 ${p.checkColor}`} />
                      </motion.div>
                    )}

                    {/* Plan label row */}
                    <div className="flex items-center gap-2 mb-3">
                      {p.icon}
                      <span className="text-[12px] font-black text-slate-800 uppercase tracking-wide">{p.key}</span>
                      <Badge className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ml-auto mr-6 ${p.badgeStyle}`}>
                        {p.badge}
                      </Badge>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1 mb-3.5">
                      <span className={`text-[28px] font-black tracking-tight ${isSelected ? p.priceColor : 'text-slate-800'}`}>
                        ₹{p.plan.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">/mo</span>
                    </div>

                    <Separator className="mb-3" />

                    {/* Features */}
                    <ul className="space-y-2">
                      {p.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? p.checkColor : 'text-slate-300'}`} />
                          <span className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-slate-700' : 'text-slate-400'}`}>
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )
              })}
            </div>

            {/* Trust strip */}
            <div className="flex items-center justify-center gap-5 mb-5 py-3 border-y border-slate-100">
              {[
                { icon: <Shield className="w-3 h-3 text-emerald-500" />, label: 'Instant Activation' },
                { icon: <Star className="w-3 h-3 text-amber-500" />, label: 'No Hidden Fees' },
                { icon: <TrendingUp className="w-3 h-3 text-blue-500" />, label: 'Cancel Anytime' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {t.icon}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t.label}</span>
                </div>
              ))}
            </div>

            {/* CTA Row */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUPIModal(true)}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:opacity-90 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                Upgrade to {targetUpgradePlan.name} — ₹{targetUpgradePlan.price.toLocaleString('en-IN')}/mo
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>

              <button
                onClick={() => onOpenChange(false)}
                className="sm:w-28 h-12 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 text-[11px] font-bold cursor-pointer transition-all"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UPIPaymentModal
        open={showUPIModal}
        onOpenChange={setShowUPIModal}
        planName={targetUpgradePlan.name}
        amount={targetUpgradePlan.price}
        restaurantId={restaurantId}
        merchantEmail={merchantEmail}
        merchantName={merchantName}
        onPaymentSubmitted={() => {
          setShowUPIModal(false)
          onOpenChange(false)
          if (onUpgradeSuccess) onUpgradeSuccess(targetUpgradePlan)
        }}
      />
    </>
  )
}

