import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Search, ChevronRight, ChevronDown, Home, 
  UtensilsCrossed, QrCode, ShoppingCart, LayoutGrid, 
  BarChart3, Users, Settings, Menu, ArrowLeft, ArrowRight, 
  Lightbulb, Copy, CheckCircle, ExternalLink, Hash,
  Zap, Shield, FileText, Code, Terminal, Globe,
  Smartphone, Monitor, Bell, CreditCard, RefreshCw,
  LifeBuoy, Layers, Palette, Lock, Eye, Compass,
  BookMarked, ScrollText, Library, Sparkles, ChevronLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Logo from '@/components/ui/Logo'
import NotificationDropdown from '@/components/ui/NotificationDropdown'

// ─── Documentation Content ───────────────────────────────────────────────────
const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    color: 'amber',
    articles: [
      {
        id: 'introduction',
        title: 'Introduction to Servora',
        content: `Servora is a comprehensive restaurant management platform designed to simplify your operations. From managing menus and processing orders to tracking analytics and managing customer relationships, Servora provides everything you need in one unified dashboard.`,
        features: [
          'Real-time order management with live status updates',
          'QR code-based digital menu for contactless ordering',
          'Comprehensive analytics dashboard with revenue tracking',
          'Customer relationship management (CRM) with loyalty features',
          'Table session tracking and floor management',
          'Multi-device responsive design for desktop and mobile'
        ]
      },
      {
        id: 'quick-setup',
        title: 'Quick Setup Guide',
        content: `Get your restaurant up and running with Servora in just a few simple steps. This guide will walk you through the essential configuration needed to start accepting digital orders.`,
        steps: [
          { title: 'Create Your Account', desc: 'Sign up for Servora and complete your restaurant profile with business details, address, and operating hours.' },
          { title: 'Set Up Your Menu', desc: 'Navigate to Menu Management and add your dishes with names, descriptions, prices, categories, and photos.' },
          { title: 'Generate QR Codes', desc: 'Go to QR Codes section, enter your table count, and generate unique QR codes for each table.' },
          { title: 'Print & Place QR Codes', desc: 'Download and print the QR codes. Place them on each table for customers to scan.' },
          { title: 'Start Receiving Orders', desc: 'Customers scan the QR code, browse your menu, and place orders directly from their phones.' }
        ]
      },
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        content: `The main dashboard is your command center. It provides a real-time snapshot of your restaurant's performance including active orders, table occupancy, and daily revenue metrics.`,
        sections: [
          { title: 'Overview Cards', desc: 'Quick glance at key metrics — total revenue, active orders, occupied tables, and total customers. All data updates in real-time.' },
          { title: 'Table Status Grid', desc: 'Visual representation of all your tables showing their current status (available, occupied, billing) with color-coded indicators.' },
          { title: 'Recent Orders', desc: 'Live feed of the latest orders showing customer details, items ordered, total amount, and current status.' },
          { title: 'Quick Actions', desc: 'One-click buttons to navigate to Orders, Analytics, and other frequently used sections.' }
        ]
      }
    ]
  },
  {
    id: 'menu-management',
    title: 'Menu Management',
    icon: UtensilsCrossed,
    color: 'blue',
    articles: [
      {
        id: 'managing-items',
        title: 'Managing Menu Items',
        content: `The Menu Management section allows you to create, edit, and organize your restaurant's digital menu. Changes are reflected instantly on the customer-facing menu.`,
        sections: [
          { title: 'Adding Items', desc: 'Click "Add Item" to create a new menu item. Fill in the name, description, price, and category. You can also upload a photo for visual appeal.' },
          { title: 'Editing Items', desc: 'Click any existing item to modify its details. Changes save automatically and update the customer menu in real-time.' },
          { title: 'Item Availability', desc: 'Toggle items on/off to temporarily remove them from the menu without deleting them. Perfect for out-of-stock items.' },
          { title: 'Bulk Actions', desc: 'Select multiple items to perform bulk operations like category changes, price adjustments, or availability toggles.' }
        ]
      },
      {
        id: 'categories',
        title: 'Managing Categories',
        icon: Hash,
        content: `Categories help organize your menu into logical sections that customers can easily browse. Create categories like Starters, Main Course, Desserts, Beverages, etc.`,
        tips: [
          'Keep category names short and descriptive for easy scanning',
          'Order categories in the sequence customers naturally browse — appetizers first, desserts last',
          'Use a maximum of 8-10 categories to avoid overwhelming customers',
          'Consider seasonal categories for special menus (e.g., "Summer Specials")'
        ]
      },
      {
        id: 'menu-analytics',
        title: 'Menu Performance Analytics',
        content: `Track how your menu items perform over time. The Menu Analytics panel shows you which items are most popular, which generate the highest revenue, and which might need refreshing.`,
        sections: [
          { title: 'Top Sellers', desc: 'View your best-selling items ranked by order frequency. Use this to ensure popular items are always in stock.' },
          { title: 'Revenue Breakdown', desc: 'See which items contribute most to your revenue. Helps identify high-value items for promotion.' },
          { title: 'Category Performance', desc: 'Compare how different menu categories perform against each other in terms of orders and revenue.' }
        ]
      }
    ]
  },
  {
    id: 'orders',
    title: 'Order Management',
    icon: ShoppingCart,
    color: 'emerald',
    articles: [
      {
        id: 'order-workflow',
        title: 'Order Workflow',
        content: `Orders in Servora follow a structured workflow that keeps both your kitchen and customers informed. Each order progresses through defined statuses.`,
        steps: [
          { title: 'PENDING', desc: 'A new order has been placed by the customer. Review and accept it to begin preparation.' },
          { title: 'PREPARING', desc: 'The kitchen is actively working on the order. The customer sees a "Preparing" status on their device.' },
          { title: 'READY', desc: 'The order is ready for pickup or serving. Staff can now deliver the food to the table.' },
          { title: 'SERVED', desc: 'The food has been delivered to the customer\'s table. The order is awaiting completion.' },
          { title: 'FINISHED', desc: 'The order is complete. Payment has been processed and the table session can be closed.' }
        ]
      },
      {
        id: 'order-notifications',
        title: 'Order Notifications',
        content: `Stay on top of incoming orders with Servora's notification system. New orders trigger real-time alerts so you never miss an order.`,
        sections: [
          { title: 'Bell Notifications', desc: 'The notification bell in the navbar shows a red badge count for unread orders. Click it to see the full list.' },
          { title: 'Sound Alerts', desc: 'Optional audio alerts can be configured to play when new orders arrive — ideal for busy kitchens.' },
          { title: 'Mobile Push', desc: 'If using the mobile view, orders appear in the mobile navbar with visual indicators.' }
        ]
      },
      {
        id: 'order-history',
        title: 'Order History & Reports',
        content: `Access your complete order history with powerful filtering and export capabilities. Use order history to analyze patterns, resolve disputes, and generate reports.`,
        tips: [
          'Filter by date range to analyze specific periods (weekends vs. weekdays)',
          'Filter by status to quickly find cancelled or problematic orders',
          'Export order data as CSV for accounting and tax purposes',
          'Use the search bar to find orders by customer name or order ID'
        ]
      }
    ]
  },
  {
    id: 'qr-codes',
    title: 'QR Code System',
    icon: QrCode,
    color: 'purple',
    articles: [
      {
        id: 'generating-qr',
        title: 'Generating QR Codes',
        content: `QR codes are the bridge between your physical tables and the digital menu. Each QR code is unique to a table number, ensuring orders are automatically associated with the correct table.`,
        steps: [
          { title: 'Set Table Count', desc: 'Enter the total number of tables in your restaurant. You can always generate more later.' },
          { title: 'Generate Codes', desc: 'Click "Generate QR Codes" to create unique codes for each table. This process takes a few seconds.' },
          { title: 'Download & Print', desc: 'Download individual codes or use "Download All" to get them in batch. Print on durable material.' },
          { title: 'Place on Tables', desc: 'Attach the printed QR codes to each corresponding table. Consider using table stands or laminated cards.' }
        ]
      },
      {
        id: 'qr-best-practices',
        title: 'QR Code Best Practices',
        content: `Follow these best practices to ensure the best customer experience with your QR code ordering system.`,
        tips: [
          'Print QR codes at a minimum size of 3x3 inches for easy scanning',
          'Place codes where they are easily visible — center of table or on a stand',
          'Laminate or use waterproof material to protect from spills and wear',
          'Test each QR code after printing to ensure it scans correctly',
          'Include brief instructions next to the QR code: "Scan to view our menu"',
          'Replace damaged or faded QR codes immediately to avoid customer frustration',
          'Consider adding your restaurant logo or branding around the QR code'
        ]
      }
    ]
  },
  {
    id: 'table-sessions',
    title: 'Table & Floor Management',
    icon: LayoutGrid,
    color: 'rose',
    articles: [
      {
        id: 'table-overview',
        title: 'Table Sessions Overview',
        content: `The Table Hub provides a real-time view of your restaurant floor. Track which tables are occupied, which are billing, and manage table turnover efficiently.`,
        sections: [
          { title: 'Table States', desc: 'Tables exist in three states: Available (green), Occupied (amber), and Billing (blue). States update automatically based on order activity.' },
          { title: 'Session Details', desc: 'Click any occupied table to see its current session — active orders, duration, total bill, and customer count.' },
          { title: 'Reset Tables', desc: 'After a customer leaves, reset the table to "Available" using the reset button. This clears the session data.' },
          { title: 'Statistics Bar', desc: 'The top stats bar shows at-a-glance metrics: total tables, occupied count, available count, and average session duration.' }
        ]
      },
      {
        id: 'session-management',
        title: 'Managing Sessions',
        content: `Table sessions automatically begin when a customer scans a QR code and end when the order is marked as finished. You can also manually manage sessions for walk-in customers.`,
        tips: [
          'Encourage customers to scan the QR code to auto-create sessions',
          'For walk-in customers, you can manually assign tables from the dashboard',
          'Monitor the "Billing" state to identify tables ready for cleanup',
          'Use the "Reset All" button at closing time to clear all stale sessions'
        ]
      }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    icon: BarChart3,
    color: 'indigo',
    articles: [
      {
        id: 'analytics-overview',
        title: 'Analytics Dashboard',
        content: `The Analytics section provides comprehensive insights into your restaurant's performance. Track revenue, orders, popular items, and customer trends with interactive charts and reports.`,
        sections: [
          { title: 'Revenue Charts', desc: 'Visualize daily, weekly, and monthly revenue with interactive line and bar charts. Compare periods to spot trends.' },
          { title: 'Order Statistics', desc: 'Track order volume, average order value, peak hours, and order completion rates.' },
          { title: 'Menu Insights', desc: 'Discover your top-selling items, underperforming dishes, and category-level performance metrics.' },
          { title: 'Custom Date Range', desc: 'Select custom date ranges to analyze specific periods — useful for comparing promotional campaigns or seasonal changes.' }
        ]
      },
      {
        id: 'exporting-data',
        title: 'Exporting Reports',
        content: `Export your analytics data for external analysis, accounting, or record-keeping. Servora supports multiple export formats.`,
        tips: [
          'Use CSV exports for spreadsheet analysis in Excel or Google Sheets',
          'PDF exports are ideal for sharing reports with stakeholders',
          'Schedule recurring exports for automated monthly reporting',
          'Filter data before exporting to get only the relevant subset'
        ]
      }
    ]
  },
  {
    id: 'customers',
    title: 'Customer Management',
    icon: Users,
    color: 'cyan',
    articles: [
      {
        id: 'crm-overview',
        title: 'CRM Overview',
        content: `Servora's Customer Management module helps you build lasting relationships with your guests. Track visit history, preferences, spending patterns, and create targeted engagement strategies.`,
        sections: [
          { title: 'Customer Profiles', desc: 'Each customer has a detailed profile showing their visit history, total spending, favorite items, and tagged segments (VIP, Regular, New).' },
          { title: 'Segmentation', desc: 'Automatically categorize customers based on visit frequency and spending. Use segments for targeted promotions.' },
          { title: 'Search & Filter', desc: 'Find customers quickly using the search bar. Filter by segment (VIP, Regular, New) or by activity metrics.' },
          { title: 'Growth Analytics', desc: 'Track customer growth over time with visual charts showing new vs. returning customer ratios.' }
        ]
      },
      {
        id: 'loyalty-features',
        title: 'Loyalty & Engagement',
        content: `Leverage customer data to create loyalty programs and engagement campaigns that bring customers back.`,
        tips: [
          'Identify VIP customers and consider personalized perks or discounts',
          'Track customers who haven\'t visited in a while for re-engagement campaigns',
          'Use spending data to create tiered loyalty programs',
          'Export customer lists for email marketing integrations'
        ]
      }
    ]
  },
  {
    id: 'architecture',
    title: 'Architecture & Development',
    icon: Code,
    color: 'violet',
    articles: [
      {
        id: 'tech-stack',
        title: 'Technology Stack',
        content: `Servora is built with modern web technologies to ensure performance, scalability, and maintainability. Our architecture follows best practices for restaurant management systems.`,
        sections: [
          { title: 'Frontend', desc: 'React 19 with Vite for fast development, TailwindCSS for styling, and Radix UI components for accessibility. State management through React hooks and context.' },
          { title: 'Backend Architecture', desc: 'RESTful API design with localStorage for data persistence in the current version. Built for easy migration to server-side storage.' },
          { title: 'UI Components', desc: 'Shadcn/UI component library with Radix UI primitives, Lucide React icons, and custom components for restaurant-specific workflows.' },
          { title: 'State Management', desc: 'React Context API for global state, custom hooks for data fetching, and local storage for data persistence across sessions.' }
        ]
      },
      {
        id: 'project-structure',
        title: 'Project Structure',
        content: `The codebase is organized into logical modules to maintain scalability and developer experience. Each feature has its own dedicated components and utilities.`,
        sections: [
          { title: 'Components', desc: 'Reusable UI components in /components, organized by feature (dashboard, menu, orders, etc.) with shared components in /ui.' },
          { title: 'Pages', desc: 'Main application pages in /pages, each representing a major route or feature area of the application.' },
          { title: 'Hooks', desc: 'Custom React hooks in /hooks for data fetching and business logic, promoting code reuse and separation of concerns.' },
          { title: 'Services', desc: 'API and data service layers in /services, handling all external data operations and business logic.' }
        ]
      }
    ]
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    icon: Terminal,
    color: 'green',
    articles: [
      {
        id: 'data-structures',
        title: 'Data Structures',
        content: `Servora uses standardized data structures across the application. Understanding these structures is essential for integration and development.`,
        sections: [
          { title: 'Order Object', desc: 'Orders contain id, items array, customer info, total amount, status, timestamp, and table number for complete tracking.' },
          { title: 'Menu Item Structure', desc: 'Menu items include id, name, description, price, category, availability status, and optional image URL.' },
          { title: 'Customer Profile', desc: 'Customer objects store visit history, total spending, favorite items, segmentation tags, and contact information.' },
          { title: 'Table Session', desc: 'Sessions track table occupancy, active orders, duration, customer count, and billing status for floor management.' }
        ]
      },
      {
        id: 'storage-api',
        title: 'Storage API',
        content: `The current implementation uses localStorage for data persistence. The storage layer is abstracted to enable easy migration to server-side storage.`,
        sections: [
          { title: 'Storage Service', desc: 'Centralized storage service in /services handles all localStorage operations with error handling and data validation.' },
          { title: 'Data Synchronization', desc: 'Real-time sync between components using storage events and custom hooks for reactive updates across the application.' },
          { title: 'Data Validation', desc: 'Zod schemas validate all data structures before storage, ensuring data integrity and preventing runtime errors.' },
          { title: 'Migration Path', desc: 'Storage abstraction layer allows seamless migration to backend APIs without changing component logic.' }
        ]
      }
    ]
  }
]

