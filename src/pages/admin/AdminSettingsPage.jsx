import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ShieldCheck, 
  Mail, 
  DatabaseZap, 
  Power, 
  Loader2, 
  Save, 
  RefreshCw, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Sparkles 
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { logAdminAction } from '@/lib/audit'
import { supabase } from '@/lib/supabase'
import { checkEmailServiceStatus, sendTestEmail, runSubscriptionExpiryScan } from '@/services/email.service'

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Gmail & Automation States
  const [emailStatus, setEmailStatus] = useState({ configured: false, status: 'Checking...', sender: '' })
  const [testEmailRecipient, setTestEmailRecipient] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [isScanningExpiry, setIsScanningExpiry] = useState(false)
  const [scanResult, setScanResult] = useState(null)

  // Platform Configuration State
  const [config, setConfig] = useState({
    maintenanceMode: false,
    smtpHost: 'smtp.gmail.com',
    smtpPort: '465',
    smtpKey: '••••••••••••••••',
    allowedIps: '192.168.1.1, 10.0.0.5',
    jwtExpiry: '24'
  })

  // Load existing config & check email status on mount
  useEffect(() => {
    const fetchConfigAndStatus = async () => {
      try {
        const { data } = await supabase.from('platform_config').select('*').single()
        if (data) {
          setConfig({
            maintenanceMode: data.maintenance_mode || false,
            smtpHost: data.smtp_host || 'smtp.gmail.com',
            smtpPort: data.smtp_port || '465',
            smtpKey: data.smtp_key || '••••••••••••••••',
            allowedIps: data.allowed_ips || '192.168.1.1, 10.0.0.5',
            jwtExpiry: data.jwt_expiry || '24'
          })
        }
      } catch (err) {
        console.warn('Platform config load notice:', err)
      }

      // Check Email Engine Status
      const statusRes = await checkEmailServiceStatus()
      setEmailStatus(statusRes)
    }

    fetchConfigAndStatus()
  }, [])

  const handleRefreshStatus = async () => {
    setIsSyncing(true)
    const statusRes = await checkEmailServiceStatus()
    setEmailStatus(statusRes)
    setTimeout(() => setIsSyncing(false), 600)
    toast.info('Email Engine status refreshed.')
  }

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      toast.error('Please enter a valid recipient email address.')
      return
    }

    setIsSendingTest(true)
    try {
      const res = await sendTestEmail(testEmailRecipient.trim())
      if (res.success) {
        toast.success('Test Email Dispatched!', {
          description: `Delivered to ${testEmailRecipient} via Gmail SMTP.`
        })
      } else {
        toast.warning('Test Email Simulated / Note:', {
          description: res.error || 'Server is running in development mode.'
        })
      }
    } catch (err) {
      toast.error('Failed to send test email', { description: err.message })
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleRunExpiryScan = async () => {
    setIsScanningExpiry(true)
    setScanResult(null)
    try {
      const res = await runSubscriptionExpiryScan()
      if (res.success) {
        setScanResult(res.result)
        toast.success('Subscription Expiry Scan Complete!', {
          description: `Scanned ${res.result?.totalScanned || 0} subscriptions. ${res.result?.totalNotified || 0} merchants notified.`
        })
        logAdminAction(`Subscription Expiry Scan Executed: ${res.result?.totalNotified || 0} notified`, "AUTOMATION", "INFO")
      } else {
        toast.error('Scan failed', { description: res.error })
      }
    } catch (err) {
      toast.error('Scan execution error', { description: err.message })
    } finally {
      setIsScanningExpiry(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      await supabase.from('platform_config').upsert({
        id: 1,
        maintenance_mode: config.maintenanceMode,
        smtp_host: config.smtpHost,
        smtp_port: config.smtpPort,
        smtp_key: config.smtpKey,
        allowed_ips: config.allowedIps,
        jwt_expiry: config.jwtExpiry,
        updated_at: new Date().toISOString()
      })
    } catch (err) {
      console.warn('Supabase platform_config update error:', err)
    }

    logAdminAction("Global Platform Configuration Updated", "SYSTEM", "SECURITY")
    window.dispatchEvent(new Event('platformConfigUpdated'))
    
    setIsSaving(false)
    toast.success("Platform Configuration Successfully Committed to Node", {
      description: "All cluster parameters updated."
    })
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
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-2">Core System Parameters / Gmail Engine & Governance</p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
             variant="outline"
             onClick={handleRefreshStatus}
             className="h-12 w-12 rounded-2xl border-slate-200 p-0 text-slate-400 hover:text-blue-600 transition-all hover:bg-blue-50 cursor-pointer"
           >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
           </Button>
           <Button 
             onClick={handleSave}
             disabled={isSaving}
             className="h-12 rounded-2xl bg-slate-950 hover:bg-black text-white font-black text-xs uppercase tracking-widest px-8 shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-slate-800 cursor-pointer disabled:opacity-50"
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
                        className={`h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all ${config.maintenanceMode ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30' : 'border-slate-200 text-slate-700 hover:bg-slate-50'} cursor-pointer`}
                     >
                        {config.maintenanceMode ? "Disengage Node" : "Engage Protocol"}
                     </Button>
                  </div>
               </CardContent>
            </Card>
         </motion.div>

         {/* ─── Gmail & Automated Notification Suite ─────────────────── */}
         <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-blue-200/80 shadow-2xl shadow-blue-500/10 rounded-[2.5rem] overflow-hidden border-2 bg-gradient-to-b from-white to-blue-50/20">
               <div className="bg-blue-600 p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-lg">
                        <Mail className="w-6 h-6" />
                     </div>
                     <div className="space-y-1">
                        <h3 className="text-xl font-black tracking-tight leading-none uppercase">Gmail Engine & Automated Dispatches</h3>
                        <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider leading-none">Password Resets • PDF Invoices • Expiry Automation</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${emailStatus.configured ? 'bg-emerald-400 text-slate-950' : 'bg-amber-400 text-slate-950'}`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        {emailStatus.status || 'Active'}
                     </span>
                  </div>
               </div>

               <CardContent className="p-8 sm:p-10 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* Feature 1: Password Recovery & PDF Receipts */}
                     <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                              <FileText className="w-5 h-5" />
                           </div>
                           <div>
                              <h4 className="text-base font-black text-slate-900">PDF Invoices & Recovery</h4>
                              <p className="text-xs text-slate-500 font-medium">Automatic dispatch on approval and password resets</p>
                           </div>
                        </div>

                        <ul className="text-xs text-slate-600 font-medium space-y-2 pt-2 border-t border-slate-100">
                           <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Instant password reset link sent to registered email</span>
                           </li>
                           <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Official Servora Tax Invoice attached as PDF upon payment approval</span>
                           </li>
                        </ul>

                        <div className="pt-2 space-y-3">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Send Test Diagnostic Email</Label>
                           <div className="flex gap-2">
                              <Input 
                                 placeholder="admin@example.com"
                                 value={testEmailRecipient}
                                 onChange={(e) => setTestEmailRecipient(e.target.value)}
                                 className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                              />
                              <Button 
                                 onClick={handleSendTestEmail}
                                 disabled={isSendingTest}
                                 className="h-12 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                 {isSendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              </Button>
                           </div>
                        </div>
                     </div>

                     {/* Feature 2: Subscription Expiry Automation */}
                     <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                 <Clock className="w-5 h-5" />
                              </div>
                              <div>
                                 <h4 className="text-base font-black text-slate-900">Subscription Expiry Automation</h4>
                                 <p className="text-xs text-slate-500 font-medium">Daily background cron (09:00 AM)</p>
                              </div>
                           </div>

                           <p className="text-xs text-slate-600 font-medium leading-relaxed">
                              Automatically checks all restaurant accounts and delivers warning notices at <strong>7 days</strong>, <strong>3 days</strong>, <strong>1 day</strong>, and on expiration day.
                           </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-3">
                           <Button
                              onClick={handleRunExpiryScan}
                              disabled={isScanningExpiry}
                              className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                           >
                              {isScanningExpiry ? (
                                 <>
                                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                    <span>Scanning Supabase Database...</span>
                                 </>
                              ) : (
                                 <>
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Run Expiry Scanner Now</span>
                                 </>
                              )}
                           </Button>

                           {scanResult && (
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium flex items-center justify-between">
                                 <span>Scanned: <strong>{scanResult.totalScanned}</strong></span>
                                 <span>Notified: <strong className="text-blue-600">{scanResult.totalNotified}</strong></span>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>
         </motion.div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Security Protocol */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
               <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden relative group border-2 h-full">
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
                           <p className="text-[10px] font-bold text-slate-400 px-2 italic uppercase tracking-tighter">*Comma separated platform overrides</p>
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

            {/* Email Gateway Config */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
               <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden border-2 h-full">
                  <div className="bg-slate-50 p-8 border-b border-slate-100 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                        <Mail className="w-6 h-6" />
                     </div>
                     <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-950 tracking-tight leading-none uppercase">SMTP Gateway Settings</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Relay Parameters</p>
                     </div>
                  </div>
                  <CardContent className="p-10 space-y-6">
                     <div className="space-y-6">
                        <div className="space-y-3">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">SMTP Host Node</Label>
                           <Input 
                              value={config.smtpHost}
                              onChange={(e) => setConfig({...config, smtpHost: e.target.value})}
                              className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-900 px-6" 
                           />
                        </div>
                        <div className="space-y-3">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Routing Port</Label>
                           <Input 
                              value={config.smtpPort}
                              onChange={(e) => setConfig({...config, smtpPort: e.target.value})}
                              className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-900 px-6" 
                           />
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </motion.div>
         </div>
      </div>
      
      {/* Background Ambience */}
      <div className="fixed bottom-0 left-0 w-full h-1/2 bg-linear-to-t from-slate-100/50 to-transparent pointer-events-none -z-10" />
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

const cn = (...classes) => classes.filter(Boolean).join(' ')
