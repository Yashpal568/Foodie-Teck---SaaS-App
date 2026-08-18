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
  Sparkles,
  Lock,
  Server,
  Globe,
  Sliders
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
      // Load saved settings from Local Storage
      try {
        const saved = localStorage.getItem('servora_platform_config')
        if (saved) {
          setConfig(prev => ({ ...prev, ...JSON.parse(saved) }))
        }
      } catch (e) {}

      const statusRes = await checkEmailServiceStatus()
      setEmailStatus(statusRes)
    }

    fetchConfigAndStatus()
  }, [])

  const handleRefreshStatus = async () => {
    setIsSyncing(true)
    const statusRes = await checkEmailServiceStatus()
    setEmailStatus(statusRes)
    setTimeout(() => setIsSyncing(false), 500)
    toast.info('Email Engine Status Refreshed')
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
          description: `Diagnostic notification sent to ${testEmailRecipient}.`
        })
      } else {
        toast.warning('Test Email Note:', {
          description: res.error || 'Running in standalone simulated mode.'
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
    // 1. Save to Local Storage
    try {
      localStorage.setItem('servora_platform_config', JSON.stringify(config))
    } catch (e) {}

    logAdminAction("Global Platform Configuration Updated", "SYSTEM", "SECURITY")
    window.dispatchEvent(new Event('platformConfigUpdated'))
    
    setIsSaving(false)
    toast.success("Platform Configuration Saved", {
      description: "All parameters updated successfully."
    })
  }

  const toggleMaintenance = () => {
     const newState = !config.maintenanceMode
     const newConfig = { ...config, maintenanceMode: newState }
     setConfig(newConfig)
     try {
       localStorage.setItem('servora_platform_config', JSON.stringify(newConfig))
     } catch (e) {}
     
     if (newState) {
        logAdminAction("Maintenance Mode Engaged", "GLOBAL_GATEWAY", "CRITICAL")
        toast.error("System Entering Maintenance Mode", {
           description: "Non-admin traffic will be directed to maintenance page."
        })
     } else {
        logAdminAction("Maintenance Mode Disengaged", "GLOBAL_GATEWAY", "NOMINAL")
        toast.success("Maintenance Mode Disengaged", {
           description: "Normal traffic restored."
        })
     }
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans select-none">
      
      {/* ─── ⚡ CLEAN ENTERPRISE PAGE HEADER ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Platform Settings
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Settings Synced
            </Badge>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Configure system parameters, maintenance mode, Gmail SMTP engine, and security thresholds.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button 
            onClick={handleRefreshStatus}
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button 
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Settings
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* ─── 🛑 MAINTENANCE MODE CONTROL ─────────────────────────── */}
        <Card className={`rounded-2xl border transition-all ${
          config.maintenanceMode ? 'border-rose-300 bg-rose-50/40 shadow-xs' : 'border-slate-200/90 bg-white shadow-xs'
        }`}>
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                config.maintenanceMode ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
              }`}>
                <Power className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-900">Maintenance Mode</h3>
                  {config.maintenanceMode && (
                    <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold uppercase">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 max-w-xl">
                  When enabled, all non-admin visitor and merchant traffic is directed to the 503 maintenance page. Useful during database schema migrations or core upgrades.
                </p>
              </div>
            </div>

            <Button
              onClick={toggleMaintenance}
              variant={config.maintenanceMode ? "default" : "outline"}
              size="sm"
              className={`h-9 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                config.maintenanceMode 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs' 
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {config.maintenanceMode ? "Disable Maintenance" : "Enable Maintenance"}
            </Button>
          </div>
        </Card>

        {/* ─── 📧 GMAIL & NOTIFICATION SUITE ───────────────────────── */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Email & Notification Engine</h3>
                <p className="text-xs text-slate-500">Automated PDF tax invoices, password resets, and subscription expiration notices.</p>
              </div>
            </div>

            <Badge className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1.5 w-fit ${
              emailStatus.configured 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${emailStatus.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {emailStatus.status || 'Active'}
            </Badge>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature 1: Test Email Dispatch */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">PDF Invoices & Password Recovery</h4>
                    <p className="text-[11px] text-slate-500">Automatic dispatch upon payment verification</p>
                  </div>
                </div>

                <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-200/60">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Instant password reset link sent to merchant email</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Official Servora GST Tax Invoice PDF attached on approval</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Send Test Diagnostic Email</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="recipient@example.com"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    className="h-9 rounded-xl bg-white border-slate-200 text-xs"
                  />
                  <Button 
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest}
                    size="sm"
                    className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Feature 2: Subscription Expiry Cron */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Subscription Expiry Automation</h4>
                    <p className="text-[11px] text-slate-500">Daily background scanner (09:00 AM Cron)</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Scans all merchant subscription rows and automatically dispatches advance warning notices at <strong>7 days</strong>, <strong>3 days</strong>, and <strong>1 day</strong> prior to expiry.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <Button
                  onClick={handleRunExpiryScan}
                  disabled={isScanningExpiry}
                  variant="outline"
                  size="sm"
                  className="w-full h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isScanningExpiry ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                      <span>Scanning Subscriptions...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Run Expiry Scanner Now</span>
                    </>
                  )}
                </Button>

                {scanResult && (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 font-medium flex items-center justify-between">
                    <span>Scanned: <strong>{scanResult.totalScanned}</strong></span>
                    <span>Notified: <strong className="text-blue-600">{scanResult.totalNotified}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ─── 🛡️ SECURITY & SMTP SETTINGS GRID ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Bounds */}
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Security & Access Governance</h3>
                <p className="text-xs text-slate-500">IP limitations and session lifecycle constraints</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Admin Allowed IP Range</label>
                <Input 
                  value={config.allowedIps}
                  onChange={(e) => setConfig({...config, allowedIps: e.target.value})}
                  className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-mono"
                  placeholder="e.g. 192.168.1.1, 10.0.0.5"
                />
                <p className="text-[11px] text-slate-400">Comma-separated IPv4 / IPv6 addresses</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">JWT Session Token Expiry (Hours)</label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number"
                    value={config.jwtExpiry}
                    onChange={(e) => setConfig({...config, jwtExpiry: e.target.value})}
                    className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-mono w-28"
                  />
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    Auto-Rotation Active
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* SMTP Relay Settings */}
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">SMTP Relay Parameters</h3>
                <p className="text-xs text-slate-500">Mailing host and network transport routing</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">SMTP Host</label>
                <Input 
                  value={config.smtpHost}
                  onChange={(e) => setConfig({...config, smtpHost: e.target.value})}
                  className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-mono"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Routing Port</label>
                <Input 
                  value={config.smtpPort}
                  onChange={(e) => setConfig({...config, smtpPort: e.target.value})}
                  className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-mono"
                  placeholder="465"
                />
              </div>
            </div>
          </Card>
        </div>

      </div>

    </div>
  )
}
