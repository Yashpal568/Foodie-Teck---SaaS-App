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
import MobileNavbar from '@/components/layout/MobileNavbar'
import { docSections } from '../data/docsContent'

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
    <div className="h-screen flex flex-col bg-white overflow-hidden relative">
      {/* Mobile Top Header (Standalone) */}
      <div className="lg:hidden sticky top-0 z-[60] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100 rounded-xl w-10 h-10" onClick={() => navigate('/dashboard')}>
            <Home className="w-5 h-5" />
          </Button>
          <Logo subtitle="Docs" iconSize={26} />
        </div>
        <div className="flex items-center gap-2">
          <NotificationDropdown />
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-[10px] shadow-lg shadow-blue-200">
            JD
          </div>
        </div>
      </div>
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
        <main ref={contentRef} className="flex-1 overflow-y-auto bg-slate-50/30 pb-24 lg:pb-0">
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
            <div className="mt-20 pt-10 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-8">
              {prevArticle ? (
                <button 
                  onClick={() => navigateToArticle(prevArticle.sectionId, prevArticle.articleId)}
                  className="group flex-1 flex items-center gap-4 p-6 rounded-3xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left shadow-sm hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 flex-shrink-0 shadow-sm">
                    <ChevronLeft className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Previous Article</span>
                    <p className="text-lg font-black text-slate-900 truncate tracking-tight">{getPrevTitle()}</p>
                  </div>
                </button>
              ) : <div className="hidden md:block flex-1" />}

              {nextArticle && (
                <button 
                  onClick={() => navigateToArticle(nextArticle.sectionId, nextArticle.articleId)}
                  className="group flex-1 flex items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 hover:bg-black transition-all text-right border-none shadow-xl shadow-slate-200 hover:shadow-blue-900/10"
                >
                  <div className="text-left min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Next Up</span>
                    <p className="text-lg font-black text-white truncate tracking-tight">{getNextTitle()}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-slate-900 transition-all duration-300 flex-shrink-0">
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
              <SheetTitle className="sr-only">Documentation Menu</SheetTitle>
              <SheetDescription className="sr-only">Browse documentation sections and articles</SheetDescription>
              <PremiumSidebar />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavbar activeItem="docs" setActiveItem={() => {}} />
    </div>
  )
}
