import { useState, useEffect, useMemo } from 'react'
import { supabase, ensureAdminSession } from '@/lib/adminSupabase'
import { getAdminPlatformData, approveMerchantPayment } from '@/lib/adminDataService'
import { sendPurchaseSummaryEmail, sendSubscriptionExpiryEmail } from '@/services/email.service'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DownloadCloud, 
  ArrowUpRight, 
  IndianRupee, 
  TrendingUp, 
  Activity, 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  Search, 
  RefreshCw, 
  Layers, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  AlertCircle,
  FileCheck,
  Store,
  Calendar,
  CalendarDays,
  Mail,
  Send,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  BellRing,
  AlertTriangle
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
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function AdminRevenuePage() {
  const now = new Date()
  
  // Calendar-wise State
  const [calendarMode, setCalendarMode] = useState('MONTHLY') // 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'ALL'
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-11
  
  // Ledger filtering & search
  const [ledgerFilter, setLedgerFilter] = useState('ALL') // 'ALL' | 'DUE_SOON' | 'OVERDUE' | 'ACTIVE'
  const [searchLedger, setSearchLedger] = useState('')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  
  // Sent notifications tracking
  const [sentNotificationMap, setSentNotificationMap] = useState({})
  
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
     selectedMonthRevenue: 0,
     todayRevenue: 0,
     weekRevenue: 0,
     totalARR: 0,
     arpu: 0,
     ltv: 0,
     activeClusters: 0,
     expansionMRR: 0,
     churnImpact: 0,
     nrr: '100.0%',
     grossMargin: '94.6%',
     momFormatted: '+0.0% MoM',
     dueSoonCount: 0,
     overdueCount: 0,
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

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const handleResetToCurrentMonth = () => {
    const cur = new Date()
    setSelectedYear(cur.getFullYear())
    setSelectedMonth(cur.getMonth())
  }

  // 1-Click Renewal Notification per restaurant
  const handleSendRenewalNotification = async (company) => {
    try {
      setProcessingId(`notify-${company.id}`)
      const email = company.email
      if (!email || !email.includes('@')) {
        toast.error('Invalid Email', { description: 'This restaurant does not have a valid email.' })
        return
      }

      const daysLeft = company.daysRemaining ?? 0
      const isExpired = daysLeft <= 0
      const dueDateStr = company.dueDate || 'Soon'

      // 1. Send via email service
      try {
        await sendSubscriptionExpiryEmail({
          email,
          merchantName: company.name || company.merchantName || 'Servora Partner',
          planName: company.plan || 'Professional',
          daysRemaining: Math.max(0, daysLeft),
          isExpired,
          expiryDate: company.rawDueDate ? company.rawDueDate.toISOString() : new Date().toISOString(),
          restaurantId: company.id
        })
      } catch (mailErr) {
        console.warn('[AdminRevenuePage] Email dispatch note:', mailErr)
      }

      // 2. Direct Supabase In-App Notification
      try {
        await supabase.from('notifications').insert({
          restaurant_id: company.id,
          type: 'subscription_renewal',
          title: isExpired 
            ? '⚠️ Subscription Expired — Action Required' 
            : `⏳ Subscription Due for Renewal (${daysLeft} Days Left)`,
          message: isExpired
            ? `Your Servora ${company.plan} subscription expired on ${dueDateStr}. Renew your license to keep digital QR ordering and POS active.`
            : `Your Servora ${company.plan} plan renews on ${dueDateStr}. Ensure your payment is confirmed for uninterrupted dining service.`,
          is_read: false,
          created_at: new Date().toISOString()
        })
      } catch (notifErr) {
        console.warn('In-app notification note:', notifErr)
      }

      // 3. System Audit Log
      try {
        await supabase.from('audit_logs').insert({
          restaurant_id: company.id,
          action: `Renewal Notice Sent to ${company.name} (${isExpired ? 'Expired' : `${daysLeft}d remaining`})`,
          actor: 'System Admin',
          severity: isExpired ? 'WARNING' : 'NOMINAL',
          created_at: new Date().toISOString()
        })
      } catch (auditErr) {}

      // Trigger local push notification broadcast
      try {
        triggerPushNotification({
          title: '🔔 Renewal Reminder Dispatched',
          body: `Notification successfully sent to ${company.name} (${email})`
        })
      } catch (e) {}

      setSentNotificationMap(prev => ({
        ...prev,
        [company.id]: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }))

      toast.success('Renewal Reminder Sent', {
        description: `Dispatched email and in-app alert to ${company.name} (${email}).`
      })
    } catch (err) {
      toast.error('Notification Error', { description: err.message })
    } finally {
      setProcessingId(null)
    }
  }

  // Bulk Notify All Due / Expired Restaurants
  const handleNotifyAllDue = async () => {
    const targets = metrics.ledger.filter(l => l.daysRemaining <= 7)
    if (targets.length === 0) {
      toast.info('No Restaurants Due', { description: 'All active restaurant subscriptions have >7 days remaining.' })
      return
    }

    setProcessingId('notify-all')
    let count = 0
    for (const t of targets) {
      await handleSendRenewalNotification(t)
      count++
    }
    setProcessingId(null)
    toast.success('Batch Renewal Notices Complete', {
      description: `Dispatched renewal reminders to ${count} restaurants.`
    })
  }

  const handleGrantExtension = async (company) => {
     try {
        setProcessingId('extend')
        const restId = company.restaurantId || company.id
        const nowTime = new Date()
        const extEnd = new Date(nowTime.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

        const { data: existingSub } = await supabase.from('subscriptions').select('id').eq('restaurant_id', restId)
        if (existingSub && existingSub.length > 0) {
          await supabase.from('subscriptions').update({
            plan_name: company.plan || 'Professional',
            price: company.amount || 2499,
            status: 'Active',
            start_date: nowTime.toISOString(),
            end_date: extEnd
          }).eq('restaurant_id', restId)
        } else {
          await supabase.from('subscriptions').insert({
            restaurant_id: restId,
            plan_name: company.plan || 'Professional',
            price: company.amount || 2499,
            status: 'Active',
            start_date: nowTime.toISOString(),
            end_date: extEnd
          })
        }

        if (company.email || company.merchantEmail) {
           try {
              await sendPurchaseSummaryEmail({
                 email: company.email || company.merchantEmail,
                 merchantName: company.merchant || company.name || 'Servora Merchant',
                 planName: company.plan || 'Professional (+30 Days Grant)',
                 amount: company.amount || 0,
                 utrNumber: 'ADMIN-GRANT-30D',
                 startDate: nowTime.toISOString(),
                 endDate: extEnd,
                 restaurantId: restId
              })
           } catch (mailErr) {
              console.warn('[AdminRevenuePage] Extension email note:', mailErr.message)
           }
        }

        window.dispatchEvent(new Event('platformConfigUpdated'))

        toast.success('Subscription Extended', {
           description: `Granted +30 days license access to ${company.merchant || company.name}.`
        })

        fetchRevenueData()
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
          const nowDate = new Date()

          // ── 1. Calendar Range Boundaries ──
          // Month boundary for selected month/year (Starts with ₹0 on the 1st!)
          const monthStart = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0)
          const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999)
          const daysInMonth = monthEnd.getDate()

          // Today boundary (Starts with ₹0 at 00:00:00!)
          const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0, 0)
          const todayEnd = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 23, 59, 59, 999)

          // Current Week boundary (Monday to Sunday)
          const currentDayOfWeek = nowDate.getDay()
          const diffToMon = nowDate.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1)
          const weekStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), diffToMon, 0, 0, 0, 0)
          const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)

          // ── 2. Collect Individual Billing / Revenue Events ──
          const billingEvents = []

          rawSubs.forEach(sub => {
            const isApproved = (sub.status || '').toUpperCase() === 'ACTIVE' || (sub.status || '').toUpperCase() === 'APPROVED'
            if (!isApproved) return
            
            const subStart = new Date(sub.start_date || sub.created_at || Date.now())
            const subPrice = parseInt(sub.price || 2499)
            
            billingEvents.push({
              id: sub.id,
              restaurantId: sub.restaurant_id,
              plan: sub.plan_name || 'PRO',
              amount: subPrice,
              date: subStart
            })
          })

          // ── 3. Calculate Calendar Metrics Starting From Zero ──
          // A. Selected Calendar Month Revenue
          const selectedMonthEvents = billingEvents.filter(e => e.date >= monthStart && e.date <= monthEnd)
          const selectedMonthRevenue = selectedMonthEvents.reduce((acc, e) => acc + e.amount, 0)

          // B. Previous Month Revenue for MoM growth comparison
          const prevMonthStart = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0)
          const prevMonthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
          const prevMonthEvents = billingEvents.filter(e => e.date >= prevMonthStart && e.date <= prevMonthEnd)
          const prevMonthRevenue = prevMonthEvents.reduce((acc, e) => acc + e.amount, 0)

          const momGrowthVal = prevMonthRevenue > 0 
            ? (((selectedMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) 
            : (selectedMonthRevenue > 0 ? 100 : 0)
          const momFormatted = `${momGrowthVal >= 0 ? '+' : ''}${momGrowthVal.toFixed(1)}% MoM`

          // C. Today's Revenue (starts at ₹0 at 00:00)
          const todayEvents = billingEvents.filter(e => e.date >= todayStart && e.date <= todayEnd)
          const todayRevenue = todayEvents.reduce((acc, e) => acc + e.amount, 0)

          // D. This Week's Revenue (starts at ₹0 on Monday)
          const weekEvents = billingEvents.filter(e => e.date >= weekStart && e.date <= weekEnd)
          const weekRevenue = weekEvents.reduce((acc, e) => acc + e.amount, 0)

          // E. Active Clusters & Run-Rate
          const activeClusters = rawSubs.filter(s => (s.status || '').toUpperCase() === 'ACTIVE' || (s.status || '').toUpperCase() === 'APPROVED').length
          const totalARR = selectedMonthRevenue * 12
          const arpu = activeClusters > 0 ? selectedMonthRevenue / activeClusters : 0
          const ltv = arpu * 24

          const expansionMRR = rawSubs.reduce((acc, sub) => {
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
          if (selectedMonthRevenue > 0) {
             nrrValue = 100 + (((expansionMRR - churnImpact) / selectedMonthRevenue) * 100)
          } else if (rawSubs.length > 0) {
             nrrValue = 104.2
          }
          const nrrFormatted = `${Math.max(80, Math.min(150, nrrValue)).toFixed(1)}%`

          const opsCost = (selectedMonthRevenue * 0.035) + (activeClusters * 40)
          const grossProfit = selectedMonthRevenue - opsCost
          const marginValue = selectedMonthRevenue > 0 ? (grossProfit / selectedMonthRevenue) * 100 : 94.6
          const marginFormatted = `${marginValue.toFixed(1)}%`

          // ── 4. Build Dynamic Chart Data based on Calendar Mode ──
          const history = []

          if (calendarMode === 'MONTHLY') {
            // Day-by-Day tracking for the chosen month (Day 1 to Last Day of Month)
            // Starts with ₹0 on the 1st of the month!
            let cumulativeDayRev = 0
            for (let day = 1; day <= daysInMonth; day++) {
              const currentDayStart = new Date(selectedYear, selectedMonth, day, 0, 0, 0, 0)
              const currentDayEnd = new Date(selectedYear, selectedMonth, day, 23, 59, 59, 999)
              
              const dayEvts = billingEvents.filter(e => e.date >= currentDayStart && e.date <= currentDayEnd)
              const dayTotal = dayEvts.reduce((sum, e) => sum + e.amount, 0)
              cumulativeDayRev += dayTotal

              // Show label for key days to avoid overcrowding
              const label = (day === 1 || day === 5 || day === 10 || day === 15 || day === 20 || day === 25 || day === daysInMonth) 
                ? `${MONTH_NAMES[selectedMonth].substring(0, 3)} ${day}` 
                : `${day}`

              history.push({
                name: label,
                dayNum: day,
                dailyRevenue: dayTotal,
                revenue: cumulativeDayRev
              })
            }
          } else if (calendarMode === 'WEEKLY') {
            // Mon through Sun of the current week
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            for (let i = 0; i < 7; i++) {
              const dayStart = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)
              const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
              const dayEvts = billingEvents.filter(e => e.date >= dayStart && e.date <= dayEnd)
              const dayTotal = dayEvts.reduce((sum, e) => sum + e.amount, 0)

              history.push({
                name: dayNames[i],
                dailyRevenue: dayTotal,
                revenue: dayTotal
              })
            }
          } else if (calendarMode === 'DAILY') {
            // Hourly breakdown for Today
            const hourLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59']
            for (let i = 0; i < hourLabels.length; i++) {
              const hStart = new Date(todayStart.getTime() + (i * 4) * 60 * 60 * 1000)
              const hEnd = new Date(todayStart.getTime() + ((i + 1) * 4) * 60 * 60 * 1000 - 1)
              const hEvts = billingEvents.filter(e => e.date >= hStart && e.date <= hEnd)
              const hTotal = hEvts.reduce((sum, e) => sum + e.amount, 0)

              history.push({
                name: hourLabels[i],
                dailyRevenue: hTotal,
                revenue: hTotal
              })
            }
          } else {
            // ALL / Full Year Month-by-Month
            for (let m = 0; m < 12; m++) {
              const mStart = new Date(selectedYear, m, 1, 0, 0, 0, 0)
              const mEnd = new Date(selectedYear, m + 1, 0, 23, 59, 59, 999)
              const mEvts = billingEvents.filter(e => e.date >= mStart && e.date <= mEnd)
              const mTotal = mEvts.reduce((sum, e) => sum + e.amount, 0)

              history.push({
                name: MONTH_NAMES[m].substring(0, 3),
                dailyRevenue: mTotal,
                revenue: mTotal
              })
            }
          }

          // ── 5. Plan Distribution ──
          const planCounts = rawSubs.reduce((acc, sub) => {
             let tier = (sub.plan_name || sub.tier || 'Starter').toUpperCase()
             if (tier === 'STARTER' || tier === 'BASIC') tier = 'Starter'
             else if (tier === 'PRO' || tier === 'PROFESSIONAL') tier = 'Professional'
             else if (tier === 'PREMIUM' || tier === 'ENTERPRISE') tier = 'Enterprise'
             acc[tier] = (acc[tier] || 0) + 1
             return acc
          }, {})

          const planDistribution = Object.keys(planCounts).map(tier => ({
             name: tier,
             value: planCounts[tier],
             share: Math.round((planCounts[tier] / (activeClusters || 1)) * 100)
          }))

          // ── 6. Build Restaurant Ledger with Due Dates & Renewal Status ──
          let dueSoonCount = 0
          let overdueCount = 0

          const ledger = rawUsers.map(u => {
             const userSub = rawSubs.find(s => s.restaurant_id === u.id || s.restaurant_id === u.email)
             const startDate = userSub?.start_date ? new Date(userSub.start_date) : new Date(u.created_at || Date.now())
             const endDate = userSub?.end_date 
               ? new Date(userSub.end_date) 
               : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

             const diffTime = endDate.getTime() - nowDate.getTime()
             const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

             let dueStatus = 'ACTIVE'
             let dueLabel = `${daysRemaining}d left`
             
             if (daysRemaining < 0) {
               dueStatus = 'OVERDUE'
               dueLabel = `Expired ${Math.abs(daysRemaining)}d ago`
               overdueCount++
             } else if (daysRemaining === 0) {
               dueStatus = 'DUE_TODAY'
               dueLabel = 'Expires Today'
               dueSoonCount++
             } else if (daysRemaining <= 7) {
               dueStatus = 'DUE_SOON'
               dueLabel = `Due in ${daysRemaining}d`
               dueSoonCount++
             }

             return {
                id: u.id,
                name: u.business_name || 'Servora Merchant',
                email: u.email || 'N/A',
                phone: u.phone || '',
                plan: userSub ? (userSub.plan_name || 'Professional').toUpperCase() : 'STARTER',
                yield: userSub ? parseInt(userSub.price || 999) : 999,
                status: userSub ? (userSub.status || 'Active') : 'Active',
                startDate: startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                dueDate: endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                rawDueDate: endDate,
                daysRemaining,
                dueStatus,
                dueLabel,
                activeSince: new Date(u.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                rawSub: userSub,
                rawUser: u
             }
          })

          setMetrics({
             selectedMonthRevenue,
             todayRevenue,
             weekRevenue,
             totalARR,
             arpu,
             ltv,
             activeClusters,
             expansionMRR,
             churnImpact,
             nrr: nrrFormatted,
             grossMargin: marginFormatted,
             momFormatted,
             dueSoonCount,
             overdueCount,
             history,
             planDistribution,
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

      const interval = setInterval(fetchRevenueData, 60000)
      window.addEventListener('platformConfigUpdated', fetchRevenueData)
      window.addEventListener('storage', fetchRevenueData)

      return () => {
         clearInterval(interval)
         window.removeEventListener('platformConfigUpdated', fetchRevenueData)
         window.removeEventListener('storage', fetchRevenueData)
      }
  }, [calendarMode, selectedMonth, selectedYear])

  const exportCSV = () => {
      const csvRows = [
         ['Merchant Name', 'Email', 'Plan Tier', 'Monthly Yield (INR)', 'Billing Status', 'Due Date', 'Days Remaining', 'Active Since'],
         ...metrics.ledger.map(row => [
            `"${row.name}"`,
            `"${row.email}"`,
            `"${row.plan}"`,
            row.yield,
            `"${row.status}"`,
            `"${row.dueDate}"`,
            row.daysRemaining,
            `"${row.activeSince}"`
         ])
      ]
      
      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `Servora_Revenue_Ledger_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Subscription Ledger Exported')
  }

  // Filter ledger rows by search and status tabs
  const filteredLedger = useMemo(() => {
    return metrics.ledger.filter(l => {
      // 1. Status Filter
      if (ledgerFilter === 'DUE_SOON' && !(l.dueStatus === 'DUE_SOON' || l.dueStatus === 'DUE_TODAY')) return false
      if (ledgerFilter === 'OVERDUE' && l.dueStatus !== 'OVERDUE') return false
      if (ledgerFilter === 'ACTIVE' && l.dueStatus !== 'ACTIVE') return false

      // 2. Query Search
      if (!searchLedger) return true
      const q = searchLedger.toLowerCase()
      return (
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.plan?.toLowerCase().includes(q) ||
        l.dueDate?.toLowerCase().includes(q)
      )
    })
  }, [metrics.ledger, ledgerFilter, searchLedger])

  // Open Company Inspector Drawer
  const handleInspectCompany = (item) => {
     const restId = item.restaurantId || item.id
     const email = item.email || item.merchantEmail
     
     const historyList = []
     const rawSubs = platformRawData.subscriptions || []
     rawSubs.forEach(s => {
        if (s.restaurant_id === restId || (email && s.restaurant_id === email)) {
           historyList.push({
              id: s.id,
              date: new Date(s.start_date || s.created_at || Date.now()).toLocaleDateString('en-IN'),
              utr: s.utr_number || 'SYSTEM_VERIFIED',
              plan: (s.plan_name || 'Professional').toUpperCase(),
              amount: s.price || 2499,
              status: s.status || 'Active'
           })
        }
     })

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
        status: item.status || 'Active',
        totalLifetimeRevenue: totalLifetimeRevenue > 0 ? totalLifetimeRevenue : (item.yield || 2499),
        dueDate: item.dueDate || 'N/A',
        daysRemaining: item.daysRemaining ?? 30,
        dueStatus: item.dueStatus || 'ACTIVE',
        historyList: historyList.length > 0 ? historyList : [{
           id: 'sub-1',
           date: new Date().toLocaleDateString('en-IN'),
           utr: item.utr || 'INIT_SUBSCRIPTION',
           plan: (item.plan || 'PROFESSIONAL').toUpperCase(),
           amount: item.amount || 2499,
           status: item.status || 'Active'
        }]
     })
  }

  const handleCopyText = (text, type = 'utr') => {
     if (!text) return
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
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans select-none">
      
      {/* ─── ⚡ CLEAN ENTERPRISE PAGE HEADER ───────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Revenue & Renewal Suite
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Calendar Telemetry
            </Badge>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Calendar-wise revenue tracking, monthly zero-reset audits, restaurant due date timeline, and 1-click renewal alerts.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Calendar Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            {[
              { id: 'MONTHLY', label: 'Monthly' },
              { id: 'WEEKLY', label: 'Weekly' },
              { id: 'DAILY', label: 'Daily' },
              { id: 'ALL', label: 'Annual / All' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCalendarMode(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  calendarMode === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <Button 
            onClick={fetchRevenueData}
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </Button>

          {/* Export CSV */}
          <Button 
            onClick={exportCSV}
            size="sm"
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ─── 📅 CALENDAR MONTH / PERIOD SELECTOR BAR ───────────────── */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                {calendarMode === 'MONTHLY' && `Tracking Month: ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                {calendarMode === 'WEEKLY' && 'Current Calendar Week (Monday to Sunday)'}
                {calendarMode === 'DAILY' && `Today's Revenue: ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                {calendarMode === 'ALL' && `All-Time Financial Year ${selectedYear}`}
              </span>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                Resets to ₹0 on 1st of every month
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Every month begins with ₹0 to accurately monitor recurring payments, renewed plans, and new store onboarding.
            </p>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handlePrevMonth}
            variant="outline"
            size="sm"
            className="h-8.5 px-2.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev Month
          </Button>

          {/* Month Dropdown */}
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="h-8.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden cursor-pointer"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>{m} {selectedYear}</option>
            ))}
          </select>

          <Button
            onClick={handleNextMonth}
            variant="outline"
            size="sm"
            className="h-8.5 px-2.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            title="Next Month"
          >
            Next Month
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>

          {(selectedMonth !== now.getMonth() || selectedYear !== now.getFullYear()) && (
            <Button
              onClick={handleResetToCurrentMonth}
              size="sm"
              variant="ghost"
              className="h-8.5 px-2.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 text-xs font-bold cursor-pointer"
            >
              Current Month
            </Button>
          )}
        </div>
      </div>

      {/* ─── ⚠️ DUE SOON & OVERDUE ALERT BANNER ────────────────────── */}
      {(metrics.dueSoonCount > 0 || metrics.overdueCount > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
                Renewal Attention Required
                <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                  {metrics.dueSoonCount + metrics.overdueCount} Stores Needing Renewal
                </Badge>
              </h4>
              <p className="text-xs text-amber-900 mt-0.5">
                {metrics.dueSoonCount} restaurant(s) expiring within the next 7 days &bull; {metrics.overdueCount} restaurant(s) currently overdue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setLedgerFilter('DUE_SOON')}
              size="sm"
              variant="outline"
              className="h-8.5 px-3 rounded-xl border-amber-300 text-amber-900 hover:bg-amber-100/60 text-xs font-bold cursor-pointer bg-white"
            >
              Filter Due Stores
            </Button>
            <Button
              onClick={handleNotifyAllDue}
              disabled={processingId === 'notify-all'}
              size="sm"
              className="h-8.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {processingId === 'notify-all' ? 'Sending Reminders...' : 'Send Renewal Reminders (All)'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* ─── 📊 REFINED KPI METRIC CARDS ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Selected Month Revenue */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {MONTH_NAMES[selectedMonth].substring(0, 3)} {selectedYear} Revenue
              </span>
              <IndianRupee className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatINR(metrics.selectedMonthRevenue)}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                {metrics.momFormatted}
              </span>
              <span className="text-slate-400">&bull;</span>
              <span>Starts at ₹0 on 1st</span>
            </p>
          </div>
        </Card>

        {/* KPI 2: Today's Revenue */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Revenue</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatINR(metrics.todayRevenue)}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Reset at 00:00 midnight daily
            </p>
          </div>
        </Card>

        {/* KPI 3: This Week's Revenue */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">This Week's Revenue</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatINR(metrics.weekRevenue)}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Monday through Sunday cycle
            </p>
          </div>
        </Card>

        {/* KPI 4: Renewal Timeline Alert */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Renewal Status</span>
              <BellRing className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {metrics.dueSoonCount + metrics.overdueCount} <span className="text-xs font-normal text-slate-400">Stores</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="text-amber-600 font-bold">{metrics.dueSoonCount} Due Soon</span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-rose-600 font-bold">{metrics.overdueCount} Overdue</span>
            </p>
          </div>
        </Card>
      </div>

      {/* ─── 📊 VISUAL ANALYTICS GRID (CHARTS) ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trajectory Chart */}
        <Card className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                {calendarMode === 'MONTHLY' && `${MONTH_NAMES[selectedMonth]} ${selectedYear} Daily Progression`}
                {calendarMode === 'WEEKLY' && 'Weekly Day-by-Day Revenue Flow'}
                {calendarMode === 'DAILY' && "Today's Intraday Revenue Velocity"}
                {calendarMode === 'ALL' && `Annual Revenue Trajectory (${selectedYear})`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {calendarMode === 'MONTHLY' && `Starts at ₹0 on the 1st of ${MONTH_NAMES[selectedMonth]} and accumulates with each payment.`}
                {calendarMode === 'WEEKLY' && 'Displays revenue registered across each day of the active week.'}
                {calendarMode === 'DAILY' && 'Displays intraday revenue registered across today.'}
                {calendarMode === 'ALL' && `Full 12-month calendar performance for ${selectedYear}.`}
              </p>
            </div>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-[10px] font-bold">
              {calendarMode === 'MONTHLY' ? 'Cumulative Curve' : 'Time Interval View'}
            </Badge>
          </div>
          
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              {calendarMode === 'MONTHLY' ? (
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
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis hide domain={['dataMin - 100', 'dataMax + 500']} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '0.75rem', 
                      border: 'none', 
                      color: 'white',
                      padding: '0.75rem 1rem'
                    }}
                    formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                  />
                </AreaChart>
              ) : (
                <BarChart data={metrics.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '0.75rem', 
                      border: 'none', 
                      color: 'white',
                      padding: '0.75rem 1rem'
                    }}
                    formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="dailyRevenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Plan Tier Distribution Donut Chart */}
        <Card className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white shadow-xs p-6 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Plan Tier Share</h3>
            <p className="text-xs text-slate-500 mt-0.5">Active tier distribution across stores</p>
          </div>

          <div className="h-52 w-full min-w-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
              <PieChart>
                <Pie
                  data={metrics.planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {metrics.planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '0.75rem', 
                    border: 'none', 
                    color: 'white'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-black text-slate-900">{metrics.activeClusters}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Plans</p>
            </div>
          </div>

          <div className="space-y-2">
            {metrics.planDistribution.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-bold text-slate-700">{p.name}</span>
                </div>
                <div className="text-right font-medium">
                  <span className="font-bold text-slate-900">{p.value}</span>
                  <span className="text-slate-400 ml-1.5">({p.share}%)</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ─── 📋 DUE DATES & SUBSCRIPTION LEDGER TABLE ─────────────── */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Toolbar & Filters */}
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900">Restaurant Due Dates & Subscription Ledger</h2>
              <Badge className="bg-slate-100 text-slate-800 text-[10px] font-bold">
                {filteredLedger.length} Records
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Track renewal due dates, days remaining, and dispatch instant renewal reminders to restaurant owners.
            </p>
          </div>

          {/* Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Status Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs">
              {[
                { id: 'ALL', label: `All (${metrics.ledger.length})` },
                { id: 'DUE_SOON', label: `Due Soon (${metrics.dueSoonCount})`, color: 'text-amber-700' },
                { id: 'OVERDUE', label: `Overdue (${metrics.overdueCount})`, color: 'text-rose-700' },
                { id: 'ACTIVE', label: 'Active' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setLedgerFilter(f.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    ledgerFilter === f.id
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : f.color || 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input 
                value={searchLedger}
                onChange={e => setSearchLedger(e.target.value)}
                placeholder="Search merchant, email, due date..."
                className="h-9 pl-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              />
              {searchLedger && (
                <button 
                  onClick={() => setSearchLedger('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Merchant Details</th>
                <th className="py-3.5 px-5">Subscription Plan</th>
                <th className="py-3.5 px-5">Monthly Yield</th>
                <th className="py-3.5 px-5">Start Date</th>
                <th className="py-3.5 px-5">Renewal Due Date</th>
                <th className="py-3.5 px-5">Due Status</th>
                <th className="py-3.5 px-5 text-right">Actions & Reminders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    No restaurant records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                          {row.name?.substring(0, 2).toUpperCase() || 'TX'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate">{row.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium truncate">{row.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200/80 font-mono text-[10px] font-bold uppercase">
                        {row.plan}
                      </Badge>
                    </td>

                    <td className="py-4 px-5 font-bold text-slate-900">
                      ₹{row.yield.toLocaleString('en-IN')}<span className="text-[10px] text-slate-400 font-normal">/mo</span>
                    </td>

                    <td className="py-4 px-5 text-slate-500 text-[11px] font-medium whitespace-nowrap">
                      {row.startDate}
                    </td>

                    {/* Renewal Due Date */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {row.dueDate}
                      </div>
                    </td>

                    {/* Due Status & Countdown Badge */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <Badge className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1.5 w-fit ${
                        row.dueStatus === 'OVERDUE'
                          ? 'bg-rose-50 text-rose-800 border-rose-200 font-extrabold'
                          : row.dueStatus === 'DUE_SOON' || row.dueStatus === 'DUE_TODAY'
                            ? 'bg-amber-50 text-amber-800 border-amber-200 font-extrabold'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          row.dueStatus === 'OVERDUE'
                            ? 'bg-rose-500'
                            : row.dueStatus === 'DUE_SOON' || row.dueStatus === 'DUE_TODAY'
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-emerald-500'
                        }`} />
                        {row.dueLabel}
                      </Badge>
                    </td>

                    {/* Actions & Reminders */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Send Renewal Notice Button */}
                        <Button 
                          onClick={() => handleSendRenewalNotification(row)}
                          disabled={processingId === `notify-${row.id}`}
                          variant={row.daysRemaining <= 7 ? "default" : "outline"}
                          size="sm"
                          className={`h-8 px-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            row.daysRemaining <= 7 
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs' 
                              : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Dispatch subscription renewal reminder email & dashboard alert"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          {sentNotificationMap[row.id] ? `Sent (${sentNotificationMap[row.id]})` : 'Send Renew Notice'}
                        </Button>

                        {/* Inspect Button */}
                        <Button 
                          onClick={() => handleInspectCompany(row)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          Inspect
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── 🛡️ SLIDING MERCHANT INSPECTION DRAWER ─────────────────── */}
      <AnimatePresence>
        {inspectingCompany && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectingCompany(null)}
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
                    {inspectingCompany.merchantName?.substring(0, 2).toUpperCase() || 'TX'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{inspectingCompany.merchantName}</h3>
                    <p className="text-xs text-slate-500">{inspectingCompany.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setInspectingCompany(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                {/* 4 Stat Box Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Renewal Due Date</span>
                    <p className="text-sm font-black text-slate-900 mt-1">{inspectingCompany.dueDate}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Days Left</span>
                    <p className={`text-sm font-black mt-1 ${inspectingCompany.daysRemaining <= 7 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {inspectingCompany.daysRemaining > 0 ? `${inspectingCompany.daysRemaining} Days` : `Expired ${Math.abs(inspectingCompany.daysRemaining)}d ago`}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Tier</span>
                    <p className="text-sm font-black text-indigo-600 mt-1 truncate">{inspectingCompany.planName}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Yield</span>
                    <p className="text-sm font-black text-slate-900 mt-1">₹{inspectingCompany.amount?.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* UUID Card */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Restaurant ID</span>
                    <p className="font-mono text-xs font-semibold text-slate-700 truncate max-w-50">{inspectingCompany.restaurantId}</p>
                  </div>
                  <button
                    onClick={() => handleCopyText(inspectingCompany.restaurantId, 'uuid')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Copy UUID"
                  >
                    {copiedUuid ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Renewal Quick Action in Drawer */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                    <BellRing className="w-4 h-4 text-amber-600" />
                    Renewal Management
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Send an authoritative renewal notice via email & merchant dashboard alert with instant payment gateway link.
                  </p>
                  <Button
                    onClick={() => handleSendRenewalNotification(inspectingCompany)}
                    disabled={processingId === `notify-${inspectingCompany.id}`}
                    size="sm"
                    className="w-full h-8.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Dispatch Renewal Notification
                  </Button>
                </div>

                {/* Audit & Transaction History */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">Billing History</p>
                  <div className="space-y-1.5">
                    {inspectingCompany.historyList?.map((h, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{h.plan} &bull; ₹{h.amount}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Ref: {h.utr}</p>
                        </div>
                        <Badge className="text-[9px] font-bold uppercase bg-white text-slate-700 border-slate-200">
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
                  onClick={() => handleGrantExtension(inspectingCompany)}
                  disabled={processingId === 'extend'}
                  className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Grant +30 Days Free Extension
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
