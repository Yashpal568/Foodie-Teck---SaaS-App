import { useState, useEffect, useMemo } from 'react'
import { supabase, ensureAdminSession } from '@/lib/adminSupabase'
import { getAdminPlatformData, approveMerchantPayment } from '@/lib/adminDataService'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DownloadCloud, 
  IndianRupee, 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  X, 
  Copy, 
  Check, 
  Calendar, 
  Sparkles, 
  ChevronRight, 
  AlertCircle,
  Filter,
  CheckCheck,
  ShieldAlert,
  ArrowUpRight,
  LayoutGrid,
  List,
  Layers,
  ArrowRight,
  TrendingUp,
  FileText,
  BadgeCheck,
  Send,
  SlidersHorizontal,
  ExternalLink,
  ChevronDown,
  Hash,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { triggerPushNotification } from '@/lib/pushNotifications'

export default function AdminVerificationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('PENDING') // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'amount_high' | 'amount_low'
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  
  // Data States
  const [pendingVerifications, setPendingVerifications] = useState([])
  const [historicalVerifications, setHistoricalVerifications] = useState([])
  const [restaurantsMap, setRestaurantsMap] = useState({})

  // Inspection Drawer & Reject Dialog States
  const [inspectingItem, setInspectingItem] = useState(null)
  const [rejectingItem, setRejectingItem] = useState(null)
  const [rejectReason, setRejectReason] = useState('Invalid UTR Reference Number')
  const [customRejectReason, setCustomRejectReason] = useState('')
  const [copiedUtr, setCopiedUtr] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [extensionDays, setExtensionDays] = useState(30)

  // Fetch Verification Data
  const fetchData = async () => {
    try {
      setLoading(true)
      const platformData = await getAdminPlatformData()
      setPendingVerifications(platformData.pendingVerifications || [])

      // Map restaurants by ID
      const rMap = {}
      ;(platformData.restaurants || []).forEach(r => {
        rMap[r.id] = r
        if (r.email) rMap[r.email] = r
      })
      setRestaurantsMap(rMap)

      // Fetch all historical verification records
      const { data: allRecords } = await supabase
        .from('payment_verifications')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (allRecords) {
        setHistoricalVerifications(allRecords)
      }
    } catch (err) {
      console.error('Failed to fetch verification queue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ensureAdminSession()
    fetchData()

    const interval = setInterval(fetchData, 4000)
    window.addEventListener('platformConfigUpdated', fetchData)
    window.addEventListener('storage', fetchData)

    const channel = supabase.channel('admin_verifications_live_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_verifications' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, fetchData)
      .subscribe()

    return () => {
      clearInterval(interval)
      window.removeEventListener('platformConfigUpdated', fetchData)
      window.removeEventListener('storage', fetchData)
      supabase.removeChannel(channel)
    }
  }, [])

  // Aggregate items according to active filter
  const displayedItems = useMemo(() => {
    let list = []

    if (filterStatus === 'PENDING') {
      list = [...pendingVerifications]
    } else if (filterStatus === 'APPROVED') {
      list = historicalVerifications
        .filter(v => v.status === 'APPROVED' || v.status === 'Approved')
        .map(v => ({
          id: v.id,
          merchant: v.merchant_name || 'Servora Merchant',
          email: v.email || 'N/A',
          restaurantId: v.restaurant_id,
          plan: v.plan_name || 'Professional',
          amount: v.amount || 2499,
          utr: v.utr_number || 'N/A',
          status: 'APPROVED',
          createdAt: new Date(v.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          rawDate: new Date(v.created_at || Date.now()).getTime()
        }))
    } else if (filterStatus === 'REJECTED') {
      list = historicalVerifications
        .filter(v => v.status === 'REJECTED' || v.status === 'Rejected')
        .map(v => ({
          id: v.id,
          merchant: v.merchant_name || 'Servora Merchant',
          email: v.email || 'N/A',
          restaurantId: v.restaurant_id,
          plan: v.plan_name || 'Professional',
          amount: v.amount || 2499,
          utr: v.utr_number || 'N/A',
          status: 'REJECTED',
          createdAt: new Date(v.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          rawDate: new Date(v.created_at || Date.now()).getTime()
        }))
    } else {
      // ALL: Combine Pending + Historical
      const combined = [...pendingVerifications]
      historicalVerifications.forEach(v => {
        if (!combined.some(c => c.utr === v.utr_number && v.utr_number)) {
          combined.push({
            id: v.id,
            merchant: v.merchant_name || 'Servora Merchant',
            email: v.email || 'N/A',
            restaurantId: v.restaurant_id,
            plan: v.plan_name || 'Professional',
            amount: v.amount || 2499,
            utr: v.utr_number || 'N/A',
            status: v.status || 'PENDING_APPROVAL',
            createdAt: new Date(v.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            rawDate: new Date(v.created_at || Date.now()).getTime()
          })
        }
      })
      list = combined
    }

    // Apply Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(item => 
        item.merchant?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.utr?.toLowerCase().includes(q) ||
        item.plan?.toLowerCase().includes(q) ||
        item.restaurantId?.toLowerCase().includes(q)
      )
    }

    // Apply Sorting
    if (sortBy === 'amount_high') {
      list.sort((a, b) => (parseInt(b.amount) || 0) - (parseInt(a.amount) || 0))
    } else if (sortBy === 'amount_low') {
      list.sort((a, b) => (parseInt(a.amount) || 0) - (parseInt(b.amount) || 0))
    } else {
      list.sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0))
    }

    return list
  }, [filterStatus, pendingVerifications, historicalVerifications, searchQuery, sortBy])

  // Aggregate Metrics
  const totalPendingAmount = pendingVerifications.reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0)
  const approvedCount = historicalVerifications.filter(v => v.status === 'APPROVED' || v.status === 'Approved').length
  const rejectedCount = historicalVerifications.filter(v => v.status === 'REJECTED' || v.status === 'Rejected').length
  const totalProcessedValue = historicalVerifications
    .filter(v => v.status === 'APPROVED' || v.status === 'Approved')
    .reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0)

  // Copy helper
  const handleCopy = (text, type = 'utr') => {
    navigator.clipboard.writeText(text)
    if (type === 'utr') {
      setCopiedUtr(text)
      setTimeout(() => setCopiedUtr(''), 2000)
    } else {
      setCopiedId(text)
      setTimeout(() => setCopiedId(''), 2000)
    }
    toast.success('Copied to Clipboard', { description: text })
  }

  // Approve Payment Action
  const handleApprove = async (item, days = 30) => {
    try {
      setProcessingId(item.id)

      // Optimistic filter
      setPendingVerifications(prev => prev.filter(p => 
        p.id !== item.id && 
        p.utr !== item.utr && 
        p.restaurantId !== item.restaurantId &&
        (!item.email || p.email?.toLowerCase() !== item.email?.toLowerCase())
      ))

      await approveMerchantPayment({ ...item, daysToGrant: days })

      window.dispatchEvent(new Event('platformConfigUpdated'))

      triggerPushNotification({
        title: '🎉 Payment Verified & License Activated!',
        body: `UTR #${item.utr} approved. ${item.merchant} activated for ${days} days.`,
        sound: true
      })

      toast.success('🎉 Subscription License Activated!', {
        description: `Verified UTR #${item.utr}. ${item.merchant} unlocked for ${days} days.`
      })

      if (inspectingItem) setInspectingItem(null)
      fetchData()
    } catch (err) {
      console.error('Approval failed:', err)
      toast.error('Approval Error', { description: err.message })
    } finally {
      setProcessingId(null)
    }
  }

  // Reject Payment Action
  const handleConfirmReject = async () => {
    if (!rejectingItem) return
    const item = rejectingItem
    const finalReason = rejectReason === 'Other' ? (customRejectReason || 'Payment rejected by system administrator') : rejectReason

    try {
      setProcessingId(item.id)

      setPendingVerifications(prev => prev.filter(p => 
        p.id !== item.id && 
        p.utr !== item.utr && 
        p.restaurantId !== item.restaurantId &&
        (!item.email || p.email?.toLowerCase() !== item.email?.toLowerCase())
      ))

      if (item.utr && item.utr !== 'N/A') {
        await supabase.from('payment_verifications').update({ status: 'REJECTED' }).eq('utr_number', item.utr)
      }
      if (item.restaurantId) {
        await supabase.from('payment_verifications').update({ status: 'REJECTED' }).eq('restaurant_id', item.restaurantId)
        await supabase.from('subscriptions').update({ status: 'REJECTED' }).eq('restaurant_id', item.restaurantId)
      }
      if (item.id && !item.id.toString().startsWith('sub-')) {
        await supabase.from('payment_verifications').update({ status: 'REJECTED' }).eq('id', item.id)
      }

      try {
        await supabase.from('audit_logs').insert({
          restaurant_id: item.restaurantId,
          action: `Payment Rejected: UTR #${item.utr} (${finalReason})`,
          actor: 'admin@servora',
          severity: 'WARNING'
        })
      } catch (e) {}

      window.dispatchEvent(new Event('platformConfigUpdated'))

      triggerPushNotification({
        title: '❌ Payment Verification Rejected',
        body: `UTR #${item.utr} marked as invalid. Reason: ${finalReason}`,
        sound: true
      })

      toast.error('Payment Verification Rejected', {
        description: `UTR #${item.utr} flagged: ${finalReason}`
      })

      setRejectingItem(null)
      if (inspectingItem) setInspectingItem(null)
      fetchData()
    } catch (err) {
      console.error('Rejection failed:', err)
      toast.error('Rejection Failed', { description: err.message })
    } finally {
      setProcessingId(null)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Merchant', 'Email', 'Restaurant_ID', 'Plan', 'Amount_INR', 'UTR_Number', 'Status', 'Date']
      const rows = displayedItems.map(item => [
        `"${item.merchant || ''}"`,
        `"${item.email || ''}"`,
        `"${item.restaurantId || ''}"`,
        `"${item.plan || ''}"`,
        item.amount || 0,
        `"${item.utr || ''}"`,
        `"${item.status || ''}"`,
        `"${item.createdAt || ''}"`
      ])

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `Servora_Payment_Verifications_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Verification Records Exported to CSV')
    } catch (err) {
      toast.error('Export Failed')
    }
  }

  // Inspection Drawer
  const openInspector = (item) => {
    const restData = restaurantsMap[item.restaurantId] || restaurantsMap[item.email] || {}
    const historyList = []

    historicalVerifications.forEach(v => {
      if (v.restaurant_id === item.restaurantId || (item.email && v.email === item.email) || v.utr_number === item.utr) {
        historyList.push({
          id: v.id,
          date: new Date(v.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          utr: v.utr_number || 'N/A',
          plan: (v.plan_name || 'Professional').toUpperCase(),
          amount: v.amount || 2499,
          status: v.status || 'PENDING_APPROVAL'
        })
      }
    })

    if (item.utr && item.utr !== 'N/A' && !historyList.some(h => h.utr === item.utr)) {
      historyList.unshift({
        id: item.id || `utr-${item.utr}`,
        date: item.createdAt || 'Just now',
        utr: item.utr,
        plan: (item.plan || 'PROFESSIONAL').toUpperCase(),
        amount: item.amount || 2499,
        status: item.status || 'PENDING_APPROVAL'
      })
    }

    setInspectingItem({
      ...item,
      merchantName: item.merchant || restData.business_name || restData.name || 'Servora Merchant',
      email: item.email || restData.email || 'N/A',
      phone: restData.phone || restData.owner_phone || '+91 98765 43210',
      address: restData.address || 'Registered Merchant Location',
      restaurantId: item.restaurantId || restData.id || 'N/A',
      createdAt: item.createdAt || new Date(restData.created_at || Date.now()).toLocaleDateString('en-IN'),
      planName: item.plan || 'PROFESSIONAL',
      amount: item.amount || 2499,
      status: item.status || 'PENDING_APPROVAL',
      historyList
    })
  }

  return (
    <div className="space-y-8 pb-20 font-sans select-none">
      
      {/* ─── ⚡ ULTRA-PREMIUM COMMAND HERO HEADER ────────────────────── */}
      <div className="relative overflow-hidden rounded-[2.75rem] bg-slate-950 text-white p-8 sm:p-10 border border-slate-800/80 shadow-2xl backdrop-blur-2xl">
        {/* Glow ambient meshes */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-gradient-to-br from-indigo-600/20 via-amber-500/15 to-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-950/50 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Live Settlement Gateway
              </Badge>
              <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                12-Digit UTR Forensic Engine
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                Instant 30-Day Auto License
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent uppercase">
              Payment Verifications
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-400 leading-relaxed">
              Forensic validation of incoming UPI UTR transaction reference numbers. 1-click approvals instantly provision 30-day merchant workspace access, generate GST tax invoices, and notify store owners.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-3 z-10 flex-wrap sm:flex-nowrap">
            <Button 
              onClick={fetchData}
              variant="outline"
              className="h-12 px-5 rounded-2xl bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 mr-2 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
              Sync Live Pipeline
            </Button>

            <Button 
              onClick={handleExportCSV}
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <DownloadCloud className="w-4 h-4" />
              Export Records
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 📊 EXECUTIVE KPI BENTO GRID ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Bento 1: Pending Approvals */}
        <Card className="bg-slate-950 text-white rounded-[2.5rem] p-7 border border-amber-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-52 group hover:border-amber-500/70 hover:scale-[1.02] transition-all">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-amber-500/30 transition-colors" />
          
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 backdrop-blur-md">
              Pending Inflow Queue
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-amber-950/50">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div className="z-10">
            <div className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-white mb-2 flex items-baseline gap-2">
              {pendingVerifications.length}
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Awaiting Approval</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">Requires manual or 1-click verification</span>
            </div>
          </div>
        </Card>

        {/* Bento 2: Locked Settlement Volume */}
        <Card className="bg-slate-950 text-white rounded-[2.5rem] p-7 border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-52 group hover:border-emerald-500/70 hover:scale-[1.02] transition-all">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-emerald-500/30 transition-colors" />
          
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 backdrop-blur-md">
              Queue Value (INR)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-emerald-950/50">
              <IndianRupee className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="z-10">
            <div className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-white mb-2">
              ₹{totalPendingAmount.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                Pipeline Inflow
              </Badge>
              <span className="text-[10px] font-bold text-slate-400">Direct UPI Submissions</span>
            </div>
          </div>
        </Card>

        {/* Bento 3: Historical Approvals */}
        <Card className="bg-slate-950 text-white rounded-[2.5rem] p-7 border border-indigo-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-52 group hover:border-indigo-500/70 hover:scale-[1.02] transition-all">
          <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-500/30 transition-colors" />
          
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 backdrop-blur-md">
              Total Approved
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-indigo-950/50">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div className="z-10">
            <div className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-white mb-2 flex items-baseline gap-2">
              {approvedCount}
              <span className="text-xs font-bold text-indigo-400">Nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">₹{totalProcessedValue.toLocaleString('en-IN')} Total Settled</span>
            </div>
          </div>
        </Card>

        {/* Bento 4: Verification SLA */}
        <Card className="bg-slate-950 text-white rounded-[2.5rem] p-7 border border-blue-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-52 group hover:border-blue-500/70 hover:scale-[1.02] transition-all">
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-blue-500/30 transition-colors" />
          
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 backdrop-blur-md">
              Verification Protocol
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center backdrop-blur-md shadow-lg shadow-blue-950/50">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          <div className="z-10">
            <div className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-white mb-2">
              &lt; 10m
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">99.8% On-Time SLA Fulfillment</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── 🔍 INTERACTIVE PIPELINE CONTROL & FILTER TOOLBAR ───────── */}
      <div className="bg-white rounded-[2.25rem] p-6 border-2 border-slate-200/90 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Segmented Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
            {[
              { id: 'PENDING', label: 'Pending Action', count: pendingVerifications.length, color: 'bg-amber-500 text-white' },
              { id: 'APPROVED', label: 'Approved Licenses', count: approvedCount, color: 'bg-emerald-500 text-white' },
              { id: 'REJECTED', label: 'Flagged / Rejected', count: rejectedCount, color: 'bg-rose-500 text-white' },
              { id: 'ALL', label: 'All Transactions', count: pendingVerifications.length + historicalVerifications.length, color: 'bg-slate-700 text-white' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-slate-950 text-white shadow-xl shadow-slate-950/20 scale-[1.02]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${tab.color}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search, Sort, & View Switcher */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search UTR, Email, Merchant..."
                className="h-11 pl-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold focus:bg-white"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-11 px-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <option value="newest">Newest First</option>
              <option value="amount_high">Highest Value</option>
              <option value="amount_low">Lowest Value</option>
            </select>

            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-white text-slate-950 shadow-md font-bold' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'table' 
                    ? 'bg-white text-slate-950 shadow-md font-bold' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Dense Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ⚡ VIEW MODE: GRID VIEW ───────────────────────────────── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {displayedItems.map((item, idx) => {
              const isPending = item.status === 'PENDING_APPROVAL' || !item.status || item.status === 'Pending'
              const isApproved = item.status === 'APPROVED' || item.status === 'Active' || item.status === 'Approved'
              const isRejected = item.status === 'REJECTED' || item.status === 'Rejected'
              const planName = (item.plan || 'PROFESSIONAL').toUpperCase()

              return (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={`rounded-[2.25rem] bg-white border-2 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full group ${
                    isPending ? 'border-amber-400/80 hover:border-amber-500' : isApproved ? 'border-emerald-400/80' : 'border-rose-400/80'
                  }`}>
                    
                    {/* Top Status Header */}
                    <div className="p-6 pb-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <Badge className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                          isPending 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300/80 shadow-sm animate-pulse' 
                            : isApproved 
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${isPending ? 'bg-amber-500 animate-ping' : isApproved ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {isPending ? 'Pending Verification' : isApproved ? 'Approved & Active' : 'Payment Flagged'}
                        </Badge>

                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.createdAt}
                        </span>
                      </div>

                      {/* Merchant Avatar & Info */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white font-black text-base flex items-center justify-center shadow-lg shadow-indigo-950/20 group-hover:scale-105 transition-transform shrink-0 border border-indigo-500/20">
                          {item.merchant?.substring(0, 2).toUpperCase() || 'TX'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-base text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {item.merchant || 'Servora Merchant'}
                          </h3>
                          <p className="text-xs font-semibold text-slate-500 truncate">
                            {item.email || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Plan Tier & Value Pill */}
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-black uppercase">
                            {planName}
                          </Badge>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Plan License</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-950">₹{item.amount?.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] font-bold text-slate-400 ml-1">/mo</span>
                        </div>
                      </div>

                      {/* 12-Digit UTR Forensic Box */}
                      <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-1.5 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-indigo-400" />
                            Submitted UTR Code
                          </span>
                          {item.utr && item.utr !== 'N/A' && (
                            <button
                              onClick={() => handleCopy(item.utr, 'utr')}
                              className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedUtr === item.utr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              {copiedUtr === item.utr ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>
                        <p className="font-mono text-sm font-black tracking-widest text-amber-300">
                          {item.utr || 'NOT_SUBMITTED'}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-6 pt-0 border-t border-slate-100 pt-4 flex items-center gap-2">
                      <Button
                        onClick={() => openInspector(item)}
                        variant="outline"
                        size="sm"
                        className="h-10 px-3 rounded-xl border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 font-bold text-xs flex-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                        Inspect
                      </Button>

                      {isPending && (
                        <>
                          <Button
                            onClick={() => handleApprove(item)}
                            disabled={processingId === item.id}
                            size="sm"
                            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 flex-1 cursor-pointer transition-all active:scale-95"
                          >
                            {processingId === item.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => setRejectingItem(item)}
                            disabled={processingId === item.id}
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs shrink-0 cursor-pointer"
                            title="Flag / Reject Payment"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {!isPending && (
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 px-2 py-1">
                          {isApproved ? <BadgeCheck className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                          {item.status}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─── 📋 VIEW MODE: ENTERPRISE DATA TABLE VIEW ──────────────── */}
      {viewMode === 'table' && (
        <Card className="bg-white rounded-[2.25rem] p-6 border-2 border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="py-4 px-6">Merchant & Contact Node</th>
                  <th className="py-4 px-6">Tier & Price</th>
                  <th className="py-4 px-6">12-Digit UTR Proof</th>
                  <th className="py-4 px-6">Status & Time</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 bg-white">
                <AnimatePresence>
                  {displayedItems.map((item, idx) => {
                    const isPending = item.status === 'PENDING_APPROVAL' || !item.status || item.status === 'Pending'
                    const isApproved = item.status === 'APPROVED' || item.status === 'Active' || item.status === 'Approved'

                    return (
                      <motion.tr 
                        key={item.id || idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Merchant Node */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white font-black text-xs flex items-center justify-center shadow-md">
                              {item.merchant?.substring(0, 2).toUpperCase() || 'TX'}
                            </div>
                            <div>
                              <div className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {item.merchant}
                              </div>
                              <span className="text-xs font-semibold text-slate-400">{item.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Plan & Price */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 w-fit font-mono text-[10px] font-black uppercase">
                              {item.plan}
                            </Badge>
                            <span className="text-xs font-black text-slate-900">₹{item.amount?.toLocaleString('en-IN')}/mo</span>
                          </div>
                        </td>

                        {/* UTR Reference */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                              {item.utr}
                            </span>
                            {item.utr && item.utr !== 'N/A' && (
                              <button 
                                onClick={() => handleCopy(item.utr, 'utr')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Copy UTR Number"
                              >
                                {copiedUtr === item.utr ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <Badge className={`w-fit text-[9px] font-black uppercase flex items-center gap-1 ${
                              isPending 
                                ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                : isApproved 
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500 animate-ping' : isApproved ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {item.status || 'PENDING'}
                            </Badge>
                            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.createdAt}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              onClick={() => openInspector(item)}
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 font-bold text-xs cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                              Inspect
                            </Button>

                            {isPending && (
                              <>
                                <Button 
                                  onClick={() => handleApprove(item)}
                                  disabled={processingId === item.id}
                                  size="sm"
                                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
                                >
                                  {processingId === item.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                      Approve
                                    </>
                                  )}
                                </Button>

                                <Button 
                                  onClick={() => setRejectingItem(item)}
                                  disabled={processingId === item.id}
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 px-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs cursor-pointer"
                                  title="Reject Payment"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── 🚀 ZERO STATE (EMPTY QUEUE) ───────────────────────────── */}
      {displayedItems.length === 0 && (
        <Card className="bg-white rounded-[2.5rem] p-16 border-2 border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Zero Verification Requests</h3>
          <p className="text-xs font-semibold text-slate-400 max-w-md mx-auto">
            {filterStatus === 'PENDING'
              ? 'All incoming merchant UPI payments have been verified and approved. New merchant submissions will appear here instantly in real-time.'
              : 'No matching transaction records found for the active filter.'}
          </p>
          <Button
            onClick={() => { setFilterStatus('ALL'); setSearchQuery(''); }}
            variant="outline"
            className="rounded-2xl text-xs font-bold border-slate-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
          >
            View All Historical Records
          </Button>
        </Card>
      )}

      {/* ─── 🛡️ SLIDING MERCHANT INSPECTOR DRAWER ──────────────────── */}
      <AnimatePresence>
        {inspectingItem && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectingItem(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            />

            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto border-l border-slate-200"
            >
              {/* Header */}
              <div className="p-8 bg-slate-950 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-black uppercase tracking-widest">
                    Merchant KYC & Forensic Audit
                  </Badge>
                  <button 
                    onClick={() => setInspectingItem(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-black text-xl flex items-center justify-center shadow-xl shadow-indigo-900/50">
                    {inspectingItem.merchantName?.substring(0, 2).toUpperCase() || 'TX'}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{inspectingItem.merchantName}</h3>
                    <p className="text-xs text-slate-400 font-bold">{inspectingItem.email}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6 flex-1 bg-slate-50/60 overflow-y-auto">
                {/* Subscription Tier Block */}
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Plan Tier</span>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-xs font-black uppercase">
                      {inspectingItem.planName}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Yield</span>
                    <span className="text-base font-black text-slate-900">₹{inspectingItem.amount?.toLocaleString('en-IN')}/mo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workspace Node ID</span>
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[200px]">
                      {inspectingItem.restaurantId}
                    </span>
                  </div>
                </div>

                {/* Submitted 12-Digit UTR Block */}
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    Submitted UPI Reference Proof
                  </h4>

                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">12-Digit Bank UTR</span>
                      <button 
                        onClick={() => handleCopy(inspectingItem.utr, 'utr')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-black flex items-center gap-1 cursor-pointer"
                      >
                        {copiedUtr === inspectingItem.utr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedUtr === inspectingItem.utr ? 'Copied' : 'Copy UTR'}
                      </button>
                    </div>
                    <p className="font-mono text-base font-black tracking-widest text-amber-300">
                      {inspectingItem.utr || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Custom Extension Period Selector */}
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Grant License Validity</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 60, 365].map(d => (
                      <button
                        key={d}
                        onClick={() => setExtensionDays(d)}
                        className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                          extensionDays === d
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        +{d} Days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audit Trail */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Audit Trail</h4>
                  <div className="space-y-2.5">
                    {inspectingItem.historyList?.map((h, i) => (
                      <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-900">{h.plan} License &bull; ₹{h.amount}</p>
                          <p className="text-[10px] text-slate-400 font-mono">UTR #{h.utr}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className="text-[9px] font-black uppercase bg-slate-100 text-slate-700 border-none">
                            {h.status}
                          </Badge>
                          <p className="text-[9px] text-slate-400 font-bold">{h.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 bg-white border-t border-slate-200 space-y-3">
                <Button 
                  onClick={() => handleApprove(inspectingItem, extensionDays)}
                  disabled={processingId === inspectingItem.id}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Grant {extensionDays} Days License
                </Button>

                <Button 
                  onClick={() => { setRejectingItem(inspectingItem); }}
                  disabled={processingId === inspectingItem.id}
                  variant="outline"
                  className="w-full h-11 rounded-2xl border-slate-200 text-rose-600 hover:bg-rose-50 font-black text-xs uppercase tracking-widest cursor-pointer"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Flag / Reject Transaction
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ❌ REJECTION CONFIRMATION MODAL ───────────────────────── */}
      <AnimatePresence>
        {rejectingItem && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectingItem(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl z-10 border border-slate-200 p-8 space-y-6 relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-black text-slate-900 uppercase">Reject Payment Proof?</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  This will flag UTR <span className="font-mono font-black text-slate-800">#{rejectingItem.utr}</span> for merchant <span className="font-bold text-slate-800">{rejectingItem.merchant}</span>.
                </p>
              </div>

              {/* Reason Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rejection Reason</label>
                <select
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="Invalid UTR Reference Number">Invalid UTR Reference Number</option>
                  <option value="Payment Not Received in Bank">Payment Not Received in Bank</option>
                  <option value="Amount Mismatch">Amount Mismatch</option>
                  <option value="Duplicate UTR Submission">Duplicate UTR Submission</option>
                  <option value="Other">Other Reason</option>
                </select>

                {rejectReason === 'Other' && (
                  <Input 
                    value={customRejectReason}
                    onChange={e => setCustomRejectReason(e.target.value)}
                    placeholder="Enter custom rejection reason..."
                    className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 mt-2"
                  />
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setRejectingItem(null)}
                  variant="outline"
                  className="w-1/2 h-11 rounded-xl border-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </Button>

                <Button 
                  onClick={handleConfirmReject}
                  disabled={processingId === rejectingItem.id}
                  className="w-1/2 h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  Confirm Reject
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
