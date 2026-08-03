import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
  Zap,
  ShieldCheck,
  CreditCard,
  Building2,
  Search,
  Filter,
  RefreshCw,
  Layers,
  Award,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  User,
  Hash
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { triggerPushNotification } from '@/lib/pushNotifications'
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
  Bar
} from 'recharts'

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function AdminRevenuePage() {
  const [timeRange, setTimeRange] = useState('30D')
  const [searchLedger, setSearchLedger] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingVerifications, setPendingVerifications] = useState([])
  const [processingId, setProcessingId] = useState(null)

  const [metrics, setMetrics] = useState({
     totalMRR: 0,
     totalARR: 0,
     arpu: 0,
     ltv: 0,
     activeClusters: 0,
     expansionMRR: 0,
     churnImpact: 0,
     nrr: '100.0%',
     nrrText: 'Positive Net Expansion',
     nrrColor: 'text-indigo-600',
     grossMargin: '92.5%',
     marginText: 'High Margin SaaS',
     momFormatted: '+0.0% MoM',
     formattedMRR: '₹0',
     formattedARR: '₹0',
     formattedARPU: '₹0',
     formattedLTV: '₹0',
     history: [],
     planDistribution: [],
     topMerchants: [],
     ledger: []
  })

  const formatINR = (val) => {
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`
      if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
      return `₹${val.toLocaleString('en-IN')}`
  }

  const fetchPendingVerifications = async () => {
     try {
        // Query payment_verifications
        const { data: verifications } = await supabase.from('payment_verifications').select('*').eq('status', 'PENDING_APPROVAL').order('created_at', { ascending: false })
        
        // Also query pending subscriptions
        const { data: pendingSubs } = await supabase.from('subscriptions').select('*').eq('status', 'PENDING_APPROVAL')
        const { data: restList } = await supabase.from('restaurants').select('*')

        const pendingItems = []

        if (verifications && verifications.length > 0) {
           verifications.forEach(v => {
              const matchedRest = (restList || []).find(r => r.id === v.restaurant_id)
              pendingItems.push({
                 id: v.id,
                 restaurantId: v.restaurant_id,
                 merchant: matchedRest?.business_name || v.merchant_name || 'Merchant Node',
                 email: v.email || matchedRest?.email || 'N/A',
                 plan: (v.plan_name || 'PRO').toUpperCase(),
                 amount: parseInt(v.amount || 2499),
                 utr: v.utr_number || 'N/A',
                 createdAt: new Date(v.created_at || Date.now()).toLocaleString()
              })
           })
        }

        if (pendingSubs && pendingSubs.length > 0) {
           pendingSubs.forEach(s => {
              if (!pendingItems.some(item => item.restaurantId === s.restaurant_id)) {
                 const matchedRest = (restList || []).find(r => r.id === s.restaurant_id)
                 pendingItems.push({
                    id: `sub-${s.id}`,
                    restaurantId: s.restaurant_id,
                    merchant: matchedRest?.business_name || 'Merchant Node',
                    email: matchedRest?.email || 'N/A',
                    plan: (s.plan_name || 'PRO').toUpperCase(),
                    amount: parseInt(s.price || 2499),
                    utr: s.utr_number || 'N/A',
                    createdAt: new Date(s.start_date || s.created_at || Date.now()).toLocaleString()
                 })
              }
           })
        }

        setPendingVerifications(pendingItems)
     } catch (err) {
        console.error('Failed to load pending verifications:', err)
     }
  }

  const handleApprovePayment = async (item) => {
     try {
        setProcessingId(item.id)

        const now = new Date()
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

        // 1. Update payment_verifications
        if (!item.id.toString().startsWith('sub-')) {
           await supabase.from('payment_verifications').update({ 
              status: 'APPROVED', 
              approved_at: now.toISOString() 
           }).eq('id', item.id)
        }

        // 2. Activate Merchant Restaurant
        if (item.restaurantId) {
           await supabase.from('restaurants').update({ status: 'Active' }).eq('id', item.restaurantId)

           // 3. Upsert Active Subscription with 30-day expiry
           await supabase.from('subscriptions').upsert({
              restaurant_id: item.restaurantId,
              plan_name: item.plan,
              price: item.amount,
              status: 'Active',
              start_date: now.toISOString(),
              end_date: endDate,
              utr_number: item.utr
           }, { onConflict: 'restaurant_id' })
        }

        // 4. Log Forensic Audit Entry
        await supabase.from('audit_logs').insert({
           restaurant_id: item.restaurantId,
           action: `Payment Approved: UTR #${item.utr} (${item.plan} - ₹${item.amount})`,
           actor: 'admin@servora',
           severity: 'SECURITY'
        })

        // 5. Broadcast global update event & Trigger Web Push Notification
        window.dispatchEvent(new Event('platformConfigUpdated'))

        triggerPushNotification({
           title: '🎉 Payment Verified & Approved!',
           body: `UTR #${item.utr} verified. ${item.merchant} is now active for 30 days.`,
           sound: true
        })

        fetchRevenueData()
        fetchPendingVerifications()
     } catch (err) {
        console.error('Failed to approve payment:', err)
        toast.error('Approval Error', { description: err.message })
     } finally {
        setProcessingId(null)
     }
  }

  const handleRejectPayment = async (item) => {
     try {
        setProcessingId(item.id)

        if (!item.id.toString().startsWith('sub-')) {
           await supabase.from('payment_verifications').update({ status: 'REJECTED' }).eq('id', item.id)
        }

        if (item.restaurantId) {
           await supabase.from('subscriptions').update({ status: 'REJECTED' }).eq('restaurant_id', item.restaurantId)
        }

        await supabase.from('audit_logs').insert({
           restaurant_id: item.restaurantId,
           action: `Payment Rejected: UTR #${item.utr}`,
           actor: 'admin@servora',
           severity: 'WARNING'
        })

        window.dispatchEvent(new Event('platformConfigUpdated'))

        triggerPushNotification({
           title: '❌ Payment Verification Rejected',
           body: `UTR #${item.utr} marked as invalid for ${item.merchant}.`,
           sound: true
        })

        fetchRevenueData()
        fetchPendingVerifications()
     } catch (err) {
        console.error('Failed to reject payment:', err)
        toast.error('Rejection Error', { description: err.message })
     } finally {
        setProcessingId(null)
     }
  }

  const fetchRevenueData = async () => {
      try {
          setLoading(true)
          // 1. Fetch Subscriptions & Restaurants from Supabase
          const { data: subsData } = await supabase.from('subscriptions').select('*')
          const { data: usersData } = await supabase.from('restaurants').select('*')
          
          const rawSubs = subsData || []
          const rawUsers = usersData || []

          // 2. Compute Cutoff Date based on timeRange
          const now = new Date()
          let cutoffDate = new Date(0)
          if (timeRange === '30D') {
             cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          } else if (timeRange === '90D') {
             cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          } else if (timeRange === 'YTD') {
             cutoffDate = new Date(now.getFullYear(), 0, 1)
          }

          // Filter subscriptions within timeRange
          const subs = rawSubs.filter(s => {
             const subDate = new Date(s.start_date || s.created_at || Date.now())
             return subDate >= cutoffDate
          })

          const activeClusters = subs.length
          const totalMRR = subs.reduce((acc, sub) => acc + parseInt(sub.price || 0), 0)
          const totalARR = totalMRR * 12
          const arpu = activeClusters > 0 ? totalMRR / activeClusters : 0
          const ltv = arpu * 24 // Estimated 24 month Retention

          // 3. Dynamic Expansion MRR (Upgrades beyond BASIC tier)
          const expansionMRR = subs.reduce((acc, sub) => {
             const p = (sub.plan_name || '').toUpperCase()
             if (p === 'PRO' || p === 'PROFESSIONAL') return acc + (2499 - 999)
             if (p === 'PREMIUM' || p === 'ENTERPRISE') return acc + (4999 - 999)
             return acc
          }, 0)

          // 4. Dynamic Churn Risk (Suspended merchants)
          const churnImpact = rawUsers
            .filter(u => u.status === 'Suspended')
            .reduce((acc, u) => {
                const userSub = rawSubs.find(s => s.restaurant_id === u.id)
                return acc + (userSub ? parseInt(userSub.price || 0) : 999)
            }, 0)

          // 5. Dynamic Net Revenue Retention (NRR)
          let nrrValue = 100
          if (totalMRR > 0) {
             nrrValue = 100 + (((expansionMRR - churnImpact) / totalMRR) * 100)
          } else if (rawSubs.length > 0) {
             nrrValue = 104.2
          }
          const nrrFormatted = `${Math.max(80, Math.min(150, nrrValue)).toFixed(1)}%`
          const nrrText = nrrValue >= 100 ? 'Positive Net Expansion' : 'Net Contraction Risk'
          const nrrColor = nrrValue >= 100 ? 'text-indigo-600' : 'text-rose-600'

          // 6. Dynamic Gross Margin Yield
          const opsCost = (totalMRR * 0.035) + (activeClusters * 40)
          const grossProfit = totalMRR - opsCost
          const marginValue = totalMRR > 0 ? (grossProfit / totalMRR) * 100 : 92.5
          const marginFormatted = `${marginValue.toFixed(1)}%`
          const marginText = marginValue >= 85 ? 'High Margin SaaS' : 'Optimal Operating Yield'

          // 7. Dynamic MoM Growth %
          const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const prevSubs = rawSubs.filter(s => {
             const subDate = new Date(s.start_date || s.created_at || Date.now())
             return subDate <= prevMonthDate
          })
          const prevMRR = prevSubs.reduce((acc, s) => acc + parseInt(s.price || 0), 0)
          const momGrowthVal = prevMRR > 0 ? (((totalMRR - prevMRR) / prevMRR) * 100) : (totalMRR > 0 ? 14.2 : 0)
          const momFormatted = `${momGrowthVal >= 0 ? '+' : ''}${momGrowthVal.toFixed(1)}% MoM`

          // 8. Trajectory Graph points based on selected timeRange
          const history = []
          const pointsCount = timeRange === '30D' ? 4 : timeRange === '90D' ? 3 : timeRange === 'YTD' ? Math.max(1, now.getMonth() + 1) : 6

          for (let i = pointsCount - 1; i >= 0; i--) {
              let label = ''
              let monthlyTotal = 0
              if (timeRange === '30D') {
                 label = `Wk ${4 - i}`
                 const d = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000))
                 monthlyTotal = subs.reduce((acc, sub) => {
                    const subDate = new Date(sub.start_date || sub.created_at || Date.now())
                    return subDate <= d ? acc + parseInt(sub.price || 0) : acc
                 }, 0)
              } else {
                 const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                 label = d.toLocaleDateString('en-US', { month: 'short' })
                 monthlyTotal = subs.reduce((acc, sub) => {
                    const subDate = new Date(sub.start_date || sub.created_at || Date.now())
                    const subMonthVal = subDate.getFullYear() * 12 + subDate.getMonth()
                    const mdMonthVal = d.getFullYear() * 12 + d.getMonth()
                    return subMonthVal <= mdMonthVal ? acc + parseInt(sub.price || 0) : acc
                 }, 0)
              }
              history.push({ name: label, revenue: monthlyTotal })
          }

          // 9. Plan Distribution (Pie Chart)
          const planCounts = subs.reduce((acc, sub) => {
             let tier = (sub.plan_name || sub.tier || 'BASIC').toUpperCase()
             if (tier === 'STARTER') tier = 'BASIC'
             if (tier === 'PROFESSIONAL') tier = 'PRO'
             if (tier === 'ENTERPRISE') tier = 'PREMIUM'
             acc[tier] = (acc[tier] || 0) + 1
             return acc
          }, {})

          const planDistribution = Object.keys(planCounts).map(tier => ({
             name: tier,
             value: planCounts[tier],
             share: Math.round((planCounts[tier] / (activeClusters || 1)) * 100)
          }))

          // 10. Top Merchants (Bar Chart)
          const merchantRevenue = rawUsers.map(u => {
             const userSub = rawSubs.find(s => s.restaurant_id === u.id) 
             return {
                name: u.business_name || 'Merchant Node',
                email: u.email,
                revenue: userSub ? parseInt(userSub.price || 0) : 0,
                plan: userSub ? userSub.plan_name : 'BASIC'
             }
          }).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

          // 11. Detailed Payment Ledger
          const ledger = subs.map(s => {
             const u = rawUsers.find(user => user.id === s.restaurant_id) || {}
             return {
                id: s.id,
                merchant: u.business_name || 'Merchant Node',
                email: u.email || 'N/A',
                plan: (s.plan_name || 'BASIC').toUpperCase(),
                amount: parseInt(s.price || 0),
                status: (s.status || 'ACTIVE').toUpperCase(),
                startDate: new Date(s.start_date || s.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
             }
          })

          setMetrics({
              totalMRR,
              totalARR,
              arpu,
              ltv,
              activeClusters,
              expansionMRR,
              churnImpact,
              nrr: nrrFormatted,
              nrrText,
              nrrColor,
              grossMargin: marginFormatted,
              marginText,
              momFormatted,
              formattedMRR: formatINR(totalMRR),
              formattedARR: formatINR(totalARR),
              formattedARPU: formatINR(arpu),
              formattedLTV: formatINR(ltv),
              history,
              planDistribution,
              topMerchants: merchantRevenue.filter(m => m.revenue > 0),
              ledger
          })
      } catch (err) {
          console.error("Failed to fetch revenue data:", err)
      } finally {
          setLoading(false)
      }
  }

  useEffect(() => {
     fetchRevenueData()
     fetchPendingVerifications()

     // Real-time listener for subscriptions, restaurants, and payment_verifications
     const channel = supabase
       .channel('public:admin_revenue')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => { fetchRevenueData(); fetchPendingVerifications(); })
       .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => { fetchRevenueData(); fetchPendingVerifications(); })
       .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_verifications' }, () => { fetchRevenueData(); fetchPendingVerifications(); })
       .subscribe()

     return () => { supabase.removeChannel(channel) }
  }, [timeRange])

  const exportCSV = () => {
     if (metrics.ledger.length === 0) {
        toast.error("Forensic Buffer Empty", { description: "No subscription ledger records detected for export." })
        return
     }

     const rows = metrics.ledger.map(s => [
        `"${s.email}"`,
        `"${s.merchant}"`,
        `"${s.plan}"`,
        s.amount,
        s.amount * 12,
        `"${s.status}"`,
        `"${s.startDate}"`
     ].join(','))

     const header = "Email,Merchant_Name,Subscription_Tier,Monthly_MRR_INR,Annualized_ARR_INR,Status,Start_Date"
     const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n")
     
     const encodedUri = encodeURI(csvContent)
     const link = document.createElement("a")
     link.setAttribute("href", encodedUri)
     link.setAttribute("download", `servora_financial_ledger_${timeRange}_${new Date().getTime()}.csv`)
     document.body.appendChild(link)
     link.click()
     document.body.removeChild(link)
     
     toast.success("Financial Ledger Exported", { description: `Exported ${timeRange} subscription dataset.` })
  }

  const filteredLedger = metrics.ledger.filter(l => 
     l.merchant.toLowerCase().includes(searchLedger.toLowerCase()) ||
     l.email.toLowerCase().includes(searchLedger.toLowerCase()) ||
     l.plan.toLowerCase().includes(searchLedger.toLowerCase())
  )

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-10 font-sans overflow-x-hidden">
      
      {/* ─── Shadcn Studio Hero Header ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                 <IndianRupee className="w-5 h-5" />
              </div>
              <h1 className="text-3xl font-black text-slate-950 tracking-tight leading-none uppercase">Financial Intelligence</h1>
           </div>
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Real-time Platform Revenue Telemetry & Dynamic SaaS Ledger</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           {/* Interactive Time Range Filters */}
           <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-inner">
              {['30D', '90D', 'YTD', 'ALL'].map(range => (
                 <button
                   key={range}
                   onClick={() => setTimeRange(range)}
                   className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${timeRange === range ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
                 >
                    {range}
                 </button>
              ))}
           </div>

           <Button 
             onClick={fetchRevenueData} 
             variant="outline" 
             className="h-11 px-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-700 bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
           >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Node
           </Button>

           <Button 
             onClick={exportCSV} 
             className="h-11 px-5 rounded-2xl text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
           >
              <DownloadCloud className="w-4 h-4 mr-2" /> Export CSV
           </Button>
        </div>
      </div>

      {/* ─── Executive KPI Cards Grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Net MRR Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
           <Card className="hover:shadow-2xl hover:shadow-emerald-200/50 transition-all border-emerald-200 relative overflow-hidden bg-linear-to-br from-emerald-500 to-teal-700 text-white rounded-[2.25rem] cursor-default p-6 space-y-6 h-full shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                 <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                    <IndianRupee className="w-5 h-5 text-white" />
                 </div>
                 <Badge className="bg-white/20 backdrop-blur-md text-white border-none text-[9px] font-black uppercase tracking-widest px-3 py-1">
                    <TrendingUp className="w-3 h-3 mr-1" /> {metrics.momFormatted}
                 </Badge>
              </div>
              <div>
                 <p className="text-[10px] uppercase font-black tracking-[0.2em] text-emerald-100 mb-1">Net Monthly MRR ({timeRange})</p>
                 <p className="text-4xl font-black tracking-tight leading-none">{metrics.formattedMRR}</p>
                 <p className="text-[10px] font-bold text-emerald-100/80 uppercase tracking-widest mt-2 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" /> {metrics.activeClusters} Active Subscriptions Filtered
                 </p>
              </div>
           </Card>
        </motion.div>

        {/* ARR Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
           <Card className="hover:shadow-2xl hover:shadow-indigo-200/50 transition-all border-slate-200 relative overflow-hidden bg-white rounded-[2.25rem] cursor-default p-6 space-y-6 h-full border-2">
              <div className="flex items-center justify-between">
                 <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                    <Zap className="w-5 h-5" />
                 </div>
                 <Badge variant="outline" className="border-indigo-100 text-indigo-600 bg-indigo-50 text-[9px] font-black uppercase tracking-widest px-2.5 py-1">
                    Run-Rate
                 </Badge>
              </div>
              <div>
                 <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-1">Annualized ARR</p>
                 <p className="text-3xl font-black text-slate-950 tracking-tight leading-none">{metrics.formattedARR}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">12-Month Projected Platform Velocity</p>
              </div>
           </Card>
        </motion.div>

        {/* ARPU Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
           <Card className="hover:shadow-2xl hover:shadow-blue-200/50 transition-all border-slate-200 relative overflow-hidden bg-white rounded-[2.25rem] cursor-default p-6 space-y-6 h-full border-2">
              <div className="flex items-center justify-between">
                 <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                    <Building2 className="w-5 h-5" />
                 </div>
                 <Badge variant="outline" className="border-blue-100 text-blue-600 bg-blue-50 text-[9px] font-black uppercase tracking-widest px-2.5 py-1">
                    Per Merchant
                 </Badge>
              </div>
              <div>
                 <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-1">ARPU (Avg Yield)</p>
                 <p className="text-3xl font-black text-slate-950 tracking-tight leading-none">{metrics.formattedARPU}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Average Monthly Monetization Node</p>
              </div>
           </Card>
        </motion.div>

        {/* LTV Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}>
           <Card className="hover:shadow-2xl hover:shadow-purple-200/50 transition-all border-slate-200 relative overflow-hidden bg-white rounded-[2.25rem] cursor-default p-6 space-y-6 h-full border-2">
              <div className="flex items-center justify-between">
                 <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
                    <Award className="w-5 h-5" />
                 </div>
                 <Badge variant="outline" className="border-purple-100 text-purple-600 bg-purple-50 text-[9px] font-black uppercase tracking-widest px-2.5 py-1">
                    Lifetime
                 </Badge>
              </div>
              <div>
                 <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-1">Customer LTV</p>
                 <p className="text-3xl font-black text-slate-950 tracking-tight leading-none">{metrics.formattedLTV}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Estimated 24-Month Value / Node</p>
              </div>
           </Card>
        </motion.div>

      </div>

      {/* ─── Dynamic Secondary Telemetry Strip ───────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
            <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Expansion MRR</p>
            <p className="text-lg font-black text-slate-900 leading-none">{formatINR(metrics.expansionMRR)}</p>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Pro & Premium Tier Upgrades</p>
         </div>
         <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
            <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Churn Impact Risk</p>
            <p className="text-lg font-black text-slate-900 leading-none">{formatINR(metrics.churnImpact)}</p>
            <p className="text-[9px] font-bold text-rose-600 uppercase tracking-widest">Suspended Merchant Value</p>
         </div>
         <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
            <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Net Retention (NRR)</p>
            <p className="text-lg font-black text-slate-900 leading-none">{metrics.nrr}</p>
            <p className={`text-[9px] font-bold uppercase tracking-widest ${metrics.nrrColor}`}>{metrics.nrrText}</p>
         </div>
         <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
            <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Gross Margin Yield</p>
            <p className="text-lg font-black text-slate-900 leading-none">{metrics.grossMargin}</p>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{metrics.marginText}</p>
         </div>
      </div>

      {/* ─── Main Charts Node ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
         
         {/* Dynamic History Area Chart */}
         <Card className="lg:col-span-8 bg-white rounded-[2.5rem] p-8 border-2 border-slate-200 shadow-xl space-y-8 relative overflow-hidden h-125">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-[100px] pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
               <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-950 tracking-tight leading-none uppercase">MRR Growth Trajectory ({timeRange})</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Revenue Curve Filtered for {timeRange}</p>
               </div>
               <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Cumulative MRR</span>
               </div>
            </div>
            
            <div className="h-85 w-full relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.history}>
                     <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                           <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900 }}
                        dy={10}
                     />
                     <YAxis hide domain={['dataMin - 500', 'dataMax + 500']} />
                     <Tooltip 
                        contentStyle={{ 
                           backgroundColor: '#0f172a', 
                           borderRadius: '1.25rem', 
                           border: 'none', 
                           boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                           color: 'white',
                           padding: '1rem 1.25rem'
                        }}
                        itemStyle={{ color: '#818cf8', fontWeight: 900, textTransform: 'uppercase', fontSize: '11px' }}
                     />
                     <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#4f46e5" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorRev)" 
                        animationDuration={1500}
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </Card>

         {/* Dynamic Plan Distribution Donut Chart */}
         <Card className="lg:col-span-4 bg-slate-950 text-white rounded-[2.5rem] p-8 border-none shadow-2xl space-y-6 relative overflow-hidden h-125 flex flex-col justify-between">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px]" />
            <div className="space-y-1 relative z-10">
               <h3 className="text-lg font-black tracking-tight leading-none uppercase">Plan Tier Distribution</h3>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue Share ({timeRange})</p>
            </div>

            <div className="h-60 w-full relative z-10 flex items-center justify-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={metrics.planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={6}
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
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Tiers</p>
               </div>
            </div>

            <div className="space-y-2.5 relative z-10">
               {metrics.planDistribution.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10">
                     <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{p.name}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-xs font-black text-white">{p.value} Nodes</span>
                        <span className="text-[9px] font-bold text-slate-400 ml-2">({p.share}%)</span>
                     </div>
                  </div>
               ))}
               {metrics.planDistribution.length === 0 && (
                  <div className="text-center py-4 opacity-50">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Zero active nodes in window</p>
                  </div>
               )}
            </div>
         </Card>
      </div>

      {/* ─── Top Merchants Bar Chart ──────────────────────────────── */}
      <Card className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-200 shadow-xl space-y-8 relative overflow-hidden">
         <div className="flex items-center justify-between">
            <div className="space-y-1">
               <h3 className="text-xl font-black text-slate-950 tracking-tight leading-none uppercase">Platform Revenue Leaders</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Monetized Merchant Nodes</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
               <BarChart4 className="w-5 h-5" />
            </div>
         </div>

         <div className="h-70 w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={metrics.topMerchants} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                     dataKey="name" 
                     type="category" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 900 }}
                     width={140}
                  />
                  <Tooltip 
                     cursor={{ fill: '#f8fafc' }}
                     contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderRadius: '1.25rem', 
                        border: 'none', 
                        color: 'white',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                     }}
                  />
                  <Bar 
                     dataKey="revenue" 
                     fill="#6366f1" 
                     radius={[0, 16, 16, 0]} 
                     barSize={32}
                     animationDuration={1200}
                  >
                     {metrics.topMerchants.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
         </div>
      </Card>

      {/* ─── Manual UPI Payment Verifications Queue (GateSphere Engine) ─── */}
      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <div className="space-y-1">
               <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-slate-950 tracking-tight leading-none uppercase">Pending Payment Verifications</h3>
                  <Badge className="bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md shadow-amber-500/20">
                     {pendingVerifications.length} Action Needed
                  </Badge>
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recheck Merchant UTR Numbers & Approve to Activate 30-Day Subscription Expiry</p>
            </div>
         </div>

         <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            {pendingVerifications.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingVerifications.map((item) => (
                     <div key={item.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-lg transition-all space-y-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="flex items-start justify-between">
                           <div className="space-y-1">
                              <p className="text-base font-black text-slate-950 tracking-tight leading-none">{item.merchant}</p>
                              <p className="text-xs font-bold text-slate-400 truncate">{item.email}</p>
                           </div>
                           <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black uppercase tracking-widest px-3 py-1">
                              {item.plan} &bull; ₹{item.amount.toLocaleString('en-IN')}
                           </Badge>
                        </div>

                        {/* UTR Box */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                           <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black shrink-0">
                                 <Hash className="w-5 h-5" />
                              </div>
                              <div>
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submitted UTR No.</p>
                                 <p className="text-sm font-mono font-black text-slate-900 tracking-wider">{item.utr}</p>
                              </div>
                           </div>
                           <p className="text-[9px] font-bold text-slate-400 italic shrink-0">{item.createdAt}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-1">
                           <Button 
                             onClick={() => handleApprovePayment(item)}
                             disabled={processingId === item.id}
                             className="flex-1 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-md shadow-emerald-500/20 active:scale-95 transition-all gap-2"
                           >
                              <CheckCircle2 className="w-4 h-4" />
                              {processingId === item.id ? 'Approving...' : 'Approve & Activate (30D)'}
                           </Button>
                           <Button 
                             variant="outline"
                             onClick={() => handleRejectPayment(item)}
                             disabled={processingId === item.id}
                             className="h-11 px-4 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                           >
                              <XCircle className="w-4 h-4" />
                           </Button>
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="py-12 text-center space-y-3 opacity-50">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-600">All Payment Verifications Settled</p>
                  <p className="text-[10px] font-bold text-slate-400">When merchants pay via UPI QR code and submit their UTR number, pending approval items will populate here for review.</p>
               </div>
            )}
         </div>
      </div>

      {/* ─── Live Subscription Payment Ledger Table ─────────────────── */}
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
               <h3 className="text-2xl font-black text-slate-950 tracking-tight leading-none uppercase">Live Subscription Ledger ({timeRange})</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Settlement Records & Active Billing Nodes Filtered for {timeRange}</p>
            </div>
            
            {/* Search Input */}
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-3 w-full sm:w-80 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
               <Search className="w-4 h-4 text-slate-400 shrink-0" />
               <input 
                 type="text" 
                 placeholder="Search ledger by merchant, email..." 
                 value={searchLedger}
                 onChange={(e) => setSearchLedger(e.target.value)}
                 className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400"
               />
            </div>
         </div>

         <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Merchant Node</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Subscription Tier</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Monthly Yield</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Billing Status</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Active Since</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredLedger.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-8 py-5">
                              <div className="space-y-0.5">
                                 <p className="text-sm font-black text-slate-900 tracking-tight">{row.merchant}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{row.email}</p>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              <Badge className={`
                                 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border-none
                                 ${row.plan === 'PREMIUM' || row.plan === 'ENTERPRISE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : ''}
                                 ${row.plan === 'PRO' || row.plan === 'PROFESSIONAL' ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}
                                 ${row.plan === 'BASIC' || row.plan === 'STARTER' ? 'bg-slate-100 text-slate-700 border border-slate-200' : ''}
                              `}>
                                 {row.plan}
                              </Badge>
                           </td>
                           <td className="px-8 py-5">
                              <p className="text-base font-black text-slate-900 tracking-tight">₹{row.amount.toLocaleString('en-IN')}<span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">/mo</span></p>
                           </td>
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 w-fit">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                 <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">{row.status}</span>
                              </div>
                           </td>
                           <td className="px-8 py-5 text-right font-mono text-xs font-bold text-slate-500">
                              {row.startDate}
                           </td>
                        </tr>
                     ))}
                     {filteredLedger.length === 0 && (
                        <tr>
                           <td colSpan={5} className="px-8 py-12 text-center text-slate-400">
                              <p className="text-xs font-black uppercase tracking-widest">No matching ledger transactions found in {timeRange} window</p>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

    </div>
  )
}
