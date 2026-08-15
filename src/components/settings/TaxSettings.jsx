import React from 'react'
import { 
  Receipt, 
  Percent, 
  Save, 
  Loader2, 
  Calculator, 
  Sparkles, 
  ShieldCheck, 
  HelpCircle,
  FileText
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function TaxSettings({ gstData, setGstData, isSaving, handleSave }) {
  const sampleSubtotal = 750
  const rateNum = Number(gstData.rate) || 0
  const calculatedTax = (sampleSubtotal * rateNum) / 100
  const grandTotal = sampleSubtotal + calculatedTax

  return (
    <Card className="border border-slate-200/80 shadow-md rounded-[2rem] bg-white overflow-hidden animate-in fade-in-50 duration-500">
      <CardHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl flex items-center justify-center shadow-xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-lg font-black text-slate-900 tracking-tight">GST & Automated Tax Engine</CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Configure goods & services tax automatically applied to customer digital invoices.
            </CardDescription>
          </div>
        </div>

        <Badge className={gstData.enabled ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-black text-xs px-3 py-1" : "bg-slate-100 text-slate-600 border-slate-200 font-bold text-xs px-3 py-1"}>
          {gstData.enabled ? "Tax Engine Active" : "Tax Inactive"}
        </Badge>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-8">
        {/* 1. Main Enable Toggle Card */}
        <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs transition-colors", 
              gstData.enabled ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20" : "bg-slate-200 text-slate-500 border-slate-300"
            )}>
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-base">
                {gstData.enabled ? 'Automatic Tax Calculation Enabled' : 'Tax Calculation Disabled'}
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {gstData.enabled 
                  ? 'All customer orders will automatically calculate itemized GST at checkout.' 
                  : 'Customer orders will only reflect pure food subtotal without taxes.'}
              </p>
            </div>
          </div>

          <Switch
            checked={gstData.enabled}
            onCheckedChange={(val) => setGstData(p => ({...p, enabled: val}))}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>

        {/* 2. Tax Rate & Label Inputs */}
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 transition-all", !gstData.enabled && "opacity-40 pointer-events-none")}>
          {/* Rate Selector */}
          <div className="space-y-3">
            <Label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              Tax Percentage Rate (%)
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="28"
                step="0.5"
                placeholder="5"
                value={gstData.rate}
                onChange={(e) => setGstData(p => ({...p, rate: e.target.value}))}
                className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-emerald-500 font-black text-xl text-slate-900 pr-12 shadow-xs transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">%</span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Presets:</span>
              {['0', '5', '12', '18', '28'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setGstData(p => ({...p, rate: r}))}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95",
                    gstData.rate === r 
                      ? "bg-emerald-600 text-white shadow-emerald-500/20 scale-105" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {r}% {r === '5' ? '(Standard F&B)' : r === '18' ? '(Luxury)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Tax Label */}
          <div className="space-y-3">
            <Label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Invoice Tax Label
            </Label>
            <Input
              type="text"
              placeholder="e.g. GST (CGST + SGST)"
              value={gstData.label}
              onChange={(e) => setGstData(p => ({...p, label: e.target.value}))}
              className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-emerald-500 font-bold text-sm text-slate-900 px-4 shadow-xs transition-all"
            />
            <p className="text-xs text-slate-400 font-medium">
              This tax label appears on customer digital carts and downloadable receipts.
            </p>
          </div>
        </div>

        {/* 3. Live Customer Receipt Simulator */}
        {gstData.enabled && (
          <div className="p-6 bg-gradient-to-br from-emerald-50/60 via-slate-50/80 to-emerald-50/40 border border-emerald-200/80 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Live Customer Digital Receipt Simulator
              </span>
              <Badge className="bg-white text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                Sample Order #1042
              </Badge>
            </div>

            <div className="space-y-2 bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs">
              <div className="flex justify-between text-xs text-slate-600 font-semibold">
                <span>Food & Beverage Subtotal</span>
                <span>₹{sampleSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-700 font-black">
                <span>{gstData.label || 'GST'} ({rateNum}%)</span>
                <span>₹{calculatedTax.toFixed(2)}</span>
              </div>
              <div className="h-px bg-slate-100 my-2" />
              <div className="flex justify-between text-base font-black text-slate-900">
                <span>Total Payable by Diner</span>
                <span className="text-emerald-700">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save & Apply Tax Configuration</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
