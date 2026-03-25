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
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminHeader({ onMenuClick }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState({ merchants: [], tickets: [], audits: [] })
  const [showResults, setShowResults] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    // Load Live Notifications from Audits
    const loadNotifs = () => {
      const audits = JSON.parse(localStorage.getItem('servora_db_audits') || '[]')
      setNotifications(audits.slice(0, 5))
    }
    loadNotifs()
    window.addEventListener('storage', loadNotifs)
    
    // Close search on click outside
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('storage', loadNotifs)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSearch = (val) => {
    setSearchTerm(val)
    if (!val.trim()) {
      setSearchResults({ merchants: [], tickets: [], audits: [] })
      setShowResults(false)
      return
    }

    const merchants = JSON.parse(localStorage.getItem('servora_db_users') || '[]')
    const tickets = JSON.parse(localStorage.getItem('servora_db_tickets') || '[]')
    const audits = JSON.parse(localStorage.getItem('servora_db_audits') || '[]')

    const filteredMerchants = merchants.filter(m => 
      m.businessName?.toLowerCase().includes(val.toLowerCase()) || 
      m.email?.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 3)

    const filteredTickets = tickets.filter(t => 
      t.id.toLowerCase().includes(val.toLowerCase()) || 
      t.subject.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 3)

    const filteredAudits = audits.filter(a => 
      a.action.toLowerCase().includes(val.toLowerCase()) || 
      a.type.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 3)

    setSearchResults({
      merchants: filteredMerchants,
      tickets: filteredTickets,
      audits: filteredAudits
    })
    setShowResults(true)
  }

  const copyKey = () => {
    navigator.clipboard.writeText('SYS-ADM-2026-KEY')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="h-20 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-50 sticky top-0 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-slate-500 hover:bg-slate-100"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        {/* Global Search Interface */}
        <div ref={searchRef} className="relative hidden md:block max-w-xl w-full">
          <div className={`flex items-center bg-slate-100 rounded-2xl px-5 py-3 border transition-all shadow-inner ${
            showResults ? 'ring-2 ring-blue-500/20 bg-white border-blue-200' : 'border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white focus-within:border-blue-200'
          }`}>
            <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
            <input 
              type="text" 
              placeholder="Omni-Intelligence Search (Merchants, TKTs, Forensic Logs)..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchTerm && setShowResults(true)}
              className="bg-transparent border-none outline-none text-[13px] font-black text-slate-900 w-full placeholder:text-slate-400 placeholder:font-bold tracking-tight"
            />
            {searchTerm && (
              <X 
                className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" 
                onClick={() => { setSearchTerm(''); setShowResults(false); }}
              />
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-4 z-50 ring-1 ring-slate-900/5"
              >
                <div className="space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar p-2">
                  {searchResults.merchants.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Merchants & Nodes</h4>
                      {searchResults.merchants.map(m => (
                        <div key={m.email} onClick={() => navigate('/admin/merchants')} className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-2xl cursor-pointer transition-colors group border border-transparent hover:border-blue-100">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 leading-none truncate">{m.businessName}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{m.email}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.tickets.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Support Relay</h4>
                      {searchResults.tickets.map(t => (
                        <div key={t.id} onClick={() => navigate('/admin/support')} className="flex items-center gap-3 p-3 hover:bg-emerald-50 rounded-2xl cursor-pointer transition-colors group border border-transparent hover:border-emerald-100">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 leading-none truncate">#{t.id} - {t.subject}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate mt-1 uppercase tracking-tighter">{t.status} &bull; {t.businessName}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.audits.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Forensic Logs</h4>
                      {searchResults.audits.map((a, idx) => (
                        <div key={idx} onClick={() => navigate('/admin/audit')} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors group border border-transparent hover:border-slate-100">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black">
                            <History className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 leading-none truncate">{a.action}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate mt-1 uppercase italic tracking-tighter">{a.type} &bull; {a.timestamp}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      ))}
                    </div>
                  )}

                  {Object.values(searchResults).every(arr => arr.length === 0) && (
                    <div className="py-12 text-center space-y-3 opacity-40">
                      <Zap className="w-10 h-10 mx-auto text-slate-400" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">No Intelligence Matches Found</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Live Notification Relay */}
        <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
          <DropdownMenuTrigger asChild>
             <Button variant="ghost" size="icon" className="relative hover:bg-slate-100">
                <Bell className="w-5 h-5 text-slate-500" />
                {notifications.length > 0 && (
                   <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
             </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 rounded-[2rem] shadow-2xl border-slate-100 overflow-hidden z-50 mt-4">
            <div className="bg-slate-950 p-6 text-white overflow-hidden relative">
               <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
               <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em]">Forensic Relay</h4>
                  <div className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-bold">LIVE</div>
               </div>
               <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest italic">Monitoring Platform Mutations...</p>
            </div>
            <div className="p-3 bg-white space-y-2 max-h-[350px] overflow-y-auto no-scrollbar">
               {notifications.length > 0 ? notifications.map((n, idx) => (
                  <div key={idx} className="p-3 border border-slate-50 hover:bg-slate-50 rounded-2xl transition-all group flex items-start gap-4 cursor-pointer" onClick={() => navigate('/admin/audit')}>
                     <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                        n.severity === 'CRITICAL' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                     }`}>
                        <ShieldCheck className="w-4 h-4" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-900 leading-tight uppercase line-clamp-2">{n.action}</p>
                        <p className="text-[9px] font-bold text-slate-400 truncate mt-1 italic">{n.timestamp}</p>
                     </div>
                  </div>
               )) : (
                  <div className="py-10 text-center space-y-4 opacity-30 italic">
                     <p className="text-[10px] font-black uppercase tracking-widest">Protocol Buffer Clear</p>
                  </div>
               )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
               <Button 
                onClick={() => { navigate('/admin/audit'); setShowNotifications(false); }}
                className="w-full h-10 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-lg hover:shadow-black/10 active:scale-95 transition-all"
               >
                  Full Forensic Audit
               </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 h-10 px-4 rounded-full border-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors shadow-sm cursor-pointer shadow-blue-500/10 active:scale-95">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-inner">SO</div>
              <span className="hidden sm:inline-block font-black text-xs text-blue-900 tracking-tighter uppercase mr-1">System Owner</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 rounded-[2rem] shadow-2xl border-slate-100 mt-4 overflow-hidden z-50">
            <div className="px-5 py-5 border-b border-slate-100 mb-2 bg-slate-50/50">
              <p className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase italic">Root Authorization</p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest truncate">admin@servora.com</p>
            </div>
            <div className="p-2 space-y-1">
               <div 
                  className="flex items-center justify-between px-3 py-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer transition-colors group"
                  onClick={copyKey}
               >
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none group-hover:text-slate-900">Access Key</span>
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
               </div>
               <DropdownMenuItem 
                  className="h-12 rounded-xl font-black text-[10px] text-red-600 uppercase tracking-widest focus:bg-red-50 focus:text-red-700 cursor-pointer flex gap-3 mt-1 active:scale-95 transition-all"
                  onClick={() => { navigate('/admin/login'); }}
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
