import { useState, useEffect } from 'react'
import { 
  HelpCircle, MessageCircle, Mail, Phone, FileText, BookOpen, 
  ChevronDown, ChevronRight, ExternalLink, Search, Send, 
  Zap, Shield, Clock, Star, Menu, Headphones, 
  LifeBuoy, Lightbulb, CheckCircle, AlertCircle, ArrowRight,
  Youtube, Twitter, Globe, Ticket, Eye, ArrowLeft, 
  MessageSquare, RefreshCw, Hash, User, Calendar
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

// ─── Ticket Helpers (localStorage) ───────────────────────────────────────────
const TICKETS_KEY = 'support_tickets'

const generateTicketId = () => {
  const prefix = 'TKT'
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}-${ts}-${rand}`
}

const loadTickets = () => {
  try {
    return JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]')
  } catch { return [] }
}

const saveTickets = (tickets) => {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets))
  window.dispatchEvent(new Event('ticketsUpdated'))
}

const createTicket = ({ name, email, subject, message }) => {
  const tickets = loadTickets()
  const ticket = {
    id: generateTicketId(),
    name,
    email,
    subject,
    message,
    status: 'open',          // open | in-progress | resolved | closed
    priority: 'normal',      // low | normal | high | urgent
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: []              // admin replies go here
  }
  tickets.unshift(ticket)
  saveTickets(tickets)
  return ticket
}

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
  { icon: Youtube, title: 'Video Tutorials', desc: 'Step-by-step visual guides', color: 'red', badge: 'New', action: null },
  { icon: Globe, title: 'API Reference', desc: 'Integration documentation', color: 'green', badge: 'Dev', action: null },
  { icon: FileText, title: 'Release Notes', desc: 'Latest updates and changes', color: 'purple', badge: 'v2.1', action: null },
]

// ─── Status Helpers ──────────────────────────────────────────────────────────
const statusConfig = {
  'open':        { label: 'Open',        color: 'blue',   icon: AlertCircle },
  'in-progress': { label: 'In Progress', color: 'amber',  icon: RefreshCw },
  'resolved':    { label: 'Resolved',    color: 'emerald', icon: CheckCircle },
  'closed':      { label: 'Closed',      color: 'gray',   icon: CheckCircle },
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
export default function HelpSupport({ activeItem, setActiveItem, navigate }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedFaq, setExpandedFaq] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('faq')

  // Contact form state
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactSubject, setContactSubject] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [messageSent, setMessageSent] = useState(false)
  const [newTicketId, setNewTicketId] = useState(null)

  // Tickets state
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketFilter, setTicketFilter] = useState('all')

  // Load tickets
  useEffect(() => {
    setTickets(loadTickets())
    const handler = () => setTickets(loadTickets())
    window.addEventListener('ticketsUpdated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('ticketsUpdated', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  const openTicketCount = tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
           q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  const filteredTickets = ticketFilter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === ticketFilter)

  // Submit ticket
  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!contactName || !contactEmail || !contactSubject || !contactMessage) return
    
    const ticket = createTicket({
      name: contactName,
      email: contactEmail,
      subject: contactSubject,
      message: contactMessage
    })
    
    setNewTicketId(ticket.id)
    setMessageSent(true)
    setTickets(loadTickets())

    setTimeout(() => {
      setContactName('')
      setContactEmail('')
      setContactSubject('')
      setContactMessage('')
      setMessageSent(false)
      setNewTicketId(null)
    }, 4000)
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

        <div className="p-4 md:p-6 lg:p-8 space-y-6 pb-32 lg:pb-8 max-w-4xl">
          {/* Ticket Meta */}
          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
            <CardContent className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Hash className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ticket ID</p>
                    <p className="text-xs font-bold text-gray-900">{ticket.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Submitted by</p>
                    <p className="text-xs font-bold text-gray-900">{ticket.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Created</p>
                    <p className="text-xs font-bold text-gray-900">{timeAgo(ticket.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</p>
                    <p className="text-xs font-bold text-gray-900 truncate max-w-[140px]">{ticket.email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Original Message */}
          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900">{ticket.name}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{formatDate(ticket.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Replies */}
          {ticket.replies && ticket.replies.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Replies ({ticket.replies.length})
              </h3>
              {ticket.replies.map((reply, idx) => (
                <Card key={idx} className={`border-0 shadow-sm rounded-2xl ${reply.isAdmin ? 'bg-emerald-50/50 ring-1 ring-emerald-100' : 'bg-white ring-1 ring-gray-100'}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${reply.isAdmin ? 'bg-emerald-200' : 'bg-blue-100'}`}>
                        {reply.isAdmin ? (
                          <Headphones className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <User className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{reply.author}</span>
                            {reply.isAdmin && (
                              <Badge variant="outline" className="text-[9px] font-bold border-emerald-200 text-emerald-700 bg-emerald-50 px-1.5 py-0">
                                Support Team
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">{formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm bg-amber-50/50 ring-1 ring-amber-100 rounded-2xl">
              <CardContent className="p-6 text-center">
                <Clock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Awaiting Response</h3>
                <p className="text-sm text-gray-500">Our support team will reply to your ticket soon. Check back later for updates.</p>
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
              />
            </SheetContent>
          </Sheet>
          <Logo subtitle="Help Center" />
        </div>
        <div className="flex items-center gap-1">
          <NotificationDropdown />
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center ml-1">
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
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-40" />
          <CardContent className="p-6 md:p-10 relative z-10">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto ring-1 ring-white/30">
                <HelpCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">How can we help you?</h2>
              <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
                Search our knowledge base or browse frequently asked questions below.
              </p>
              <div className="relative max-w-lg mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for help topics, features, or issues..."
                  className="pl-12 h-12 bg-white text-gray-900 border-0 shadow-xl rounded-xl placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl hover:shadow-md hover:ring-blue-100 transition-all cursor-pointer group" onClick={() => setActiveTab('contact')}>
            <CardContent className="p-4 md:p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto ring-1 ring-blue-100/50 group-hover:bg-blue-100 transition-colors">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">New Ticket</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Submit a request</p>
              </div>
              <Badge variant="outline" className="text-[10px] border-green-200 text-green-700 bg-green-50">Open 24/7</Badge>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl hover:shadow-md hover:ring-purple-100 transition-all cursor-pointer group" onClick={() => setActiveTab('tickets')}>
            <CardContent className="p-4 md:p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto ring-1 ring-purple-100/50 group-hover:bg-purple-100 transition-colors relative">
                <Ticket className="w-6 h-6" />
                {openTicketCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{openTicketCount}</span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">My Tickets</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">View & track tickets</p>
              </div>
              <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-700 bg-purple-50">{tickets.length} Total</Badge>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl hover:shadow-md hover:ring-amber-100 transition-all cursor-pointer group">
            <CardContent className="p-4 md:p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto ring-1 ring-amber-100/50 group-hover:bg-amber-100 transition-colors">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Call Us</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">+91 xxxxxxxxxx</p>
              </div>
              <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">9am–6pm</Badge>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl hover:shadow-md hover:ring-rose-100 transition-all cursor-pointer group" onClick={() => setActiveTab('contact')}>
            <CardContent className="p-4 md:p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto ring-1 ring-rose-100/50 group-hover:bg-rose-100 transition-colors">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Report Bug</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Found an issue?</p>
              </div>
              <Badge variant="outline" className="text-[10px] border-rose-200 text-rose-700 bg-rose-50">Priority</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-white ring-1 ring-gray-100 rounded-xl p-1">
            <TabsTrigger value="faq" className="rounded-lg font-semibold text-xs sm:text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <HelpCircle className="w-4 h-4 mr-1 sm:mr-2" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="contact" className="rounded-lg font-semibold text-xs sm:text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <Send className="w-4 h-4 mr-1 sm:mr-2" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="tickets" className="rounded-lg font-semibold text-xs sm:text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white relative">
              <Ticket className="w-4 h-4 mr-1 sm:mr-2" />
              Tickets
              {openTicketCount > 0 && (
                <span className="ml-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{openTicketCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="resources" className="rounded-lg font-semibold text-xs sm:text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <BookOpen className="w-4 h-4 mr-1 sm:mr-2" />
              Resources
            </TabsTrigger>
          </TabsList>

          {/* ═══ FAQ Tab ═══ */}
          <TabsContent value="faq" className="space-y-4">
            {filteredFaqs.length === 0 ? (
              <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
                <CardContent className="p-10 text-center">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 mb-1">No results found</h3>
                  <p className="text-sm text-gray-500">Try a different search term or browse all categories.</p>
                </CardContent>
              </Card>
            ) : (
              filteredFaqs.map((category, catIdx) => (
                <Card key={catIdx} className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    {category.questions.map((faq, faqIdx) => {
                      const key = `${catIdx}-${faqIdx}`
                      const isExpanded = expandedFaq === key
                      return (
                        <div key={faqIdx}>
                          <button
                            onClick={() => setExpandedFaq(isExpanded ? null : key)}
                            className="w-full flex items-center justify-between py-3.5 px-3 rounded-xl text-left hover:bg-gray-50 transition-colors group"
                          >
                            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 pr-4">{faq.q}</span>
                            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-gray-900 text-white rotate-180' : 'bg-gray-100 text-gray-500'}`}>
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="px-3 pb-4 animate-in slide-in-from-top-2 duration-200">
                              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                                <p className="text-sm text-gray-700 leading-relaxed">{faq.a}</p>
                              </div>
                            </div>
                          )}
                          {faqIdx < category.questions.length - 1 && <Separator className="mx-3 opacity-50" />}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ═══ Contact / New Ticket Tab ═══ */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Contact Form */}
              <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Send className="w-5 h-5 text-emerald-600" />
                    Submit a Support Ticket
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {messageSent ? (
                    <div className="text-center py-10 animate-in zoom-in-95 duration-300">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Ticket Created!</h3>
                      <p className="text-sm text-gray-500 mb-3">Your ticket has been submitted successfully.</p>
                      {newTicketId && (
                        <Badge variant="outline" className="text-sm font-bold text-blue-700 border-blue-200 bg-blue-50 px-4 py-1.5">
                          <Hash className="w-3.5 h-3.5 mr-1.5" />
                          {newTicketId}
                        </Badge>
                      )}
                      <p className="text-xs text-gray-400 mt-3">
                        View your ticket in the <button onClick={() => { setMessageSent(false); setActiveTab('tickets') }} className="text-emerald-600 font-bold underline">My Tickets</button> tab.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Your Name <span className="text-red-400">*</span></label>
                          <Input 
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="John Doe" 
                            className="h-11 rounded-xl border-gray-200 focus:border-emerald-400 focus:ring-emerald-400" 
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email Address <span className="text-red-400">*</span></label>
                          <Input 
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="john@restaurant.com" 
                            className="h-11 rounded-xl border-gray-200 focus:border-emerald-400 focus:ring-emerald-400" 
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Subject <span className="text-red-400">*</span></label>
                        <Input
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          placeholder="Brief description of your issue"
                          className="h-11 rounded-xl border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Message <span className="text-red-400">*</span></label>
                        <textarea 
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Describe your issue or question in detail..."
                          rows={5}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none resize-none text-sm transition-colors"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
                        <Send className="w-4 h-4 mr-2" />
                        Submit Ticket
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Contact Info Sidebar */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
                  <CardContent className="p-5 space-y-4">
                    <h3 className="font-bold text-gray-900 text-sm">Contact Information</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-blue-100/50">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</p>
                          <p className="text-sm font-semibold text-gray-900">support@servora.com</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-green-50 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-green-100/50">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</p>
                          <p className="text-sm font-semibold text-gray-900">+91 xxxxxxxxxx</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-purple-100/50">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hours</p>
                          <p className="text-sm font-semibold text-gray-900">Mon–Sat, 9am–6pm IST</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-900 to-gray-800 text-white ring-1 ring-gray-700 rounded-2xl">
                  <CardContent className="p-5 space-y-3 text-center">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto ring-1 ring-white/20">
                      <Headphones className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="font-bold text-base">Priority Support</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Upgrade to Premium for priority ticket handling and a dedicated support agent.
                    </p>
                    <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl w-full font-semibold">
                      <Star className="w-3.5 h-3.5 mr-2 text-amber-400" />
                      Upgrade Plan
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══ My Tickets Tab ═══ */}
          <TabsContent value="tickets" className="space-y-4">
            {/* Ticket Filter Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {['all', 'open', 'in-progress', 'resolved', 'closed'].map(filter => (
                  <Button 
                    key={filter} 
                    variant={ticketFilter === filter ? 'default' : 'outline'} 
                    size="sm" 
                    className={`rounded-xl text-xs font-semibold capitalize ${ticketFilter === filter ? 'bg-gray-900 text-white' : 'bg-white'}`}
                    onClick={() => setTicketFilter(filter)}
                  >
                    {filter === 'all' ? `All (${tickets.length})` : `${filter.replace('-', ' ')} (${tickets.filter(t => t.status === filter).length})`}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="rounded-xl font-semibold" onClick={() => setActiveTab('contact')}>
                <Send className="w-3.5 h-3.5 mr-2" />
                New Ticket
              </Button>
            </div>

            {filteredTickets.length === 0 ? (
              <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
                <CardContent className="p-10 text-center">
                  <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 mb-1">
                    {tickets.length === 0 ? 'No tickets yet' : 'No matching tickets'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {tickets.length === 0 
                      ? 'Submit a support ticket and it will appear here for tracking.'
                      : 'Try a different filter to see your tickets.'}
                  </p>
                  {tickets.length === 0 && (
                    <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => setActiveTab('contact')}>
                      <Send className="w-3.5 h-3.5 mr-2" />
                      Submit First Ticket
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map(ticket => {
                  const cfg = statusConfig[ticket.status] || statusConfig.open
                  const StatusIcon = cfg.icon
                  const hasReplies = ticket.replies && ticket.replies.length > 0
                  const lastReply = hasReplies ? ticket.replies[ticket.replies.length - 1] : null
                  
                  return (
                    <Card 
                      key={ticket.id} 
                      className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl hover:shadow-md hover:ring-blue-100 transition-all cursor-pointer group"
                      onClick={() => setSelectedTicket(ticket.id)}
                    >
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-10 h-10 bg-${cfg.color}-50 text-${cfg.color}-600 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-${cfg.color}-100/50`}>
                              <StatusIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="text-[10px] font-bold text-gray-400 font-mono">{ticket.id}</span>
                                <Badge variant="outline" className={`text-[9px] font-bold border-${cfg.color}-200 text-${cfg.color}-700 bg-${cfg.color}-50 px-1.5 py-0`}>
                                  {cfg.label}
                                </Badge>
                                {hasReplies && (
                                  <Badge variant="outline" className="text-[9px] font-bold border-emerald-200 text-emerald-700 bg-emerald-50 px-1.5 py-0">
                                    <MessageSquare className="w-2.5 h-2.5 mr-0.5" />
                                    {ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate">{ticket.subject}</h3>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                {hasReplies && lastReply.isAdmin 
                                  ? `Admin replied: ${lastReply.message}` 
                                  : ticket.message}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{timeAgo(ticket.updatedAt)}</span>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══ Resources Tab ═══ */}
          <TabsContent value="resources" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickLinks.map((link, idx) => (
                <Card key={idx} className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl hover:shadow-md transition-all cursor-pointer group" onClick={() => link.action ? setActiveItem(link.action) : null}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 bg-${link.color}-50 text-${link.color}-600 rounded-xl flex items-center justify-center ring-1 ring-${link.color}-100/50`}>
                        <link.icon className="w-5 h-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold">{link.badge}</Badge>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{link.title}</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">{link.desc}</p>
                    </div>
                    <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Getting Started Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { step: '1', title: 'Set Up Your Menu', desc: 'Add your dishes, prices, and categories in Menu Management.', color: 'blue' },
                    { step: '2', title: 'Generate QR Codes', desc: 'Create scannable QR codes for each table in your restaurant.', color: 'purple' },
                    { step: '3', title: 'Start Receiving Orders', desc: 'Customers scan, order, and you manage everything from the dashboard.', color: 'emerald' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center text-center p-5 bg-gray-50/50 rounded-2xl ring-1 ring-gray-100 hover:ring-blue-100 transition-all">
                      <div className={`w-10 h-10 bg-${item.color}-100 text-${item.color}-600 rounded-full flex items-center justify-center mb-3 font-black text-lg`}>
                        {item.step}
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-100 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Tips & Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Keep your menu items updated with accurate pricing and availability.',
                    'Use high-quality photos for menu items to increase customer orders.',
                    'Monitor the Analytics dashboard weekly to track revenue trends.',
                    'Enable notifications to stay on top of new orders in real-time.',
                    'Regularly back up your QR codes and keep printed copies on tables.',
                    'Use the Customer Management section to build loyalty programs.',
                  ].map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-3 h-3" />
                      </div>
                      <p className="text-sm text-gray-700">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
