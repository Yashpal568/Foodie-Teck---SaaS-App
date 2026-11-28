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

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-indigo-100 rounded-2xl p-4 sm:p-5 mb-4 lg:mb-6 shadow-sm shadow-indigo-100/50 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] -z-10 -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0">
              Setup Required
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">Complete your restaurant profile</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mb-4 max-w-xl">
            You're almost ready to go live! Complete the remaining steps to ensure your customers have all the necessary information about your restaurant.
          </p>
          
          <div className="flex flex-wrap items-center gap-3">
            {steps.map((step, idx) => (
              <div key={idx} className={`flex items-center gap-1.5 text-xs font-bold ${step.isComplete ? 'text-emerald-600' : 'text-slate-400'}`}>
                {step.isComplete ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                <span className={step.isComplete ? 'line-through opacity-70' : ''}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="flex items-center gap-3 w-auto">
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-black text-indigo-600 leading-none">{progress}%</div>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-indigo-50 flex items-center justify-center relative shrink-0">
               <svg className="w-10 h-10 sm:w-12 sm:h-12 -rotate-90 absolute top-[-4px] left-[-4px]" viewBox="0 0 36 36">
                  <path
                    className="text-indigo-500 transition-all duration-1000 ease-out"
                    strokeDasharray={`${progress}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
               </svg>
            </div>
          </div>
          <button 
            onClick={onSetupClick}
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            Finish Setup
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
