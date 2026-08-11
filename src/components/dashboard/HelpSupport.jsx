import { useState, useEffect } from 'react'
import { 
  HelpCircle, MessageCircle, Mail, Phone, FileText, BookOpen, 
  ChevronDown, ChevronRight, ExternalLink, Search, Send, 
  Zap, Shield, Clock, Star, Menu, Headphones, 
  LifeBuoy, Lightbulb, CheckCircle, AlertCircle, ArrowRight,
  Youtube, Twitter, Globe, Ticket, Eye, ArrowLeft, 
  MessageSquare, RefreshCw, Hash, User, Calendar, Sparkles, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Sidebar from '../layout/Sidebar'
import Logo from '@/components/ui/Logo'
import NotificationDropdown from '@/components/ui/NotificationDropdown'

import { 
  fetchTickets, 
  createTicket as createCloudTicket,
  addTicketReply as addCloudReply,
  supabase
} from '@/lib/api'

// ─── FAQ Data ────────────────────────────────────────────────────────────────

// ─── FAQ Data ────────────────────────────────────────────────────────────────
const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I add menu items to my restaurant?',
        a: 'Navigate to Menu Management from the sidebar. Click the "Add Item" button and fill in the item details including name, price, category, and photo. Your items will appear instantly on the customer-facing menu.'
      },
      {
        q: 'How do I generate QR codes for my tables?',
        a: 'Go to QR Codes in the sidebar. Enter your restaurant ID and the number of tables you have, then click "Generate QR Codes". You can download and print them for each table.'
      },
      {
        q: 'How does the order tracking system work?',
        a: 'When a customer scans your QR code and places an order, it appears in the Orders section. You can update order statuses (Preparing → Ready → Served → Finished) and the customer sees real-time updates on their device.'
      }
    ]
  },
  {
    category: 'Orders & Tables',
    questions: [
      {
        q: 'Why is a table still showing as "occupied" after the order is completed?',
        a: 'Tables automatically update to "available" when an order is marked as "Finished". If the status persists, you can manually reset tables from the Table Hub using the "Reset Tables" button.'
      },
      {
        q: 'Can I modify an order after it has been placed?',
        a: 'Currently, orders cannot be modified once placed. However, you can cancel the existing order and ask the customer to place a new one. We are working on an order modification feature for a future update.'
      },
      {
        q: 'How do I view my order history?',
        a: 'In the Orders section, click the "Order History" button in the top-right corner. You can filter by date range, status, and table number.'
      }
    ]
  },
  {
    category: 'Analytics & Reports',
    questions: [
      {
        q: 'How are revenue metrics calculated?',
        a: 'Revenue is calculated from all completed orders (status: FINISHED). The dashboard shows today\'s revenue, while the Analytics section provides weekly, monthly, and custom date range breakdowns.'
      },
      {
        q: 'Can I export my analytics data?',
        a: 'Yes! In the Analytics section, you can export reports as CSV or PDF. Look for the export button in the top-right corner of each chart or table.'
      }
    ]
  },
  {
    category: 'Account & Settings',
    questions: [
      {
        q: 'How do I change my restaurant profile?',
        a: 'Go to Settings in the sidebar. You can update your restaurant name, address, contact details, cuisine type, and operating hours from the profile section.'
      },
      {
        q: 'Is Servora available on mobile devices?',
        a: 'Absolutely! Servora is fully responsive and works seamlessly on smartphones and tablets. The dashboard automatically adapts to your screen size with dedicated mobile navigation.'
      }
    ]
  }
]

const quickLinks = [
  { icon: BookOpen, title: 'Documentation', desc: 'Complete guides and tutorials', color: 'blue', badge: 'Docs', action: 'docs' },
  { icon: Youtube, title: 'Video Tutorials', desc: 'Step-by-step visual guides', color: 'red', badge: 'New', action: 'tutorials' },
  { icon: FileText, title: 'Release Notes', desc: 'Latest updates and changes', color: 'purple', badge: 'v2.1', action: 'releases' },
]

