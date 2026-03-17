import React from 'react'
import { cn } from '@/lib/utils'

export const LogoIcon = ({ className = '', size = 36 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 96 96" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="96" height="96" rx="20" fill="#EDE9FE"/>
    <rect x="12" y="12" width="22" height="22" rx="4" fill="none" stroke="#6C5CE7" strokeWidth="2.5"/>
    <rect x="16" y="16" width="14" height="14" rx="2.5" fill="#6C5CE7"/>
    <rect x="62" y="12" width="22" height="22" rx="4" fill="none" stroke="#6C5CE7" strokeWidth="2.5"/>
    <rect x="66" y="16" width="14" height="14" rx="2.5" fill="#6C5CE7"/>
    <rect x="12" y="62" width="22" height="22" rx="4" fill="none" stroke="#6C5CE7" strokeWidth="2.5"/>
    <rect x="16" y="66" width="14" height="14" rx="2.5" fill="#6C5CE7"/>
    <rect x="40" y="21" width="5" height="5" rx="1" fill="#6C5CE7" opacity="0.8"/>
    <rect x="13" y="48" width="5" height="5" rx="1" fill="#6C5CE7" opacity="0.9"/>
    <rect x="40" y="48" width="5" height="5" rx="1" fill="#6C5CE7" opacity="0.9"/>
    <rect x="78" y="48" width="5" height="5" rx="1" fill="#6C5CE7" opacity="0.9"/>
    <rect x="62" y="62" width="22" height="22" rx="4" fill="#6C5CE7"/>
    <line x1="70" y1="66" x2="70" y2="82" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="68" y1="66" x2="68" y2="69" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="72" y1="66" x2="72" y2="69" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="78" y1="66" x2="78" y2="82" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M78 66 Q82 69 78 73" stroke="white" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
  </svg>
)

export const LogoText = ({ className = '' }) => (
  <div className={cn("font-bold text-gray-800 tracking-tight", className)}>
    Serv<span className="text-[#6C5CE7]">ora</span>
  </div>
)

export const Logo = ({ className = '', showText = true, subtitle = '', iconSize = 36 }) => {
  return (
    <div className={cn("flex items-center gap-2.5 sm:gap-3", className)}>
      <div className="flex-shrink-0">
        <LogoIcon size={iconSize} className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] lg:w-[36px] lg:h-[36px]" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <LogoText className="text-xl sm:text-2xl leading-tight" />
          {subtitle && (
            <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0 sm:mt-0.5 leading-none">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default Logo
