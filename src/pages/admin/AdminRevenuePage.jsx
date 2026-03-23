import { motion } from 'framer-motion'
import { DownloadCloud, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const mrrData = [
  { month: 'Oct 2025', val: 24, label: '₹24L' },
  { month: 'Nov 2025', val: 28, label: '₹28L' },
  { month: 'Dec 2025', val: 33, label: '₹33L' },
  { month: 'Jan 2026', val: 38, label: '₹38L' },
  { month: 'Feb 2026', val: 41, label: '₹41L' },
  { month: 'Mar 2026', val: 45, label: '₹45.2L', active: true },
]

export default function AdminRevenuePage() {
  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Financial Telemetry</h1>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Platform Revenue Flow</p>
        </div>
        <Button variant="outline" className="gap-2 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 shadow-sm transition-all">
           <DownloadCloud className="w-4 h-4" /> Export CSV Audit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="hover:shadow-2xl hover:shadow-emerald-200/50 transition-all border-emerald-200 group relative overflow-hidden bg-emerald-50 rounded-[2.5rem] cursor-default md:col-span-2">
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-400/30 transition-colors" />
           <CardContent className="p-10 space-y-8 relative z-10 flex flex-col justify-between h-full">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center shadow-inner">
                     <IndianRupee className="w-6 h-6" />
                  </div>
                  <p className="text-sm uppercase font-black tracking-[0.2em] text-emerald-800 leading-none">Net MRR Yield</p>
               </div>
               <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-white px-3 py-1.5 rounded-xl shadow-sm">
                 <ArrowUpRight className="w-4 h-4" /> +15.8% MoM
               </div>
             </div>
             <div>
                <p className="text-6xl md:text-[6rem] font-black text-emerald-950 tracking-tighter leading-none mb-4">₹45.2L</p>
                <p className="text-sm font-bold text-emerald-700 uppercase tracking-widest max-w-sm">Calculated across 248 active enterprise & professional clusters globally.</p>
             </div>
           </CardContent>
         </Card>

         <div className="space-y-6 flex flex-col">
            <Card className="flex-1 hover:shadow-xl hover:shadow-slate-200 transition-all border-slate-200 bg-white rounded-3xl cursor-default p-6 flex flex-col justify-center">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                     <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Expansion MRR</p>
               </div>
               <p className="text-3xl font-black text-slate-950 tracking-tighter leading-none mb-1">₹5.4L</p>
               <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex gap-1"><ArrowUpRight className="w-3 h-3"/> Upgrades detected</p>
            </Card>

            <Card className="flex-1 hover:shadow-xl hover:shadow-slate-200 transition-all border-slate-200 bg-white rounded-3xl cursor-default p-6 flex flex-col justify-center">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
                     <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Churn Impact</p>
               </div>
               <p className="text-3xl font-black text-slate-950 tracking-tighter leading-none mb-1">₹0.8L</p>
               <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex gap-1"><ArrowDownRight className="w-3 h-3"/> Lost Clusters</p>
            </Card>
         </div>
      </div>

      <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-12">
         <h3 className="text-xl font-black text-slate-950 tracking-tight leading-none">6-Month Trajectory</h3>
         
         <div className="flex items-end justify-between h-72 gap-4 relative">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
               {[1,2,3,4,5].map(i => <div key={i} className="w-full h-px bg-slate-900" />)}
            </div>

            {/* Bars */}
            {mrrData.map((d, i) => (
               <motion.div 
                 key={i} 
                 initial={{ height: 0 }}
                 whileInView={{ height: `${(d.val / 50) * 100}%` }}
                 viewport={{ once: true }}
                 transition={{ delay: i * 0.1, duration: 0.6 }}
                 className="relative flex-1 group"
               >
                 <div className={`w-full h-full rounded-t-xl transition-all border-t-2 shadow-lg flex items-end justify-center pb-4
                    ${d.active 
                      ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 shadow-emerald-500/30' 
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-600 shadow-slate-900/10'}`}
                 >
                    <span className={`text-[10px] font-black uppercase tracking-widest ${d.active ? 'text-emerald-950' : 'text-slate-400'} group-hover:scale-110 transition-transform opacity-0 group-hover:opacity-100 hidden sm:block`}>
                       {d.label}
                    </span>
                 </div>
                 
                 <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${d.active ? 'text-emerald-600' : 'text-slate-400'}`}>{d.month}</p>
                 </div>
               </motion.div>
            ))}
         </div>
      </div>
    </div>
  )
}
