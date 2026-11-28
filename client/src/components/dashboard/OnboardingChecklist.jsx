import React from 'react';
import { CheckCircle2, Circle, ArrowRight, Store, MapPin, Phone, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OnboardingChecklist({ profile, onSetupClick }) {
  if (!profile || profile.id === 'demo-merchant' || profile.id === 'demo' || profile.id === 'guest') return null;

  // We consider it complete if they have phone, address, and logo
  const hasPhone = !!profile.phone && profile.phone !== '+91 98765 43210';
  const hasAddress = !!profile.address && profile.address !== 'Main Square Mall, Floor 2';
  const hasLogo = !!profile.logo_url || !!profile.avatar;

  const steps = [
    { label: "Create Account", isComplete: true, icon: Store },
    { label: "Purchase Plan", isComplete: true, icon: CheckCircle2 },
    { label: "Add Phone Number", isComplete: hasPhone, icon: Phone },
    { label: "Set Location Address", isComplete: hasAddress, icon: MapPin },
    { label: "Upload Restaurant Logo", isComplete: hasLogo, icon: ImageIcon }
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const totalSteps = steps.length;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  if (progress === 100) return null;

  const ringCircumference = 113.1
  const ringOffset = Number((ringCircumference * (1 - progress / 100)).toFixed(2))

  return (
    <motion.div 
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-white via-white to-[#EFF4FF]/60 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_-4px_rgba(9,13,31,0.05)] relative overflow-hidden"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#EFF4FF] text-[#3B4BFF] border border-[#C7D7FE]/80 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0">
              Setup Required
            </span>
            <h2 className="text-base font-extrabold text-[#090D1F] tracking-tight">Complete your restaurant profile</h2>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl">
            Complete the remaining steps so diners see your verified brand, phone number, and location on every QR menu &amp; GST receipt.
          </p>
          
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {steps.map((step, idx) => (
              <button
                key={idx}
                type="button"
                onClick={onSetupClick}
                className={`min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                  step.isComplete
                    ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-[#C7D7FE] hover:text-[#3B4BFF]'
                }`}
              >
                {step.isComplete ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                <span className={step.isComplete ? 'line-through opacity-75' : ''}>{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-xl font-extrabold text-[#3B4BFF] leading-none">{progress}%</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Completed</div>
            </div>
            <svg className="w-11 h-11 -rotate-90 shrink-0" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="#E2E8F0" strokeWidth="4" />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="#3B4BFF"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
          </div>
          <button 
            type="button"
            onClick={onSetupClick}
            className="min-h-[42px] px-4 bg-gradient-to-r from-[#3B4BFF] to-[#4F46E5] hover:brightness-105 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <span>Finish Setup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