// Flatten all articles for search
const allArticles = docSections.flatMap(section => 
  section.articles.map(article => ({ ...article, sectionId: section.id, sectionTitle: section.title, icon: section.icon, color: section.color }))
)

export default function DocumentationPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSectionId, setActiveSectionId] = useState('getting-started')
  const [activeArticleId, setActiveArticleId] = useState('introduction')
  const [expandedSections, setExpandedSections] = useState(['getting-started'])
  const [docSidebarOpen, setDocSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const contentRef = useRef(null)

  const activeSection = docSections.find(s => s.id === activeSectionId) || docSections[0]
  const activeArticle = activeSection.articles.find(a => a.id === activeArticleId) || activeSection.articles[0]

  // Search results
  const searchResults = searchTerm.length > 1 
    ? allArticles.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : []

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    )
  }

  const navigateToArticle = (sectionId, articleId) => {
    setActiveSectionId(sectionId)
    setActiveArticleId(articleId)
    if (!expandedSections.includes(sectionId)) {
      setExpandedSections(prev => [...prev, sectionId])
    }
    setSearchTerm('')
    setDocSidebarOpen(false)
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Navigation helpers
  const allArticlesList = docSections.flatMap(s => s.articles.map(a => ({ sectionId: s.id, articleId: a.id })))
  const currentIdx = allArticlesList.findIndex(a => a.sectionId === activeSectionId && a.articleId === activeArticleId)
  const prevArticle = currentIdx > 0 ? allArticlesList[currentIdx - 1] : null
  const nextArticle = currentIdx < allArticlesList.length - 1 ? allArticlesList[currentIdx + 1] : null

  const getPrevTitle = () => {
    if (!prevArticle) return ''
    const s = docSections.find(s => s.id === prevArticle.sectionId)
    return s?.articles.find(a => a.id === prevArticle.articleId)?.title || ''
  }
  const getNextTitle = () => {
    if (!nextArticle) return ''
    const s = docSections.find(s => s.id === nextArticle.sectionId)
    return s?.articles.find(a => a.id === nextArticle.articleId)?.title || ''
  }

  // Copy link
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/docs/${activeSectionId}/${activeArticleId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── Premium Sidebar ─────────────────────────────────────────────────
  const PremiumSidebar = () => (
    <div className="h-full flex flex-col bg-white border-r border-slate-200/60 shadow-xl z-20">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 rounded-lg border border-blue-100/50 w-fit">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-bold text-blue-700">{allArticles.length} Articles</span>
        </div>
      </div>

      {/* Search Section */}
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documentation..."
            className="pl-9 h-9 bg-white border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus-visible:ring-slate-300 focus-visible:border-slate-300 shadow-sm"
          />
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto">
        {searchTerm.length > 1 ? (
          <div className="p-4">
            {searchResults.length === 0 ? (
              <div className="text-center py-8">
                <Compass className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No results found</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Search Results</p>
                {searchResults.map(result => (
                  <button
                    key={`${result.sectionId}-${result.id}`}
                    onClick={() => navigateToArticle(result.sectionId, result.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-100 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 bg-${result.color}-50 text-${result.color}-600 rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <result.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{result.sectionTitle}</p>
                        <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 mt-0.5 truncate">{result.title}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2 tracking-widest leading-none">Table of Contents</p>
            <nav className="space-y-1 mt-4">
              {docSections.map(section => {
                const Icon = section.icon
                const isExpanded = expandedSections.includes(section.id)
                const isActiveSection = section.id === activeSectionId
                return (
                  <div key={section.id} className="mb-2">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group ${
                        isActiveSection 
                          ? 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActiveSection 
                          ? `bg-${section.color}-100 text-${section.color}-700` 
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold flex-1 truncate">{section.title}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 pl-4 border-l-2 border-slate-100">
                        {section.articles.map(article => {
                          const isActive = activeSectionId === section.id && activeArticleId === article.id
                          return (
                            <button
                              key={article.id}
                              onClick={() => navigateToArticle(section.id, article.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                isActive 
                                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {article.title}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
        <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" />
            <span>v2.0.4 Stable</span>
          </div>
          <span>&copy; Servora Docs</span>
        </div>
      </div>
    </div>
  )

  // ─── Render ─────────────────────────────────────────────────────────────
  const SectionIcon = activeSection.icon

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Premium Top Navigation Bar */}
      <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 sticky top-0 z-50 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div className="cursor-pointer" onClick={() => navigateToArticle('getting-started', 'introduction')}>
            <Logo subtitle="Documentation" iconSize={32} />
          </div>
          <Separator orientation="vertical" className="h-6 bg-slate-200" />
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="h-10 px-5 bg-white border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500 hover:text-blue-600 transition-all duration-300 group flex items-center gap-3"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="tracking-tight">Back to Dashboard</span>
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-tight">Support Hub</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">Premium</span>
          </div>
          <NotificationDropdown />
          <div className="flex items-center gap-3 pl-2 ml-2 border-l border-slate-100">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-900 leading-none">John Doe</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-blue-200 cursor-pointer hover:scale-105 transition-transform">
              JD
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Fixed Sidebar */}
        <aside className="hidden lg:block w-80 flex-shrink-0 border-r border-slate-100 overflow-y-auto bg-slate-50/20">
          <PremiumSidebar />
        </aside>

        {/* Dynamic Content Area */}
        <main ref={contentRef} className="flex-1 overflow-y-auto bg-slate-50/30">
          <div className="w-full mx-auto px-6 md:px-12 py-12">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 mb-8 text-sm font-medium">
              <button 
                onClick={() => navigateToArticle('getting-started', 'introduction')}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                Documentation
              </button>
              <ChevronRight className="w-4 h-4 text-slate-300" />
              <span className="text-slate-400">{activeSection.title}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{activeArticle.title}</span>
            </nav>

            {/* Article Header */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl bg-${activeSection.color}-50 border border-${activeSection.color}-100 shadow-sm shadow-${activeSection.color}-50`}>
                  <SectionIcon className={`w-5 h-5 text-${activeSection.color}-600`} />
                  <span className={`text-xs font-black uppercase tracking-widest text-${activeSection.color}-700`}>
                    {activeSection.title}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copyLink}
                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  <span className="text-xs font-bold">{copied ? 'Copied URL!' : 'Copy direct link'}</span>
                </Button>
              </div>
              
              <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4 leading-[1.1]">
                {activeArticle.title}
              </h1>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-3xl">
                {activeArticle.content}
              </p>
            </div>

            {/* Article Content (Prose) */}
            <div className="space-y-12">
              {/* Features Grid */}
              {activeArticle.features && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeArticle.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group cursor-default">
                      <div className="w-2 h-2 rounded-full bg-blue-400 group-hover:scale-125 transition-transform" />
                      <span className="text-slate-700 font-bold">{feature}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Step-by-Step Guide */}
              {activeArticle.steps && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    Implementation Steps
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeArticle.steps.map((step, idx) => (
                      <div key={idx} className="relative p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
                        <div className="absolute -top-3 -left-3 w-10 h-10 bg-white border border-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-900 shadow-sm">
                          {idx + 1}
                        </div>
                        <h4 className="text-lg font-black text-slate-900 mt-4 mb-2 tracking-tight">{step.title}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-bold">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Sections */}
              {activeArticle.sections && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {activeArticle.sections.map((section, idx) => (
                    <div key={idx} className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-${activeSection.color}-50/30 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110`} />
                      <h4 className="text-xl font-black text-slate-900 mb-4 relative z-10 tracking-tight">{section.title}</h4>
                      <p className="text-slate-500 leading-relaxed relative z-10 font-bold">{section.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips Section */}
              {activeArticle.tips && (
                <div className="p-10 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-[2.5rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Lightbulb className="w-32 h-32 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-black text-amber-900 mb-8 flex items-center gap-3 tracking-tight leading-none uppercase tracking-widest text-xs">
                    Pro Tips & Best Practices
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeArticle.tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
                        <p className="text-amber-800 font-black leading-snug">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Navigation */}
            <div className="mt-20 pt-10 border-t border-slate-100 flex items-center justify-between gap-8">
              {prevArticle ? (
                <button 
                  onClick={() => navigateToArticle(prevArticle.sectionId, prevArticle.articleId)}
                  className="group flex-1 flex items-center gap-4 p-6 rounded-3xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left"
                >
                  <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Previous Article</span>
                    <p className="text-lg font-black text-slate-900 line-clamp-1 tracking-tight">{getPrevTitle()}</p>
                  </div>
                </button>
              ) : <div className="flex-1" />}

              {nextArticle && (
                <button 
                  onClick={() => navigateToArticle(nextArticle.sectionId, nextArticle.articleId)}
                  className="group flex-1 flex items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 hover:bg-blue-700 transition-all text-right border-none shadow-xl shadow-slate-200"
                >
                  <div className="text-left">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Next Up</span>
                    <p className="text-lg font-black text-white line-clamp-1 tracking-tight">{getNextTitle()}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-blue-700 transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Mobile Sidebar (Floating Toggle Button) */}
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <Sheet open={docSidebarOpen} onOpenChange={setDocSidebarOpen}>
            <SheetTrigger asChild>
              <Button size="lg" className="h-16 w-16 rounded-3xl bg-blue-600 text-white shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 active:scale-95">
                <Menu className="w-8 h-8" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 border-none shadow-2xl">
              <PremiumSidebar />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  )
}
