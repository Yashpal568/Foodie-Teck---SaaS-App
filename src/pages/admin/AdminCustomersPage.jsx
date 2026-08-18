import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MoreHorizontal, 
  Search, 
  Settings2, 
  ShieldOff, 
  CheckCircle2, 
  Calendar, 
  AlertTriangle,
  Store,
  Users,
  TrendingUp,
  Plus,
  RefreshCw,
  QrCode,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { logAdminAction } from '@/lib/audit'
import { supabase, ensureAdminSession } from '@/lib/adminSupabase'
import { getAdminPlatformData } from '@/lib/adminDataService'
import { toast } from 'sonner'

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('All')
  
  const [newBizName, setNewBizName] = useState('')
  const [newBizEmail, setNewBizEmail] = useState('')
  const [newBizPass, setNewBizPass] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [realMapped, setRealMapped] = useState([])
  const [loading, setLoading] = useState(true)

  const loadCustomers = async () => {
    try {
      setLoading(true)
      await ensureAdminSession()
      const platformData = await getAdminPlatformData()
      const restaurants = platformData.restaurants || []
      const subscriptions = platformData.subscriptions || []

      // Fetch QR Codes summary
      let qrCodes = []
      try {
        const { data } = await supabase.from('qr_codes').select('restaurant_id')
        if (data) qrCodes = data
      } catch (e) {}

      const mapped = restaurants.map((r) => {
         const plan = subscriptions.find(s => s.restaurant_id === r.id || s.restaurant_id === r.email)
         const rawTier = plan?.plan_name || 'Starter'
         const tierUpper = rawTier.toUpperCase()
         const displayPlan = tierUpper.includes('ENTERPRISE') || tierUpper.includes('PREMIUM') 
           ? 'Enterprise' 
           : tierUpper.includes('PRO') 
             ? 'Professional' 
             : 'Starter'
         
         const planPrice = plan?.price 
           ? Number(plan.price).toLocaleString('en-IN') 
           : (displayPlan === 'Enterprise' ? '4,999' : displayPlan === 'Professional' ? '2,499' : '999')

         const daysRemaining = plan && plan.end_date ? Math.ceil((new Date(plan.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 30
         const qrs = qrCodes.filter(q => q.restaurant_id === r.id).length

         return {
            id: r.id,
            email: r.email || 'N/A',
            name: r.business_name || r.name || 'Servora Merchant',
            owner: r.email || 'N/A',
            plan: displayPlan,
            amount: planPrice,
            tables: qrs || 10,
            daysRemaining: daysRemaining > 0 ? daysRemaining : 30,
            status: r.status || 'Active',
            joined: new Date(r.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
         }
      })
      setRealMapped(mapped.reverse())
    } catch (err) {
      console.error('Failed to load customers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()

    const channel = supabase
      .channel('public:admin_customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => loadCustomers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => loadCustomers())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleDeployMerchant = async () => {
     if (!newBizName || !newBizEmail || !newBizPass) {
       toast.error('Please fill in all fields')
       return
     }
     try {
       // 1. Create Auth Account
       const { data: authRes, error: authErr } = await supabase.auth.signUp({
         email: newBizEmail.toLowerCase().trim(),
         password: newBizPass
       })

       if (authErr) throw authErr

       // 2. Insert Restaurant Record
       const { data: rest, error: restErr } = await supabase
         .from('restaurants')
         .insert({
           owner_id: authRes.user?.id || null,
           business_name: newBizName.trim(),
           email: newBizEmail.toLowerCase().trim(),
           status: 'Active'
         })
         .select()
         .single()

       if (restErr) throw restErr

       // 3. Create Subscription
       const expiresAt = new Date()
       expiresAt.setDate(expiresAt.getDate() + 30)
       await supabase.from('subscriptions').insert({
          restaurant_id: rest.id,
          plan_name: 'BASIC',
          price: 999,
          status: 'ACTIVE',
          start_date: new Date().toISOString(),
          end_date: expiresAt.toISOString()
       })

       await logAdminAction(`Provisioned Merchant: ${newBizName}`, newBizEmail, 'NOMINAL')
       toast.success('Merchant Onboarded Successfully', { description: `${newBizName} is now active.` })
       await loadCustomers()
     } catch (err) {
       console.error('Merchant Deployment Error:', err)
       toast.error('Onboarding Note:', { description: err.message })
     } finally {
       setDialogOpen(false)
       setNewBizName('')
       setNewBizEmail('')
       setNewBizPass('')
     }
  }

  const toggleMerchantStatus = async (email, id, currentStatus) => {
    let newStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended'
    
    await supabase.from('restaurants').update({ status: newStatus }).eq('id', id)
    setRealMapped(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m))
    await logAdminAction(`Merchant Status: ${newStatus}`, email, newStatus === 'Suspended' ? 'WARNING' : 'NOMINAL')
    toast.success(newStatus === 'Active' ? 'Merchant Activated' : 'Merchant Suspended')
  }

  const morphMerchantPlan = async (email, id, newPlan) => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data: existingSub } = await supabase.from('subscriptions').select('id').eq('restaurant_id', id)
    if (existingSub && existingSub.length > 0) {
      await supabase.from('subscriptions').update({
        plan_name: newPlan,
        status: 'Active',
        price: newPlan === 'Enterprise' || newPlan === 'PREMIUM' ? 4999 : newPlan === 'Professional' || newPlan === 'PRO' ? 2499 : 999,
        start_date: new Date().toISOString(),
        end_date: expiresAt.toISOString()
      }).eq('restaurant_id', id)
    } else {
      await supabase.from('subscriptions').insert({
        restaurant_id: id,
        plan_name: newPlan,
        status: 'Active',
        price: newPlan === 'Enterprise' || newPlan === 'PREMIUM' ? 4999 : newPlan === 'Professional' || newPlan === 'PRO' ? 2499 : 999,
        start_date: new Date().toISOString(),
        end_date: expiresAt.toISOString()
      })
    }
    
    await logAdminAction(`Subscription Changed: ${newPlan}`, email, 'SECURITY')
    toast.success(`Plan updated to ${newPlan}`)
    await loadCustomers()
  }

  const searchMapped = realMapped.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.id?.toLowerCase().includes(search.toLowerCase())
  )

  const filtered = searchMapped.filter(m => planFilter === 'All' || m.plan === planFilter)

  const activeCount = realMapped.filter(m => m.status === 'Active').length
  const totalTables = realMapped.reduce((sum, m) => sum + (m.tables || 0), 0)
  const expiringSoon = realMapped.filter(m => m.daysRemaining <= 7).length

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans select-none">
      
      {/* ─── ⚡ CLEAN ENTERPRISE PAGE HEADER ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Merchants & Users
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Directory Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Manage registered restaurant accounts, active subscriptions, dining table quotas, and account status.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button 
            onClick={loadCustomers}
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm"
                className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Provision Merchant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl p-6 border-slate-200 bg-white font-sans space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900">Provision New Merchant</DialogTitle>
                <p className="text-xs text-slate-500">Create a registered restaurant profile and initial subscription.</p>
              </DialogHeader>
              
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Business / Restaurant Name</label>
                  <Input 
                    placeholder="e.g. Olive Bistro"
                    value={newBizName}
                    onChange={e => setNewBizName(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Owner Email</label>
                  <Input 
                    type="email"
                    placeholder="owner@restaurant.com"
                    value={newBizEmail}
                    onChange={e => setNewBizEmail(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Initial Password</label>
                  <Input 
                    type="password"
                    placeholder="••••••••"
                    value={newBizPass}
                    onChange={e => setNewBizPass(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 flex items-center gap-2">
                <Button 
                  onClick={() => setDialogOpen(false)}
                  variant="outline"
                  size="sm"
                  className="w-1/2 h-9 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeployMerchant}
                  size="sm"
                  className="w-1/2 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Deploy Merchant
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─── 📊 REFINED SHADCN KPI METRIC CARDS ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Total Merchants */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Merchants</span>
              <Store className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {realMapped.length}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{activeCount} Active &bull; {realMapped.length - activeCount} Suspended</span>
            </p>
          </div>
        </Card>

        {/* Metric 2: QR & Table Capacity */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">QR Table Quota</span>
              <QrCode className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {totalTables}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Configured dining tables
            </p>
          </div>
        </Card>

        {/* Metric 3: Expiring Soon */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Renewal Attention</span>
              <Calendar className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {expiringSoon}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Expiring in &le; 7 days
            </p>
          </div>
        </Card>

        {/* Metric 4: Platform Health */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Account Health</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              100%
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Verified merchant security
            </p>
          </div>
        </Card>
      </div>

      {/* ─── 🔍 CONTROL TOOLBAR ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1">
          {['All', 'Starter', 'Professional', 'Enterprise'].map(plan => {
            const count = plan === 'All' ? realMapped.length : realMapped.filter(m => m.plan === plan).length
            return (
              <button
                key={plan}
                onClick={() => setPlanFilter(plan)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  planFilter === plan
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{plan === 'All' ? 'All Plans' : `${plan}`}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                  planFilter === plan 
                    ? 'bg-slate-700 text-white' 
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72 px-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <Input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search merchant, email, ID..."
            className="h-9 pl-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ─── 📋 MERCHANTS DATA TABLE ───────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Restaurant / Merchant</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Tables</th>
                <th className="py-3.5 px-5">Subscription Plan</th>
                <th className="py-3.5 px-5">Billing Cycle</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filtered.map((m) => (
                  <motion.tr 
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Merchant Details */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {m.name?.substring(0, 2).toUpperCase() || 'RS'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate">{m.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{m.owner}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      {m.status === 'Active' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit">
                          <ShieldOff className="w-3 h-3 text-rose-500" />
                          Suspended
                        </Badge>
                      )}
                    </td>

                    {/* Tables */}
                    <td className="py-4 px-5">
                      <span className="font-bold text-slate-800 text-xs">{m.tables} tables</span>
                    </td>

                    {/* Plan */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          m.plan === 'Enterprise' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : m.plan === 'Professional' 
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {m.plan}
                        </Badge>
                        <span className="text-xs font-bold text-slate-900">₹{m.amount}</span>
                      </div>
                    </td>

                    {/* Billing Cycle */}
                    <td className="py-4 px-5">
                      <div className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 w-fit border ${
                        m.daysRemaining <= 7 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.daysRemaining} days left</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 cursor-pointer">
                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-lg border-slate-200 text-xs font-sans">
                          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                            Modify Plan
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => morphMerchantPlan(m.owner, m.id, 'Starter')} className="cursor-pointer rounded-lg font-medium">
                            Switch to Starter (₹999)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => morphMerchantPlan(m.owner, m.id, 'Professional')} className="cursor-pointer rounded-lg font-medium">
                            Switch to Professional (₹2,499)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => morphMerchantPlan(m.owner, m.id, 'Enterprise')} className="cursor-pointer rounded-lg font-medium">
                            Switch to Enterprise (₹4,999)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-slate-100" />
                          <DropdownMenuItem 
                            onClick={() => toggleMerchantStatus(m.owner, m.id, m.status)}
                            className={`cursor-pointer rounded-lg font-semibold ${
                              m.status === 'Active' ? 'text-rose-600 focus:text-rose-700 focus:bg-rose-50' : 'text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700'
                            }`}
                          >
                            {m.status === 'Active' ? 'Suspend Merchant' : 'Restore Merchant'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Merchants Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No registered merchants match your search or filter.
            </p>
          </div>
        )}
      </Card>

    </div>
  )
}
