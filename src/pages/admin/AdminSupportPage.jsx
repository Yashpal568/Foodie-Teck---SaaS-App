import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Inbox, 
  MessageSquare, 
  CheckCircle2, 
  Trash2, 
  Search, 
  User, 
  Send,
  Clock,
  Filter,
  LifeBuoy,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { logAdminAction } from '@/lib/audit'
import { toast } from 'sonner'
import { fetchAllTickets, addTicketReply, updateTicketStatus } from '@/lib/api'

export default function AdminSupportPage() {
  const [search, setSearch] = useState('')
  const [tickets, setTickets] = useState([])
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const loadTickets = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      const data = await fetchAllTickets()
      
      const formatted = (data || []).map(t => ({
         ...t,
         businessName: t.business_name || t.restaurants?.business_name || 'Merchant',
         restaurantId: t.restaurant_id,
         time: new Date(t.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
         date: new Date(t.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
         replies: (t.ticket_replies || []).map(r => ({
           author: r.sender_role === 'admin' ? 'Support Team' : 'Merchant',
           isAdmin: r.sender_role === 'admin',
           message: r.message,
           createdAt: r.created_at
         })).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      }))
      
      setTickets(formatted)
      
      if (selectedTicket) {
        const updated = formatted.find(t => t.id === selectedTicket.id)
        if (updated) setSelectedTicket(updated)
      }
    } catch (err) {
      console.error('Failed to load tickets:', err)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
    const interval = setInterval(() => loadTickets(true), 10000)
    return () => clearInterval(interval)
  }, [])

  const handleReply = async (ticketId, resolve = false) => {
    if (!replyMessage.trim() && !resolve) return

    try {
      if (replyMessage.trim()) {
         await addTicketReply(ticketId, replyMessage, 'admin')
      }
      
      const newStatus = resolve ? 'RESOLVED' : 'IN-PROGRESS'
      await updateTicketStatus(ticketId, newStatus)
      
      logAdminAction(`Admin Reply: ${ticketId}`, 'SUPPORT', 'NOMINAL')
      
      setReplyMessage('')
      if (resolve) {
        setIsSheetOpen(false)
        setSelectedTicket(null)
      }
      
      toast.success(resolve ? "Ticket Resolved" : "Reply Sent")
      await loadTickets()
    } catch (err) {
      console.error('Reply failed:', err)
      toast.error('Failed to dispatch reply')
    }
  }

  const handleResolveOnly = async (ticketId) => {
    try {
      await updateTicketStatus(ticketId, 'RESOLVED')
      logAdminAction(`Manual Resolution: ${ticketId}`, 'SUPPORT', 'NOMINAL')
      toast.success("Ticket Resolved")
      setIsSheetOpen(false)
      setSelectedTicket(null)
      await loadTickets()
    } catch (err) {
      toast.error('Failed to resolve ticket')
    }
  }

  const openTicketDetails = (ticket) => {
    setSelectedTicket(ticket)
    setIsSheetOpen(true)
  }

  const filtered = tickets.filter(t => {
    const matchesSearch = t.id.toLowerCase().includes(search.toLowerCase()) || 
                         t.businessName?.toLowerCase().includes(search.toLowerCase()) ||
                         t.subject.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = activeFilter === 'ALL' || t.status === activeFilter
    return matchesSearch && matchesFilter
  })

  const openCount = tickets.filter(t => t.status === 'OPEN').length
  const inProgressCount = tickets.filter(t => t.status === 'IN-PROGRESS').length
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans select-none">
      
      {/* ─── ⚡ CLEAN ENTERPRISE PAGE HEADER ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Support Tickets
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Support Dispatch Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Manage merchant support requests, real-time ticket replies, and account troubleshooting.
          </p>
        </div>

        {/* Refresh Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button 
            onClick={() => loadTickets(false)}
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── 📊 REFINED SHADCN KPI METRIC CARDS ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Metric 1: Open Tickets */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open Tickets</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {openCount}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Pending response</span>
            </p>
          </div>
        </Card>

        {/* Metric 2: In-Progress */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In Progress</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {inProgressCount}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Active admin investigation
            </p>
          </div>
        </Card>

        {/* Metric 3: Resolved */}
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {resolvedCount}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Closed & satisfied tickets
            </p>
          </div>
        </Card>
      </div>

      {/* ─── 🔍 CONTROL TOOLBAR ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1">
          {[
            { id: 'ALL', label: 'All Tickets', count: tickets.length },
            { id: 'OPEN', label: 'Open', count: openCount },
            { id: 'IN-PROGRESS', label: 'In Progress', count: inProgressCount },
            { id: 'RESOLVED', label: 'Resolved', count: resolvedCount }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                activeFilter === tab.id 
                  ? 'bg-slate-700 text-white' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72 px-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <Input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ticket, merchant, subject..."
            className="h-9 pl-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ─── 📋 TICKETS DATA TABLE ─────────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Ticket ID</th>
                <th className="py-3.5 px-5">Merchant</th>
                <th className="py-3.5 px-5">Subject</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filtered.map((ticket) => (
                  <motion.tr 
                    key={ticket.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => openTicketDetails(ticket)}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  >
                    <td className="py-4 px-5">
                      <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {ticket.id}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <p className="font-bold text-slate-900 text-xs">{ticket.businessName}</p>
                    </td>
                    <td className="py-4 px-5">
                      <p className="text-xs text-slate-700 font-medium truncate max-w-xs">{ticket.subject}</p>
                    </td>
                    <td className="py-4 px-5">
                      {ticket.status === 'OPEN' ? (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold uppercase">Open</Badge>
                      ) : ticket.status === 'IN-PROGRESS' ? (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold uppercase">In Progress</Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase">Resolved</Badge>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <span className="text-[11px] text-slate-400 font-medium">{ticket.date}</span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Support Tickets</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No tickets found matching the selected filter.
            </p>
          </div>
        )}
      </Card>

      {/* ─── 💬 TICKET INSPECTOR DRAWER ────────────────────────────── */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md w-full p-6 flex flex-col justify-between font-sans border-l border-slate-200 bg-white">
          {selectedTicket && (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <SheetHeader className="text-left space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{selectedTicket.id}</span>
                    <Badge className="text-[10px] font-bold uppercase">{selectedTicket.status}</Badge>
                  </div>
                  <SheetTitle className="text-lg font-bold text-slate-900">{selectedTicket.subject}</SheetTitle>
                  <p className="text-xs text-slate-500">Merchant: <strong>{selectedTicket.businessName}</strong></p>
                </SheetHeader>

                {/* Conversation Feed */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold text-slate-700">{selectedTicket.businessName}</span>
                      <span>{selectedTicket.time}</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed">{selectedTicket.description || selectedTicket.message || 'Support request details'}</p>
                  </div>

                  {selectedTicket.replies?.map((r, i) => (
                    <div 
                      key={i} 
                      className={`p-3.5 rounded-xl text-xs space-y-1 border ${
                        r.isAdmin 
                          ? 'bg-blue-50/70 border-blue-100 ml-4' 
                          : 'bg-slate-50 border-slate-100 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">{r.author}</span>
                      </div>
                      <p className="text-slate-800 leading-relaxed">{r.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply Box */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <Input 
                  placeholder="Type reply to merchant..."
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleReply(selectedTicket.id) }}
                  className="h-9 text-xs rounded-xl"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleReply(selectedTicket.id)}
                    size="sm"
                    className="flex-1 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Reply
                  </Button>
                  <Button 
                    onClick={() => handleResolveOnly(selectedTicket.id)}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold cursor-pointer"
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  )
}
