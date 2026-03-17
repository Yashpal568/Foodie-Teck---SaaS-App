import React, { useState } from 'react'
import { 
  FileText, Sparkles, ChevronRight, ArrowLeft, 
  Home, Menu, Zap, Shield, Rocket, Package,
  Star, Clock, Terminal, CheckCircle2, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import Logo from '@/components/ui/Logo'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import MobileNavbar from '../layout/MobileNavbar'

const releases = [
  {
    version: 'v2.1.0',
    date: 'March 15, 2026',
    tag: 'Production',
    title: 'The "Precision" Update',
    highlights: [
      { type: 'feature', icon: Sparkles, title: 'Real-time Analytics', desc: 'New live dashboard metrics for monitoring peak restaurant hours.' },
      { type: 'fix', icon: Shield, title: 'Security Patch', desc: 'Enhanced CSRF protection and session validation logic.' },
      { type: 'improvement', icon: Zap, title: 'QR Engine v2', desc: 'Faster QR generation with support for high-resolution vector exports.' }
    ]
  },
  {
    version: 'v2.0.5',
    date: 'February 28, 2026',
    tag: 'Stable',
    title: 'Mobile Optimization',
    highlights: [
      { type: 'feature', icon: Rocket, title: 'Progressive Web App', desc: 'Install Servora on your homescreen for a native mobile experience.' },
      { type: 'improvement', icon: Package, title: 'Menu Previews', desc: 'Interactive dish previews for customers before they order.' }
    ]
  }
]

export default function ReleaseNotes({ activeItem, setActiveItem, navigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="h-full flex flex-col lg:flex-row bg-white overflow-hidden relative">
      {/* Mobile Navbar */}
      <div className="lg:hidden sticky top-0 z-[60] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100 rounded-xl" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <Logo subtitle="Releases" iconSize={26} />
        </div>
        <div className="flex items-center gap-2">
          <NotificationDropdown />
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-[10px] shadow-lg shadow-blue-200">
            JD
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0 border-r border-slate-100 bg-slate-50/10 overflow-y-auto">
        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <Logo subtitle="Release Notes" iconSize={32} />
        </div>
        <nav className="p-4 space-y-1">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2">History</div>
          {releases.map((rel, idx) => (
            <button key={idx} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-white hover:text-blue-600 transition-all text-left shadow-sm hover:shadow-md mb-2">
              <span className="truncate">{rel.version}</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest">{rel.date.split(',')[0]}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 flex-shrink-0 bg-white border-b border-slate-200 px-6 items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
             <Button 
              variant="outline" 
              onClick={() => setActiveItem('dashboard')}
              className="h-10 px-5 bg-white border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-50 hover:text-blue-600 transition-all duration-300 group flex items-center gap-3"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Dashboard</span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
               <Star className="w-3.5 h-3.5 text-emerald-600" />
               <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">Latest: v2.1.0</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-lg">
              JD
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 pb-24 lg:pb-0">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="mb-16 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl mb-6">
                <Rocket className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Platform Updates</span>
              </div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">New Features & <br className="hidden md:block"/>Improvements</h1>
              <p className="text-xl text-slate-500 font-bold max-w-2xl leading-relaxed">
                Stay updated with the latest performance enhancements, security patches, 
                and new tools designed to grow your restaurant business.
              </p>
            </div>

            <div className={`space-y-12 relative ${releases.length > 1 ? 'before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 before:hidden md:before:block' : ''}`}>
              {releases.map((rel, idx) => (
                <div key={idx} className="relative md:pl-16">
                  {/* Timeline Node */}
                  <div className="hidden md:flex absolute left-4 top-2 w-4 h-4 bg-white border-4 border-blue-600 rounded-full z-10" />
                  
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border-none">
                        {rel.version}
                      </Badge>
                      <span className="text-sm font-bold text-slate-400">{rel.date}</span>
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{rel.title}</h2>

                    <div className="grid grid-cols-1 gap-4">
                      {rel.highlights.map((h, hidx) => (
                        <Card key={hidx} className="border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                                h.type === 'feature' ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' :
                                h.type === 'fix' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' :
                                'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                              }`}>
                                <h.icon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0 border-none ${
                                    h.type === 'feature' ? 'text-amber-600' :
                                    h.type === 'fix' ? 'text-emerald-600' :
                                    'text-blue-600'
                                  }`}>
                                    {h.type}
                                  </Badge>
                                  <h3 className="text-lg font-black text-slate-900 tracking-tight">{h.title}</h3>
                                </div>
                                <p className="text-slate-500 font-bold text-sm leading-relaxed">{h.desc}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-80 border-none shadow-2xl">
          <SheetTitle className="sr-only">Versions</SheetTitle>
          <SheetDescription className="sr-only">Select version to view</SheetDescription>
          <div className="h-full bg-white flex flex-col">
            <div className="p-6 border-b border-slate-100">
               <Logo subtitle="Release Notes" iconSize={32} />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
               {releases.map((rel, idx) => (
                <button key={idx} className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-200 transition-all text-left">
                  <span>{rel.version}</span>
                  <span className="text-[10px] text-slate-400 font-black">{rel.date}</span>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <MobileNavbar activeItem={activeItem} setActiveItem={setActiveItem} />
    </div>
  )
}
