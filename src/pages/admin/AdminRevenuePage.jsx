import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DownloadCloud, 
  ArrowUpRight, 
  ArrowDownRight, 
  IndianRupee, 
  PieChart as PieIcon, 
  BarChart4, 
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts'

// Simple utility for combining class names, assuming it's available or defined
// If `cn` is not globally available or imported, this basic implementation will suffice.
const cn = (...classes) => classes.filter(Boolean).join(' ');

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function AdminRevenuePage() {
  const [metrics, setMetrics] = useState({
     totalMRR: 0,
     activeClusters: 0,
     expansionMRR: 0,
     churnImpact: 0,
     formattedMRR: '₹0',
     history: [],
     planDistribution: [],
     topMerchants: []
  })

  useEffect(() => {
     const formatINR = (val) => {
         if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`
         if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
         return `₹${val}`
     }

     const pollRevenue = () => {
         const subs = JSON.parse(localStorage.getItem('servora_db_subscriptions') || '[]')
         const users = JSON.parse(localStorage.getItem('servora_db_users') || '[]')
         
         const activeClusters = subs.length
         const totalMRR = subs.reduce((acc, sub) => acc + parseInt(sub.price || 0), 0)
         
         // 1. History Calculation (Area Chart)
         const now = new Date()
         const history = []
         for (let i = 5; i >= 0; i--) {
             const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
             const monthStr = d.toLocaleDateString('en-US', { month: 'short' })
             
             const monthlyTotal = subs.reduce((acc, sub) => {
                 const subDate = new Date(sub.activeSince || Date.now())
                 const subMonthVal = subDate.getFullYear() * 12 + subDate.getMonth()
                 const mdMonthVal = d.getFullYear() * 12 + d.getMonth()
                 return subMonthVal <= mdMonthVal ? acc + parseInt(sub.price || 0) : acc
             }, 0)

             history.push({ name: monthStr, revenue: monthlyTotal })
         }

         // 2. Plan Distribution (Pie Chart)
         const planCounts = subs.reduce((acc, sub) => {
            acc[sub.tier] = (acc[sub.tier] || 0) + 1
            return acc
         }, {})
         const planDistribution = Object.keys(planCounts).map(tier => ({
            name: tier,
            value: planCounts[tier]
         }))

         // 3. Top Merchants (Bar Chart)
         // Map subscriptions to businesses via email if possible, or just use tiers for now
         // Real logic: find matching user for each sub
         const merchantRevenue = users.map(u => {
            const userSub = subs.find(s => s.email === u.email) // Assume sub has email (added in recent purchase logic)
            return {
               name: u.businessName || u.name || 'Merchant Node',
               revenue: userSub ? parseInt(userSub.price) : 0
            }
         }).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

         setMetrics({
             totalMRR,
             activeClusters,
             expansionMRR: totalMRR * 0.12, 
             churnImpact: totalMRR * 0.03, 
             formattedMRR: formatINR(totalMRR),
             history,
             planDistribution,
             topMerchants: merchantRevenue.filter(m => m.revenue > 0)
         })
     }

     pollRevenue()
     const timer = setInterval(pollRevenue, 2000)
     return () => clearInterval(timer)
  }, [])

  const formatSubMetric = (val) => {
     if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`
     if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
     return `₹${val.toFixed(0)}`
  }

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-12 font-sans overflow-hidden">
      {/* ─── Header Section ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none uppercase">Financial Intelligence</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Real-time Platform Revenue Telemetry Node</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
              <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Network Live</span>
           </div>
           <Button 
             onClick={() => {
                const subs = JSON.parse(localStorage.getItem('servora_db_subscriptions') || '[]')
                const users = JSON.parse(localStorage.getItem('servora_db_users') || '[]')
                
                if (subs.length === 0) {
                   toast.error("Forensic Buffer Empty", { description: "No subscription records detected for export." })
                   return
                }

                // Data Flattening for Export
                const rows = subs.map(s => {
                   const u = users.find(user => user.email === s.email) || {}
                   return [
                      s.email,
                      u.businessName || 'Manual Node',
                      s.tier,
                      s.price,
                      s.activeSince || 'N/A'
                   ].join(',')
                })

                const header = "Email,Merchant_Name,Subscription_Tier,Price_INR,Active_Since"
                const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n")
                
                const encodedUri = encodeURI(csvContent)
                const link = document.createElement("a")
                link.setAttribute("href", encodedUri)
                link.setAttribute("download", `servora_revenue_export_${new Date().getTime()}.csv`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                
                toast.success("Forensic Pack Exported", { description: "Subscription ledger downloaded successfully." })
             }}
             variant="outline" 
             className="gap-2 h-12 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 bg-white border-slate-200 hover:bg-slate-50 shadow-sm transition-all"
           >
              <DownloadCloud className="w-4 h-4" /> Export CSV
           </Button>
        </div>
      </div>

      {/* ─── Top Level Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="hover:shadow-2xl hover:shadow-emerald-200/50 transition-all border-emerald-200 group relative overflow-hidden bg-emerald-50 rounded-[3rem] cursor-default md:col-span-2 border-2">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-400/30 transition-colors" />
            <CardContent className="p-10 space-y-8 relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-14 h-14 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <IndianRupee className="w-7 h-7" />
                   </div>
                   <div>
                      <p className="text-xs uppercase font-black tracking-[0.2em] text-emerald-800 leading-none">Net MRR Yield</p>
                      <p className="text-[10px] font-bold text-emerald-600 mt-1">Simulated Platform Ecosystem</p>
                   </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-emerald-100">
                  <TrendingUp className="w-4 h-4" /> +12.4% MoM
                </div>
              </div>
              <div>
                 <p className="text-6xl lg:text-[7.5rem] font-black text-emerald-950 tracking-tightest leading-none mb-6">{metrics.formattedMRR}</p>
                 <div className="flex items-center gap-4">
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-4 py-1.5 font-black uppercase tracking-widest text-[9px]">Cluster Verified</Badge>
                    <p className="text-sm font-bold text-emerald-700 uppercase tracking-widest">Active nodes: {metrics.activeClusters}</p>
                 </div>
              </div>
            </CardContent>
         </Card>

         <div className="space-y-6 flex flex-col items-stretch">
            <Card className="flex-1 hover:shadow-2xl hover:shadow-blue-200/50 transition-all border-slate-200 bg-white rounded-[2.5rem] cursor-default p-8 flex flex-col justify-center border-2 group">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                     <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] uppercase font-black tracking-widest text-slate-500">Expansion MRR</p>
               </div>
               <p className="text-4xl font-black text-slate-950 tracking-tightest leading-none mb-2">{formatSubMetric(metrics.expansionMRR)}</p>
               <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"><Zap className="w-3 h-3 fill-emerald-600"/> High Density Growth</p>
            </Card>

            <Card className="flex-1 hover:shadow-2xl hover:shadow-rose-200/50 transition-all border-slate-200 bg-white rounded-[2.5rem] cursor-default p-8 flex flex-col justify-center border-2 group">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner group-hover:bg-rose-600 group-hover:text-white transition-all">
                     <ArrowDownRight className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] uppercase font-black tracking-widest text-slate-500">Churn Risk</p>
               </div>
               <p className="text-4xl font-black text-slate-950 tracking-tightest leading-none mb-2">{formatSubMetric(metrics.churnImpact)}</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated 3.2% Impact</p>
            </Card>
         </div>
      </div>

      {/* ─── Main Charts ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
         {/* History Area Chart */}
         <Card className="lg:col-span-8 bg-white rounded-[3rem] p-10 border-2 border-slate-100 shadow-xl shadow-slate-200/20 space-y-10 relative overflow-hidden h-[540px]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-[100px] pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
               <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-950 tracking-tight leading-none uppercase">Growth Trajectory</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Platform MRR Accumulation</p>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-blue-600" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cumulative Yield</span>
                  </div>
               </div>
            </div>
            
            <div className="h-[360px] w-full relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.history}>
                     <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                        dy={15}
                     />
                     <YAxis 
                        hide 
                        domain={['dataMin - 1000', 'dataMax + 1000']}
                      />
                     <Tooltip 
                        contentStyle={{ 
                           backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                           borderRadius: '1.5rem', 
                           border: 'none', 
                           boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                           padding: '1.5rem'
                        }}
                        itemStyle={{ color: '#0f172a', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                     />
                     <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorRev)" 
                        animationDuration={2000}
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </Card>

         {/* Plan Distribution Pie Chart */}
         <Card className="lg:col-span-4 bg-slate-950 text-white rounded-[3rem] p-10 border-none shadow-2xl space-y-8 relative overflow-hidden h-[540px]">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]" />
            <div className="space-y-1 relative z-10">
               <h3 className="text-xl font-black tracking-tight leading-none uppercase">Plan Density</h3>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tier Adoption Distribution</p>
            </div>

            <div className="h-[300px] w-full relative z-10 flex items-center justify-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={metrics.planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="#0f172a"
                        strokeWidth={4}
                     >
                        {metrics.planDistribution.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ 
                           backgroundColor: '#0f172a', 
                           borderRadius: '1rem', 
                           border: '1px solid #1e293b', 
                           color: 'white'
                        }}
                     />
                  </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-black text-white">{metrics.activeClusters}</p>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Nodes</p>
               </div>
            </div>

            <div className="space-y-3 relative z-10">
               {metrics.planDistribution.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{p.name}</span>
                     </div>
                     <span className="text-xs font-black">{p.value} Accounts</span>
                  </div>
               ))}
               {metrics.planDistribution.length === 0 && (
                  <div className="text-center py-4 opacity-50">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Wait for Node Sync...</p>
                  </div>
               )}
            </div>
         </Card>
      </div>

      {/* ─── Top Merchants Bar Chart ──────────────────────────────── */}
      <Card className="bg-white rounded-[3rem] p-10 border-2 border-slate-100 shadow-xl shadow-slate-200/20 space-y-12 relative overflow-hidden">
         <div className="flex items-center justify-between">
            <div className="space-y-1">
               <h3 className="text-2xl font-black text-slate-950 tracking-tight leading-none uppercase">Platform Elite</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Density Leaders (Top 5 Branches)</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
               <BarChart4 className="w-6 h-6" />
            </div>
         </div>

         <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={metrics.topMerchants} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                     dataKey="name" 
                     type="category" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 900 }}
                     width={120}
                  />
                  <Tooltip 
                     cursor={{ fill: '#f8fafc' }}
                     contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '1.5rem', 
                        border: 'none', 
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                     }}
                  />
                  <Bar 
                     dataKey="revenue" 
                     fill="#6366f1" 
                     radius={[0, 20, 20, 0]} 
                     barSize={40}
                     animationBegin={500}
                     animationDuration={1500}
                  >
                     {metrics.topMerchants.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
         </div>
         
         <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 italic">Financial data is cross-referenced with simulated SQL node cluster logs.</p>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Leader Variance detected</span>
               </div>
            </div>
         </div>
      </Card>
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
