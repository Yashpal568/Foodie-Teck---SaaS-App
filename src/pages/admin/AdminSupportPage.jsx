import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Inbox, 
  MessageSquare, 
  CheckCircle, 
  Trash2, 
  AlertCircle, 
  Search, 
  User, 
  ExternalLink,
  ChevronRight,
  Filter,
  LifeBuoy
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { logAdminAction } from '@/lib/audit'
import { toast } from 'sonner'

export default function AdminSupportPage() {
  const [search, setSearch] = useState('')
  const [tickets, setTickets] = useState([])
  const [activeFilter, setActiveFilter] = useState('OPEN')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')

  const loadTickets = () => {
    const raw = localStorage.getItem('servora_db_tickets') || '[]'
    const parsed = JSON.parse(raw)
    setTickets(parsed.reverse())
    if (selectedTicket) {
      const updated = parsed.find(t => t.id === selectedTicket.id)
      if (updated) setSelectedTicket(updated)
    }
  }

  useEffect(() => {
    loadTickets()
    window.addEventListener('storage', loadTickets)
    return () => window.removeEventListener('storage', loadTickets)
  }, [])

  const handleReply = (ticketId, resolve = false) => {
    if (!replyMessage.trim() && !resolve) return

    const allTickets = JSON.parse(localStorage.getItem('servora_db_tickets') || '[]')
    const updated = allTickets.map(t => {
      if (t.id === ticketId) {
        const newReply = {
          author: 'System Administrator',
          isAdmin: true,
          message: replyMessage,
          createdAt: new Date().toISOString()
        }
        const updatedReplies = [...(t.replies || []), newReply]
        return { 
          ...t, 
          replies: updatedReplies, 
          status: resolve ? 'RESOLVED' : 'IN-PROGRESS',
          updatedAt: new Date().toISOString()
        }
      }
      return t
    })
    
    localStorage.setItem('servora_db_tickets', JSON.stringify(updated))
    logAdminAction(`Admin Reply to Ticket: ${ticketId}`, 'SUPPORT_RELAY', 'NOMINAL')
    setTickets(updated.reverse())
    setReplyMessage('')
    if (resolve) setSelectedTicket(null)
    toast.success("Command Reply Transmitted", {
      description: resolve ? "Relay closed and resolved." : "Merchant notified of progress."
    })
  }

  const handleResolveOnly = (ticketId) => {
    const allTickets = JSON.parse(localStorage.getItem('servora_db_tickets') || '[]')
    const updated = allTickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, status: 'RESOLVED', resolvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      }
      return t
    })
    localStorage.setItem('servora_db_tickets', JSON.stringify(updated))
    logAdminAction(`Manual Resolution: ${ticketId}`, 'SUPPORT_RELAY', 'NOMINAL')
    setTickets(updated.reverse())
    toast.success("Ticket Resolved", { description: "Forensic record updated." })
  }

  const handleDelete = (ticketId) => {
    const allTickets = JSON.parse(localStorage.getItem('servora_db_tickets') || '[]')
    const updated = allTickets.filter(t => t.id !== ticketId)
    localStorage.setItem('servora_db_tickets', JSON.stringify(updated))
    setTickets(updated.reverse())
    toast.error("Ticket Protocol Purged", {
      description: "Support record successfully deleted from node."
    })
  }

  const filtered = tickets.filter(t => {
    const matchesSearch = t.id.toLowerCase().includes(search.toLowerCase()) || 
                         t.businessName?.toLowerCase().includes(search.toLowerCase()) ||
                         t.subject.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = activeFilter === 'ALL' || t.status === activeFilter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-12 font-sans overflow-hidden">
      {/* ─── Header Node ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none uppercase italic">Support Command Node</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-2">Merchant Dispute & Assistance Resolution</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
              <LifeBuoy className="w-4 h-4 text-indigo-600 animate-spin-slow" />
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Relay Active</span>
           </div>
        </div>
      </div>

      {/* ─── Control Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
         <div className="bg-white border-2 border-slate-100 flex items-center gap-4 px-6 py-4 rounded-[1.5rem] w-full max-w-2xl shadow-xl shadow-slate-200/20">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
               type="text" 
               placeholder="Search Ticket ID, Merchant Cluster, or Subject Payload..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-black tracking-tight"
            />
         </div>

         <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border-2 border-slate-100 shadow-sm w-fit self-end lg:self-auto">
            {['OPEN', 'RESOLVED', 'ALL'].map(f => (
               <Button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  variant={activeFilter === f ? 'default' : 'ghost'}
                  className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-widest px-6 ${
                     activeFilter === f ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'
                  }`}
               >
                  {f}
               </Button>
            ))}
         </div>
      </div>

      {/* ─── Ticket Loop ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <AnimatePresence>
            {filtered.map((ticket, idx) => (
               <motion.div 
                  key={ticket.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
               >
                  <Card className={`border-2 rounded-[2.5rem] overflow-hidden bg-white shadow-sm hover:shadow-2xl transition-all h-full flex flex-col ${
                     ticket.status === 'RESOLVED' ? 'border-emerald-100 opacity-80' : 'border-slate-100'
                  }`}>
                     <div className="p-8 pb-4 space-y-6 flex-1">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
                                 ticket.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                 <MessageSquare className="w-5 h-5" />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Inbound Ticket</p>
                                 <p className="text-xs font-black text-slate-900 tracking-tight leading-none uppercase">{ticket.id}</p>
                              </div>
                           </div>
                           <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] border ${
                              ticket.status === 'RESOLVED' 
                                 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                 : 'bg-rose-50 text-rose-600 border-rose-100'
                           }`}>
                              {ticket.status}
                           </div>
                        </div>

                        <div className="space-y-4 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 border-l-4 border-l-slate-900 group hover:bg-slate-100 transition-all">
                              <h4 className="text-sm font-black text-slate-950 tracking-tight leading-none mb-2 flex items-center justify-between">
                                 {ticket.subject}
                                 <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                              </h4>
                              <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">
                                 {ticket.description}
                              </p>
                           </div>

                           <div className="flex items-center gap-3 px-1">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                 <User className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                 <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none mb-0.5 truncate">{ticket.businessName}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none truncate">{ticket.restaurantId}</p>
                              </div>
                              <div className="flex gap-1">
                                 {ticket.replies?.length > 0 && (
                                    <div className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md text-[8px] font-black">
                                       {ticket.replies.length} REPLIES
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="p-8 pt-0 mt-4 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                           <Button 
                              onClick={() => setSelectedTicket(ticket)}
                              className="flex-1 h-12 rounded-2xl bg-slate-950 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest flex gap-2 active:scale-95 transition-all shadow-xl"
                           >
                              <ExternalLink className="w-4 h-4" /> Open Relay Detail
                           </Button>
                           <Button 
                              onClick={() => handleDelete(ticket.id)}
                              variant="outline" 
                              className="h-12 w-12 rounded-2xl border-rose-100 text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest flex items-center justify-center active:scale-95 transition-all"
                           >
                              <Trash2 className="w-4 h-4" />
                           </Button>
                        </div>
                     </div>
                  </Card>
               </motion.div>
            ))}
         </AnimatePresence>
      </div>

      {/* ─── Full Relief Relay Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
         {selectedTicket && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 pointer-events-none">
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedTicket(null)}
                  className="absolute inset-0 bg-slate-950/40 backdrop-blur-xl pointer-events-auto"
               />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-4xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto border border-white/20"
               >
                  {/* Modal Header */}
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-2xl">
                           <Inbox className="w-6 h-6" />
                        </div>
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Command Detail Node</span>
                              <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                 selectedTicket.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                              }`}>
                                 {selectedTicket.status}
                              </div>
                           </div>
                           <h2 className="text-xl font-black text-slate-950 tracking-tight leading-none uppercase">{selectedTicket.id}</h2>
                        </div>
                     </div>
                     <Button 
                        onClick={() => setSelectedTicket(null)}
                        variant="ghost" 
                        className="w-12 h-12 rounded-2xl hover:bg-slate-100"
                     >
                        <Trash2 className="w-5 h-5 rotate-45 text-slate-400" />
                     </Button>
                  </div>

                  {/* Modal Content - Chat Stream */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar bg-slate-50/20">
                     {/* Original Query */}
                     <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                           <User className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="space-y-3 max-w-[80%]">
                           <div className="bg-white p-6 rounded-t-3xl rounded-br-3xl shadow-sm border border-slate-100 space-y-4">
                              <div className="border-b border-slate-50 pb-2">
                                 <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{selectedTicket.subject}</h4>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedTicket.businessName} &bull; {selectedTicket.restaurantId}</p>
                              </div>
                              <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                 "{selectedTicket.description}"
                              </p>
                           </div>
                           <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] ml-2">{selectedTicket.time} &bull; {selectedTicket.date}</span>
                        </div>
                     </div>

                     {/* Reply Stream */}
                     {(selectedTicket.replies || []).map((reply, ridx) => (
                        <div key={ridx} className={`flex gap-4 ${reply.isAdmin ? 'flex-row-reverse' : ''}`}>
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${
                              reply.isAdmin ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                           }`}>
                              {reply.isAdmin ? <LifeBuoy className="w-5 h-5" /> : <User className="w-5 h-5" />}
                           </div>
                           <div className={`space-y-3 max-w-[80%] ${reply.isAdmin ? 'items-end' : ''}`}>
                              <div className={`p-6 rounded-3xl shadow-sm border ${
                                 reply.isAdmin 
                                    ? 'bg-slate-900 text-slate-100 border-slate-800 rounded-tr-none' 
                                    : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'
                              }`}>
                                 <p className="text-sm font-medium leading-relaxed">{reply.message}</p>
                              </div>
                              <div className={`flex items-center gap-2 px-2 ${reply.isAdmin ? 'justify-end' : ''}`}>
                                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                    {reply.isAdmin ? 'HQ RESPONSE' : 'FIELD UPDATE'} &bull; {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>

                  {/* Modal Footer - Command Input */}
                  <div className="p-8 bg-white border-t border-slate-100 space-y-4">
                     <textarea 
                        value={replyMessage}
                        onChange={e => setReplyMessage(e.target.value)}
                        placeholder="Type high-fidelity relief payload..."
                        className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-6 text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:border-slate-900 transition-all resize-none shadow-inner"
                     />
                     <div className="flex items-center gap-3">
                        <Button 
                           onClick={() => handleReply(selectedTicket.id, false)}
                           disabled={!replyMessage.trim()}
                           className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-500/20 active:scale-95 transition-all"
                        >
                           Transmit Reply
                        </Button>
                        <Button 
                           onClick={() => handleReply(selectedTicket.id, true)}
                           className="flex-1 h-14 rounded-2xl bg-slate-950 hover:bg-black text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-950/20 active:scale-95 transition-all flex gap-3"
                        >
                           <CheckCircle className="w-5 h-5" /> Transmit & Resolve
                        </Button>
                        {selectedTicket.status === 'OPEN' && (
                           <Button 
                              onClick={() => handleResolveOnly(selectedTicket.id)}
                              variant="outline"
                              className="h-14 px-8 rounded-2xl border-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                           >
                              Resolve Only
                           </Button>
                        )}
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  )
}
