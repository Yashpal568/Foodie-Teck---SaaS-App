import React from 'react'
import { Receipt, Percent, Save, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function TaxSettings({ gstData, setGstData, isSaving, handleSave }) {
  return (
    <Card className="border border-slate-200/60 shadow-sm rounded-3xl bg-white overflow-hidden">
      <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">GST & Tax Configuration</CardTitle>
            <CardDescription className="text-sm text-slate-500 font-medium">Define tax percentage automatically added to customer orders.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", gstData.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500")}>
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{gstData.enabled ? 'GST Enabled' : 'GST Disabled'}</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Toggle to {gstData.enabled ? 'disable' : 'enable'} tax on customer bills.</p>
            </div>
          </div>
          <Switch
            checked={gstData.enabled}
            onCheckedChange={(val) => setGstData(p => ({...p, enabled: val}))}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>

        <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-6 transition-all", !gstData.enabled && "opacity-40 pointer-events-none")}>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">GST Rate (%)</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="28"
                step="0.5"
                placeholder="5"
                value={gstData.rate}
                onChange={(e) => setGstData(p => ({...p, rate: e.target.value}))}
                className="h-12 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors font-bold text-lg text-slate-900 pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
            </div>

            <div className="flex gap-2 pt-1">
              {['5', '12', '18', '28'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setGstData(p => ({...p, rate: r}))}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                    gstData.rate === r ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bill Tax Label</Label>
            <Input
              type="text"
              placeholder="e.g. GST, SGST+CGST"
              value={gstData.label}
              onChange={(e) => setGstData(p => ({...p, label: e.target.value}))}
              className="h-12 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors font-semibold text-slate-900 px-4"
            />
            <p className="text-xs text-slate-400 font-medium">This text is shown on the customer's digital bill.</p>
          </div>
        </div>

        {gstData.enabled && Number(gstData.rate) > 0 && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
            <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-2">Live Customer Order Preview</p>
            <div className="flex justify-between text-xs text-slate-600 font-semibold">
              <span>Subtotal (Items)</span>
              <span>₹500.00</span>
            </div>
            <div className="flex justify-between text-xs text-emerald-700 font-bold">
              <span>{gstData.label || 'GST'} ({gstData.rate}%)</span>
              <span>₹{(500 * Number(gstData.rate) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-emerald-200">
              <span>Total Payable</span>
              <span>₹{(500 + 500 * Number(gstData.rate) / 100).toFixed(2)}</span>
            </div>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save Tax Settings
        </Button>
      </CardContent>
    </Card>
  )
}
