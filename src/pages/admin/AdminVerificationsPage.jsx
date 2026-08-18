import { useState, useEffect, useMemo } from 'react'
import { supabase, ensureAdminSession } from '@/lib/adminSupabase'
import { getAdminPlatformData, approveMerchantPayment } from '@/lib/adminDataService'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DownloadCloud, 
  IndianRupee, 
  ShieldCheck, 
  CreditCard, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  Filter, 
  BadgeCheck, 
  AlertTriangle,
  LayoutGrid,
  List,
  ChevronRight,
  TrendingUp,
  Store,
  Calendar,
  Layers,
  ArrowUpRight,
  SlidersHorizontal,
  Mail,
  Phone,
  MapPin,
  FileCheck
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { triggerPushNotification } from '@/lib/pushNotifications'

export default function AdminVerificationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('PENDING') // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
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
  const [extensionDays, setExtensionDays] = useState(30)

  // Fetch Verification Data
  const fetchData = async () => {
    try {
      setLoading(true)
      const platformData = await getAdminPlatformData()
      setPendingVerifications(platformData.pendingVerifications || [])

      // Map restaurants by ID and Email
      const rMap = {}
      ;(platformData.restaurants || []).forEach(r => {
        if (r.id) rMap[r.id] = r
        if (r.email) rMap[r.email.toLowerCase()] = r
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

  // Key Aggregates
  const totalPendingAmount = pendingVerifications.reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0)
  const approvedCount = historicalVerifications.filter(v => v.status === 'APPROVED' || v.status === 'Approved').length
  const rejectedCount = historicalVerifications.filter(v => v.status === 'REJECTED' || v.status === 'Rejected').length
  const totalSettledRevenue = historicalVerifications
    .filter(v => v.status === 'APPROVED' || v.status === 'Approved')
    .reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0)

  // Copy helper
  const handleCopy = (text) => {
    if (!text || text === 'N/A') return
    navigator.clipboard.writeText(text)
    setCopiedUtr(text)
    setTimeout(() => setCopiedUtr(''), 2000)
    toast.success('Copied UTR to Clipboard', { description: text })
  }

  // Approve Handler
  const handleApprove = async (item, days = 30) => {
    try {
      setProcessingId(item.id)

      // Optimistic state removal
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
        body: `UTR #${item.utr} verified. ${item.merchant} activated for ${days} days.`,
        sound: true
      })

      toast.success('Subscription License Activated', {
        description: `Verified UTR #${item.utr}. ${item.merchant} granted ${days} days access.`
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

  // Reject Handler
  const handleConfirmReject = async () => {
    if (!rejectingItem) return
    const item = rejectingItem
    const finalReason = rejectReason === 'Other' ? (customRejectReason || 'Payment verification rejected by admin') : rejectReason

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
        body: `UTR #${item.utr} flagged: ${finalReason}`,
        sound: true
      })

      toast.error('Payment Flagged & Rejected', {
        description: `UTR #${item.utr} rejected: ${finalReason}`
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
      toast.success('Verification Records Exported')
    } catch (err) {
      toast.error('Export Failed')
    }
  }

  // Open Inspection Drawer
  const openInspector = (item) => {
    const restData = restaurantsMap[item.restaurantId] || restaurantsMap[item.email?.toLowerCase()] || {}
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
      address: restData.address || 'Registered Business Node',
      restaurantId: item.restaurantId || restData.id || 'N/A',
      createdAt: item.createdAt || new Date(restData.created_at || Date.now()).toLocaleDateString('en-IN'),
      planName: item.plan || 'PROFESSIONAL',
      amount: item.amount || 2499,
      status: item.status || 'PENDING_APPROVAL',
      historyList
    })
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans select-none">
      
      {/* ─── ⚡ CLEAN ENTERPRISE PAGE HEADER ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Payment Verifications
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Gateway
            </Badge>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Verify 12-digit UPI UTR reference codes, activate 30-day merchant subscriptions, and dispatch automated invoices.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button 
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </Button>

          <Button 
            onClick={handleExportCSV}
            size="sm"
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ─── 📊 REFINED SHADCN KPI METRIC CARDS ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Pending Approvals */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Actions</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {pendingVerifications.length}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${pendingVerifications.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span>{pendingVerifications.length > 0 ? 'Merchants awaiting review' : 'All transactions verified'}</span>
            </p>
          </div>
        </Card>

        {/* KPI 2: Pipeline Volume */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Queue Volume</span>
              <IndianRupee className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              ₹{totalPendingAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Pending pipeline settlement
            </p>
          </div>
        </Card>

        {/* KPI 3: Approved Total */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Approved Payments</span>
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1.5">
              {approvedCount} <span className="text-xs font-semibold text-slate-400">licenses</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              ₹{totalSettledRevenue.toLocaleString('en-IN')} total revenue settled
            </p>
          </div>
        </Card>

        {/* KPI 4: Verification SLA */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Settlement SLA</span>
              <FileCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              &lt; 10m
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Automated invoice & license unlock
            </p>
          </div>
        </Card>
      </div>

      {/* ─── 🔍 SHADCN-STYLE CONTROL TOOLBAR ───────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1">
          {[
            { id: 'PENDING', label: 'Pending Action', count: pendingVerifications.length },
            { id: 'APPROVED', label: 'Approved', count: approvedCount },
            { id: 'REJECTED', label: 'Rejected', count: rejectedCount },
            { id: 'ALL', label: 'All', count: pendingVerifications.length + historicalVerifications.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                filterStatus === tab.id 
                  ? 'bg-slate-700 text-white' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search, Sort, and View Switcher */}
        <div className="flex items-center gap-2 px-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search UTR, merchant, email..."
              className="h-9 pl-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="h-9 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option value="newest">Newest</option>
            <option value="amount_high">Highest ₹</option>
            <option value="amount_low">Lowest ₹</option>
          </select>

          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 📋 PRIMARY DATA TABLE VIEW ────────────────────────────── */}
      {viewMode === 'table' && (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Merchant Details</th>
                  <th className="py-3.5 px-5">Plan Tier</th>
                  <th className="py-3.5 px-5">12-Digit UTR Code</th>
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {displayedItems.map((item, idx) => {
                    const isPending = item.status === 'PENDING_APPROVAL' || !item.status || item.status === 'Pending'
                    const isApproved = item.status === 'APPROVED' || item.status === 'Active' || item.status === 'Approved'
                    const isRejected = item.status === 'REJECTED' || item.status === 'Rejected'

                    return (
                      <motion.tr 
                        key={item.id || idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Merchant Node */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center shrink-0 border border-slate-200">
                              {item.merchant?.substring(0, 2).toUpperCase() || 'TX'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs truncate">{item.merchant}</p>
                              <p className="text-[11px] text-slate-400 font-medium truncate">{item.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Plan & Price */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200/80 font-mono text-[10px] font-bold uppercase">
                              {item.plan}
                            </Badge>
                            <span className="font-bold text-slate-900 text-xs">₹{item.amount?.toLocaleString('en-IN')}</span>
                          </div>
                        </td>

                        {/* UTR Code */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200">
                              {item.utr}
                            </span>
                            {item.utr && item.utr !== 'N/A' && (
                              <button 
                                onClick={() => handleCopy(item.utr)}
                                className="text-slate-400 hover:text-slate-800 p-1 rounded transition-colors cursor-pointer"
                                title="Copy UTR"
                              >
                                {copiedUtr === item.utr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="py-4 px-5 text-slate-500 text-[11px] font-medium whitespace-nowrap">
                          {item.createdAt}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          <Badge className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1.5 w-fit ${
                            isPending 
                              ? 'bg-amber-50 text-amber-800 border-amber-200' 
                              : isApproved 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500 animate-pulse' : isApproved ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected'}
                          </Badge>
                        </td>

                        {/* Quick Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              onClick={() => openInspector(item)}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Inspect
                            </Button>

                            {isPending && (
                              <>
                                <Button 
                                  onClick={() => handleApprove(item)}
                                  disabled={processingId === item.id}
                                  size="sm"
                                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs cursor-pointer"
                                >
                                  {processingId === item.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
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
                                  className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
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

      {/* ─── 🔲 VIEW MODE: CARD GRID VIEW ─────────────────────────── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {displayedItems.map((item, idx) => {
              const isPending = item.status === 'PENDING_APPROVAL' || !item.status || item.status === 'Pending'
              const isApproved = item.status === 'APPROVED' || item.status === 'Active' || item.status === 'Approved'
              const isRejected = item.status === 'REJECTED' || item.status === 'Rejected'

              return (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs p-5 flex flex-col justify-between h-full hover:border-slate-300 hover:shadow-sm transition-all space-y-4">
                    <div className="space-y-3">
                      {/* Card Top Meta */}
                      <div className="flex items-center justify-between">
                        <Badge className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                          isPending 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : isApproved 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500 animate-pulse' : isApproved ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {isPending ? 'Pending Approval' : isApproved ? 'Approved' : 'Rejected'}
                        </Badge>
                        <span className="text-[11px] font-medium text-slate-400">{item.createdAt}</span>
                      </div>

                      {/* Merchant Avatar & Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                          {item.merchant?.substring(0, 2).toUpperCase() || 'TX'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{item.merchant}</h4>
                          <p className="text-xs text-slate-500 truncate">{item.email}</p>
                        </div>
                      </div>

                      {/* Plan & Price */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200/80 font-mono text-[10px] font-bold uppercase">
                          {item.plan}
                        </Badge>
                        <span className="text-sm font-black text-slate-900">₹{item.amount?.toLocaleString('en-IN')}<span className="text-[10px] text-slate-400 font-normal">/mo</span></span>
                      </div>

                      {/* UTR Box */}
                      <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400">12-Digit UTR</span>
                          {item.utr && item.utr !== 'N/A' && (
                            <button
                              onClick={() => handleCopy(item.utr)}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedUtr === item.utr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              {copiedUtr === item.utr ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>
                        <p className="font-mono text-xs font-bold text-amber-300 tracking-wider">
                          {item.utr}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                      <Button 
                        onClick={() => openInspector(item)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 rounded-lg border-slate-200 text-slate-700 text-xs font-semibold flex-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 mr-1 text-slate-500" />
                        Inspect
                      </Button>

                      {isPending && (
                        <>
                          <Button 
                            onClick={() => handleApprove(item)}
                            disabled={processingId === item.id}
                            size="sm"
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex-1 cursor-pointer"
                          >
                            {processingId === item.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Approve'}
                          </Button>

                          <Button 
                            onClick={() => setRejectingItem(item)}
                            disabled={processingId === item.id}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─── 🚀 CLEAN ZERO-STATE ──────────────────────────────────── */}
      {displayedItems.length === 0 && (
        <Card className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Verifications Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterStatus === 'PENDING'
              ? 'All incoming merchant subscription payments have been verified and settled.'
              : 'No transaction records match the current filter and search query.'}
          </p>
          <Button
            onClick={() => { setFilterStatus('ALL'); setSearchQuery(''); }}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold border-slate-200 text-slate-700 cursor-pointer"
          >
            View All Records
          </Button>
        </Card>
      )}

      {/* ─── 🛡️ SLIDING INSPECTION SHEET / DRAWER ──────────────────── */}
      <AnimatePresence>
        {inspectingItem && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectingItem(null)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            />

            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto border-l border-slate-200"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                    {inspectingItem.merchantName?.substring(0, 2).toUpperCase() || 'TX'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{inspectingItem.merchantName}</h3>
                    <p className="text-xs text-slate-500">{inspectingItem.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setInspectingItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                {/* Plan Details Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Plan Tier</span>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-xs font-bold uppercase">
                      {inspectingItem.planName}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Monthly Price</span>
                    <span className="text-sm font-bold text-slate-900">₹{inspectingItem.amount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Status</span>
                    <Badge className="bg-slate-100 text-slate-800 border-slate-200 font-semibold text-[10px] uppercase">
                      {inspectingItem.status}
                    </Badge>
                  </div>
                </div>

                {/* Submitted 12-Digit UTR Block */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">12-Digit UTR Reference</span>
                    <button 
                      onClick={() => handleCopy(inspectingItem.utr)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUtr === inspectingItem.utr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedUtr === inspectingItem.utr ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="font-mono text-sm font-bold tracking-wider text-amber-300">
                    {inspectingItem.utr || 'N/A'}
                  </p>
                </div>

                {/* License Duration Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Grant License Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 60, 365].map(d => (
                      <button
                        key={d}
                        onClick={() => setExtensionDays(d)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          extensionDays === d
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        +{d} Days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Merchant Contact Details */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <p className="font-bold text-slate-700 mb-1">Merchant Business Details</p>
                  <p className="text-slate-600 flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {inspectingItem.email}</p>
                  <p className="text-slate-600 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {inspectingItem.phone}</p>
                  <p className="text-slate-600 flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {inspectingItem.address}</p>
                </div>

                {/* Audit Trail */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">Payment Audit History</p>
                  <div className="space-y-1.5">
                    {inspectingItem.historyList?.map((h, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{h.plan} &bull; ₹{h.amount}</p>
                          <p className="text-[10px] text-slate-400 font-mono">UTR #{h.utr}</p>
                        </div>
                        <Badge className="text-[9px] font-bold uppercase bg-slate-100 text-slate-700 border-none">
                          {h.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-5 border-t border-slate-200 bg-white space-y-2">
                <Button 
                  onClick={() => handleApprove(inspectingItem, extensionDays)}
                  disabled={processingId === inspectingItem.id}
                  className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Grant {extensionDays} Days
                </Button>

                <Button 
                  onClick={() => setRejectingItem(inspectingItem)}
                  disabled={processingId === inspectingItem.id}
                  variant="outline"
                  className="w-full h-9 rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Reject Payment
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ❌ REJECTION MODAL DIALOG ─────────────────────────────── */}
      <AnimatePresence>
        {rejectingItem && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectingItem(null)}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl z-10 border border-slate-200 p-6 space-y-4"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900">Reject Payment Proof?</h3>
                <p className="text-xs text-slate-500">
                  Flag UTR <span className="font-mono font-bold text-slate-800">#{rejectingItem.utr}</span> for {rejectingItem.merchant}.
                </p>
              </div>

              {/* Reason Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Rejection Reason</label>
                <select
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none"
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
                    placeholder="Specify reason..."
                    className="h-8 text-xs rounded-lg mt-2"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button 
                  onClick={() => setRejectingItem(null)}
                  variant="outline"
                  size="sm"
                  className="w-1/2 h-9 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>

                <Button 
                  onClick={handleConfirmReject}
                  disabled={processingId === rejectingItem.id}
                  size="sm"
                  className="w-1/2 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs cursor-pointer"
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
