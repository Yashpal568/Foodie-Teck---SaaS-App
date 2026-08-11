import React from 'react'
import { Crown, ArrowRight, Plus, Smartphone, Landmark, CreditCard, Trash2, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
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
    <div className="space-y-6">
      <Card className="border-0 shadow-lg overflow-hidden text-white rounded-2xl">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 relative">
          <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
            <Crown className="w-48 h-48 text-white mix-blend-overlay" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <Badge className="bg-white/20 text-white border border-white/30 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md backdrop-blur-md shadow-sm hover:bg-white/30">
                Active Subscription
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
                {billingData.plan} Plan
              </h2>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-white tracking-tight drop-shadow-sm">₹{billingData.price}</span>
                <span className="text-xs text-white/80 font-bold uppercase tracking-wider">/month</span>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowUpgradeModal(true)}
              className="bg-white text-indigo-600 hover:bg-slate-50 font-bold rounded-xl px-6 h-12 shadow-xl hover:scale-105 transition-all"
            >
              <Crown className="w-4 h-4 mr-2 text-indigo-500" />
              Upgrade Plan
              <ArrowRight className="w-4 h-4 ml-2 text-indigo-500/70" />
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-border shadow-sm overflow-hidden bg-card text-card-foreground">
        <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between py-5 bg-muted/20">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Payout & Billing Methods</CardTitle>
            <CardDescription>Manage bank accounts for payouts and corporate cards for billing.</CardDescription>
          </div>
          <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Method
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-xl p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Add Payment Method</DialogTitle>
                <DialogDescription>Save a new payment method for subscription billing.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCard} className="space-y-4 mt-4">
                {addCardError && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md font-medium border border-destructive/20">{addCardError}</div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Method Type</Label>
                  <select
                    value={newPaymentMethod.type}
                    onChange={(e) => setNewPaymentMethod({...newPaymentMethod, type: e.target.value})}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="UPI">UPI</option>
                    <option value="ACCOUNT_TRANSFER">Account Transfer</option>
                  </select>
                </div>
                
                {(newPaymentMethod.type === 'CREDIT_CARD' || newPaymentMethod.type === 'DEBIT_CARD') && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Cardholder Name</Label>
                      <Input 
                        placeholder="JOHN DOE"
                        value={newPaymentMethod.name}
                        onChange={(e) => setNewPaymentMethod({...newPaymentMethod, name: e.target.value.toUpperCase()})}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Card Number</Label>
                      <Input 
                        placeholder="4000 0000 0000 0000"
                        maxLength={16}
                        value={newPaymentMethod.number}
                        onChange={(e) => setNewPaymentMethod({...newPaymentMethod, number: e.target.value.replace(/\D/g, '')})}
                        className="h-9 tracking-widest"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Expiry (MM/YY)</Label>
                        <Input 
                          placeholder="12/28"
                          maxLength={5}
                          value={newPaymentMethod.expiry}
                          onChange={(e) => setNewPaymentMethod({...newPaymentMethod, expiry: e.target.value})}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">CVV</Label>
                        <Input 
                          placeholder="123"
                          maxLength={3}
                          value={newPaymentMethod.cvv}
                          onChange={(e) => setNewPaymentMethod({...newPaymentMethod, cvv: e.target.value.replace(/\D/g, '')})}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </>
                )}

                {newPaymentMethod.type === 'UPI' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">UPI Handle</Label>
                    <Input 
                      placeholder="username@upi"
                      value={newPaymentMethod.upiId}
                      onChange={(e) => setNewPaymentMethod({...newPaymentMethod, upiId: e.target.value})}
                      className="h-9"
                    />
                  </div>
                )}

                {newPaymentMethod.type === 'ACCOUNT_TRANSFER' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Account Number</Label>
                      <Input 
                        placeholder="1234567890"
                        value={newPaymentMethod.accountNumber}
                        onChange={(e) => setNewPaymentMethod({...newPaymentMethod, accountNumber: e.target.value.replace(/\D/g, '')})}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">IFSC Code</Label>
                      <Input 
                        placeholder="SBIN0001234"
                        value={newPaymentMethod.ifsc}
                        onChange={(e) => setNewPaymentMethod({...newPaymentMethod, ifsc: e.target.value.toUpperCase()})}
                        className="h-9"
                      />
                    </div>
                  </>
                )}

                <Button type="submit" disabled={isSaving} className="w-full h-9 mt-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Method'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Payout Accounts (Receiving Earnings)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {billingData.paymentMethods?.filter(m => m.type === 'UPI' || m.type === 'ACCOUNT_TRANSFER').length > 0 ? (
                billingData.paymentMethods.filter(m => m.type === 'UPI' || m.type === 'ACCOUNT_TRANSFER').map(method => (
                  <div key={method.id} className="p-4 bg-background rounded-lg border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-muted rounded border border-border flex items-center justify-center">
                        {method.type === 'UPI' && <Smartphone className="w-5 h-5 text-muted-foreground" />}
                        {method.type === 'ACCOUNT_TRANSFER' && <Landmark className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {method.type === 'UPI' ? method.details.upiId : `Acct ending in ${method.details.accountNumber?.slice(-4)}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {method.type === 'UPI' ? 'Verified UPI' : `IFSC: ${method.details.ifsc}`}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveCard(method.id)} 
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-4 text-center bg-muted/20 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">No payout accounts configured.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Billing Methods (Paying Subscriptions)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {billingData.paymentMethods?.filter(m => m.type === 'CREDIT_CARD' || m.type === 'DEBIT_CARD').length > 0 ? (
                billingData.paymentMethods.filter(m => m.type === 'CREDIT_CARD' || m.type === 'DEBIT_CARD').map(method => (
                  <div key={method.id} className="p-4 bg-background rounded-lg border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-muted rounded border border-border flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {method.type.replace('_', ' ')} ending in {method.details.last4}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Expires {method.details.expiry}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveCard(method.id)} 
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-4 text-center bg-muted/20 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">No billing cards saved.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
