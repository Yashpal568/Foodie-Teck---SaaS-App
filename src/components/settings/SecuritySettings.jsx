import React from 'react'
import { 
  Lock, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Save, 
  Loader2, 
  KeyRound, 
  Smartphone, 
  ShieldAlert,
  Fingerprint,
  Sparkles
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function SecuritySettings({ 
  securityData, 
  setSecurityData, 
  isSaving, 
  showPassword, 
  setShowPassword, 
  handlePasswordUpdate 
}) {
  const getPasswordStrength = (pass) => {
    if (!pass) return 0
    let score = 0
    if (pass.length >= 8) score += 25
    if (/[A-Z]/.test(pass)) score += 25
    if (/[0-9]/.test(pass)) score += 25
    if (/[^A-Za-z0-9]/.test(pass)) score += 25
    return score
  }

  const strength = getPasswordStrength(securityData.newPassword)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in-50 duration-500">
      {/* 🔒 1. PASSWORD SECURITY & ROTATION CARD */}
      <Card className="border border-slate-200/80 shadow-md rounded-[2rem] bg-white flex flex-col overflow-hidden">
        <CardHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-slate-900 tracking-tight">Master Password Security</CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium mt-0.5">
                Rotate your restaurant console login credentials.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-5 flex-1">
          {/* Current Password */}
          <div className="space-y-2">
            <Label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Current Password</Label>
            <Input 
              type="password" 
              placeholder="••••••••••••" 
              value={securityData.currentPassword}
              onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
              className="h-12 rounded-xl border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 font-bold text-slate-900 shadow-xs transition-all" 
            />
          </div>
          
          {/* New Password */}
          <div className="space-y-2">
            <Label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">New Password</Label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                autoComplete="new-password"
                placeholder="Min. 8 characters with numbers & symbols" 
                value={securityData.newPassword}
                onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                className="h-12 rounded-xl border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 font-bold text-slate-900 pr-12 shadow-xs transition-all" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {securityData.newPassword && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                  <span className="text-slate-500">Password Strength</span>
                  <span className={strength >= 75 ? "text-emerald-600" : strength >= 50 ? "text-amber-600" : "text-rose-600"}>
                    {strength >= 100 ? "Very Strong" : strength >= 75 ? "Strong" : strength >= 50 ? "Moderate" : "Weak"}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength >= 25 ? (strength >= 75 ? "bg-emerald-500" : strength >= 50 ? "bg-amber-500" : "bg-rose-500") : "bg-transparent"}`} style={{ width: '25%' }} />
                  <div className={`h-full rounded-full transition-all duration-300 ${strength >= 50 ? (strength >= 75 ? "bg-emerald-500" : "bg-amber-500") : "bg-transparent"}`} style={{ width: '25%' }} />
                  <div className={`h-full rounded-full transition-all duration-300 ${strength >= 75 ? "bg-emerald-500" : "bg-transparent"}`} style={{ width: '25%' }} />
                  <div className={`h-full rounded-full transition-all duration-300 ${strength >= 100 ? "bg-emerald-500" : "bg-transparent"}`} style={{ width: '25%' }} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Confirm New Password</Label>
            <Input 
              type="password" 
              autoComplete="new-password"
              placeholder="Re-enter new password" 
              value={securityData.confirmPassword}
              onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
              className="h-12 rounded-xl border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 font-bold text-slate-900 shadow-xs transition-all" 
            />
          </div>
        </CardContent>

        <CardFooter className="px-6 sm:px-8 pb-6 pt-0">
          <Button 
            onClick={handlePasswordUpdate}
            disabled={isSaving || !securityData.newPassword || !securityData.confirmPassword}
            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-98 transition-all cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2 text-amber-400" />}
            {isSaving ? 'Synchronizing Password...' : 'Save & Deploy Password'}
          </Button>
        </CardFooter>
      </Card>

      {/* 🛡️ 2. TWO-FACTOR & ACCESS PROTECTION CARD */}
      <Card className="border border-slate-200/80 shadow-md rounded-[2rem] bg-white overflow-hidden flex flex-col">
        <CardHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-slate-900 tracking-tight">Active Cloud Protection</CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium mt-0.5">
                Hardware token & biometric authentication layers.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-6 flex-1">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                Two-Factor Login Verification
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Prompt confirmation push alerts when signing into new terminals.
              </p>
            </div>
            <Switch 
              checked={securityData.mfaEnabled} 
              onCheckedChange={(val) => setSecurityData({...securityData, mfaEnabled: val})}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h5 className="text-xs font-black text-emerald-950 uppercase tracking-wider">End-to-End SSL Session Active</h5>
              <p className="text-xs text-emerald-800/80 font-medium">All restaurant menu transactions are encrypted via 256-bit AES cryptographic protocols.</p>
            </div>
          </div>

          <div className="p-5 bg-slate-50/80 border border-slate-200/70 rounded-2xl space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Security Best Practices</p>
            <ul className="text-xs text-slate-600 font-medium space-y-1.5 list-disc list-inside">
              <li>Use a unique password not shared with personal email accounts.</li>
              <li>Always revoke access when rotating shift managers or cashier staff.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
