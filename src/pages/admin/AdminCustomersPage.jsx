import { useState, useEffect } from 'react'
import { MoreHorizontal, Search, Settings2, ShieldOff, CheckCircle, Calendar, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { supabase } from '@/lib/supabase'

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('All')
  
  const [newBizName, setNewBizName] = useState('')
  const [newBizEmail, setNewBizEmail] = useState('')
  const [newBizPass, setNewBizPass] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [realMapped, setRealMapped] = useState([])

  useEffect(() => {
    async function loadCustomers() {
      // Fetch Restaurants
      const { data: restaurants } = await supabase.from('restaurants').select('*')
      // Fetch Subscriptions
      const { data: subscriptions } = await supabase.from('subscriptions').select('*')
      // Fetch QR Codes summary (if exists, or mock if large)
      const { data: qrCodes } = await supabase.from('qr_codes').select('restaurant_id')

      const mapped = (restaurants || []).map((r, i) => {
         const plan = (subscriptions || []).find(s => s.restaurant_id === r.id)
         const activeTier = plan ? plan.plan_name : 'Starter'
         const daysRemaining = plan && plan.end_date ? Math.ceil((new Date(plan.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 30
         const qrs = (qrCodes || []).filter(q => q.restaurant_id === r.id).length

         return {
            id: r.id,
            email: r.email,
            name: r.business_name,
            owner: r.email,
            plan: activeTier,
            amount: activeTier === 'Enterprise' ? '4,999' : activeTier === 'Professional' ? '2,999' : '1,499',
            tables: qrs,
            daysRemaining: daysRemaining,
            status: r.status || 'Active',
            joined: new Date(r.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
         }
      })
      setRealMapped(mapped.reverse())
    }
    loadCustomers()
  }, [])

  const handleDeployMerchant = () => {
     if (!newBizName || !newBizEmail || !newBizPass) return
     alert('Provisioning new users dynamically from the Admin Panel requires Supabase Auth API logic. Use Supabase dashboard manually.')
     
     // Log Attempt
     logAdminAction(`Manual Provisioning Attempt: ${newBizName}`, newBizEmail, 'NOMINAL')

     setDialogOpen(false)
     setNewBizName('')
     setNewBizEmail('')
     setNewBizPass('')
  }

  const toggleMerchantStatus = async (email, id, currentStatus) => {
    let newStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended'
    
    // Update DB
    await supabase.from('restaurants').update({ status: newStatus }).eq('id', id)

    // Modify local state
    setRealMapped(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m))
    
    // Log Forensic Action
    await logAdminAction(`Merchant Node ${newStatus}`, email, newStatus === 'Suspended' ? 'WARNING' : 'NOMINAL')
  }

  const morphMerchantPlan = async (email, id, newPlan) => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // +30 days

    // Upsert subscription
    await supabase.from('subscriptions').upsert({
       restaurant_id: id,
       plan_name: newPlan,
       status: 'active',
       price: newPlan === 'Enterprise' ? 4999 : newPlan === 'Professional' ? 2999 : 1499,
       start_date: new Date().toISOString(),
       end_date: expiresAt.toISOString(),
       features: []
    }, { onConflict: 'restaurant_id' })
    
    // Log Forensic Action
    await logAdminAction(`Subscription Morph: ${newPlan}`, email, 'SECURITY')

    setRealMapped(prev => prev.map(m => m.id === id ? { 
      ...m, 
      plan: newPlan, 
      amount: newPlan === 'Enterprise' ? '4,999' : newPlan === 'Professional' ? '2,999' : '1,499' 
    } : m))
  }

  const searchMapped = realMapped.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const filtered = searchMapped.filter(m => planFilter === 'All' || m.plan === planFilter)

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Merchant Control</h1>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Global Restaurant Directory</p>
        </div>
        <div className="flex gap-4">
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="outline" className="gap-2 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 bg-white border-slate-200">
                    <Settings2 className="w-4 h-4" /> Filter: {planFilter}
                 </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-xl border-slate-200 mt-2">
                 <DropdownMenuLabel inset className="text-[10px] font-black uppercase tracking-widest text-slate-500">Plan Status</DropdownMenuLabel>
                 <DropdownMenuSeparator className="bg-slate-100" />
                 {['All', 'Starter', 'Professional', 'Enterprise'].map(plan => (
                    <DropdownMenuItem 
                       key={plan} 
                       onClick={() => setPlanFilter(plan)}
                       inset
                       className={`h-10 rounded-xl font-bold cursor-pointer transition-colors ${planFilter === plan ? 'bg-blue-50 text-blue-700' : 'text-slate-700 focus:bg-slate-100'}`}
                    >
                       {plan === 'All' ? 'View All Plans' : `${plan} Plan`}
                    </DropdownMenuItem>
                 ))}
              </DropdownMenuContent>
           </DropdownMenu>

           <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                 <Button className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest px-6 shadow-xl active:scale-95 transition-all">
                    Provision New Merchant
                 </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-slate-200 shadow-2xl">
                 <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-black text-slate-950 tracking-tight">Deploy Node</DialogTitle>
                    <p className="text-xs uppercase font-black tracking-widest text-slate-500 mt-1">Manual Database Provisioning</p>
                 </DialogHeader>
                 
                 <div className="space-y-4 mb-8">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Business Name</label>
                       <input 
                          type="text" 
                          value={newBizName}
                          onChange={e => setNewBizName(e.target.value)}
                          className="w-full h-12 bg-slate-50 rounded-xl px-4 text-sm font-bold text-slate-900 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Owner Email</label>
                       <input 
                          type="email" 
                          value={newBizEmail}
                          onChange={e => setNewBizEmail(e.target.value)}
                          className="w-full h-12 bg-slate-50 rounded-xl px-4 text-sm font-bold text-slate-900 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Temporary Password</label>
                       <input 
                          type="password" 
                          value={newBizPass}
                          onChange={e => setNewBizPass(e.target.value)}
                          className="w-full h-12 bg-slate-50 rounded-xl px-4 text-sm font-bold text-slate-900 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                       />
                    </div>
                 </div>

                 <DialogFooter>
                    <Button onClick={handleDeployMerchant} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/30">
                       Deploy Merchant Instance
                    </Button>
                 </DialogFooter>
              </DialogContent>
           </Dialog>
        </div>
      </div>

      <div className="bg-white border text-center flex items-center gap-3 px-5 py-3 border-slate-200 rounded-2xl w-full max-w-md shadow-inner focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
         <Search className="w-5 h-5 text-slate-400 shrink-0" />
         <input 
            type="text" 
            placeholder="Search Global Customers, Subscriptions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium tracking-tight"
         />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Merchant Node</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Node Status</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Table Count</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden md:table-cell">Subscription</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden lg:table-cell">Cycle status</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                       <td className="px-8 py-6">
                          <div className="space-y-1">
                             <p className="text-sm font-black text-slate-900 tracking-tight">{m.name}</p>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{m.id} &bull; {m.owner}</p>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          {m.status === 'Active' ? (
                             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100/50 w-fit">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Online</span>
                             </div>
                          ) : (
                             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100/50 w-fit">
                                <ShieldOff className="w-2.5 h-2.5 text-red-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-red-700">Suspended</span>
                             </div>
                          )}
                       </td>
                       <td className="px-8 py-6">
                          <p className="text-xl font-black text-slate-700 tracking-tight leading-none">{m.tables}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">QR Nodes</p>
                       </td>
                       <td className="px-8 py-6 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                             <Badge className={`
                                text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl
                                ${m.plan === 'Enterprise' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : ''}
                                ${m.plan === 'Professional' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                ${m.plan === 'Starter' ? 'bg-slate-50 text-slate-700 border-slate-200' : ''}
                             `}>
                                {m.plan}
                             </Badge>
                             <p className="text-sm font-black text-slate-900 tracking-tight">₹{m.amount}</p>
                          </div>
                       </td>
                       <td className="px-8 py-6 hidden lg:table-cell">
                          <div className={`
                             px-4 py-2 rounded-2xl border flex items-center gap-3 w-fit
                             ${m.daysRemaining <= 5 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-blue-50 border-blue-100 text-blue-600'}
                          `}>
                             <Calendar className="w-4 h-4" />
                             <span className="text-xs font-black tracking-tight">{m.daysRemaining} Days Left</span>
                             {m.daysRemaining <= 5 && <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />}
                          </div>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-slate-50 border border-slate-200">
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl">
                               <DropdownMenuLabel inset className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Actions</DropdownMenuLabel>
                               <DropdownMenuSeparator className="bg-slate-100" />
                               <DropdownMenuLabel inset className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">Morph Subscription</DropdownMenuLabel>
                               <DropdownMenuItem onClick={() => morphMerchantPlan(m.owner, m.id, 'Starter')} inset className="font-bold cursor-pointer rounded-xl">Starter Tier</DropdownMenuItem>
                               <DropdownMenuItem onClick={() => morphMerchantPlan(m.owner, m.id, 'Professional')} inset className="font-bold cursor-pointer rounded-xl">Professional Tier</DropdownMenuItem>
                               <DropdownMenuItem onClick={() => morphMerchantPlan(m.owner, m.id, 'Enterprise')} inset className="font-bold cursor-pointer rounded-xl">Enterprise Tier</DropdownMenuItem>
                               <DropdownMenuSeparator className="bg-slate-100" />
                               <DropdownMenuItem 
                                 onClick={() => toggleMerchantStatus(m.owner, m.id, m.status)}
                                 inset className={`font-bold cursor-pointer rounded-xl flex gap-3 ${m.status === 'Active' ? 'text-red-600 focus:text-red-700 focus:bg-red-50' : 'text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700'}`}
                               >
                                 {m.status === 'Active' ? <ShieldOff className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                 {m.status === 'Active' ? 'Suspend Merchant Node' : 'Restore Connection'}
                               </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
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
