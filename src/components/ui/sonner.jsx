import React from 'react'
import { Toaster as SonnerToaster } from 'sonner'
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  Loader2,
  X
} from 'lucide-react'

export function Toaster({ ...props }) {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={true}
      visibleToasts={4}
      closeButton
      duration={3500}
      gap={10}
      className="toaster group font-['Roboto',sans-serif]"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#0b0f19]/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-slate-800/80 group-[.toaster]:shadow-2xl group-[.toaster]:shadow-black/50 group-[.toaster]:rounded-2xl group-[.toaster]:p-3.5 group-[.toaster]:pl-4 group-[.toaster]:gap-3.5 group-[.toaster]:font-['Roboto',sans-serif]",
          title: 
            "group-[.toast]:font-bold group-[.toast]:text-xs group-[.toast]:text-white group-[.toast]:leading-snug group-[.toast]:tracking-tight",
          description: 
            "group-[.toast]:text-slate-400 group-[.toast]:text-[11px] group-[.toast]:mt-0.5 group-[.toast]:leading-relaxed",
          actionButton:
            "group-[.toast]:bg-white group-[.toast]:hover:bg-slate-100 group-[.toast]:text-slate-900 group-[.toast]:text-xs group-[.toast]:font-bold group-[.toast]:rounded-xl group-[.toast]:px-3.5 group-[.toast]:py-1.5 shadow-sm transition-all active:scale-95",
          cancelButton:
            "group-[.toast]:bg-slate-800 group-[.toast]:hover:bg-slate-700 group-[.toast]:text-slate-300 group-[.toast]:text-xs group-[.toast]:font-semibold group-[.toast]:rounded-xl group-[.toast]:px-3.5 group-[.toast]:py-1.5 transition-all",
          closeButton:
            "group-[.toast]:bg-white/10 group-[.toast]:hover:bg-white/20 group-[.toast]:text-slate-300 group-[.toast]:hover:text-white group-[.toast]:border-0 group-[.toast]:rounded-full group-[.toast]:w-5 group-[.toast]:h-5 group-[.toast]:top-3 group-[.toast]:right-3 transition-colors",
          success:
            "group-[.toaster]:!border-emerald-500/30 group-[.toaster]:!bg-linear-to-r group-[.toaster]:!from-[#0b1c14] group-[.toaster]:!to-[#0b0f19]",
          error:
            "group-[.toaster]:!border-rose-500/30 group-[.toaster]:!bg-linear-to-r group-[.toaster]:!from-[#1c0b0f] group-[.toaster]:!to-[#0b0f19]",
          warning:
            "group-[.toaster]:!border-amber-500/30 group-[.toaster]:!bg-linear-to-r group-[.toaster]:!from-[#1c150b] group-[.toaster]:!to-[#0b0f19]",
          info:
            "group-[.toaster]:!border-indigo-500/30 group-[.toaster]:!bg-linear-to-r group-[.toaster]:!from-[#0b111c] group-[.toaster]:!to-[#0b0f19]",
        },
      }}
      icons={{
        success: (
          <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs shadow-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        ),
        info: (
          <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-xs shadow-indigo-500/20">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
          </div>
        ),
        warning: (
          <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs shadow-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
        ),
        error: (
          <div className="w-6 h-6 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-xs shadow-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
        ),
        loading: (
          <div className="w-6 h-6 rounded-full bg-slate-500/15 border border-slate-500/30 flex items-center justify-center shrink-0">
            <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin" />
          </div>
        ),
      }}
      {...props}
    />
  )
}
export default Toaster
