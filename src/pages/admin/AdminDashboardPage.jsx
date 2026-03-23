import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { 
  BarChart3, 
  Users, 
  Store, 
  DatabaseZap, 
  TrendingUp,
  ArrowUpRight
} from 'lucide-react'

const metrics = [
  { icon: Store, label: "Active Merchants", value: "248", change: "+12% MoM", color: "blue" },
  { icon: Users, label: "Total Platform Users", value: "1.2M", change: "+8% MoM", color: "indigo" },
  { icon: BarChart3, label: "Monthly Recurring Revenue", value: "₹45.2L", change: "+15% MoM", color: "emerald" },
  { icon: DatabaseZap, label: "System API Calls/sec", value: "854/s", change: "Stable", color: "amber" },
]

export default function AdminDashboardPage() {
  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-12 overflow-x-hidden font-sans">
      
      {/* ─── Hero Node ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">System Global State</h1>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Real-time Platform Diagnostics</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm">
           <span className="relative flex h-3 w-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
           </span>
           <span className="text-[10px] uppercase font-black tracking-widest text-emerald-700 leading-none">All Clusters Nominal</span>
        </div>
      </div>

      {/* ─── Global KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, idx) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
          >
            <Card className="hover:shadow-2xl hover:shadow-slate-200/50 transition-all border-slate-200 group relative overflow-hidden bg-white rounded-3xl cursor-default">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-${m.color}-50 rounded-full blur-3xl group-hover:bg-${m.color}-100 transition-colors pointer-events-none`} />
              <CardContent className="p-8 space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-${m.color}-500/10 border border-${m.color}-500/20 text-${m.color}-600 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-${m.color}-500 group-hover:text-white transition-all`}>
                    <m.icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    <TrendingUp className="w-3 h-3" />
                    {m.change}
                  </div>
                </div>
                <div>
                   <p className="text-xs uppercase font-black tracking-[0.2em] text-slate-400 mb-2 leading-none">{m.label}</p>
                   <p className="text-4xl font-black text-slate-950 tracking-tighter leading-none">{m.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
        
        {/* ─── Graph Placeholder Node ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Throughput Velocity</h3>
              <div className="text-[10px] uppercase font-black tracking-widest text-blue-600 cursor-pointer hover:underline underline-offset-4 flex items-center gap-1">
                 Deep Diagnostics <ArrowUpRight className="w-3 h-3" />
              </div>
           </div>
           
           <div className="w-full h-96 bg-slate-900 rounded-[2.5rem] p-8 flex flex-col justify-end gap-2 relative overflow-hidden group shadow-2xl shadow-blue-900/10">
              <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-blue-600/20 to-transparent pointer-events-none" />
              
              {/* Abstract Bar Graph Mock */}
              <div className="flex items-end justify-between h-full gap-2 px-4 relative z-10">
                 {[40, 65, 45, 80, 55, 90, 75, 100, 85, 40, 60, 50, 90, 70, 80].map((h, i) => (
                    <div 
                      key={i} 
                      className="w-full bg-blue-500 rounded-t-lg group-hover:bg-blue-400 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.5)] border-t border-blue-400" 
                      style={{ height: `${h}%` }} 
                    />
                 ))}
              </div>
           </div>
        </div>

        {/* ─── System Activity Feed ────────────────────────────────── */}
        <div className="space-y-6">
           <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Security Audit Log</h3>
           
           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-4 space-y-2">
              {[
                 { action: "Subscription Override", user: "admin@servora", time: "2 min ago", stat: "SECURE" },
                 { action: "New Merchant Registered", user: "Café Alpha", time: "15 min ago", stat: "NOMINAL" },
                 { action: "Plan Mutation [Enterprise]", user: "Global Dine", time: "1 hr ago", stat: "NOMINAL" },
                 { action: "Login Protocol Warning", user: "Unknown IP", time: "3 hrs ago", stat: "ALERT", c: "red" },
                 { action: "Database Backup", user: "System CRON", time: "4 hrs ago", stat: "NOMINAL" },
              ].map((log, i) => (
                 <div key={i} className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100 transition-colors cursor-default">
                    <div className="space-y-1">
                       <p className="text-sm font-black text-slate-900 leading-none tracking-tight">{log.action}</p>
                       <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{log.user}</p>
                    </div>
                    <div className="text-right space-y-2">
                       <div className={`text-[9px] uppercase font-black tracking-[0.2em] px-2 py-0.5 rounded-full inline-block ${log.c === 'red' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {log.stat}
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 tracking-widest leading-none">{log.time}</p>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  )
}
