import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Mail, DatabaseZap, Power, Loader2, Save, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { logAdminAction } from '@/lib/audit'

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Platform Configuration State
  const [config, setConfig] = useState({
    maintenanceMode: false,
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: '587',
    smtpKey: 'SG.xxxxxxxx.yyyyyyyyyyyyyy',
    allowedIps: '192.168.1.1, 10.0.0.5',
    jwtExpiry: '24'
  })

  // Load existing config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('servora_platform_config')
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig))
    }
  }, [])

  const handleSave = () => {
    setIsSaving(true)
    
    // Persist to simulated platform database
    setTimeout(() => {
      localStorage.setItem('servora_platform_config', JSON.stringify(config))
      
      // Log Forensic Action
      logAdminAction("Global Platform Configuration Updated", "SYSTEM", "SECURITY")

      // Force global event for maintenance mode listeners
      window.dispatchEvent(new Event('platformConfigUpdated'))
      
      setIsSaving(false)
      toast.success("Platform Configuration Successfully Commited to Node", {
        description: "All cluster parameters updated."
      })
    }, 1200)
  }

  const toggleMaintenance = () => {
     const newState = !config.maintenanceMode
     setConfig(prev => ({ ...prev, maintenanceMode: newState }))
     
     if (newState) {
        logAdminAction("Maintenance Mode Engaged", "GLOBAL_GATEWAY", "CRITICAL")
        toast.error("System Entering Maintenance Protocol", {
           description: "Non-admin access is being restricted."
        })
     } else {
        logAdminAction("Maintenance Mode Disengaged", "GLOBAL_GATEWAY", "NOMINAL")
        toast.success("Maintenance Protocol Disengaged", {
           description: "Global traffic nodes restored."
        })
     }
  }

  return (
    <div className="p-8 pb-32 max-w-5xl mx-auto space-y-12 font-sans overflow-hidden">
      {/* ─── Header Section ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Platform Configuration</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-2">Core System Parameters / Cluster Governance</p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
             variant="outline"
             onClick={() => {
                setIsSyncing(true)
                setTimeout(() => setIsSyncing(false), 800)
             }}
             className="h-12 w-12 rounded-2xl border-slate-200 p-0 text-slate-400 hover:text-blue-600 transition-all hover:bg-blue-50"
           >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
           </Button>
           <Button 
             onClick={handleSave}
             disabled={isSaving}
             className="h-12 rounded-2xl bg-slate-950 hover:bg-black text-white font-black text-xs uppercase tracking-widest px-8 shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-slate-800"
           >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Save className="w-4 h-4" />}
              Commit Changes
           </Button>
        </div>
      </div>

      <div className="space-y-10">
         {/* System State Control */}
         <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden border-2">
               <div className="bg-slate-50 p-8 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                        <Power className="w-6 h-6" />
                     </div>
                     <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-950 tracking-tight leading-none uppercase">System State Vector</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Maintenance Overrides</p>
                     </div>
                  </div>
                  {config.maintenanceMode && (
                     <Badge className="bg-rose-500 text-white px-4 py-1.5 font-black uppercase tracking-widest text-[9px] animate-pulse">Maintenance Active</Badge>
                  )}
               </div>
               <CardContent className="p-10">
                  <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 p-8 rounded-3xl border-2 transition-all ${config.maintenanceMode ? 'bg-rose-50/50 border-rose-200 shadow-inner' : 'bg-white border-slate-100 shadow-sm'}`}>
                     <div className="space-y-2">
                        <p className={`text-lg font-black tracking-tight ${config.maintenanceMode ? 'text-rose-900' : 'text-slate-900'}`}>Maintenance Mode Integration</p>
                        <p className="text-sm font-medium text-slate-500 max-w-md">Forces all non-admin traffic to a 503 System Migration page. Prevents data corruption during upgrades.</p>
                     </div>
                     <Button 
                        variant={config.maintenanceMode ? "default" : "outline"}
                        onClick={toggleMaintenance}
                        className={`h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all ${config.maintenanceMode ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                     >
                        {config.maintenanceMode ? "Disengage Node" : "Engage Protocol"}
                     </Button>
                  </div>
               </CardContent>
            </Card>
         </motion.div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Email Gateway */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
               <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden border-2 h-full">
                  <div className="bg-blue-50/50 p-8 border-b border-blue-100/50 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <Mail className="w-6 h-6" />
                     </div>
                     <div className="space-y-1">
                        <h3 className="text-xl font-black text-blue-950 tracking-tight leading-none uppercase">Comm Gateway</h3>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">SMTP Routing Metrics</p>
                     </div>
                  </div>
                  <CardContent className="p-10 space-y-8">
                     <div className="space-y-8">
                        <div className="grid grid-cols-1 gap-6">
                           <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">SMTP Host Node</Label>
                              <Input 
                                 value={config.smtpHost}
                                 onChange={(e) => setConfig({...config, smtpHost: e.target.value})}
                                 className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-900 px-6 focus:ring-blue-500/20 shadow-inner group-hover:bg-white transition-all" 
                              />
                           </div>
                           <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Routing Port</Label>
                              <Input 
                                 value={config.smtpPort}
                                 onChange={(e) => setConfig({...config, smtpPort: e.target.value})}
                                 className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-900 px-6 focus:ring-blue-500/20 shadow-inner" 
                              />
                           </div>
                           <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cryptographic Relay Key (API Key)</Label>
                              <Input 
                                 type="password" 
                                 value={config.smtpKey}
                                 onChange={(e) => setConfig({...config, smtpKey: e.target.value})}
                                 className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-900 px-6 focus:ring-blue-500/20 shadow-inner font-mono tracking-widest" 
                              />
                           </div>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </motion.div>

            {/* Security Protocol */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
               <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden relative group border-2 h-full">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
                  <div className="bg-emerald-50/50 p-8 border-b border-emerald-100/50 flex items-center justify-between relative z-10">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                           <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                           <h3 className="text-xl font-black text-slate-950 tracking-tight leading-none uppercase">Security Bounds</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Access Protocol Limitations</p>
                        </div>
                     </div>
                  </div>
                  <CardContent className="p-10 space-y-10 relative z-10">
                     <div className="space-y-8">
                        <div className="space-y-3">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Allowed IPv4/IPv6 Nodes</Label>
                           <Input 
                              value={config.allowedIps}
                              onChange={(e) => setConfig({...config, allowedIps: e.target.value})}
                              className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-900 px-6 focus:ring-blue-500/20 shadow-inner font-mono text-xs" 
                           />
                           <p className="text-[10px] font-bold text-slate-400 px-2 italic uppercase tracking-tighter">*Coma separated platform overrides</p>
                        </div>
                        <div className="space-y-3">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">JWT Token Lifecycle (Hours)</Label>
                           <div className="flex items-center gap-4">
                              <Input 
                                 type="number" 
                                 value={config.jwtExpiry}
                                 onChange={(e) => setConfig({...config, jwtExpiry: e.target.value})}
                                 className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-900 px-6 focus:ring-blue-500/20 shadow-inner w-32" 
                              />
                              <div className="px-5 py-2.5 bg-emerald-50 text-[9px] font-black text-emerald-700 uppercase tracking-[0.2em] rounded-xl border border-emerald-100 flex items-center gap-2">
                                 <DatabaseZap className="w-3 h-3" /> Secure Rotation Active
                              </div>
                           </div>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </motion.div>
         </div>
      </div>
      
      {/* Background Ambience */}
      <div className="fixed bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-100/50 to-transparent pointer-events-none -z-10" />
    </div>
  )
}

function Badge({ children, className }) {
   return (
      <div className={cn("px-2 py-1 rounded-md text-[10px] items-center flex", className)}>
         {children}
      </div>
   )
}

const cn = (...classes) => classes.filter(Boolean).join(' ');
