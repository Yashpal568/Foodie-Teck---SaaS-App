import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Search, ChevronRight, ChevronDown, ChevronLeft, 
  Copy, CheckCircle, ArrowLeft, ArrowRight,
  Zap, Layers, Lightbulb, ShieldCheck, Sparkles, BookOpen,
  Library, ScrollText, FileText, Compass, Globe, HelpCircle
} from 'lucide-react'
import MarketingNavbar from '../../components/marketing/MarketingNavbar'
import MarketingFooter from '../../components/marketing/MarketingFooter'
import { docSections, allArticles } from '../../data/docsContent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import Logo from '@/components/ui/Logo'
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
  const contentRef = useRef(null)

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

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Sidebar Component
  const Sidebar = () => (
    <div className="h-full flex flex-col bg-transparent overflow-hidden">
      <div className="p-4 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documentation..."
            className="pl-9 h-10 rounded-lg bg-white border-slate-200 focus:bg-white focus:border-slate-300 transition-all text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
        {searchTerm.length > 1 ? (
          <div className="space-y-6">
             <p className="text-xs font-semibold text-slate-900 px-2 tracking-tight">Search Results</p>
             {searchResults.length === 0 ? (
               <div className="text-center py-10 px-4">
                  <p className="text-sm text-slate-400 font-medium">No results found for "{searchTerm}"</p>
               </div>
             ) : (
               <div className="space-y-1">
                 {searchResults.map(result => (
                   <button
                     key={`${result.sectionId}-${result.id}`}
                     onClick={() => navigateToArticle(result.sectionId, result.id)}
                     className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 transition-all group"
                   >
                     <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">{result.title}</p>
                     <span className="text-[11px] text-slate-500 block mt-0.5">{result.sectionTitle}</span>
                   </button>
                 ))}
               </div>
             )}
          </div>
        ) : (
          <nav className="space-y-6">
            {docSections.map(section => {
              const isExpanded = expandedSections.includes(section.id)
              return (
                <div key={section.id} className="space-y-2">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-2 py-1 text-left transition-all"
                  >
                    <span className="text-sm font-semibold text-slate-900 tracking-tight">{section.title}</span>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isExpanded ? "" : "-rotate-90")} />
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-1 overflow-hidden"
                      >
                        {section.articles.map(article => (
                          <button
                            key={article.id}
                            onClick={() => navigateToArticle(section.id, article.id)}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                              activeSectionId === section.id && activeArticleId === article.id
                                ? "text-blue-600 bg-blue-50/50"
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                            )}
                          >
                            {activeSectionId === section.id && activeArticleId === article.id && (
                               <div className="w-1 h-3 rounded-full bg-blue-600" />
                            )}
                            {article.title}
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
    <div className="min-h-screen bg-transparent">
      {/* 
        SHADCN STUDIO AESTHETIC LAYOUT 
        Ultra-clean, border-driven, full-height architecture. 
      */}
      <div className="flex w-full px-6 lg:px-12 pt-[80px]">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-[240px] xl:w-[260px] flex-shrink-0 border-r border-slate-200/60 bg-white sticky top-[80px] h-[calc(100vh-80px)] overflow-hidden z-20">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 bg-white min-h-[calc(100vh-80px)] pb-32">
          <div className="px-6 py-10 md:px-12 md:py-16 w-full lg:pr-12">
            
            {/* Minimal Breadcrumbs */}
            <div className="flex items-center gap-2 mb-8 text-sm font-medium text-slate-500">
               <span className="hover:text-slate-900 cursor-pointer transition-colors" onClick={() => navigateToArticle('getting-started', 'introduction')}>Docs</span>
               <ChevronRight className="w-4 h-4" />
               <span>{activeSection.title}</span>
            </div>

            {/* Typography Heavy Header */}
            <div className="mb-12 space-y-4">
               <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-950 tracking-tight scroll-m-20">
                  {activeArticle.title}
               </h1>
               <p className="text-lg sm:text-xl text-slate-500 leading-relaxed font-medium">
                  {activeArticle.content}
               </p>
            </div>

            <Separator className="my-10 bg-slate-100" />

            {/* Content Blocks using standard Shadcn prose styling */}
            <div className="space-y-12">
               
               {activeArticle.features && (
                  <div className="space-y-4">
                     <h3 className="text-xl font-bold tracking-tight text-slate-900">Key Capabilities</h3>
                     <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeArticle.features.map((feature, i) => (
                           <li key={i} className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                              <CheckCircle className="w-5 h-5 text-slate-400 shrink-0" />
                              <span className="text-sm font-medium text-slate-700 leading-snug">{feature}</span>
                           </li>
                        ))}
                     </ul>
                  </div>
               )}

               {activeArticle.steps && (
                  <div className="space-y-6">
                     <h3 className="text-xl font-bold tracking-tight text-slate-900">Step-by-step Guide</h3>
                     <div className="space-y-6">
                        {activeArticle.steps.map((step, i) => (
                           <div key={i} className="flex gap-4 sm:gap-6">
                              <div className="flex flex-col items-center">
                                 <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                                    {i + 1}
                                 </div>
                                 {i !== activeArticle.steps.length - 1 && (
                                    <div className="w-px h-full bg-slate-200 mt-2" />
                                 )}
                              </div>
                              <div className="pb-6">
                                 <h4 className="text-base font-bold text-slate-900 mb-1">{step.title}</h4>
                                 <p className="text-sm text-slate-500 leading-relaxed font-medium">{step.desc}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {activeArticle.sections && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {activeArticle.sections.map((sec, i) => (
                          <div key={i} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                              <h4 className="text-base font-bold text-slate-900 mb-2">{sec.title}</h4>
                              <p className="text-sm text-slate-500 font-medium leading-relaxed">{sec.desc}</p>
                          </div>
                      ))}
                  </div>
               )}

               {activeArticle.tips && (
                  <div className="p-6 bg-slate-100 border border-slate-200 rounded-2xl">
                     <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" /> Pro Tips
                     </h3>
                     <div className="space-y-3">
                        {activeArticle.tips.map((tip, i) => (
                           <div key={i} className="flex gap-3 items-start">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                              <p className="text-slate-700 font-medium text-sm leading-relaxed">{tip}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

            </div>

            {/* Navigation Pager */}
            <div className="mt-20 pt-8 border-t border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
               <Button 
                  variant="outline" 
                  className="w-full sm:w-auto h-12 px-6 rounded-lg font-medium shadow-sm"
                  onClick={() => {
                      const allArts = docSections.flatMap(s => s.articles.map(a => ({ sId: s.id, aId: a.id })))
                      const current = allArts.findIndex(a => a.sId === activeSectionId && a.aId === activeArticleId)
                      if (current > 0) navigateToArticle(allArts[current-1].sId, allArts[current-1].aId)
                  }}
               >
                  <ChevronLeft className="w-4 h-4 mr-2" /> Previous Document
               </Button>
               <Button 
                  className="w-full sm:w-auto h-12 px-6 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 shadow-sm"
                  onClick={() => {
                      const allArts = docSections.flatMap(s => s.articles.map(a => ({ sId: s.id, aId: a.id })))
                      const current = allArts.findIndex(a => a.sId === activeSectionId && a.aId === activeArticleId)
                      if (current < allArts.length - 1) navigateToArticle(allArts[current+1].sId, allArts[current+1].aId)
                  }}
               >
                  Continue Reading <ChevronRight className="w-4 h-4 ml-2" />
               </Button>
            </div>

          </div>
        </main>
      </div>

      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
         <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
                <Button className="w-14 h-14 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center p-0">
                    <ScrollText className="w-6 h-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 border-r border-slate-200 shadow-2xl bg-slate-50">
                <SheetTitle className="sr-only">Documentation Contents</SheetTitle>
                <SheetDescription className="sr-only">Browse all documentation articles and categories.</SheetDescription>
                <Sidebar />
            </SheetContent>
         </Sheet>
      </div>
    </div>
  )
}
