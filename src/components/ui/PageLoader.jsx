import React from 'react'
import { LogoIcon } from './Logo'

export default function PageLoader({ message = 'Loading Servora...' }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white select-none">
      <div className="relative flex items-center justify-center">
        {/* Outer pulsing glow */}
        <div className="absolute w-20 h-20 rounded-3xl bg-indigo-500/20 blur-xl animate-pulse" />
        
        {/* Rotating border ring */}
        <div className="w-16 h-16 rounded-2xl border-2 border-indigo-500/20 border-t-indigo-500 animate-spin flex items-center justify-center" />
        
        {/* Center brand icon */}
        <div className="absolute flex items-center justify-center">
          <LogoIcon size={32} />
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-1.5">
        <p className="text-xs font-semibold tracking-wider text-slate-300 uppercase animate-pulse">
          {message}
        </p>
        <div className="w-24 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="w-full h-full bg-linear-to-r from-indigo-500 to-teal-400 -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
    </div>
  )
}
