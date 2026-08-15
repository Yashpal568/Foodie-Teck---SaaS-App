import React from 'react'
import { 
  Crown, 
  ArrowRight, 
  Plus, 
  Smartphone, 
  Landmark, 
  CreditCard, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Receipt,
  Calendar,
  Building,
  HelpCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export default function BillingSettings({ 
  billingData, 
  setShowUpgradeModal,
  isAddCardOpen,
  setIsAddCardOpen,
  newPaymentMethod,
  setNewPaymentMethod,
  addCardError,
  handleAddCard,
  handleRemoveCard,
  isSaving
}) {
  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* 👑 1. HOLOGRAPHIC SUBSCRIPTION TIER BANNER 👑 */}
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white p-8 sm:p-10 border border-indigo-800/40">
        {/* Ambient Glow mesh */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Decorative Crown */}
        <div className="absolute top-4 right-6 opacity-10 pointer-events-none">
          <Crown className="w-64 h-64 text-amber-300" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
                <Sparkles className="w-3 h-3 mr-1 text-amber-400" />
                Active Subscription Plan
              </Badge>
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Auto-Renew Enabled
              </span>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                {billingData.plan} Cloud Tier
              </h2>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black text-amber-400 tracking-tight">₹{billingData.price}</span>
                <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider">/ monthly billing cycle</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Enjoy unlimited contactless QR ordering, real-time kitchen display, automated GST billing, and priority customer support.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Unlimited Menu Items</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Live Kitchen Display</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Real-time Analytics</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 shrink-0">
            <Button 
              onClick={() => setShowUpgradeModal(true)}
              className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl px-8 h-14 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span>Upgrade Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <span className="text-[10px] text-center text-indigo-300 font-medium">Instant activation • Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* 💳 2. SAVED PAYMENT & PAYOUT METHODS 💳 */}
      <Card className="border border-slate-200/80 shadow-md rounded-[2rem] bg-white overflow-hidden">
        <CardHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Payment & Payout Accounts
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Manage corporate cards for cloud subscriptions and bank accounts for customer payout settlements.
            </CardDescription>
          </div>

          <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer">
                <Plus className="w-4 h-4 mr-1.5 text-amber-400" /> Add Payment Method
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">Add Payment Method</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">Link a corporate credit card, UPI ID, or bank account.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCard} className="space-y-4 mt-4">
                {addCardError && (
                  <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl font-bold border border-rose-200">{addCardError}</div>
                )}
                
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase text-slate-700">Method Type</Label>
                  <select
                    value={newPaymentMethod.type}
                    onChange={(e) => setNewPaymentMethod({...newPaymentMethod, type: e.target.value})}
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-bold text-slate-900 shadow-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="CREDIT_CARD">Credit Card (Visa / Mastercard / RuPay)</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="ACCOUNT_TRANSFER">Direct Bank Account Transfer</option>
                  </select>
                </div>
                
                {(newPaymentMethod.type === 'CREDIT_CARD' || newPaymentMethod.type === 'DEBIT_CARD') && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-slate-700">Cardholder Name</Label>
                      <Input 
                        placeholder="e.g. AMIT SHARMA"
                        value={newPaymentMethod.name}
                        onChange={(e) => setNewPaymentMethod({...newPaymentMethod, name: e.target.value.toUpperCase()})}
                        className="h-11 rounded-xl font-bold text-xs uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-slate-700">Card Number</Label>
                      <Input 
                        placeholder="4532 •••• •••• 8821"
                        maxLength={16}
                        value={newPaymentMethod.number}
                        onChange={(e) => setNewPaymentMethod({...newPaymentMethod, number: e.target.value.replace(/\D/g, '')})}
                        className="h-11 rounded-xl font-bold text-xs tracking-widest"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-black uppercase text-slate-700">Expiry (MM/YY)</Label>
                        <Input 
                          placeholder="12/28"
                          maxLength={5}
                          value={newPaymentMethod.expiry}
                          onChange={(e) => setNewPaymentMethod({...newPaymentMethod, expiry: e.target.value})}
                          className="h-11 rounded-xl font-bold text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-black uppercase text-slate-700">CVV</Label>
                        <Input 
                          placeholder="123"
                          maxLength={3}
                          type="password"
                          value={newPaymentMethod.cvv}
                          onChange={(e) => setNewPaymentMethod({...newPaymentMethod, cvv: e.target.value.replace(/\D/g, '')})}
                          className="h-11 rounded-xl font-bold text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                {newPaymentMethod.type === 'UPI' && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase text-slate-700">UPI Virtual Address</Label>
                    <Input 
                      placeholder="restaurantname@okaxis"
                      value={newPaymentMethod.upiId}
                      onChange={(e) => setNewPaymentMethod({...newPaymentMethod, upiId: e.target.value})}
                      className="h-11 rounded-xl font-bold text-xs"
                    />
                  </div>
                )}

                {newPaymentMethod.type === 'ACCOUNT_TRANSFER' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-slate-700">Bank Account Number</Label>
                      <Input 
                        placeholder="91201002345678"
                        value={newPaymentMethod.accountNumber}
                        onChange={(e) => setNewPaymentMethod({...newPaymentMethod, accountNumber: e.target.value})}
                        className="h-11 rounded-xl font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-slate-700">IFSC Code</Label>
                      <Input 
                        placeholder="UTIB0001234"
                        value={newPaymentMethod.ifsc}
                        onChange={(e) => setNewPaymentMethod({...newPaymentMethod, ifsc: e.target.value.toUpperCase()})}
                        className="h-11 rounded-xl font-bold text-xs uppercase"
                      />
                    </div>
                  </>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsAddCardOpen(false)} className="rounded-xl text-xs font-bold">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md">
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                    Save Method
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-4">
          {billingData.paymentMethods && billingData.paymentMethods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {billingData.paymentMethods.map((method) => (
                <div key={method.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
                      {method.type === 'UPI' ? <Smartphone className="w-5 h-5" /> : method.type === 'ACCOUNT_TRANSFER' ? <Landmark className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        {method.type === 'UPI' ? `UPI: ${method.details?.upiId}` : method.type === 'ACCOUNT_TRANSFER' ? `A/C •••• ${method.details?.accountNumber?.slice(-4)}` : `•••• •••• •••• ${method.details?.last4 || '4242'}`}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {method.type === 'CREDIT_CARD' ? `Exp: ${method.details?.expiry || '12/28'}` : 'Verified Settlement Channel'}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleRemoveCard(method.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="Remove method"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <CreditCard className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-slate-700">No Payment Methods Configured</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Add a primary payment card or UPI ID for seamless automated plan renewals and settlements.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
