import React, { useState, useRef, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Search, ChevronRight, ChevronDown, ChevronLeft, 
  Copy, CheckCircle, ArrowLeft, ArrowRight,
  Zap, Layers, Lightbulb, ShieldCheck, Sparkles, BookOpen,
  Library, ScrollText, FileText, Compass, Globe, HelpCircle,
  X, Menu
} from 'lucide-react'
import { docSections, allArticles } from '../../data/docsContent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export default function PublicDocsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const initialSection = searchParams.get('section') || 'getting-started'
  const initialArticle = searchParams.get('article') || 'introduction'

  const [searchTerm, setSearchTerm] = useState('')
  const [activeSectionId, setActiveSectionId] = useState(initialSection)
  const [activeArticleId, setActiveArticleId] = useState(initialArticle)
  const [expandedSections, setExpandedSections] = useState([initialSection])

  useEffect(() => {
    const sec = searchParams.get('section')
    const art = searchParams.get('article')
    if (sec && art) {
      setActiveSectionId(sec)
      setActiveArticleId(art)
      setExpandedSections(prev => prev.includes(sec) ? prev : [...prev, sec])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [searchParams])

  const [copied, setCopied] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const activeSection = docSections.find(s => s.id === activeSectionId) || docSections[0]
  const activeArticle = activeSection.articles.find(a => a.id === activeArticleId) || activeSection.articles[0]

  // Search logic
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
    setIsSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Sidebar Render Helper
  const renderSidebar = (isMobileDrawer = false, onClose) => (
    <div className="h-full flex flex-col bg-white overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
      {/* Mobile Drawer Header */}
      {isMobileDrawer && (
        <div className="h-14 px-4 flex items-center border-b border-slate-100 bg-white shrink-0 pr-12">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span className="font-black text-slate-900 text-sm tracking-tight">Documentation</span>
          </div>
        </div>
      )}

      <div className="p-4 sticky top-0 z-10 bg-white border-b border-slate-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documentation..."
            className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all text-sm shadow-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {searchTerm.length > 1 ? (
          <div className="space-y-4">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Search Results</p>
             {searchResults.length === 0 ? (
                <div className="text-center py-8 px-4">
                   <p className="text-sm text-slate-400 font-medium">No results found for "{searchTerm}"</p>
                </div>
             ) : (
                <div className="space-y-1">
                  {searchResults.map(result => (
                    <button
                      key={`${result.sectionId}-${result.id}`}
                      onClick={() => navigateToArticle(result.sectionId, result.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-all group"
                    >
                      <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">{result.title}</p>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{result.sectionTitle}</span>
                    </button>
                  ))}
                </div>
             )}
          </div>
        ) : (
          <nav className="space-y-4">
            {docSections.map(section => {
              const isExpanded = expandedSections.includes(section.id)
              return (
                <div key={section.id} className="space-y-1">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-xl hover:bg-slate-50 transition-all"
                  >
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{section.title}</span>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isExpanded ? "" : "-rotate-90")} />
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-1 overflow-hidden pl-2"
                      >
                        {section.articles.map(article => (
                          <button
                            key={article.id}
                            onClick={() => navigateToArticle(section.id, article.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                              activeSectionId === section.id && activeArticleId === article.id
                                ? "text-blue-600 bg-blue-50/80 font-black"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            )}
                          >
                            {activeSectionId === section.id && activeArticleId === article.id && (
                               <div className="w-1.5 h-3 rounded-full bg-blue-600 shrink-0" />
                            )}
                            <span className="truncate">{article.title}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      <Helmet>
        <title>Documentation | Servora</title>
        <meta name="description" content="Learn how to use Servora restaurant management system. Guides, API references, and tutorials for setup, digital menus, and analytics." />
        <meta name="keywords" content="servora docs, restaurant pos documentation, qr menu guide, kitchen display system tutorial" />
      </Helmet>

      {/* Main Container */}
      <div className="pt-16 sm:pt-20">
        <div className="flex w-full px-4 sm:px-6 lg:px-12">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:flex flex-col w-65 xl:w-70 shrink-0 border-r border-slate-200/60 bg-white sticky top-20 h-[calc(100vh-5rem)] overflow-hidden z-20">
            {renderSidebar(false)}
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 bg-white min-h-[calc(100vh-5rem)] pb-24 lg:border-l lg:border-slate-100">
            <div className="px-1 sm:px-8 md:px-12 py-6 sm:py-10 w-full lg:pr-12 max-w-4xl mx-auto">
              
              {/* Header Navigation & Mobile Drawer Trigger */}
              <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                 <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 truncate">
                    <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => navigateToArticle('getting-started', 'introduction')}>Docs</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span className="text-slate-700 truncate">{activeSection.title}</span>
                 </div>
                 <button 
                    type="button"
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-blue-600 font-bold text-xs border border-blue-100 transition-colors shrink-0 shadow-2xs"
                 >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Topics</span>
                 </button>
              </div>

              {/* Typography Header */}
              <div className="mb-8 space-y-3">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider">
                    Servora Platform Docs
                 </div>
                 <h1 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
                    {activeArticle.title}
                 </h1>
                 <p className="text-sm sm:text-lg text-slate-500 leading-relaxed font-medium border-l-2 border-blue-500 pl-3.5 sm:pl-4 py-0.5">
                    {activeArticle.content}
                 </p>
              </div>

              <Separator className="my-8 bg-slate-100" />

              {/* Content Blocks */}
              <div className="space-y-10">
                 {activeArticle.features && (
                    <div className="space-y-4">
                       <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          Key Capabilities
                       </h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeArticle.features.map((feature, i) => (
                             <div key={i} className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-sm hover:border-slate-300 transition-all">
                                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                                   <CheckCircle className="w-4 h-4" />
                                </div>
                                <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">{feature}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {activeArticle.steps && (
                    <div className="space-y-4">
                       <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-600" />
                          Step-by-step Walkthrough
                       </h3>
                       <div className="space-y-3">
                          {activeArticle.steps.map((step, i) => (
                             <div key={i} className="flex gap-3 sm:gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">
                                   {i + 1}
                                </div>
                                <div>
                                   <h4 className="text-sm font-bold text-slate-900 mb-0.5">{step.title}</h4>
                                   <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">{step.desc}</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {activeArticle.sections && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeArticle.sections.map((sec, i) => (
                            <div key={i} className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs hover:border-blue-300 transition-all">
                                <h4 className="text-sm font-bold text-slate-900 mb-1">{sec.title}</h4>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">{sec.desc}</p>
                            </div>
                        ))}
                    </div>
                 )}

                 {activeArticle.tips && (
                    <div className="p-4 sm:p-6 bg-amber-50/70 border border-amber-200/70 rounded-2xl">
                       <h3 className="text-xs sm:text-sm font-black text-amber-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-600" /> Pro Tips
                       </h3>
                       <div className="space-y-2">
                          {activeArticle.tips.map((tip, i) => (
                             <div key={i} className="flex gap-2.5 items-start">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <p className="text-slate-800 font-medium text-xs sm:text-sm leading-relaxed">{tip}</p>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>

              {/* Navigation Pager */}
              <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
                 <Button 
                    variant="outline" 
                    className="w-full sm:w-auto h-11 px-5 rounded-xl text-xs font-bold border-slate-200"
                    onClick={() => {
                        const allArts = docSections.flatMap(s => s.articles.map(a => ({ sId: s.id, aId: a.id })))
                        const current = allArts.findIndex(a => a.sId === activeSectionId && a.aId === activeArticleId)
                        if (current > 0) navigateToArticle(allArts[current-1].sId, allArts[current-1].aId)
                    }}
                 >
                    <ChevronLeft className="w-4 h-4 mr-1.5" /> Previous Document
                 </Button>
                 <Button 
                    className="w-full sm:w-auto h-11 px-5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black"
                    onClick={() => {
                        const allArts = docSections.flatMap(s => s.articles.map(a => ({ sId: s.id, aId: a.id })))
                        const current = allArts.findIndex(a => a.sId === activeSectionId && a.aId === activeArticleId)
                        if (current < allArts.length - 1) navigateToArticle(allArts[current+1].sId, allArts[current+1].aId)
                    }}
                 >
                    Continue Reading <ChevronRight className="w-4 h-4 ml-1.5" />
                 </Button>
              </div>

            </div>
          </main>
        </div>
      </div>

      {/* 📱 Fullscreen Solid Mobile Drawer */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-[85vw] max-w-xs border-r border-slate-200 shadow-2xl bg-white z-999999 flex flex-col h-full overflow-hidden"
          style={{ backgroundColor: '#ffffff' }}
        >
          <SheetTitle className="sr-only">Documentation Contents</SheetTitle>
          <SheetDescription className="sr-only">Browse all documentation articles and categories.</SheetDescription>
          {renderSidebar(true, () => setIsSidebarOpen(false))}
        </SheetContent>
      </Sheet>
    </div>
  )
}
