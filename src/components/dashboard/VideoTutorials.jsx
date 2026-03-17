import React, { useState } from 'react'
import { 
  Play, ArrowLeft, Menu, 
  PlayCircle, BookOpen, Star, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import Logo from '@/components/ui/Logo'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import MobileNavbar from '../layout/MobileNavbar'

export default function VideoTutorials({ activeItem, setActiveItem, navigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="h-full flex flex-col lg:flex-row bg-white overflow-hidden relative">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors" 
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Logo subtitle="Academy" iconSize={26} />
        </div>
        <div className="flex items-center gap-3">
          <NotificationDropdown />
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-[10px] shadow-lg shadow-blue-500/20">
            JD
          </div>
        </div>
      </div>

      {/* Desktop Sidebar (Playlist Placeholder) */}
      <aside className="hidden lg:block w-96 flex-shrink-0 border-r border-slate-100 bg-slate-50/10 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-white">
          <Logo subtitle="Video Tutorials" iconSize={32} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
               <PlayCircle className="w-10 h-10" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg border-2 border-white">
               <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <div>
            <h4 className="font-black text-slate-900 tracking-tight">Playlist Pending</h4>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Premium Content Loading</p>
          </div>
        </div>
      </aside>

      {/* Main Content (Coming Soon) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-20 flex-shrink-0 bg-white/50 backdrop-blur-sm border-b border-slate-100 px-8 items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-5">
             <Button 
              variant="outline" 
              onClick={() => setActiveItem('dashboard')}
              className="h-11 px-6 bg-white border-slate-200 text-slate-700 font-black rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-100 hover:text-blue-600 transition-all duration-300 group flex items-center gap-3"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Dashboard</span>
            </Button>
            <Separator orientation="vertical" className="h-8 opacity-50" />
            <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50/50 rounded-xl border border-blue-100/50">
               <Zap className="w-3 h-3 text-blue-600 animate-pulse" />
               <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Upcoming Academy</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-xs shadow-xl shadow-blue-500/20 ring-4 ring-white">
              JD
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/30 pb-24 lg:pb-0 pt-16 lg:pt-0">
          <div className="h-full max-w-5xl mx-auto px-6 flex items-center justify-center py-20">
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
               <div className="relative inline-block">
                 <div className="w-32 h-32 bg-blue-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl">
                   <Play className="w-12 h-12 text-blue-600 fill-blue-600 animate-pulse" />
                 </div>
                 <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/30 -rotate-12 border-4 border-white">
                   <Star className="w-5 h-5 text-white fill-white" />
                 </div>
               </div>

               <div className="space-y-4">
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight italic">
                    Academy Videos <br/> <span className="text-blue-600 not-italic">Coming Soon</span>
                  </h1>
                  <p className="text-xl text-slate-500 font-bold max-w-lg mx-auto leading-relaxed">
                    We are currently recording premium video tutorials to help you master every corner of the platform.
                  </p>
               </div>

               <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveItem('docs')}
                    className="h-14 px-10 rounded-2xl font-black text-slate-700 border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-100 hover:text-blue-600 transition-all flex items-center gap-3"
                  >
                    <BookOpen className="w-5 h-5" />
                    Read Documentation
                  </Button>
               </div>

               <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto opacity-50 grayscale">
                  <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section 01</p>
                    <h4 className="font-bold text-slate-900 text-sm">Onboarding</h4>
                  </div>
                  <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                      <Zap className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section 02</p>
                    <h4 className="font-bold text-slate-900 text-sm">Efficiency</h4>
                  </div>
                  <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto">
                      <Star className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section 03</p>
                    <h4 className="font-bold text-slate-900 text-sm">Analytics</h4>
                  </div>
               </div>
            </div>
          </div>
        </main>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-80 border-none shadow-2xl">
          <SheetTitle className="sr-only">Tutorials Academy</SheetTitle>
          <SheetDescription className="sr-only">New videos are being recorded</SheetDescription>
          <div className="h-full bg-white flex flex-col items-center justify-center p-12 text-center space-y-6">
             <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center">
                <Play className="w-10 h-10 text-blue-600 fill-blue-600 animate-pulse" />
             </div>
             <div>
               <h3 className="text-xl font-black text-slate-900">Academy Mobile</h3>
               <p className="text-sm font-bold text-slate-400 mt-2">Mobile lessons are coming soon to your pocket.</p>
             </div>
             <Button variant="outline" className="w-full rounded-2xl font-black h-12" onClick={() => setMobileMenuOpen(false)}>
               Got it
             </Button>
          </div>
        </SheetContent>
      </Sheet>

      <MobileNavbar activeItem={activeItem} setActiveItem={setActiveItem} />
    </div>
  )
}
