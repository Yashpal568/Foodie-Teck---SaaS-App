import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Menu, 
  Search, 
  Bell, 
  Copy, 
  Check, 
  User, 
  MessageSquare, 
  History, 
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
  Trash2,
  Command,
  Sparkles,
  ExternalLink,
  CreditCard,
  Store,
  ShieldAlert,
  CheckCheck,
  Clock,
  ChevronRight,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getAdminPlatformData } from '@/lib/adminDataService'
import { toast } from 'sonner'

import { requestPushPermission, triggerPushNotification } from '@/lib/pushNotifications'

export default function AdminHeader({ onMenuClick }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState({ merchants: [], tickets: [], audits: [] })
  const [showResults, setShowResults] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState('ALL')
  const [showNotifications, setShowNotifications] = useState(false)
  const searchRef = useRef(null)
  const inputRef = useRef(null)
  const knownPaymentIdsRef = useRef(new Set())
  const isInitialLoadRef = useRef(true)

  const loadNotifications = async () => {
    try {
      const platformData = await getAdminPlatformData()
      const pendingVerifications = platformData.pendingVerifications || []
      const restaurants = platformData.restaurants || []
      
      let audits = []
      try {
        const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6)
        if (data) audits = data
      } catch (e) {}

      const aggregatedList = []

      // 1. Pending Payment Verifications
      pendingVerifications.forEach(p => {
        const pKey = p.utr && p.utr !== 'N/A' ? `utr-${p.utr}` : `pay-${p.id}`

        // Trigger real-time popup toast if this is a newly arrived payment after initial mount
        if (!isInitialLoadRef.current && !knownPaymentIdsRef.current.has(pKey)) {
          toast('💳 New Payment Verification Received!', {
            description: `${p.merchant} submitted UTR #${p.utr} for ${p.plan} (₹${p.amount?.toLocaleString('en-IN')})`,
            action: {
              label: 'Review Queue',
              onClick: () => navigate('/admin/verifications')
            },
            duration: 9000
          })

          triggerPushNotification({
            title: '💳 New Payment Verification',
            body: `${p.merchant} submitted UTR #${p.utr} for ${p.plan}`
          })
        }
        knownPaymentIdsRef.current.add(pKey)

        aggregatedList.push({
          id: `pay-${p.id}`,
          category: 'PAYMENTS',
          title: `UTR Payment Verification Needed`,
          desc: `${p.merchant} submitted UTR #${p.utr} for ${p.plan} (₹${p.amount?.toLocaleString('en-IN')})`,
          timestamp: p.createdAt || 'Just now',
          rawDate: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
          unread: true,
          route: '/admin/verifications',
          icon: CreditCard,
          color: 'emerald'
        })
      })

      isInitialLoadRef.current = false

      // 2. Recent Merchant Signups
      restaurants.slice(-4).forEach(r => {
        aggregatedList.push({
          id: `rest-${r.id}`,
          category: 'MERCHANTS',
          title: `New Merchant Node Registered`,
          desc: `${r.business_name || r.name || 'Merchant'} (${r.email || 'N/A'}) initialized workspace.`,
          timestamp: new Date(r.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          rawDate: new Date(r.created_at || Date.now()).getTime(),
          unread: false,
          route: '/admin/customers',
          icon: Store,
          color: 'blue'
        })
      })

      // 3. System Audits
      audits.forEach(a => {
        if (!aggregatedList.some(item => item.id === `audit-${a.id}`)) {
          aggregatedList.push({
            id: `audit-${a.id}`,
            category: 'SYSTEM',
            title: a.action || 'Security Telemetry Event',
            desc: `Actor: ${a.actor || 'system@servora'} | Severity: ${a.severity || 'NOMINAL'}`,
            timestamp: new Date(a.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            rawDate: new Date(a.created_at || Date.now()).getTime(),
            unread: a.severity === 'WARNING' || a.severity === 'CRITICAL',
            route: '/admin/audit',
            icon: ShieldAlert,
            color: a.severity === 'CRITICAL' ? 'rose' : 'indigo'
          })
        }
      })

      // 4. Live Supabase Platform Notifications
      try {
        const { data: dbNotifs } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (dbNotifs && dbNotifs.length > 0) {
          dbNotifs.forEach(n => {
            if (!aggregatedList.some(item => item.id === `notif-${n.id}`)) {
              aggregatedList.push({
                id: `notif-${n.id}`,
                category: n.type === 'new_order' ? 'ORDERS' : 'SYSTEM',
                title: n.title || 'Platform Notification',
                desc: n.message || 'Notification received.',
                timestamp: new Date(n.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                rawDate: new Date(n.created_at || Date.now()).getTime(),
                unread: !n.is_read,
                route: '/admin/audit',
                icon: Zap,
                color: 'blue'
              })
            }
          })
        }
      } catch (e) {}

      // 5. Support Tickets
      try {
        const { data: supportTickets } = await supabase
          .from('support_tickets')
          .select('*')
          .in('status', ['OPEN', 'IN-PROGRESS'])
          .order('updated_at', { ascending: false })
          .limit(5)
        
        if (supportTickets && supportTickets.length > 0) {
          supportTickets.forEach(t => {
            if (!aggregatedList.some(item => item.id === `ticket-${t.id}`)) {
              aggregatedList.push({
                id: `ticket-${t.id}`,
                category: 'SYSTEM',
                title: `Support Ticket: ${t.status}`,
                desc: `[${t.subject}] - Merchant Ticket`,
                timestamp: new Date(t.updated_at || t.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                rawDate: new Date(t.updated_at || t.created_at || Date.now()).getTime(),
                unread: t.status === 'OPEN',
                route: '/admin/support',
                icon: MessageSquare,
                color: 'emerald'
              })
            }
          })
        }
      } catch (e) {}

      aggregatedList.sort((a, b) => b.rawDate - a.rawDate)

      setNotifications(aggregatedList)
      setUnreadCount(aggregatedList.filter(n => n.unread).length)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  useEffect(() => {
    requestPushPermission()
    loadNotifications()

    const handleStorage = (e) => {
      if (e.key === 'servora_admin_payment_alert' && e.newValue) {
        try {
          const item = JSON.parse(e.newValue)
          toast('💳 New Payment Verification Received!', {
            description: `${item.merchant || 'Merchant'} submitted UTR #${item.utr} for ${item.plan} (₹${item.amount?.toLocaleString('en-IN')})`,
            action: {
              label: 'Review Queue',
              onClick: () => navigate('/admin/verifications')
            },
            duration: 9000
          })
          triggerPushNotification({
            title: '💳 New Payment Verification',
            body: `${item.merchant} submitted UTR #${item.utr} for ${item.plan}`
          })
        } catch (err) {}
      }
      loadNotifications()
    }

    window.addEventListener('platformConfigUpdated', loadNotifications)
    window.addEventListener('storage', handleStorage)

    // Regular 4-second polling to ensure 100% telemetry freshness even if Realtime is offline
    const interval = setInterval(loadNotifications, 4000)

    const channel = supabase
      .channel('public:admin_header_notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_verifications' }, () => loadNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => loadNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => loadNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => loadNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => loadNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_replies' }, () => loadNotifications())
      .subscribe()

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      clearInterval(interval)
      window.removeEventListener('platformConfigUpdated', loadNotifications)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
      supabase.removeChannel(channel)
    }
  }, [])

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
    setUnreadCount(0)
    toast.success('All Notifications Marked Read')
  }

  const handleSearch = async (val) => {
    setSearchTerm(val)
    if (!val.trim()) {
      setSearchResults({ merchants: [], tickets: [], audits: [] })
      setShowResults(false)
      setSearching(false)
      return
    }

    try {
       setSearching(true)
       setShowResults(true)
       const { data: merchantsData } = await supabase.from('restaurants').select('*').or(`business_name.ilike.%${val}%,email.ilike.%${val}%`).limit(3)
       const { data: ticketsData } = await supabase.from('support_tickets').select('*').or(`subject.ilike.%${val}%`).limit(3)
       const { data: auditsData } = await supabase.from('audit_logs').select('*').or(`action.ilike.%${val}%,type.ilike.%${val}%`).limit(3)

       setSearchResults({
         merchants: (merchantsData || []).map(m => ({ email: m.email, businessName: m.business_name })),
         tickets: (ticketsData || []).map(t => ({ id: t.id, subject: t.subject, status: t.status, businessName: t.restaurant_id })),
         audits: (auditsData || []).map(a => ({ action: a.action, type: a.type, timestamp: new Date(a.created_at || Date.now()).toLocaleString() }))
       })
    } catch (err) {
       console.error("Search failed:", err)
    } finally {
       setSearching(false)
    }
  }

  const copyKey = () => {
    navigator.clipboard.writeText('SYS-ADM-2026-KEY')
    setCopied(true)
    toast.success('Admin Key Copied', { description: 'Access key saved to clipboard' })
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'ALL') return true
    return n.category === activeTab
  })

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-6 sm:px-8 backdrop-blur-xl transition-all">
      {/* Mobile Drawer Trigger & Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onMenuClick} 
          className="lg:hidden rounded-2xl h-11 w-11 hover:bg-slate-100 border border-slate-200/80"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </Button>

        {/* Global Forensic Command Search Bar */}
        <div ref={searchRef} className="relative w-full">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchTerm.trim() && setShowResults(true)}
              placeholder="Search Merchants, Support Tickets, Forensic Logs..."
              className="w-full h-11 pl-11 pr-16 bg-slate-100/60 border border-slate-200/70 rounded-2xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all shadow-inner"
            />
            <div className="absolute right-3.5 flex items-center gap-1 text-[10px] font-black text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-lg border border-slate-300/50 pointer-events-none">
              <Command className="w-3 h-3" /> K
            </div>
          </div>

          {/* Search Dropdown Overlay */}
          <AnimatePresence>
            {showResults && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 overflow-hidden z-50 p-3"
              >
                {searching ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-10 rounded-2xl w-full" />
                    <Skeleton className="h-10 rounded-2xl w-full" />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto p-1 scrollbar-hide">
                    {searchResults.merchants.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-blue-500" /> Active Merchants
                        </h4>
                        {searchResults.merchants.map((m, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => { navigate('/admin/customers'); setShowResults(false); }} 
                            className="flex items-center gap-3 p-3.5 hover:bg-blue-50/60 rounded-2xl cursor-pointer transition-all group border border-transparent hover:border-blue-100"
                          >
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                              {m.businessName?.substring(0, 2).toUpperCase() || 'MN'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-900 leading-none truncate group-hover:text-blue-600 transition-colors">{m.businessName}</p>
                              <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{m.email}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.tickets.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3 text-emerald-500" /> Support Relay
                        </h4>
                        {searchResults.tickets.map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => { navigate('/admin/support'); setShowResults(false); }} 
                            className="flex items-center gap-3 p-3.5 hover:bg-emerald-50/60 rounded-2xl cursor-pointer transition-all group border border-transparent hover:border-emerald-100"
                          >
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-900 leading-none truncate group-hover:text-emerald-600 transition-colors">#{t.id} - {t.subject}</p>
                              <p className="text-[10px] font-bold text-slate-400 truncate mt-1 uppercase tracking-wider">{t.status}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.audits.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
                          <History className="w-3 h-3 text-purple-500" /> Forensic Logs
                        </h4>
                        {searchResults.audits.map((a, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => { navigate('/admin/audit'); setShowResults(false); }} 
                            className="flex items-center gap-3 p-3.5 hover:bg-purple-50/60 rounded-2xl cursor-pointer transition-all group border border-transparent hover:border-purple-100"
                          >
                            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                              <History className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-900 leading-none truncate group-hover:text-purple-600 transition-colors">{a.action}</p>
                              <p className="text-[10px] font-bold text-slate-400 truncate mt-1 italic uppercase tracking-wider">{a.timestamp}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}

                    {Object.values(searchResults).every(arr => arr.length === 0) && (
                      <div className="py-10 text-center space-y-2 opacity-50">
                        <Sparkles className="w-8 h-8 mx-auto text-slate-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No Intelligence Matches Found</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Actions: Notifications Panel & Profile */}
      <div className="flex items-center gap-4">
        
        {/* ─── ⚡ REDESIGNED ADMIN NOTIFICATION PANEL ─────────────────── */}
        <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
          <DropdownMenuTrigger asChild>
             <Button 
               variant="ghost" 
               size="icon" 
               className="relative h-11 w-11 rounded-2xl bg-white hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-200/80 shadow-xs"
             >
                <Bell className="w-5 h-5 text-slate-700" />
                {unreadCount > 0 && (
                   <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black flex items-center justify-center shadow-lg shadow-rose-500/50 border-2 border-white ring-2 ring-rose-500/30 animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                   </span>
                )}
             </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent 
             align="end" 
             className="w-96 p-0 rounded-[2.25rem] shadow-2xl shadow-slate-900/20 border-slate-200/90 overflow-hidden z-50 mt-3 animate-in fade-in zoom-in-95 duration-200 bg-white"
          >
             {/* Notification Header */}
             <div className="bg-slate-950 text-white p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-2 relative z-10">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                         <Bell className="w-4 h-4" />
                      </div>
                      <div>
                         <h4 className="text-sm font-black uppercase tracking-widest text-white">Notifications</h4>
                         <p className="text-[10px] text-slate-400 font-bold">Real-time SaaS Telemetry Alerts</p>
                      </div>
                   </div>

                   {unreadCount > 0 && (
                      <button 
                         onClick={markAllAsRead}
                         className="text-[10px] font-black text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 transition-all"
                         title="Mark all as read"
                      >
                         <CheckCheck className="w-3.5 h-3.5" />
                         Read All
                      </button>
                   )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-800/80">
                   {['ALL', 'PAYMENTS', 'MERCHANTS', 'ORDERS', 'SYSTEM'].map(tab => (
                      <button
                         key={tab}
                         onClick={() => setActiveTab(tab)}
                         className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                            activeTab === tab 
                               ? 'bg-blue-600 text-white shadow-md' 
                               : 'text-slate-400 hover:text-white hover:bg-slate-900'
                         }`}
                      >
                         {tab}
                      </button>
                   ))}
                </div>
             </div>

             {/* Notification List Body */}
             <div className="p-3 bg-slate-50/50 space-y-2 max-h-96 overflow-y-auto">
                {filteredNotifications.length > 0 ? (
                   filteredNotifications.map((n) => {
                      const IconComp = n.icon || Bell
                      return (
                         <div 
                            key={n.id} 
                            onClick={() => {
                               navigate(n.route)
                               setShowNotifications(false)
                            }}
                            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group flex items-start gap-3.5 relative overflow-hidden ${
                               n.unread 
                                  ? 'bg-white border-blue-200 shadow-md hover:border-blue-300 hover:shadow-lg' 
                                  : 'bg-white/60 border-slate-200/70 hover:bg-white hover:border-slate-300'
                            }`}
                         >
                            {n.unread && (
                               <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                            )}

                            <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white shadow-sm ${
                               n.color === 'emerald' ? 'bg-emerald-600' : n.color === 'blue' ? 'bg-blue-600' : n.color === 'rose' ? 'bg-rose-600' : 'bg-indigo-600'
                            }`}>
                               <IconComp className="w-4.5 h-4.5" />
                            </div>

                            <div className="flex-1 min-w-0 pr-2">
                               <p className="text-xs font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                                  {n.title}
                               </p>
                               <p className="text-[11px] font-medium text-slate-500 leading-snug mt-1 line-clamp-2">
                                  {n.desc}
                               </p>
                               <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {n.timestamp}
                               </p>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-400 self-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                         </div>
                      )
                   })
                ) : (
                   <div className="py-12 text-center space-y-2 opacity-50">
                      <ShieldCheck className="w-8 h-8 mx-auto text-slate-400" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No Active Notifications</p>
                   </div>
                )}
             </div>

             {/* Footer Action Links */}
             <div className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2">
                <Button 
                   onClick={() => { navigate('/admin/revenue'); setShowNotifications(false); }}
                   variant="outline"
                   className="flex-1 h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-bold text-[10px] uppercase tracking-wider"
                >
                   <CreditCard className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                   Revenue Queue
                </Button>
                <Button 
                   onClick={() => { navigate('/admin/customers'); setShowNotifications(false); }}
                   variant="outline"
                   className="flex-1 h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-bold text-[10px] uppercase tracking-wider"
                >
                   <Store className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                   Merchants
                </Button>
             </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-8 w-px bg-slate-200/80 mx-1 hidden sm:block" />

        {/* System Owner Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-3 h-12 pl-2 pr-3.5 rounded-2xl hover:bg-slate-100 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                SO
              </div>
              <div className="text-left hidden md:block leading-none">
                 <p className="text-xs font-black text-slate-900 uppercase tracking-wider">System Owner</p>
                 <p className="text-[10px] font-bold text-slate-400 mt-1">ROOT ADMIN</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-72 p-3 rounded-[2rem] shadow-2xl border-slate-200/80 z-50 mt-3 space-y-1">
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Platform Key</p>
                <div className="flex items-center justify-between mt-2 bg-white p-2 rounded-xl border border-slate-200/80">
                   <span className="text-[10px] font-mono font-bold text-slate-600">SYS-ADM-2026-KEY</span>
                   <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-slate-900" onClick={copyKey}>
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                   </Button>
                </div>
             </div>

             <DropdownMenuItem onClick={() => navigate('/admin/settings')} className="p-3 rounded-xl font-bold text-xs cursor-pointer">
                Platform Settings
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => navigate('/admin/audit')} className="p-3 rounded-xl font-bold text-xs cursor-pointer">
                Security Audit Log
             </DropdownMenuItem>

             <DropdownMenuSeparator className="my-2 bg-slate-100" />

             <DropdownMenuItem 
               onClick={() => {
                  sessionStorage.removeItem('servora_admin_token')
                  toast.info('Admin Session Terminated')
                  navigate('/admin/login')
               }} 
               className="p-3 rounded-xl font-bold text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
             >
                Sign Out Admin Session
             </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
