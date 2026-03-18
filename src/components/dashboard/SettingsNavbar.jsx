import React from 'react'
import { Settings as SettingsIcon, Save, X, Loader2, Sparkles, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function SettingsNavbar({ 
  isSaving, 
  onSave, 
  onDiscard 
}) {
  return (
    <div className="hidden lg:flex items-center justify-between px-8 py-5 bg-white/40 backdrop-blur-xl border-b border-gray-100/50 sticky top-0 z-40 transition-all h-20">
      {/* Left: Identity & Status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-all duration-500">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
              <Badge className="bg-blue-600 text-white border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-blue-500/20">
                Admin Profile
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>System Configuration</span>
              <Separator orientation="vertical" className="h-2.5 mx-1" />
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Enterprise Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Premium Transitions & Actions */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={onDiscard}
          className="h-11 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all group"
        >
          <X className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
          Discard Changes
        </Button>

        <div className="h-8 w-[1px] bg-gray-100 mx-2" />

        <Button 
          onClick={onSave}
          disabled={isSaving}
          className="bg-gray-900 hover:bg-black text-white font-bold h-11 px-8 rounded-2xl shadow-2xl shadow-blue-900/10 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap text-xs uppercase tracking-wider flex items-center gap-2 group disabled:opacity-70"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          ) : (
            <div className="w-5 h-5 bg-white/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Save className="w-3 h-3" />
            </div>
          )}
          <span>{isSaving ? 'Syncing...' : 'Save Configuration'}</span>
        </Button>
      </div>
    </div>
  )
}
