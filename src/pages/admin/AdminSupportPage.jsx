import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Inbox, 
  MessageSquare, 
  CheckCircle, 
  Trash2, 
  Search, 
  User, 
  Send,
  Clock,
  Filter,
  LifeBuoy,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { logAdminAction } from '@/lib/audit'
import { toast } from 'sonner'
import { fetchAllTickets, addTicketReply, updateTicketStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function AdminSupportPage() {
  const [search, setSearch] = useState('')
  const [tickets, setTickets] = useState([])
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Load tickets using secure edge routing simulation
  const loadTickets = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      const data = await fetchAllTickets()
      
      // Map API data to component requirements
      const formatted = data.map(t => ({
         ...t,
         businessName: t.business_name || t.restaurants?.business_name || 'Merchant',
         restaurantId: t.restaurant_id,
         time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
         date: new Date(t.created_at).toLocaleDateString(),
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
      console.error('Failed to load cloud tickets:', err)
      toast.error('Error loading secure support feed')
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
    
    // Fallback polling every 10 seconds to keep admin support page in sync automatically
    const interval = setInterval(() => {
      loadTickets(true)
    }, 10000)
    
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
      
      logAdminAction(`Admin Reply & Update to Ticket: ${ticketId}`, 'SUPPORT_RELAY', 'NOMINAL')
      
      setReplyMessage('')
      if (resolve) {
        setIsSheetOpen(false)
        setSelectedTicket(null)
      }
      
      toast.success("Reply Sent", {
        description: resolve ? "Ticket has been resolved." : "Merchant notified of progress."
      })
      
      await loadTickets()
    } catch (err) {
      console.error('Reply failed:', err)
      toast.error('Transmission failed')
    }
  }

  const handleResolveOnly = async (ticketId) => {
    try {
      await updateTicketStatus(ticketId, 'RESOLVED')
      logAdminAction(`Manual Resolution: ${ticketId}`, 'SUPPORT_RELAY', 'NOMINAL')
      toast.success("Ticket Resolved", { description: "The ticket status has been updated." })
      setIsSheetOpen(false)
      setSelectedTicket(null)
      await loadTickets()
    } catch (err) {
      console.error('Resolve failed:', err)
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-rose-50 text-rose-600 border-rose-200 shadow-none font-bold">Open</Badge>
      case 'IN-PROGRESS':
        return <Badge className="bg-blue-50 text-blue-600 border-blue-200 shadow-none font-bold">In Progress</Badge>
      case 'RESOLVED':
        return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none font-bold">Resolved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 font-sans">
      {/* ─── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900">Support Center</h1>
           <p className="text-sm text-slate-500 mt-1">Manage merchant tickets and provide assistance.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
           <LifeBuoy className="w-4 h-4 text-emerald-600" />
           <span className="text-xs font-bold text-emerald-700">System Active</span>
        </div>
      </div>

      {/* ─── Control Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
         <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
               placeholder="Search by Ticket ID, Merchant, or Subject..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="pl-9 h-11 bg-white border-slate-200 rounded-xl shadow-sm text-sm focus-visible:ring-blue-500"
            />
         </div>
         <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-full sm:w-45 h-11 bg-white border-slate-200 rounded-xl shadow-sm">
               <div className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <SelectValue placeholder="Filter Status" />
               </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
               <SelectItem value="ALL" className="rounded-lg text-sm font-medium">All Tickets</SelectItem>
               <SelectItem value="OPEN" className="rounded-lg text-sm font-medium text-rose-600 focus:text-rose-700 focus:bg-rose-50">Open</SelectItem>
               <SelectItem value="IN-PROGRESS" className="rounded-lg text-sm font-medium text-blue-600 focus:text-blue-700 focus:bg-blue-50">In Progress</SelectItem>
               <SelectItem value="RESOLVED" className="rounded-lg text-sm font-medium text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">Resolved</SelectItem>
            </SelectContent>
         </Select>
      </div>

      {/* ─── Tickets Table ───────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider py-4">Ticket ID</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider py-4">Merchant</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider py-4">Subject</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider py-4">Status</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wider py-4 text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-400">Loading tickets...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                    <Inbox className="w-8 h-8 mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="text-sm font-medium">No tickets found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ticket) => (
                  <TableRow 
                    key={ticket.id} 
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors group"
                    onClick={() => openTicketDetails(ticket)}
                  >
                    <TableCell className="font-medium text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      {ticket.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                          {ticket.businessName?.substring(0, 2).toUpperCase() || 'MR'}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{ticket.businessName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-900 line-clamp-1">{ticket.subject}</p>
                      {ticket.replies?.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {ticket.replies.length} replies
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(ticket.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm text-slate-600">{ticket.date}</p>
                      <p className="text-xs text-slate-400">{ticket.time}</p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ─── Ticket Details Sheet ───────────────────────────────────────────── */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-slate-50 border-l border-slate-200">
          {selectedTicket && (
            <>
              {/* Sheet Header */}
              <div className="p-6 bg-white border-b border-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket {selectedTicket.id}</span>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <SheetTitle className="text-xl font-bold text-slate-900">{selectedTicket.subject}</SheetTitle>
                    <SheetDescription className="mt-1 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{selectedTicket.businessName}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-sm text-slate-500">{selectedTicket.date} {selectedTicket.time}</span>
                    </SheetDescription>
                  </div>
                </div>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Original Query */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="space-y-1 w-full max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">{selectedTicket.businessName}</span>
                      <span className="text-[10px] text-slate-400">{selectedTicket.time}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedTicket.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {(selectedTicket.replies || []).map((reply, ridx) => (
                  <div key={ridx} className={cn('flex gap-4', reply.isAdmin ? 'flex-row-reverse' : '')}>
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 border', 
                      reply.isAdmin ? 'bg-slate-800 border-slate-700' : 'bg-blue-100 border-blue-200'
                    )}>
                      {reply.isAdmin ? <LifeBuoy className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className={cn('space-y-1 w-full max-w-[85%]', reply.isAdmin ? 'items-end flex flex-col' : '')}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">{reply.author}</span>
                        <span className="text-[10px] text-slate-400">{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={cn('p-4 rounded-2xl shadow-sm border',
                        reply.isAdmin 
                          ? 'bg-blue-600 text-white border-blue-700 rounded-tr-sm text-left' 
                          : 'bg-white text-slate-700 border-slate-200 rounded-tl-sm'
                      )}>
                        <p className={cn('text-sm whitespace-pre-wrap leading-relaxed', reply.isAdmin ? 'text-white' : 'text-slate-700')}>
                          {reply.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-6 bg-white border-t border-slate-200">
                <div className="flex flex-col gap-3">
                  <textarea 
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    placeholder="Type your reply here..."
                    className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {selectedTicket.status !== 'RESOLVED' && (
                        <Button 
                          onClick={() => handleResolveOnly(selectedTicket.id)}
                          variant="outline"
                          className="h-9 px-4 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-semibold text-xs"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Resolve Ticket
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {selectedTicket.status !== 'RESOLVED' && (
                        <Button 
                          onClick={() => handleReply(selectedTicket.id, true)}
                          variant="secondary"
                          disabled={!replyMessage.trim()}
                          className="h-9 px-4 rounded-lg font-semibold text-xs bg-slate-800 text-white hover:bg-slate-700"
                        >
                          Reply & Resolve
                        </Button>
                      )}
                      <Button 
                        onClick={() => handleReply(selectedTicket.id, false)}
                        disabled={!replyMessage.trim()}
                        className="h-9 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                      >
                        <Send className="w-3 h-3 mr-2" /> Send
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
