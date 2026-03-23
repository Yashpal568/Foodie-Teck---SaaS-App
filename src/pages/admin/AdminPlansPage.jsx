import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Settings2, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const mockPlans = [
  { id: 'PLN-1', name: 'Starter', price: '₹1,499', billing: 'Monthly', subscribers: 124, status: 'Active', mrr: '₹1,85,876', color: 'slate' },
  { id: 'PLN-2', name: 'Professional', price: '₹2,999', billing: 'Monthly', subscribers: 86, status: 'Active', mrr: '₹2,57,914', color: 'blue' },
  { id: 'PLN-3', name: 'Enterprise', price: '₹4,999', billing: 'Monthly', subscribers: 38, status: 'Active', mrr: '₹1,89,962', color: 'indigo' },
  { id: 'PLN-4', name: 'Legacy Launch', price: '₹999', billing: 'Monthly', subscribers: 12, status: 'Deprecated', mrr: '₹11,988', color: 'red' },
]

export default function AdminPlansPage() {
  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Subscription Topography</h1>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Platform Tier Control</p>
        </div>
        <Button className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest px-6 shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2">
           <Plus className="w-4 h-4" /> Provision New Tier
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {mockPlans.map((p, idx) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            className={`p-8 rounded-[2.5rem] bg-white border border-${p.color}-100 shadow-xl shadow-${p.color}-900/5 relative overflow-hidden group`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${p.color}-50 rounded-full blur-3xl pointer-events-none group-hover:bg-${p.color}-100 transition-colors duration-700`} />
            
            <div className="relative z-10 space-y-8">
               <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                     <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-xl font-black uppercase tracking-[0.2em] text-${p.color}-600`}>{p.name}</h3>
                        <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                           {p.status}
                        </Badge>
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node ID: {p.id}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-3xl font-black text-slate-950 tracking-tighter leading-none">{p.price}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.billing}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Active Clusters</p>
                     <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{p.subscribers}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">MRR Impact</p>
                     <p className={`text-xl font-black text-${p.color}-600 tracking-tighter leading-none`}>{p.mrr}</p>
                  </div>
               </div>

               <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest bg-white hover:bg-slate-50 transition-colors">
                     <Edit3 className="w-4 h-4 mr-2" /> Modify Specs
                  </Button>
                  <Button variant="ghost" className="h-12 w-12 p-0 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors shrink-0">
                     <Trash2 className="w-5 h-5" />
                  </Button>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
