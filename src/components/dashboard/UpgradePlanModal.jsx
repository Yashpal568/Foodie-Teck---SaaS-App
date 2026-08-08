import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Crown, 
  X, 
  QrCode, 
  Table, 
  Utensils, 
  Lock,
  ShieldCheck,
  Rocket
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import UPIPaymentModal from './UPIPaymentModal'
import { PLAN_TIERS, getPlanDetails } from '@/utils/planLimits'

export default function UpgradePlanModal({
  open,
  onOpenChange,
  currentPlanName = 'Starter',
  limitType = 'menu', // 'menu' | 'tables' | 'crm' | 'analytics' | 'general'
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

  if (!open) return null

  const getLimitDetails = () => {
    switch (limitType) {
      case 'menu':
        return {
          title: 'Menu Item Limit Reached',
          badge: 'CATALOG CAPACITY LIMIT',
          icon: <Utensils className="w-6 h-6 text-amber-400" />,
          desc: `You have utilized ${currentUsage} of ${maxLimit || currentPlan.menuItemLimit} menu items on the ${currentPlan.name} (₹${currentPlan.price}) plan. Upgrade to expand your catalog and serve more varieties!`,
          targetBenefit: targetUpgradePlan.name === 'Professional' ? 'Up to 100 Menu Items' : 'Unlimited Menu Items'
        }
      case 'tables':
        return {
          title: 'Table & QR Limit Reached',
          badge: 'FLOOR SEATING CAPACITY LIMIT',
          icon: <Table className="w-6 h-6 text-amber-400" />,
          desc: `You have reached the limit of ${maxLimit || currentPlan.tableLimit} tables on the ${currentPlan.name} (₹${currentPlan.price}) plan. Upgrade to unlock more tables, QR codes, and seating capacity!`,
          targetBenefit: targetUpgradePlan.name === 'Professional' ? 'Up to 30 Tables & QR Codes' : 'Unlimited Tables (9,999+)'
        }
      case 'crm':
        return {
          title: 'CRM & Customer Directory Locked',
          badge: 'PRO & ENTERPRISE EXCLUSIVE',
          icon: <Crown className="w-6 h-6 text-indigo-400" />,
          desc: `Customer tracking, guest spending history, and marketing campaigns are exclusive to Professional & Enterprise plans. Upgrade to turn one-time diners into regulars!`,
          targetBenefit: 'Full CRM & Customer Directory Access'
        }
      default:
        return {
          title: 'Upgrade Your Merchant Console',
          badge: 'GROWTH UPGRADE',
          icon: <Rocket className="w-6 h-6 text-indigo-400" />,
          desc: `Scale your restaurant operations with higher table capacity, expanded menus, full CRM, and live telemetry!`,
          targetBenefit: targetUpgradePlan.name === 'Professional' ? '30 Tables + 100 Items + CRM' : 'Unlimited Everything'
        }
    }
  }

  const limitInfo = getLimitDetails()

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl overflow-hidden my-8"
        >
          {/* Top Gradient Glow Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Section */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm">
                {limitInfo.icon}
              </div>
              <div>
                <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-1">
                  {limitInfo.badge}
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {limitInfo.title}
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
              {limitInfo.desc}
            </p>
          </div>

          {/* Plan Comparison Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Professional Tier (₹2,499) */}
            <div
              onClick={() => setTargetUpgradePlan(PLAN_TIERS.Professional)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                targetUpgradePlan.name === 'Professional'
                  ? 'bg-indigo-950/60 border-2 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-white uppercase tracking-wider">Professional</span>
                <Badge className="bg-indigo-500 text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-md">
                  Most Popular
                </Badge>
              </div>

              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl sm:text-3xl font-black text-white">₹2,499</span>
                <span className="text-[10px] text-slate-400 font-bold">/month</span>
              </div>

              <ul className="space-y-2 text-[11px] text-slate-300">
                <li className="flex items-center gap-1.5 font-bold text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Up to 30 Tables & QR Codes</span>
                </li>
                <li className="flex items-center gap-1.5 font-bold text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Up to 100 Menu Items</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Full CRM & Customer Management</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>AI Revenue & Sales Telemetry</span>
                </li>
              </ul>
            </div>

            {/* Enterprise Tier (₹4,999) */}
            <div
              onClick={() => setTargetUpgradePlan(PLAN_TIERS.Enterprise)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                targetUpgradePlan.name === 'Enterprise'
                  ? 'bg-purple-950/60 border-2 border-purple-500 shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-white uppercase tracking-wider">Enterprise</span>
                <Badge className="bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-[9px] uppercase px-2 py-0.5 rounded-md">
                  Unlimited
                </Badge>
              </div>

              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl sm:text-3xl font-black text-white">₹4,999</span>
                <span className="text-[10px] text-slate-400 font-bold">/month</span>
              </div>

              <ul className="space-y-2 text-[11px] text-slate-300">
                <li className="flex items-center gap-1.5 font-bold text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Unlimited Tables & QR Codes</span>
                </li>
                <li className="flex items-center gap-1.5 font-bold text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Unlimited Menu Items</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Full CRM & Marketing Engine</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Custom Hardware & API Webhooks</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              size="lg"
              className="w-full sm:flex-1 h-13 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              onClick={() => {
                setShowUPIModal(true)
              }}
            >
              <QrCode className="w-4 h-4" />
              Upgrade to {targetUpgradePlan.name} (₹{targetUpgradePlan.price.toLocaleString('en-IN')}/mo)
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-13 px-5 rounded-2xl border-slate-800 bg-slate-950/80 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </div>
        </motion.div>

        {/* UPI Payment Modal */}
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
      </div>
    </AnimatePresence>
  )
}
