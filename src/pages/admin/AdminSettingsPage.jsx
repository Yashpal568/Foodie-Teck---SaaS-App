import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Mail, DatabaseZap, Power, Loader2, Save } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success("Platform Configuration Saved")
    }, 1500)
  }

  return (
    <div className="p-8 pb-32 max-w-5xl mx-auto space-y-12 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Platform Configuration</h1>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Core System Parameters</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest px-8 shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
           {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
           Commit Changes
        </Button>
      </div>

      <div className="space-y-8">
         {/* System State Control */}
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
               <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-inner">
                     <Power className="w-5 h-5" />
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-slate-950 tracking-tight">System State Vector</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Global Maintenance Overrides</p>
                  </div>
               </div>
               <CardContent className="p-8 pb-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
                     <div className="space-y-1">
                        <p className="text-base font-black text-slate-900 tracking-tight">Maintenance Mode</p>
                        <p className="text-sm font-medium text-slate-500 max-w-md">Forces all non-admin traffic to a 503 Service Unavailable page. Use only during critical infrastructure migrations.</p>
                     </div>
                     <Button 
                        variant={maintenanceMode ? "default" : "outline"}
                        onClick={() => {
                           setMaintenanceMode(!maintenanceMode)
                           toast.warning(maintenanceMode ? "Maintenance Mode Deactivated" : "System entering Maintenance Protocol")
                        }}
                        className={`h-12 px-6 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${maintenanceMode ? 'bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/20' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                     >
                        {maintenanceMode ? "Disengage Mode" : "Engage Protocol"}
                     </Button>
                  </div>
               </CardContent>
            </Card>
         </motion.div>

         {/* Email Gateway */}
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
               <div className="bg-blue-50/50 p-6 border-b border-blue-100/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-inner">
                     <Mail className="w-5 h-5" />
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-blue-950 tracking-tight">Communication Gateway</h3>
                     <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none mt-1">SMTP Routing Metrics</p>
                  </div>
               </div>
               <CardContent className="p-8 pb-10 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">SMTP Host Node</Label>
                        <Input defaultValue="smtp.sendgrid.net" className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-900 px-4 focus:ring-blue-500/20 shadow-inner" />
                     </div>
                     <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Routing Port</Label>
                        <Input defaultValue="587" className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-900 px-4 focus:ring-blue-500/20 shadow-inner" />
                     </div>
                     <div className="space-y-3 md:col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cryptographic Relay Key (API Key)</Label>
                        <Input type="password" defaultValue="SG.xxxxxxxx.yyyyyyyyyyyyyy" className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-900 px-4 focus:ring-blue-500/20 shadow-inner font-mono tracking-widest" />
                     </div>
                  </div>
               </CardContent>
            </Card>
         </motion.div>

         {/* Security Protocol */}
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden relative group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
               <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                        <ShieldCheck className="w-5 h-5" />
                     </div>
                     <div>
                        <h3 className="text-lg font-black text-slate-950 tracking-tight">Security Boundaries</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Access Limitations</p>
                     </div>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] rounded-md border border-emerald-100">
                     Highest Standard Level
                  </div>
               </div>
               <CardContent className="p-8 pb-10 space-y-6 relative z-10">
                  <div className="grid grid-cols-1 gap-6">
                     <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Admin Allowed IPv4/IPv6 Nodes (Comma Separated)</Label>
                        <Input defaultValue="192.168.1.1, 10.0.0.5" className="h-12 rounded-xl bg-white border-slate-200 font-bold text-slate-900 px-4 focus:ring-blue-500/20 shadow-inner font-mono text-sm" />
                        <p className="text-xs font-bold text-slate-400">Leave globally exposed empty ` ` or restrict to specific corporate gateways.</p>
                     </div>
                     <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">JWT Token Expiry (Hours)</Label>
                        <Input type="number" defaultValue="24" className="h-12 rounded-xl bg-white border-slate-200 font-bold text-slate-900 px-4 focus:ring-blue-500/20 shadow-inner w-32" />
                     </div>
                  </div>
               </CardContent>
            </Card>
         </motion.div>
      </div>
    </div>
  )
}
