import React, { useState, useEffect, useRef } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import Sidebar from '../layout/Sidebar'
import MobileNavbar from '../layout/MobileNavbar'
import Logo from '@/components/ui/Logo'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import DocumentationMobileNavbar from './DocumentationMobileNavbar'
import { docSections, allArticles } from '../../data/docsContent'

export default function Documentation({ activeItem, setActiveItem, navigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
    ? allArticles.filter(article => 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : []

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const navigateToArticle = (sectionId, articleId) => {
    setActiveSectionId(sectionId)
    setActiveArticleId(articleId)
    if (!expandedSections.includes(sectionId)) {
      setExpandedSections(prev => [...prev, sectionId])
    }
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

  // ─── Premium Doc Sidebar ────────────────────────────────────────────
  const DocSidebar = () => (
    <div className="h-full flex flex-col bg-white overflow-hidden border-r border-slate-100">
      {/* Top Search Area */}
      <div className="p-4 border-b border-slate-50">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search docs..."
            className="pl-9 h-10 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 transition-all text-sm placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 rounded-lg border border-blue-100/30 w-fit">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-black text-blue-700 uppercase tracking-tight">{allArticles.length} Articles Registered</span>
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {searchTerm.length > 1 ? (
          /* Search Results */
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Search Results</p>
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No matches for "{searchTerm}"</p>
            ) : (
              <div className="space-y-1">
                {searchResults.map(result => (
                  <button
                    key={`${result.sectionId}-${result.id}`}
                    onClick={() => navigateToArticle(result.sectionId, result.id)}
                    className="w-full text-left px-3 py-3 rounded-xl hover:bg-blue-50 transition-all group border border-transparent hover:border-blue-100"
                  >
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">{result.sectionTitle}</span>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-blue-700 mt-1">{result.title}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Table of Contents */
          <div className="space-y-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 group">Table of Contents</p>
            <nav className="space-y-1">
              {docSections.map(section => {
                const Icon = section.icon
                const isExpanded = expandedSections.includes(section.id)
                const isActiveSection = section.id === activeSectionId
                return (
                  <div key={section.id} className="mb-2">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all group ${
                        isActiveSection 
                          ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        isActiveSection 
                          ? `bg-blue-600 text-white shadow-sm` 
                          : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold flex-1 truncate tracking-tight">{section.title}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 pl-4 border-l-2 border-slate-100">
                        {section.articles.map(article => {
                          const isActive = activeSectionId === section.id && activeArticleId === article.id
                          return (
                            <button
                              key={article.id}
                              onClick={() => navigateToArticle(section.id, article.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                isActive 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
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

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-50 bg-slate-50/30">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-300">
          <span>Servora Docs</span>
          <span>&copy; 2026</span>
        </div>
      </div>
    </div>
  )

  // ─── Render ─────────────────────────────────────────────────────────────
  const SectionIcon = activeSection.icon

  return (
    <div className="h-full flex flex-col lg:flex-row bg-white overflow-hidden relative">
      <DocumentationMobileNavbar 
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        onSearch={() => setDocSidebarOpen(true)}
        searchTerm={searchTerm}
      />

      <aside className="hidden lg:block w-80 flex-shrink-0 border-r border-slate-100 bg-white z-50">
        <DocSidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="hidden lg:flex h-16 flex-shrink-0 bg-white border-b border-slate-200 px-6 items-center justify-between shadow-sm sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <div className="cursor-pointer" onClick={() => navigateToArticle('getting-started', 'introduction')}>
              <Logo subtitle="Documentation" iconSize={32} />
            </div>
            <Separator orientation="vertical" className="h-6 bg-slate-200" />
            <Button 
              variant="outline" 
              onClick={() => setActiveItem('dashboard')}
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
            <NotificationDropdown />
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-blue-200 cursor-pointer hover:scale-105 transition-transform">
              JD
            </div>
          </div>
        </header>

        <main ref={contentRef} className="flex-1 overflow-y-auto bg-slate-50/30 pb-24 lg:pb-0">
          <div className="w-full mx-auto px-6 md:px-12 py-12">
            <div className="flex items-center gap-2 mb-10 text-xs font-black uppercase tracking-widest text-slate-400">
              <button 
                onClick={() => navigateToArticle('getting-started', 'introduction')} 
                className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                Documentation
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-500">{activeSection.title}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-black">{activeArticle.title}</span>
            </div>

            <div className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl bg-${activeSection.color}-50 border border-${activeSection.color}-100 shadow-sm shadow-${activeSection.color}-50`}>
                  <SectionIcon className={`w-5 h-5 text-${activeSection.color}-600`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest text-${activeSection.color}-700`}>
                    {activeSection.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyLink}
                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg font-bold"
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mr-2" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                    {copied ? 'Link Copied!' : 'Copy direct link'}
                  </Button>
                </div>
              </div>
              
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
                {activeArticle.title}
              </h1>
              <p className="text-lg text-slate-500 font-bold leading-relaxed max-w-3xl">
                {activeArticle.content}
              </p>
            </div>

            <div className="space-y-12">
              {activeArticle.features && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeArticle.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all group group cursor-default">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400 group-hover:scale-125 transition-transform" />
                      <span className="text-slate-700 font-bold tracking-tight">{feature}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeArticle.steps && (
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-8 uppercase tracking-widest text-xs">
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    Step-by-Step Implementation
                  </h3>
                  <div className="grid grid-cols-1 gap-6">
                    {activeArticle.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-6 p-6 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center font-black text-slate-900 shadow-sm flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="pt-1">
                          <h4 className="text-lg font-black text-slate-900 mb-1 tracking-tight">{step.title}</h4>
                          <p className="text-slate-500 font-bold leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeArticle.sections && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeArticle.sections.map((section, idx) => (
                    <Card key={idx} className="border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group overflow-hidden">
                      <CardContent className="p-8 relative">
                        <h4 className="text-lg font-black text-slate-900 mb-3 relative z-10 tracking-tight">{section.title}</h4>
                        <p className="text-slate-500 font-bold leading-relaxed relative z-10">{section.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {activeArticle.tips && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-[2.5rem] p-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Lightbulb className="w-24 h-24 text-amber-500" />
                  </div>
                  <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                    Pro Tips & Best Practices
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {activeArticle.tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-900 font-black text-sm leading-snug">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-20 pt-10 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
              {prevArticle ? (
                <button 
                  onClick={() => navigateToArticle(prevArticle.sectionId, prevArticle.articleId)}
                  className="group flex-1 flex items-center gap-4 p-5 rounded-3xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left shadow-sm hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300 flex-shrink-0">
                    <ChevronLeft className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Previous Article</span>
                    <p className="text-base font-black text-slate-900 truncate tracking-tight">{getPrevTitle()}</p>
                  </div>
                </button>
              ) : <div className="hidden md:block flex-1" />}

              {nextArticle && (
                <button 
                  onClick={() => navigateToArticle(nextArticle.sectionId, nextArticle.articleId)}
                  className="group flex-1 flex items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 hover:bg-black transition-all text-right border-none shadow-xl shadow-slate-200 hover:shadow-blue-900/10"
                >
                  <div className="text-left min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Next Up</span>
                    <p className="text-base font-black text-white truncate tracking-tight">{getNextTitle()}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-slate-900 transition-all duration-300 flex-shrink-0">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </main>

        {!docSidebarOpen && (
          <div className="lg:hidden fixed bottom-24 right-6 z-50">
            <Button 
              size="lg" 
              onClick={() => setDocSidebarOpen(true)}
              className="h-14 w-14 rounded-2xl bg-slate-900 text-white shadow-2xl hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center p-0"
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        )}
      </div>

      <Sheet open={docSidebarOpen} onOpenChange={setDocSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80 border-none shadow-2xl">
          <SheetTitle className="sr-only">Documentation Menu</SheetTitle>
          <SheetDescription className="sr-only">Browse documentation sections and articles</SheetDescription>
          <DocSidebar />
        </SheetContent>
      </Sheet>

      <MobileNavbar activeItem={activeItem} setActiveItem={setActiveItem} />
    </div>
  )
}
