import { useState } from 'react'
import { MoreHorizontal, Search, Settings2, ShieldOff, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const mockMerchants = [
  { id: 'MER-4821', name: 'Global Dine Hub', owner: 'marcus@globaldine.com', plan: 'Enterprise', tables: 142, status: 'Active', joined: 'Oct 2025' },
  { id: 'MER-9102', name: 'Café Alpha', owner: 'sarah.alpha@gmail.com', plan: 'Starter', tables: 8, status: 'Active', joined: 'Jan 2026' },
  { id: 'MER-3829', name: 'Velvet Lounge', owner: 'ops@velvetlounge.co', plan: 'Professional', tables: 28, status: 'Active', joined: 'Nov 2025' },
  { id: 'MER-5510', name: 'Burger Garage', owner: 'dan@burgergarage.net', plan: 'Starter', tables: 12, status: 'Suspended', joined: 'Feb 2026' },
  { id: 'MER-2281', name: 'Oceana Seafood', owner: 'kitchen@oceana.com', plan: 'Professional', tables: 34, status: 'Active', joined: 'Dec 2025' },
  { id: 'MER-7734', name: 'The Local Roastery', owner: 'hello@localroast.co', plan: 'Starter', tables: 6, status: 'Active', joined: 'Mar 2026' },
]

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('')

  const filtered = mockMerchants.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.owner.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Merchant Control</h1>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Global Restaurant Directory</p>
        </div>
        <div className="flex gap-4">
           <Button variant="outline" className="gap-2 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 bg-white border-slate-200">
              <Settings2 className="w-4 h-4" /> Filter Records
           </Button>
           <Button className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest px-6 shadow-xl active:scale-95 transition-all">
              Provision New Merchant
           </Button>
        </div>
      </div>

      <div className="bg-white border text-center flex items-center gap-3 px-5 py-3 border-slate-200 rounded-2xl w-full max-w-md shadow-inner focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
         <Search className="w-5 h-5 text-slate-400 shrink-0" />
         <input 
            type="text" 
            placeholder="Search by ID, Restaurant Name, or Owner Email..."
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
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Plan Status</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden md:table-cell">Table Count</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden sm:table-cell">Deployment</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                       <td className="px-8 py-6">
                          <div className="space-y-1">
                             <div className="flex items-center gap-3">
                                <p className="text-sm font-black text-slate-900 tracking-tight">{m.name}</p>
                                {m.status === 'Active' ? (
                                   <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100/50">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Online</span>
                                   </div>
                                ) : (
                                   <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100/50">
                                      <ShieldOff className="w-2.5 h-2.5 text-red-500" />
                                      <span className="text-[9px] font-black uppercase tracking-widest text-red-700">Suspended</span>
                                   </div>
                                )}
                             </div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{m.id} &bull; {m.owner}</p>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <Badge variant="outline" className={`
                             text-xs font-black uppercase tracking-widest px-3 py-1 rounded-xl shadow-sm
                             ${m.plan === 'Enterprise' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : ''}
                             ${m.plan === 'Professional' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                             ${m.plan === 'Starter' ? 'bg-slate-50 text-slate-700 border-slate-200' : ''}
                          `}>
                             {m.plan}
                          </Badge>
                       </td>
                       <td className="px-8 py-6 hidden md:table-cell">
                          <p className="text-xl font-black text-slate-700 tracking-tight leading-none">{m.tables}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Generated QR Nodes</p>
                       </td>
                       <td className="px-8 py-6 hidden sm:table-cell">
                          <p className="text-sm font-bold text-slate-600 tracking-tight leading-none">{m.joined}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Initial Validation</p>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-slate-200">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem className="h-10 rounded-xl font-bold cursor-pointer text-slate-700 focus:bg-slate-100">
                                Morph Subscription Plan
                              </DropdownMenuItem>
                              <DropdownMenuItem className="h-10 rounded-xl font-bold cursor-pointer text-slate-700 focus:bg-slate-100">
                                View Full Telemetry
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem className={`h-10 rounded-xl font-bold cursor-pointer flex gap-3 ${m.status === 'Active' ? 'text-red-600 focus:bg-red-50 focus:text-red-700' : 'text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700'}`}>
                                {m.status === 'Active' ? <ShieldOff className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                {m.status === 'Active' ? 'Suspend Merchant Core' : 'Restore Connection'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                       </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-slate-500 font-bold opacity-50">
                         No cluster records matching query.
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  )
}
