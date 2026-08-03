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
  ExternalLink
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
  const [showNotifications, setShowNotifications] = useState(false)
  const searchRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    // Request Desktop Web Push Notification Permission on Mount
    requestPushPermission()

    // Load Live Notifications from Audits via Supabase
    const loadNotifs = async () => {
      const { data: audits } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5)
      
      if (audits) {
         setNotifications(audits.map(a => ({
            id: a.id,
            action: a.action,
            severity: a.severity || 'NOMINAL',
            timestamp: new Date(a.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
         })))
      }
    }
    
    loadNotifs()
    window.addEventListener('platformConfigUpdated', loadNotifs)
    
    // Realtime Listener for Instant Web & Push Notification Alerts
    const channel = supabase
      .channel('public:admin_push_alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
         loadNotifs()
         const audit = payload.new
         triggerPushNotification({
            title: `🚨 System Event: ${audit.action || 'New Audit Entry'}`,
            body: `Performer: ${audit.actor || 'System'} | Severity: ${audit.severity || 'NOMINAL'}`,
            onClick: () => navigate('/admin/audit')
         })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payment_verifications' }, (payload) => {
         const pay = payload.new
         triggerPushNotification({
            title: `💳 New UPI Payment Request`,
            body: `UTR #${pay.utr_number || 'N/A'} submitted by ${pay.merchant_name || pay.email || 'Merchant'}. Action required!`,
            onClick: () => navigate('/admin/revenue')
         })
      })
      .subscribe()

    // Keyboard shortcut Ctrl+K or Cmd+K
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    // Close search on click outside
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('platformConfigUpdated', loadNotifs)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
       // Search via Supabase ILIKE queries
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

  return (
    <header className="h-20 shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-8 z-50 sticky top-0 shadow-sm transition-all">
      
      {/* Left: Mobile Menu Toggle & Omni Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-slate-600 hover:bg-slate-100/80 rounded-2xl transition-transform active:scale-95"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        {/* Global Search Bar */}
        <div ref={searchRef} className="relative hidden md:block w-full">
          <div className={`flex items-center bg-slate-100/80 hover:bg-slate-100 rounded-2xl px-5 py-3 border transition-all duration-300 ${
            showResults 
              ? 'ring-4 ring-indigo-500/10 bg-white border-indigo-400 shadow-lg shadow-indigo-500/5' 
              : 'border-slate-200/80 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:bg-white focus-within:border-indigo-400'
          }`}>
            <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Search Merchants, Support Tickets, Forensic Logs..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchTerm && setShowResults(true)}
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-900 w-full placeholder:text-slate-400 placeholder:font-medium tracking-tight"
            />
            {searchTerm ? (
              <X 
                className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" 
                onClick={() => { setSearchTerm(''); setShowResults(false); }}
              />
            ) : (
              <div className="flex items-center gap-1 bg-white border border-slate-200/80 text-slate-400 font-black px-2 py-0.5 rounded-lg text-[9px] shadow-2xs pointer-events-none">
                 <Command className="w-2.5 h-2.5" /> K
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2.25rem] shadow-2xl shadow-slate-900/10 border border-slate-200/80 p-5 z-50 overflow-hidden ring-1 ring-slate-900/5"
              >
                {searching ? (
                  <div className="space-y-4 p-2">
                     <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-2xl" />
                        <div className="space-y-2 flex-1">
                           <Skeleton className="h-4 w-3/4" />
                           <Skeleton className="h-3 w-1/2" />
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-2xl" />
                        <div className="space-y-2 flex-1">
                           <Skeleton className="h-4 w-2/3" />
                           <Skeleton className="h-3 w-1/3" />
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide p-1">
                    {searchResults.merchants.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-indigo-500" /> Merchants & Nodes
                        </h4>
                        {searchResults.merchants.map(m => (
                          <div 
                            key={m.email} 
                            onClick={() => { navigate('/admin/merchants'); setShowResults(false); }} 
                            className="flex items-center gap-3 p-3.5 hover:bg-indigo-50/60 rounded-2xl cursor-pointer transition-all group border border-transparent hover:border-indigo-100"
                          >
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-900 leading-none truncate group-hover:text-indigo-600 transition-colors">{m.businessName}</p>
                              <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{m.email}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
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

      {/* Right Actions: Notifications & Owner Profile Menu */}
      <div className="flex items-center gap-4">
        
        {/* Live Notification Relay Drawer */}
        <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
          <DropdownMenuTrigger asChild>
             <Button 
               variant="ghost" 
               size="icon" 
               className="relative h-11 w-11 rounded-2xl hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-transparent hover:border-slate-200"
             >
                <Bell className="w-5 h-5 text-slate-600" />
                {notifications.length > 0 && (
                   <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
             </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 rounded-[2.25rem] shadow-2xl shadow-slate-900/10 border-slate-200/80 overflow-hidden z-50 mt-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-linear-to-br from-slate-950 to-indigo-950 p-6 text-white overflow-hidden relative">
               <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 pointer-events-none" />
               <div className="flex items-center justify-between mb-3 relative z-10">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                     <ShieldCheck className="w-4 h-4 text-emerald-400" /> Forensic Relay
                  </h4>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[8px] font-black tracking-widest px-2 py-0.5">
                     LIVE
                  </Badge>
               </div>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Real-Time Security & System Events</p>
            </div>

            <div className="p-3 bg-white space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
               {notifications.length > 0 ? notifications.map((n, idx) => (
                  <div 
                    key={n.id || idx} 
                    className="p-3 border border-slate-100 hover:bg-slate-50 hover:border-slate-200/80 rounded-2xl transition-all group flex items-start gap-3.5 cursor-pointer" 
                    onClick={() => { navigate('/admin/audit'); setShowNotifications(false); }}
                  >
                     <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-black text-xs transition-transform group-hover:scale-105 ${
                        n.severity === 'CRITICAL' || n.severity === 'WARNING' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                     }`}>
                        <ShieldCheck className="w-4 h-4" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{n.action}</p>
                        <p className="text-[9px] font-bold text-slate-400 truncate mt-1 italic">{n.timestamp}</p>
                     </div>
                  </div>
               )) : (
                  <div className="py-10 text-center space-y-2 opacity-40">
                     <ShieldCheck className="w-8 h-8 mx-auto text-slate-400" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Protocol Buffer Clear</p>
                  </div>
               )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
               <Button 
                onClick={() => { navigate('/admin/audit'); setShowNotifications(false); }}
                className="w-full h-11 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-md hover:shadow-lg active:scale-95 transition-all"
               >
                  Full Forensic Audit Trail
               </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-8 w-px bg-slate-200/80 mx-1 hidden sm:block" />

        {/* System Owner Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2.5 h-11 px-3.5 pr-4 rounded-2xl border-indigo-200/80 bg-indigo-50/60 hover:bg-indigo-100/60 hover:border-indigo-300 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <div className="relative">
                 <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow-md shadow-indigo-500/20">
                    SO
                 </div>
                 <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
              </div>
              <div className="text-left hidden sm:block">
                 <p className="font-black text-xs text-indigo-950 tracking-tight leading-none uppercase">System Owner</p>
                 <p className="text-[9px] font-bold text-indigo-600/80 uppercase tracking-widest leading-none mt-0.5">Root Admin</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-64 p-2 rounded-[2rem] shadow-2xl shadow-slate-900/10 border-slate-200/80 mt-3 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-5 border-b border-slate-100 mb-2 bg-linear-to-br from-slate-50 to-indigo-50/50 rounded-2xl">
              <p className="text-xs font-black text-slate-900 tracking-tight leading-none uppercase">Root Authorization</p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest truncate">admin@servora.com</p>
            </div>
            
            <div className="p-1 space-y-1">
               <div 
                  className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer transition-all group"
                  onClick={copyKey}
               >
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest leading-none group-hover:text-slate-900">Secret Access Key</span>
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />}
               </div>

               <DropdownMenuItem 
                  inset={false}
                  className="h-11 rounded-xl font-black text-[10px] text-slate-700 uppercase tracking-widest focus:bg-slate-100 cursor-pointer flex gap-3 mt-1 active:scale-95 transition-all"
                  onClick={() => navigate('/admin/settings')}
               >
                  <Sparkles className="w-4 h-4 text-indigo-500" /> Platform Settings
               </DropdownMenuItem>

               <DropdownMenuSeparator className="bg-slate-100 my-1" />

               <DropdownMenuItem 
                  inset={false}
                  className="h-11 rounded-xl font-black text-[10px] text-red-600 uppercase tracking-widest focus:bg-red-50 focus:text-red-700 cursor-pointer flex gap-3 active:scale-95 transition-all"
                  onClick={() => { 
                    sessionStorage.clear()
                    toast.success('Signed Out', { description: 'Admin session terminated' })
                    navigate('/admin/login') 
                  }}
               >
                  <Trash2 className="w-4 h-4" /> Sign Out Securely
               </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}
