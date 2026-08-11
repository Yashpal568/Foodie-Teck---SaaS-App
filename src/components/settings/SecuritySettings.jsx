import React from 'react'
import { Lock, ShieldCheck, Eye, EyeOff, CheckCircle2, Save, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function SecuritySettings({ securityData, setSecurityData, isSaving, showPassword, setShowPassword, handlePasswordUpdate }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border border-slate-200/60 shadow-sm rounded-3xl bg-white flex flex-col overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Password Security</CardTitle>
              <CardDescription className="text-sm text-slate-500 font-medium">Change your account login password.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5 flex-1">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Current Password</Label>
            <Input 
              type="password" 
              placeholder="Enter current password" 
              value={securityData.currentPassword}
              onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
              className="h-11 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors font-semibold text-slate-900" 
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">New Password</Label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                autoComplete="new-password"
                placeholder="Min. 8 characters" 
                value={securityData.newPassword}
                onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                className="h-11 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors font-semibold text-slate-900 pr-10" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Confirm Password</Label>
            <Input 
              type="password" 
              autoComplete="new-password"
              placeholder="Confirm new password" 
              value={securityData.confirmPassword}
              onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
              className="h-11 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors font-semibold text-slate-900" 
            />
          </div>
        </CardContent>
        <CardFooter className="px-6 pb-6 pt-0">
          <Button 
            onClick={handlePasswordUpdate}
            disabled={isSaving || !securityData.newPassword || !securityData.confirmPassword}
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {isSaving ? 'Updating...' : 'Update Password'}
          </Button>
        </CardFooter>
      </Card>

      <Card className="border border-slate-200/60 shadow-sm rounded-3xl bg-white overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Account Protection</CardTitle>
              <CardDescription className="text-sm text-slate-500 font-medium">Session verification & two-step alerts.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Two-Factor Push Security</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Require device authorization on new logins.</p>
            </div>
            <Switch 
              checked={securityData.mfaEnabled} 
              onCheckedChange={(val) => setSecurityData({...securityData, mfaEnabled: val})}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200/60 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-emerald-800">Your account authentication session is encrypted and active.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