const statusConfig = {
  'OPEN':        { label: 'Open',        color: 'blue',   icon: AlertCircle },
  'IN-PROGRESS': { label: 'In Progress', color: 'amber',  icon: RefreshCw },
  'RESOLVED':    { label: 'Resolved',    color: 'emerald', icon: CheckCircle },
  'CLOSED':      { label: 'Closed',      color: 'gray',   icon: CheckCircle },
}

const formatDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
    ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HelpSupport({ activeItem, setActiveItem, navigate, restaurantId }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedFaq, setExpandedFaq] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('faq')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Contact form state
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactSubject, setContactSubject] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [messageSent, setMessageSent] = useState(false)
  const [newTicketId, setNewTicketId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [isReplying, setIsReplying] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setContactEmail(currentUser.email || '')
        setContactName(currentUser.user_metadata?.business_name || 'Merchant Admin')
      }
    }
    loadUser()
  }, [])

  // Tickets state
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketFilter, setTicketFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  // Load tickets from Supabase
  const loadCloudTickets = async (isSilent = false) => {
    if (!restaurantId) return
    try {
      if (!isSilent) setLoading(true)
      const data = await fetchTickets(restaurantId)
      // Normalize Supabase fields to match component expectations if needed
      const normalized = (data || []).map(t => ({
        ...t,
        name: t.business_name || 'Merchant',
        message: t.description,
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
        replies: (t.ticket_replies || []).map(r => ({
           author: r.sender_role === 'admin' ? 'Support Team' : 'You',
           message: r.message,
           createdAt: r.created_at,
           isAdmin: r.sender_role === 'admin'
        }))
      }))
      setTickets(normalized)
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    loadCloudTickets()

    if (!restaurantId) return

    const channel = supabase
      .channel(`merchant_tickets_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, (payload) => {
        loadCloudTickets(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_replies' }, (payload) => {
        loadCloudTickets(true)
      })
      .subscribe()

    // Fallback polling every 10 seconds to guarantee synchronization 
    // even if Supabase Realtime is disabled for this table.
    const interval = setInterval(() => {
      loadCloudTickets(true)
    }, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [restaurantId])

  const openTicketCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN-PROGRESS').length

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
           q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  const filteredTickets = ticketFilter === 'ALL' 
    ? tickets 
    : tickets.filter(t => t.status === ticketFilter)

  // Submit ticket to Cloud
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!contactName || !contactEmail || !contactSubject || !contactMessage) return
    
    setIsRefreshing(true)
    try {
      const ticket = await createCloudTicket(restaurantId, {
        businessName: contactName,
        subject: contactSubject,
        description: contactMessage,
        category: 'Support',
        priority: 'MEDIUM'
      })
      
      setNewTicketId(ticket.id)
      setMessageSent(true)
      await loadCloudTickets()

      setTimeout(() => {
        setContactSubject('')
        setContactMessage('')
        setMessageSent(false)
        setNewTicketId(null)
      }, 4000)
    } catch (err) {
      console.error('Failed to create ticket:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMerchantReply = async (ticketId) => {
    if (!replyText.trim()) return
    setIsReplying(true)
    try {
      await addCloudReply(ticketId, replyText, 'merchant')
      setReplyText('')
      await loadCloudTickets()
    } catch (err) {
      console.error('Failed to reply:', err)
    } finally {
      setIsReplying(false)
    }
  }

  // ─── Ticket Detail View ──────────────────────────────────────────────────
  if (selectedTicket) {
    const ticket = tickets.find(t => t.id === selectedTicket)
    if (!ticket) { setSelectedTicket(null); return null }
    const cfg = statusConfig[ticket.status] || statusConfig.open
    const StatusIcon = cfg.icon

    return (
      <div className="min-h-screen bg-gray-50/50">
        {/* Mobile Navbar */}
        <div className="lg:hidden sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)} className="text-gray-600 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-bold text-gray-900 text-sm truncate">{ticket.id}</span>
          </div>
          <Badge variant="outline" className={`text-[10px] font-bold border-${cfg.color}-200 text-${cfg.color}-700 bg-${cfg.color}-50`}>
            {cfg.label}
          </Badge>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)} className="text-gray-600 hover:bg-gray-100 rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-0.5">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Ticket Detail</span>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">{ticket.subject}</h1>
                </div>
              </div>
              <Badge variant="outline" className={`h-9 px-3 text-xs font-semibold border-${cfg.color}-200 text-${cfg.color}-700 bg-${cfg.color}-50`}>
                <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                {cfg.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
          {/* Ticket Meta Strip */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-wrap divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {[
              { icon: Hash, label: 'Ticket ID', value: ticket.id.slice(0, 8), mono: true },
              { icon: User, label: 'Submitted by', value: ticket.name },
              { icon: Calendar, label: 'Created', value: timeAgo(ticket.createdAt) },
              { icon: Mail, label: 'Email', value: ticket.email }
            ].map((meta, idx) => (
              <div key={idx} className="flex items-center gap-3 p-4 flex-1 min-w-[200px]">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                  <meta.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{meta.label}</p>
                  <p className={`text-sm font-semibold text-slate-900 truncate ${meta.mono ? 'font-mono' : ''}`}>{meta.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Original Message (Merchant) */}
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 shadow-inner">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-sm font-bold text-slate-900">{ticket.name}</span>
                  <span className="text-xs font-medium text-slate-500">{formatDate(ticket.createdAt)}</span>
                </div>
                <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl rounded-tl-sm p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {ticket.message}
                </div>
              </div>
            </div>

            {/* Replies */}
            {ticket.replies && ticket.replies.length > 0 && ticket.replies.map((reply, idx) => (
              <div key={idx} className={`flex gap-4 max-w-[85%] ${reply.isAdmin ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner ${reply.isAdmin ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {reply.isAdmin ? <Headphones className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 px-1 ${reply.isAdmin ? 'justify-end' : ''}`}>
                    {reply.isAdmin && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 px-1.5 py-0 border-transparent shadow-xs">
                        Support Team
                      </Badge>
                    )}
                    <span className="text-sm font-bold text-slate-900">{reply.author}</span>
                    <span className="text-xs font-medium text-slate-500">{formatDate(reply.createdAt)}</span>
                  </div>
                  <div className={`p-4 text-sm leading-relaxed whitespace-pre-wrap shadow-sm border ${
                    reply.isAdmin 
                      ? 'bg-blue-600 text-white border-blue-700 rounded-2xl rounded-tr-sm' 
                      : 'bg-white border-slate-200/60 text-slate-700 rounded-2xl rounded-tl-sm'
                  }`}>
                    {reply.message}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Status Message */}
          {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') ? (
            <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-3xl p-8 text-center max-w-2xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Ticket {ticket.status === 'RESOLVED' ? 'Resolved' : 'Closed'}</h3>
              <p className="text-sm text-slate-600">This ticket has been marked as {ticket.status.toLowerCase()} by our support team.</p>
            </div>
          ) : (!ticket.replies || ticket.replies.length === 0) && (
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-8 text-center max-w-2xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Awaiting Response</h3>
              <p className="text-sm text-slate-500">Our support team will reply to your ticket soon. Check back later for updates.</p>
            </div>
          )}

          {/* Reply Form */}
          {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl overflow-hidden mt-6">
              <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-bold text-gray-700">Add a Reply</span>
              </div>
              <CardContent className="p-0">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  className="w-full min-h-[120px] p-4 text-sm resize-none focus:outline-none placeholder:text-gray-400"
                />
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <Button 
                    onClick={() => handleMerchantReply(ticket.id)} 
                    disabled={!replyText.trim() || isReplying}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm text-sm px-6 h-9 font-semibold"
                  >
                    {isReplying ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // ─── Main View ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile Navbar */}
      <div className="lg:hidden sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 rounded-xl">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-none">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Access all dashboard sections</SheetDescription>
              <Sidebar 
                activeItem={activeItem} 
                setActiveItem={(item) => {
                  setActiveItem(item)
                  setMobileMenuOpen(false)
                }} 
                isCollapsed={false}
                setIsCollapsed={() => {}}
                isMobile={true}
                restaurantId={restaurantId}
              />
            </SheetContent>
          </Sheet>
          <Logo subtitle="Help Center" />
        </div>
        <div className="flex items-center gap-1">
          <NotificationDropdown restaurantId={restaurantId} />
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center ml-1">
            <span className="text-[10px] font-bold text-blue-700">JD</span>
          </div>
        </div>
      </div>

      {/* Desktop Section Header */}
      <div className="hidden lg:block bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-1">
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Support Center</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-none">
                Help & Support
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-1.5 max-w-sm">
                Find answers, get help, and track your support tickets.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <Badge variant="outline" className="h-9 px-3 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50/50">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                All Systems Operational
              </Badge>
              {openTicketCount > 0 && (
                <Badge variant="outline" className="h-9 px-3 text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/50 cursor-pointer" onClick={() => setActiveTab('tickets')}>
                  <Ticket className="w-3.5 h-3.5 mr-1.5" />
                  {openTicketCount} Open Ticket{openTicketCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-6 pb-32 lg:pb-8">
        {/* Hero Search */}
        <div className="relative rounded-3xl border border-slate-200/60 bg-slate-50/50">
          {/* Background graphics clipped to corners */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-white to-transparent" />
          </div>
          
          {/* Content (not clipped) */}
          <div className="relative z-10 px-6 py-12 md:py-16 text-center">
            <Badge variant="secondary" className="mb-6 mx-auto bg-white/60 backdrop-blur-sm border-slate-200 text-slate-600 font-semibold px-4 py-1.5 rounded-full shadow-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              How can we help you today?
            </Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Support <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">Center</span>
            </h2>
            <p className="text-sm md:text-base text-slate-500 max-w-lg mx-auto mb-10 font-medium">
              Search our knowledge base, browse frequently asked questions, or get in touch with our team.
            </p>
            
            <div className="max-w-2xl mx-auto relative group">
              <div className="absolute -inset-1 bg-linear-to-r from-blue-500 to-indigo-500 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex items-center bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden ring-1 ring-white/50">
                <Search className="w-5 h-5 text-slate-400 ml-5 shrink-0" />
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    if (activeTab !== 'faq' && e.target.value.length > 0) setActiveTab('faq')
                  }}
                  onFocus={() => { if (searchTerm.length > 0) setActiveTab('faq') }}
                  placeholder="Search for topics, features, or issues..."
                  className="border-0 shadow-none bg-transparent h-14 pl-3 pr-4 text-base placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                />
                {searchTerm.length > 0 && (
                  <Button variant="ghost" size="icon" onClick={() => setSearchTerm('')} className="mr-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100/50">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {/* Live Search Results Overlay */}
              {searchTerm.length > 0 && (
                <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {filteredFaqs.reduce((acc, cat) => acc + cat.questions.length, 0)} Matches Found
                    </span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                    {filteredFaqs.length > 0 ? (
                      filteredFaqs.map((cat) => (
                        cat.questions.map((q, idx) => (
                          <button
                            key={`${cat.category}-${idx}`}
                            onClick={() => {
                              setActiveTab('faq')
                              const key = `${faqs.findIndex(f => f.category === cat.category)}-${faqs.find(f => f.category === cat.category).questions.findIndex(qu => qu.q === q.q)}`
                              setExpandedFaq(key)
                              setSearchTerm('')
                              document.getElementById('faq-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-slate-100/80 transition-colors text-left group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">{q.q}</p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{cat.category}</p>
                            </div>
                          </button>
                        ))
                      ))
                    ) : (
                      <div className="py-10 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <Search className="w-5 h-5 text-slate-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-1">No results found</h3>
                        <p className="text-xs text-slate-500">Try adjusting your search terms</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'contact', title: 'New Ticket', desc: 'Submit a request', icon: MessageCircle, color: 'blue', badge: 'Open 24/7' },
            { id: 'tickets', title: 'My Tickets', desc: 'View & track tickets', icon: Ticket, color: 'indigo', badge: `${tickets.length} Total`, alert: openTicketCount },
            { id: 'call', title: 'Call Us', desc: '+91 xxxxxxxxxx', icon: Phone, color: 'violet', badge: '9am–6pm' },
            { id: 'contact-bug', title: 'Report Bug', desc: 'Found an issue?', icon: AlertCircle, color: 'rose', badge: 'Priority' }
          ].map((action, idx) => (
            <Card key={idx} 
              onClick={() => {
                if (action.id.startsWith('contact')) setActiveTab('contact')
                else if (action.id === 'tickets') setActiveTab('tickets')
              }}
              className="border-slate-200/60 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group bg-white rounded-2xl overflow-hidden relative"
            >
              <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${action.color}-50 text-${action.color}-600 group-hover:bg-${action.color}-600 group-hover:text-white transition-all duration-300 transform group-hover:scale-110 group-hover:-rotate-3`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">{action.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{action.desc}</p>
                </div>
                <Badge variant="secondary" className={`bg-${action.color}-50 text-${action.color}-700 border-${action.color}-200/50 hover:bg-${action.color}-100 font-semibold text-[10px]`}>
                  {action.badge}
                </Badge>
                {action.alert > 0 && (
                  <div className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full text-[10px] font-bold shadow-sm ring-2 ring-white animate-in zoom-in">
                    {action.alert}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-14 bg-slate-100/80 p-1.5 rounded-2xl">
            <TabsTrigger value="faq" className="rounded-xl font-semibold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-300">
              <HelpCircle className="w-4 h-4 mr-1.5 sm:mr-2" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="contact" className="rounded-xl font-semibold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-300">
              <Send className="w-4 h-4 mr-1.5 sm:mr-2" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="tickets" className="rounded-xl font-semibold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-300 relative">
              <Ticket className="w-4 h-4 mr-1.5 sm:mr-2" />
              Tickets
              {openTicketCount > 0 && (
                <span className="ml-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">{openTicketCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="resources" className="rounded-xl font-semibold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-300">
              <BookOpen className="w-4 h-4 mr-1.5 sm:mr-2" />
              Resources
            </TabsTrigger>
          </TabsList>

          {/* ═══ FAQ Tab ═══ */}
          <TabsContent value="faq" id="faq-content" className="space-y-6 mt-4">
            {filteredFaqs.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No results found</h3>
                <p className="text-sm text-slate-500">Try adjusting your search or browse the categories below.</p>
              </div>
            ) : (
              filteredFaqs.map((category, catIdx) => (
                <div key={catIdx} className="bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">{category.category}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {category.questions.map((faq, faqIdx) => {
                      const key = `${catIdx}-${faqIdx}`
                      const isExpanded = expandedFaq === key
                      return (
                        <div key={faqIdx} className="group">
                          <button
                            onClick={() => setExpandedFaq(isExpanded ? null : key)}
                            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:bg-slate-50"
                          >
                            <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors pr-6">{faq.q}</span>
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-blue-100 text-blue-600 rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="px-6 pb-5 pt-1 animate-in slide-in-from-top-2 duration-300">
                              <div className="bg-slate-50 border-l-2 border-blue-500 rounded-r-xl p-4 ml-2">
                                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* ═══ Contact / New Ticket Tab ═══ */}
          <TabsContent value="contact" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Contact Form */}
              <div className="lg:col-span-3 bg-white border border-slate-200/60 shadow-sm rounded-3xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                    <Send className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Submit a Support Ticket</h3>
                </div>
                <div className="p-6 md:p-8">
                  {messageSent ? (
                    <div className="text-center py-10 animate-in zoom-in-95 duration-300">
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-50">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Ticket Created!</h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Your ticket has been submitted successfully and our team will get back to you shortly.</p>
                      {newTicketId && (
                        <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl mb-6 shadow-xs">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket ID:</span>
                          <span className="text-sm font-bold text-slate-900 font-mono">{newTicketId}</span>
                        </div>
                      )}
                      <div>
                        <Button onClick={() => { setMessageSent(false); setActiveTab('tickets') }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl h-11 px-6 shadow-sm">
                          View My Tickets
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Your Name <span className="text-red-500">*</span></label>
                          <Input 
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="John Doe" 
                            className="h-12 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors" 
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address <span className="text-red-500">*</span></label>
                          <Input 
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="john@restaurant.com" 
                            className="h-12 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors" 
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Subject <span className="text-red-500">*</span></label>
                        <Input
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          placeholder="Brief description of your issue"
                          className="h-12 rounded-xl border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Message <span className="text-red-500">*</span></label>
                        <textarea 
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Describe your issue or question in detail..."
                          rows={6}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 focus:bg-white outline-none resize-none text-sm transition-colors focus:ring-2 focus:ring-slate-900/5"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md transition-all active:scale-[0.98]">
                        <Send className="w-4 h-4 mr-2" />
                        Submit Ticket
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {/* Contact Info Sidebar */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border border-slate-200/60 shadow-sm rounded-3xl p-6">
                  <h3 className="font-bold text-slate-900 text-sm mb-5">Contact Information</h3>
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">support@servora.com</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">+91 xxxxxxxxxx</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">Mon–Sat, 9am–6pm IST</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
                  
                  <div className="relative z-10 text-center space-y-4">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto ring-1 ring-white/20">
                      <Headphones className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="font-bold text-lg text-white">Priority Support</h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-[200px] mx-auto">
                      Upgrade to Premium for priority ticket handling and a dedicated support agent.
                    </p>
                    <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white rounded-xl w-full font-semibold border-t-white/40 h-11 mt-2 transition-all">
                      <Star className="w-4 h-4 mr-2 text-amber-400" />
                      Upgrade Plan
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═══ My Tickets Tab ═══ */}
          <TabsContent value="tickets" className="space-y-4">
            {/* Ticket Filter Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {['ALL', 'OPEN', 'IN-PROGRESS', 'RESOLVED', 'CLOSED'].map(filter => (
                  <Button 
                    key={filter} 
                    variant={ticketFilter === filter ? 'default' : 'outline'} 
                    size="sm" 
                    className={`rounded-xl text-xs font-semibold uppercase tracking-widest ${ticketFilter === filter ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-900'}`}
                    onClick={() => setTicketFilter(filter)}
                  >
                    {filter === 'ALL' ? `All (${tickets.length})` : `${filter.replace('-', ' ')} (${tickets.filter(t => t.status === filter).length})`}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="rounded-xl font-semibold" onClick={() => setActiveTab('contact')}>
                <Send className="w-3.5 h-3.5 mr-2" />
                New Ticket
              </Button>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-12 text-center shadow-sm">
                <div className="w-20 h-20 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center mx-auto mb-5">
                  <Ticket className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {tickets.length === 0 ? 'No tickets yet' : 'No matching tickets'}
                </h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                  {tickets.length === 0 
                    ? 'Submit a support ticket and it will appear here for tracking.'
                    : 'Try a different filter to see your tickets.'}
                </p>
                {tickets.length === 0 && (
                  <Button className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold h-11 px-6 shadow-md" onClick={() => setActiveTab('contact')}>
                    <Send className="w-4 h-4 mr-2" />
                    Submit First Ticket
                  </Button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200/60 shadow-sm rounded-3xl overflow-hidden divide-y divide-slate-100">
                {filteredTickets.map(ticket => {
                  const cfg = statusConfig[ticket.status] || statusConfig.open
                  const StatusIcon = cfg.icon
                  const hasReplies = ticket.replies && ticket.replies.length > 0
                  const lastReply = hasReplies ? ticket.replies[ticket.replies.length - 1] : null
                  
                  return (
                    <div 
                      key={ticket.id} 
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer gap-4"
                      onClick={() => setSelectedTicket(ticket.id)}
                    >
                      <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-${cfg.color}-50 text-${cfg.color}-600 ring-1 ring-${cfg.color}-100/50 shadow-inner`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400 font-mono tracking-wider">#{ticket.id.slice(0,8)}</span>
                            <Badge variant="outline" className={`text-[10px] font-semibold border-${cfg.color}-200 text-${cfg.color}-700 bg-${cfg.color}-50 px-2 py-0.5 rounded-full`}>
                              {cfg.label}
                            </Badge>
                            {hasReplies && (
                              <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent px-2 py-0.5 rounded-full">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                {ticket.replies.length}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate pr-4">{ticket.subject}</h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1 pr-4">
                            {hasReplies && lastReply.isAdmin 
                              ? <><span className="font-semibold text-slate-700">Support:</span> {lastReply.message}</>
                              : ticket.message}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0 sm:min-w-[100px] border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeAgo(ticket.updatedAt)}</span>
                        </div>
                        <div className="flex items-center text-xs font-semibold text-blue-600 opacity-0 sm:group-hover:opacity-100 transition-all sm:-translate-x-2 sm:group-hover:translate-x-0">
                          View Ticket
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-all sm:hidden" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══ Resources Tab ═══ */}
          <TabsContent value="resources" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickLinks.map((link, idx) => (
                <div key={idx} className="bg-white border border-slate-200/60 shadow-sm rounded-3xl hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group" onClick={() => link.action ? setActiveItem(link.action) : null}>
                  <div className="p-5 flex flex-col h-full space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 bg-${link.color}-50 text-${link.color}-600 rounded-2xl flex items-center justify-center ring-1 ring-${link.color}-100/50 shadow-inner group-hover:scale-110 transition-transform`}>
                        <link.icon className="w-6 h-6" />
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">{link.badge}</Badge>
                    </div>
                    <div className="mt-auto">
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{link.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{link.desc}</p>
                    </div>
                    <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:text-blue-700 pt-2 border-t border-slate-100/50">
                      <span>View Resource</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200/60 shadow-sm rounded-3xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Getting Started Guide</h3>
              </div>
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { step: '1', title: 'Set Up Your Menu', desc: 'Add your dishes, prices, and categories in Menu Management.', color: 'blue' },
                    { step: '2', title: 'Generate QR Codes', desc: 'Create scannable QR codes for each table in your restaurant.', color: 'indigo' },
                    { step: '3', title: 'Start Receiving Orders', desc: 'Customers scan, order, and you manage everything from the dashboard.', color: 'emerald' },
                  ].map((item, idx) => (
                    <div key={idx} className="relative flex flex-col items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all">
                      <div className={`w-12 h-12 bg-${item.color}-100 text-${item.color}-600 rounded-full flex items-center justify-center mb-4 font-black text-xl shadow-inner`}>
                        {item.step}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mb-2">{item.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 shadow-sm rounded-3xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Tips & Best Practices</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Keep your menu items updated with accurate pricing and availability.',
                    'Use high-quality photos for menu items to increase customer orders.',
                    'Monitor the Analytics dashboard weekly to track revenue trends.',
                    'Enable notifications to stay on top of new orders in real-time.',
                    'Regularly back up your QR codes and keep printed copies on tables.',
                    'Use the Customer Management section to build loyalty programs.',
                  ].map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100/50 transition-colors">
                      <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
