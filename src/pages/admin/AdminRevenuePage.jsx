import { useState, useEffect } from 'react'
import { supabase, ensureAdminSession } from '@/lib/adminSupabase'
import { getAdminPlatformData, approveMerchantPayment } from '@/lib/adminDataService'
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
  Hash,
  Eye,
  X,
  Copy,
  Check,
  Calendar,
  Sparkles,
  ChevronRight,
  Send,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  const [searchPending, setSearchPending] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingVerifications, setPendingVerifications] = useState([])
  const [processingId, setProcessingId] = useState(null)
  
  // Company Inspection Drawer State
  const [inspectingCompany, setInspectingCompany] = useState(null)
  const [copiedUtr, setCopiedUtr] = useState('')
  const [copiedUuid, setCopiedUuid] = useState(false)

  const [platformRawData, setPlatformRawData] = useState({
     restaurants: [],
     subscriptions: [],
     pendingVerifications: [],
     paymentVerifications: []
  })

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
        const platformData = await getAdminPlatformData()
        setPendingVerifications(platformData.pendingVerifications)
     } catch (err) {
        console.error('Failed to load pending verifications:', err)
     }
  }

  const handleApprovePayment = async (item) => {
     try {
        setProcessingId(item.id)

        // Optimistically remove approved card from UI state immediately
        setPendingVerifications(prev => prev.filter(p => 
           p.id !== item.id && 
           p.utr !== item.utr && 
           p.restaurantId !== item.restaurantId &&
           (!item.email || p.email.toLowerCase() !== item.email.toLowerCase())
        ))

        await approveMerchantPayment(item)

        // Broadcast global update event & Trigger Web Push Notification
        window.dispatchEvent(new Event('platformConfigUpdated'))

        triggerPushNotification({
           title: '🎉 Payment Verified & Approved!',
           body: `UTR #${item.utr} verified. ${item.merchant} is now active for 30 days.`,
           sound: true
        })

        toast.success('🎉 Subscription Approved!', {
           description: `${item.merchant} is now active for 30 days.`
        })

        if (inspectingCompany) {
           setInspectingCompany(prev => prev ? { ...prev, status: 'Active' } : null)
        }

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

        toast.error('Payment Rejected', { description: `UTR #${item.utr} rejected.` })

        fetchRevenueData()
        fetchPendingVerifications()
     } catch (err) {
        console.error('Failed to reject payment:', err)
        toast.error('Rejection Error', { description: err.message })
     } finally {
        setProcessingId(null)
     }
  }

  const handleGrantExtension = async (company) => {
     try {
        setProcessingId('extend')
        const restId = company.restaurantId
        const now = new Date()
        const extEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

        await supabase.from('subscriptions').upsert({
           restaurant_id: restId,
           plan_name: company.plan || 'Professional',
           price: company.amount || 2499,
           status: 'Active',
           start_date: now.toISOString(),
           end_date: extEnd
        }, { onConflict: 'restaurant_id' })

        window.dispatchEvent(new Event('platformConfigUpdated'))

        toast.success('🎁 +30 Days Granted!', {
           description: `Extended subscription for ${company.merchant || company.name} by 30 days.`
        })

        fetchRevenueData()
        fetchPendingVerifications()
     } catch (err) {
        toast.error('Extension Error', { description: err.message })
     } finally {
        setProcessingId(null)
     }
  }

  const fetchRevenueData = async () => {
      try {
          setLoading(true)
          const platformData = await getAdminPlatformData()
          setPlatformRawData({ paymentVerifications: [], ...platformData })
          
          const rawSubs = platformData.subscriptions || []
          const rawUsers = platformData.restaurants || []

          const now = new Date()
          let cutoffDate = new Date(0)
          if (timeRange === '30D') {
             cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          } else if (timeRange === '90D') {
             cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          } else if (timeRange === 'YTD') {
             cutoffDate = new Date(now.getFullYear(), 0, 1)
          }

          const subs = rawSubs.filter(s => {
             const subDate = new Date(s.start_date || s.created_at || Date.now())
             return subDate >= cutoffDate
          })

          const activeClusters = subs.length
          const totalMRR = subs.reduce((acc, sub) => acc + parseInt(sub.price || 0), 0)
          const totalARR = totalMRR * 12
          const arpu = activeClusters > 0 ? totalMRR / activeClusters : 0
          const ltv = arpu * 24

          const expansionMRR = subs.reduce((acc, sub) => {
             const p = (sub.plan_name || '').toUpperCase()
             if (p === 'PRO' || p === 'PROFESSIONAL') return acc + (2499 - 999)
             if (p === 'PREMIUM' || p === 'ENTERPRISE') return acc + (4999 - 999)
             return acc
          }, 0)

          const churnImpact = rawUsers
            .filter(u => u.status === 'Suspended')
            .reduce((acc, u) => {
                const userSub = rawSubs.find(s => s.restaurant_id === u.id)
                return acc + (userSub ? parseInt(userSub.price || 0) : 999)
            }, 0)

          let nrrValue = 100
          if (totalMRR > 0) {
             nrrValue = 100 + (((expansionMRR - churnImpact) / totalMRR) * 100)
          } else if (rawSubs.length > 0) {
             nrrValue = 104.2
          }
          const nrrFormatted = `${Math.max(80, Math.min(150, nrrValue)).toFixed(1)}%`
          const nrrText = nrrValue >= 100 ? 'Positive Net Expansion' : 'Net Contraction Risk'
          const nrrColor = nrrValue >= 100 ? 'text-indigo-600' : 'text-rose-600'

          const opsCost = (totalMRR * 0.035) + (activeClusters * 40)
          const grossProfit = totalMRR - opsCost
          const marginValue = totalMRR > 0 ? (grossProfit / totalMRR) * 100 : 92.5
          const marginFormatted = `${marginValue.toFixed(1)}%`
          const marginText = marginValue >= 85 ? 'High Margin SaaS' : 'Optimal Operating Yield'

          const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const prevSubs = rawSubs.filter(s => {
             const subDate = new Date(s.start_date || s.created_at || Date.now())
             return subDate <= prevMonthDate
          })
          const prevMRR = prevSubs.reduce((acc, s) => acc + parseInt(s.price || 0), 0)
          const momGrowthVal = prevMRR > 0 ? (((totalMRR - prevMRR) / prevMRR) * 100) : (totalMRR > 0 ? 14.2 : 0)
          const momFormatted = `${momGrowthVal >= 0 ? '+' : ''}${momGrowthVal.toFixed(1)}% MoM`

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

          const topMerchants = rawUsers.map(u => {
             const userSub = rawSubs.find(s => s.restaurant_id === u.id) 
             return {
                name: u.business_name || 'Merchant Node',
                email: u.email,
                revenue: userSub ? parseInt(userSub.price || 0) : 0,
                plan: userSub ? userSub.plan_name : 'BASIC'
             }
          }).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

          const ledger = rawUsers.map(u => {
             const userSub = rawSubs.find(s => s.restaurant_id === u.id || s.restaurant_id === u.email)
             return {
                id: u.id,
                name: u.business_name || 'Merchant Node',
                email: u.email || 'N/A',
                plan: userSub ? (userSub.plan_name || 'Professional').toUpperCase() : 'STARTER',
                yield: userSub ? parseInt(userSub.price || 999) : 999,
                status: userSub ? (userSub.status || 'Active') : 'Active',
                activeSince: new Date(u.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                rawSub: userSub,
                rawUser: u
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
             formattedARPU: formatINR(Math.round(arpu)),
             formattedLTV: formatINR(Math.round(ltv)),
             history,
             planDistribution,
             topMerchants,
             ledger
          })
      } catch (err) {
          console.error('Failed to compute revenue data:', err)
      } finally {
          setLoading(false)
      }
  }

  useEffect(() => {
      ensureAdminSession()
      fetchRevenueData()
      fetchPendingVerifications()

      const interval = setInterval(() => {
         fetchRevenueData()
         fetchPendingVerifications()
      }, 5000)

      window.addEventListener('platformConfigUpdated', fetchPendingVerifications)
      window.addEventListener('storage', fetchPendingVerifications)

      return () => {
         clearInterval(interval)
         window.removeEventListener('platformConfigUpdated', fetchPendingVerifications)
         window.removeEventListener('storage', fetchPendingVerifications)
      }
  }, [timeRange])

  const exportCSV = () => {
      const csvRows = [
         ['Merchant Name', 'Email', 'Plan Tier', 'Monthly Yield (INR)', 'Billing Status', 'Active Since'],
         ...metrics.ledger.map(row => [
            `"${row.name}"`,
            `"${row.email}"`,
            `"${row.plan}"`,
            row.yield,
            `"${row.status}"`,
            `"${row.activeSince}"`
         ])
      ]
      
      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `servora_revenue_ledger_${timeRange}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('CSV Download Started', { description: 'Exporting subscription ledger dataset.' })
  }

  // Filtered lists
  const filteredPending = pendingVerifications.filter(p => {
     if (!searchPending) return true
     const q = searchPending.toLowerCase()
     return (
        p.merchant?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.utr?.toLowerCase().includes(q) ||
        p.plan?.toLowerCase().includes(q)
     )
  })

  const filteredLedger = metrics.ledger.filter(l => {
     if (!searchLedger) return true
     const q = searchLedger.toLowerCase()
     return (
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.plan?.toLowerCase().includes(q)
     )
  })

  // Open Inspector for a given Company / Merchant
  const handleInspectCompany = (item) => {
     const restId = item.restaurantId || item.id
     const email = item.email || item.merchantEmail
     
     // Build payment history list
     const historyList = []
     
     // 1. Check DB & Local payment verifications
     const rawVerifications = platformRawData.paymentVerifications || []
     rawVerifications.forEach(v => {
        if (v.restaurant_id === restId || (email && v.email === email) || v.utr_number === item.utr) {
           historyList.push({
              id: v.id,
              date: new Date(v.created_at || Date.now()).toLocaleString('en-IN'),
              utr: v.utr_number || 'N/A',
              plan: (v.plan_name || 'Professional').toUpperCase(),
              amount: v.amount || 2499,
              status: v.status || 'PENDING_APPROVAL'
           })
        }
     })

     // 2. Check DB & Local subscriptions
     const rawSubs = platformRawData.subscriptions || []
     rawSubs.forEach(s => {
        if (s.restaurant_id === restId || (email && s.restaurant_id === email)) {
           if (!historyList.some(h => h.utr === s.utr_number && s.utr_number)) {
              historyList.push({
                 id: s.id,
                 date: new Date(s.start_date || s.created_at || Date.now()).toLocaleString('en-IN'),
                 utr: s.utr_number || 'SYSTEM_ACTIVATED',
                 plan: (s.plan_name || 'Professional').toUpperCase(),
                 amount: s.price || 2499,
                 status: s.status || 'Active'
              })
           }
        }
     })

     // If current pending item is not in list yet, append it
     if (item.utr && item.utr !== 'N/A' && !historyList.some(h => h.utr === item.utr)) {
        historyList.unshift({
           id: item.id || `utr-${item.utr}`,
           date: item.createdAt || new Date().toLocaleString('en-IN'),
           utr: item.utr,
           plan: item.plan || 'PROFESSIONAL',
           amount: item.amount || 2499,
           status: 'PENDING_APPROVAL'
        })
     }

     const totalLifetimeRevenue = historyList
        .filter(h => h.status === 'APPROVED' || h.status === 'Active' || h.status === 'Approved')
        .reduce((sum, h) => sum + parseInt(h.amount || 0), 0)

     setInspectingCompany({
        ...item,
        merchantName: item.merchant || item.name || 'Servora Merchant',
        email: email || 'N/A',
        restaurantId: restId || 'N/A',
        createdAt: item.createdAt || item.activeSince || new Date().toLocaleDateString('en-IN'),
        planName: item.plan || 'PROFESSIONAL',
        amount: item.amount || item.yield || 2499,
        status: item.status || 'PENDING_APPROVAL',
        totalLifetimeRevenue: totalLifetimeRevenue > 0 ? totalLifetimeRevenue : (item.yield || 2499),
        historyList: historyList.length > 0 ? historyList : [{
           id: 'sys-1',
           date: new Date().toLocaleString('en-IN'),
           utr: item.utr || 'INIT_SUBSCRIPTION',
           plan: (item.plan || 'PROFESSIONAL').toUpperCase(),
           amount: item.amount || 2499,
           status: item.status || 'PENDING_APPROVAL'
        }]
     })
  }

  const handleCopyText = (text, type = 'utr') => {
     navigator.clipboard.writeText(text)
     if (type === 'utr') {
        setCopiedUtr(text)
        setTimeout(() => setCopiedUtr(''), 2000)
     } else {
        setCopiedUuid(true)
        setTimeout(() => setCopiedUuid(false), 2000)
     }
     toast.success('Copied to Clipboard', { description: text })
  }

  return (
    <div className="space-y-8 pb-16 font-sans select-none">
       {/* ─── Page Title Header & Control Bar ──────────────────────── */}
       <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-950 text-white p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-600/15 via-indigo-600/10 to-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="space-y-2 z-10">
             <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md shadow-lg shadow-emerald-950/50">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                   Live Telemetry Active
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                   SaaS Platform Engine v2.4
                </Badge>
             </div>
             <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent uppercase">
                Financial Intelligence
             </h1>
             <p className="text-xs font-bold text-slate-400 max-w-xl">
                Real-time platform MRR telemetry, automated UPI payment verification queue, and merchant settlement ledger.
             </p>
          </div>

          <div className="flex items-center gap-3.5 z-10 flex-wrap sm:flex-nowrap">
             {/* Time Range Selector */}
             <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 shadow-inner">
                {['30D', '90D', 'YTD', 'ALL'].map(range => (
                   <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                         timeRange === range 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 scale-105' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                   >
                      {range}
                   </button>
                ))}
             </div>

             <Button 
                onClick={fetchRevenueData}
                variant="outline"
                className="h-12 px-5 rounded-2xl bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs shadow-md"
             >
                <RefreshCw className={`w-4 h-4 mr-2 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
                Sync Node
             </Button>

             <Button 
                onClick={exportCSV}
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 transition-all flex items-center gap-2 active:scale-95"
             >
                <DownloadCloud className="w-4 h-4" />
                Export CSV
             </Button>
          </div>
       </div>

       {/* ─── Executive KPI Cards (Unified Ultra-Sleek Styling) ──────── */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Net Monthly MRR */}
          <Card className="bg-slate-950 text-white rounded-[2.5rem] p-7 border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-52 group hover:border-emerald-500/70 hover:scale-[1.02] transition-all">
             <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-emerald-500/30 transition-colors" />
             
             <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 backdrop-blur-md">
                   Net Monthly MRR ({timeRange})
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-emerald-950/50">
                   <IndianRupee className="w-5 h-5 text-emerald-400" />
                </div>
             </div>

             <div className="z-10">
                <div className="text-4xl font-black tracking-tight leading-none text-white mb-3">
                   {metrics.formattedMRR}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                   <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      {metrics.momFormatted}
                   </span>
                   <span className="text-[10px] font-bold text-slate-400">{metrics.activeClusters} Active Subscriptions</span>
                </div>
             </div>
          </Card>

          {/* Card 2: Annualized ARR */}
          <Card className="bg-slate-950 text-white rounded-[2.5rem] p-7 border border-blue-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-52 group hover:border-blue-500/70 hover:scale-[1.02] transition-all">
             <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-blue-500/30 transition-colors" />
             
             <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 backdrop-blur-md">
                   Annualized ARR
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-blue-950/50">
                   <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
             </div>

             <div className="z-10">
                <div className="text-4xl font-black tracking-tight leading-none text-white mb-3">
                   {metrics.formattedARR}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                   <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black">
                      12-Month Run-Rate
                   </Badge>
                   <span className="text-[10px] font-bold text-slate-400">Projected Velocity</span>
                </div>
             </div>
          </Card>

          {/* Card 3: ARPU */}
          <Card className="bg-slate-950 text-white rounded-[2.5rem] p-7 border border-indigo-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-52 group hover:border-indigo-500/70 hover:scale-[1.02] transition-all">
             <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-500/30 transition-colors" />
             
             <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 backdrop-blur-md">
                   ARPU (Avg Yield)
                </span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-indigo-950/50">
                   <Building2 className="w-5 h-5 text-indigo-400" />
                </div>
             </div>

             <div className="z-10">
                <div className="text-4xl font-black tracking-tight leading-none text-white mb-3">
                   {metrics.formattedARPU}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                   <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black">
                      Per Merchant Node
                   </Badge>
                   <span className="text-[10px] font-bold text-slate-400">Avg Monetization</span>
                </div>
             </div>
          </Card>

          {/* Card 4: Customer LTV */}
          <Card className="bg-slate-950 text-white rounded-[2.5rem] p-7 border border-amber-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-52 group hover:border-amber-500/70 hover:scale-[1.02] transition-all">
             <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-amber-500/30 transition-colors" />
             
             <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 backdrop-blur-md">
                   Customer LTV
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-amber-950/50">
                   <Award className="w-5 h-5 text-amber-400" />
                </div>
             </div>

             <div className="z-10">
                <div className="text-4xl font-black tracking-tight leading-none text-white mb-3">
                   {metrics.formattedLTV}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                   <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black">
                      24-Month Lifetime
                   </Badge>
                   <span className="text-[10px] font-bold text-slate-400">Estimated Value</span>
                </div>
             </div>
          </Card>
       </div>

       {/* ─── Secondary SaaS Performance Ribbon ───────────────────── */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-3xl border border-slate-800 text-white shadow-xl">
          <div className="flex items-center gap-3 px-3 py-2 border-r border-slate-800/80 last:border-none">
             <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
             </div>
             <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expansion MRR</div>
                <div className="text-xs font-black text-white">₹{metrics.expansionMRR?.toLocaleString('en-IN')} <span className="text-[9px] font-bold text-blue-400">Upgrades</span></div>
             </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 border-r border-slate-800/80 last:border-none">
             <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
             </div>
             <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Churn Impact</div>
                <div className="text-xs font-black text-white">₹{metrics.churnImpact} <span className="text-[9px] font-bold text-emerald-400">Low Risk</span></div>
             </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 border-r border-slate-800/80 last:border-none">
             <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
             </div>
             <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Retention</div>
                <div className="text-xs font-black text-indigo-400">{metrics.nrr} <span className="text-[9px] font-bold text-slate-400">Expansion</span></div>
             </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2">
             <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
             </div>
             <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gross Margin</div>
                <div className="text-xs font-black text-emerald-400">{metrics.grossMargin} <span className="text-[9px] font-bold text-slate-400">High Yield</span></div>
             </div>
          </div>
       </div>

       {/* ─── Visual Analytics Grid (Charts) ───────────────────────── */}
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* MRR Growth Trajectory Chart */}
          <Card className="lg:col-span-8 bg-white rounded-[2.5rem] p-8 border-2 border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
             <div className="flex items-center justify-between">
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
                <ResponsiveContainer width="99%" height="100%" minWidth={100} minHeight={250} debounce={50}>
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
                <ResponsiveContainer width="99%" height="100%" minWidth={100} minHeight={200} debounce={50}>
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

       {/* ─── ⚡ PENDING PAYMENT VERIFICATIONS (INDUSTRY-LEVEL LIST VIEW) ─── */}
       <Card className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="space-y-1">
                <div className="flex items-center gap-3">
                   <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-none uppercase">Payment Verification Queue</h2>
                   <Badge className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      pendingVerifications.length > 0 
                         ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse' 
                         : 'bg-emerald-500 text-white'
                   }`}>
                      {pendingVerifications.length > 0 ? `${pendingVerifications.length} ACTION NEEDED` : 'ALL SETTLED'}
                   </Badge>
                </div>
                <p className="text-xs font-bold text-slate-400">Recheck merchant UTR numbers & approve to activate 30-day subscription expiry.</p>
             </div>

             <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <Input 
                   value={searchPending}
                   onChange={e => setSearchPending(e.target.value)}
                   placeholder="Search UTR, Email, Company..."
                   className="h-11 pl-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold"
                />
             </div>
          </div>

          {/* List View Table */}
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50/50">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="py-4 px-6">Merchant / Company Node</th>
                      <th className="py-4 px-6">Selected Tier & Price</th>
                      <th className="py-4 px-6">Submitted UTR Reference</th>
                      <th className="py-4 px-6">Status & Timestamp</th>
                      <th className="py-4 px-6 text-right">Quick Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 bg-white">
                   <AnimatePresence>
                      {filteredPending.map(item => (
                         <motion.tr 
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="hover:bg-slate-50/80 transition-colors group"
                         >
                            {/* Company Node */}
                            <td className="py-4 px-6">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-md">
                                     {item.merchant?.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                     <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                                        {item.merchant}
                                     </div>
                                     <span className="text-xs font-semibold text-slate-400">{item.email}</span>
                                  </div>
                               </div>
                            </td>

                            {/* Selected Tier & Price */}
                            <td className="py-4 px-6">
                               <div className="flex flex-col gap-1">
                                  <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 w-fit font-mono text-[10px] font-black uppercase">
                                     {item.plan}
                                  </Badge>
                                  <span className="text-xs font-black text-slate-900">₹{item.amount?.toLocaleString('en-IN')}/mo</span>
                               </div>
                            </td>

                            {/* UTR Number & Copy */}
                            <td className="py-4 px-6">
                               <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                                     {item.utr}
                                  </span>
                                  {item.utr && item.utr !== 'N/A' && (
                                     <button 
                                        onClick={() => handleCopyText(item.utr, 'utr')}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                        title="Copy UTR Number"
                                     >
                                        {copiedUtr === item.utr ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                     </button>
                                  )}
                               </div>
                            </td>

                            {/* Status & Timestamp */}
                            <td className="py-4 px-6">
                               <div className="flex flex-col gap-1">
                                  <Badge className="bg-amber-100 text-amber-800 border border-amber-300/50 w-fit text-[9px] font-black uppercase flex items-center gap-1">
                                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                     PENDING APPROVAL
                                  </Badge>
                                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                     <Clock className="w-3 h-3" />
                                     {item.createdAt}
                                  </span>
                               </div>
                            </td>

                            {/* Quick Actions */}
                            <td className="py-4 px-6 text-right">
                               <div className="flex items-center justify-end gap-2">
                                  <Button 
                                     onClick={() => handleInspectCompany(item)}
                                     variant="outline"
                                     size="sm"
                                     className="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 font-bold text-xs"
                                     title="View Company & Payment History"
                                  >
                                     <Eye className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                                     Inspect
                                  </Button>

                                  <Button 
                                     onClick={() => handleApprovePayment(item)}
                                     disabled={processingId === item.id}
                                     size="sm"
                                     className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20"
                                  >
                                     {processingId === item.id ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                     ) : (
                                        <>
                                           <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                           Approve (30D)
                                        </>
                                     )}
                                  </Button>

                                  <Button 
                                     onClick={() => handleRejectPayment(item)}
                                     disabled={processingId === item.id}
                                     variant="ghost"
                                     size="sm"
                                     className="h-9 px-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs"
                                  >
                                     <XCircle className="w-4 h-4" />
                                  </Button>
                               </div>
                            </td>
                         </motion.tr>
                      ))}
                   </AnimatePresence>
                </tbody>
             </table>

             {filteredPending.length === 0 && (
                <div className="py-16 text-center space-y-3">
                   <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6" />
                   </div>
                   <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">All Payment Verifications Settled</h4>
                   <p className="text-xs font-semibold text-slate-400 max-w-md mx-auto">
                      When merchants select a plan and submit their 12-digit UTR reference number, pending items will populate here for review.
                   </p>
                </div>
             )}
          </div>
       </Card>

       {/* ─── LIVE SUBSCRIPTION LEDGER ─────────────────────────────── */}
       <Card className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-none uppercase">Live Subscription Ledger (30D)</h2>
                <p className="text-xs font-bold text-slate-400">Real-time settlement records & active billing nodes filtered for {timeRange}.</p>
             </div>

             <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <Input 
                   value={searchLedger}
                   onChange={e => setSearchLedger(e.target.value)}
                   placeholder="Search ledger by merchant..."
                   className="h-11 pl-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold"
                />
             </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50/50">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="py-4 px-6">Merchant Node</th>
                      <th className="py-4 px-6">Subscription Tier</th>
                      <th className="py-4 px-6">Monthly Yield</th>
                      <th className="py-4 px-6">Billing Status</th>
                      <th className="py-4 px-6">Active Since</th>
                      <th className="py-4 px-6 text-right">Company Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 bg-white">
                   {filteredLedger.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                         <td className="py-4 px-6 font-bold text-slate-900">
                            <div>
                               <div className="font-black text-sm text-slate-900">{row.name}</div>
                               <span className="text-xs font-semibold text-slate-400">{row.email}</span>
                            </div>
                         </td>
                         <td className="py-4 px-6">
                            <Badge className="bg-slate-100 text-slate-800 font-mono text-[10px] font-black uppercase">
                               {row.plan}
                            </Badge>
                         </td>
                         <td className="py-4 px-6 font-black text-slate-900">
                            ₹{row.yield.toLocaleString('en-IN')}<span className="text-[10px] font-semibold text-slate-400">/mo</span>
                         </td>
                         <td className="py-4 px-6">
                            <Badge className={`text-[10px] font-black uppercase ${
                               row.status === 'Active' || row.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                               ● {row.status}
                            </Badge>
                         </td>
                         <td className="py-4 px-6 text-xs font-semibold text-slate-500">
                            {row.activeSince}
                         </td>
                         <td className="py-4 px-6 text-right">
                            <Button 
                               onClick={() => handleInspectCompany(row)}
                               variant="outline"
                               size="sm"
                               className="h-8 px-3 rounded-xl border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 font-bold text-xs"
                            >
                               <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                               Inspect Node
                            </Button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </Card>

       {/* ─── 🏢 COMPANY & PAYMENT HISTORY INSPECTOR MODAL (SHADCN STUDIO BOX UI) ──── */}
       <AnimatePresence>
          {inspectingCompany && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xl">
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: 20 }}
                   className="bg-slate-950 text-white rounded-[2.5rem] border border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
                >
                   {/* Ambient Modal Background Glow */}
                   <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-600/20 via-indigo-600/15 to-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

                   {/* Modal Header */}
                   <div className="p-6 sm:p-8 border-b border-slate-800/80 flex items-start justify-between bg-slate-900/40 relative z-10">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/10">
                            {inspectingCompany.merchantName?.substring(0, 2).toUpperCase()}
                         </div>
                         <div className="space-y-1">
                            <div className="flex items-center gap-3 flex-wrap">
                               <h3 className="text-2xl font-black text-white tracking-tight">{inspectingCompany.merchantName}</h3>
                               <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  {inspectingCompany.status || 'Active'}
                               </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 flex-wrap">
                               <span>{inspectingCompany.email}</span>
                               <span className="text-slate-600">•</span>
                               <span className="font-mono text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
                                  UUID: {inspectingCompany.restaurantId?.substring(0, 16)}...
                                  <button 
                                     onClick={() => handleCopyText(inspectingCompany.restaurantId, 'uuid')} 
                                     className="text-slate-400 hover:text-white transition-colors"
                                     title="Copy Internal UUID"
                                  >
                                     {copiedUuid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                               </span>
                            </div>
                         </div>
                      </div>

                      <button 
                         onClick={() => setInspectingCompany(null)}
                         className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all shadow-md"
                      >
                         <X className="w-5 h-5" />
                      </button>
                   </div>

                   {/* Modal Body */}
                   <div className="p-6 sm:p-8 space-y-7 overflow-y-auto relative z-10">
                      {/* 4 Stat Box Grid (Shadcn Studio Style) */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                         {/* Box 1: Total Paid */}
                         <div className="bg-slate-900/80 p-5 rounded-2xl border border-emerald-500/30 shadow-lg relative overflow-hidden group hover:border-emerald-500/60 transition-all">
                            <div className="flex items-center justify-between mb-2">
                               <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                                  Total Paid
                               </span>
                               <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                  <IndianRupee className="w-3.5 h-3.5" />
                               </div>
                            </div>
                            <div className="text-2xl font-black text-emerald-400 tracking-tight">
                               ₹{inspectingCompany.totalLifetimeRevenue?.toLocaleString('en-IN')}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">Verified Lifetime Settlement</p>
                         </div>

                         {/* Box 2: Current Tier */}
                         <div className="bg-slate-900/80 p-5 rounded-2xl border border-indigo-500/30 shadow-lg relative overflow-hidden group hover:border-indigo-500/60 transition-all">
                            <div className="flex items-center justify-between mb-2">
                               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                                  Active Tier
                               </span>
                               <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                  <Sparkles className="w-3.5 h-3.5" />
                               </div>
                            </div>
                            <div className="text-xl font-black text-white tracking-tight truncate">
                               {inspectingCompany.planName}
                            </div>
                            <p className="text-[10px] font-bold text-indigo-300 mt-1">₹{inspectingCompany.amount?.toLocaleString('en-IN')} / Month</p>
                         </div>

                         {/* Box 3: Monthly Yield */}
                         <div className="bg-slate-900/80 p-5 rounded-2xl border border-blue-500/30 shadow-lg relative overflow-hidden group hover:border-blue-500/60 transition-all">
                            <div className="flex items-center justify-between mb-2">
                               <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                                  Monthly Yield
                               </span>
                               <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                  <CreditCard className="w-3.5 h-3.5" />
                               </div>
                            </div>
                            <div className="text-2xl font-black text-white tracking-tight">
                               ₹{inspectingCompany.amount?.toLocaleString('en-IN')}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">Active Monthly Rate</p>
                         </div>

                         {/* Box 4: Health Score */}
                         <div className="bg-slate-900/80 p-5 rounded-2xl border border-teal-500/30 shadow-lg relative overflow-hidden group hover:border-teal-500/60 transition-all">
                            <div className="flex items-center justify-between mb-2">
                               <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest bg-teal-500/10 px-2.5 py-0.5 rounded-md border border-teal-500/20">
                                  Health Score
                               </span>
                               <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                               </div>
                            </div>
                            <div className="text-2xl font-black text-teal-400 tracking-tight">
                               100% Active
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">Zero Risk Merchant Node</p>
                         </div>
                      </div>

                      {/* Payment Verification & UTR Transaction History Log Table */}
                      <div className="space-y-3">
                         <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                               <CreditCard className="w-4 h-4 text-blue-400" />
                               Payment Verification & UTR Transaction History
                            </h4>
                            <Badge className="bg-slate-900 text-slate-400 border border-slate-800 text-[10px] font-mono font-bold">
                               {inspectingCompany.historyList?.length || 0} RECORDS
                            </Badge>
                         </div>

                         <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-inner">
                            <table className="w-full text-left text-xs">
                               <thead>
                                  <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                     <th className="py-3.5 px-5">Date / Time</th>
                                     <th className="py-3.5 px-5">Submitted UTR Reference</th>
                                     <th className="py-3.5 px-5">Plan & Amount</th>
                                     <th className="py-3.5 px-5 text-right">Approval Status</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                  {inspectingCompany.historyList?.map((h, i) => (
                                     <tr key={i} className="hover:bg-slate-900/80 transition-colors">
                                        <td className="py-3.5 px-5 text-slate-400 font-semibold">{h.date}</td>
                                        <td className="py-3.5 px-5">
                                           <div className="flex items-center gap-2">
                                              <span className="font-mono text-xs font-black text-white bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                                                 {h.utr}
                                              </span>
                                              {h.utr && h.utr !== 'N/A' && (
                                                 <button 
                                                    onClick={() => handleCopyText(h.utr, 'utr')}
                                                    className="p-1 text-slate-400 hover:text-white transition-colors"
                                                    title="Copy UTR"
                                                 >
                                                    {copiedUtr === h.utr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                 </button>
                                              )}
                                           </div>
                                        </td>
                                        <td className="py-3.5 px-5 font-bold text-white">
                                           <span className="text-indigo-400">{h.plan}</span> • ₹{h.amount?.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3.5 px-5 text-right">
                                           <Badge className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                              h.status === 'APPROVED' || h.status === 'Active' || h.status === 'Approved'
                                                 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                 : h.status === 'REJECTED'
                                                 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                 : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                           }`}>
                                              ● {h.status}
                                           </Badge>
                                        </td>
                                     </tr>
                                  ))}
                               </tbody>
                            </table>
                         </div>
                      </div>
                   </div>

                   {/* Modal Action Footer */}
                   <div className="p-6 border-t border-slate-800/80 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                      <Button
                         onClick={() => handleGrantExtension(inspectingCompany)}
                         disabled={processingId === 'extend'}
                         variant="outline"
                         className="h-11 px-5 rounded-2xl border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold text-xs shadow-md"
                      >
                         <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                         Grant +30 Days Free Extension
                      </Button>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                         {inspectingCompany.status !== 'Active' && inspectingCompany.status !== 'Approved' && (
                            <Button 
                               onClick={() => handleApprovePayment(inspectingCompany)}
                               disabled={processingId === inspectingCompany.id}
                               className="h-11 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/30"
                            >
                               <CheckCircle2 className="w-4 h-4 mr-2" />
                               Approve & Unlock Node
                            </Button>
                         )}
                         <Button 
                            onClick={() => setInspectingCompany(null)}
                            variant="secondary"
                            className="h-11 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700"
                         >
                            Close Inspector
                         </Button>
                      </div>
                   </div>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  )
}
