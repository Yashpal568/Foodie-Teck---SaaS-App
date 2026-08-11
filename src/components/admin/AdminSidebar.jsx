import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/api'
import { 
  Building2, 
  BarChart3, 
  Users, 
  ShieldAlert, 
  HelpCircle,
  Settings2, 
  PackageSearch,
  LogOut,
  X,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Logo from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'

const navLinks = [
  { name: 'System Overview', icon: BarChart3, path: '/admin/dashboard' },
  { name: 'Merchants & Users', icon: Users, path: '/admin/customers' },
  { name: 'Subscription Plans', icon: PackageSearch, path: '/admin/plans' },
  { name: 'Revenue Tracking', icon: BarChart3, path: '/admin/revenue' },
  { name: 'System Audit', icon: ShieldAlert, path: '/admin/audit' },
  { name: 'Support Tickets', icon: HelpCircle, path: '/admin/support' },
  { name: 'Platform Settings', icon: Settings2, path: '/admin/settings' },
]

export default function AdminSidebar({ isOpen, setIsOpen }) {
  const location = useLocation()
  const [openTicketsCount, setOpenTicketsCount] = useState(0)

  useEffect(() => {
    const fetchOpenTickets = async () => {
      try {
        const { count } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'OPEN')
        setOpenTicketsCount(count || 0)
      } catch (err) {}
    }
    
    fetchOpenTickets()
    
    const channel = supabase.channel('admin_sidebar_tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchOpenTickets()
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const SidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300 w-65 border-r border-slate-800/80 shadow-2xl relative overflow-hidden">
      {/* Decorative Blur Glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/15 blur-[60px] rounded-full pointer-events-none" />

      {/* Header section with brand */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-3">
           <Logo showText={true} iconSize={28} className="text-white drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]" />
           <div className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-[9px] font-black uppercase tracking-widest text-indigo-400">Owner</div>
        </div>
        {/* Mobile close button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation section */}
      <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2 z-10 no-scrollbar">
        <div className="mb-4 px-2">
           <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 mb-2">Platform Control</p>
        </div>
        {navLinks.map((link) => {
          const isActive = location.pathname.startsWith(link.path)
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                "group flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 relative border cursor-pointer",
                isActive 
                  ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 shadow-lg shadow-indigo-500/10 font-black" 
                  : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/80 hover:border-slate-700/60 hover:text-white hover:translate-x-1 hover:shadow-md"
              )}
            >
              {isActive && (
                 <motion.div 
                   layoutId="activeNavAdmin" 
                   className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3/5 bg-indigo-500 rounded-r-md shadow-[0_0_12px_rgba(99,102,241,0.8)]" 
                 />
              )}
              <link.icon className={cn(
                 "w-5 h-5 transition-all duration-200 shrink-0",
                 isActive 
                   ? "text-indigo-400" 
                   : "text-slate-500 group-hover:scale-110 group-hover:text-indigo-400"
              )} />
              <span className={cn(
                 "text-xs font-bold tracking-tight flex-1 truncate",
                 isActive ? "text-indigo-300 font-black" : "text-slate-400 group-hover:text-white"
              )}>
                 {link.name}
              </span>
              {link.name === 'Support Tickets' && openTicketsCount > 0 && (
                 <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[9px] font-black absolute right-8">
                   {openTicketsCount > 9 ? '9+' : openTicketsCount}
                 </div>
              )}
              <ChevronRight className={cn(
                 "w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200",
                 isActive ? "opacity-100 text-indigo-400" : "text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5"
              )} />
            </Link>
          )
        })}
      </div>

      {/* Security Footer block */}
      <div className="p-4 border-t border-slate-800/80 z-10">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
           <ShieldAlert className="w-8 h-8 text-emerald-400 p-1.5 bg-emerald-500/10 rounded-xl shrink-0" />
           <div>
              <p className="text-xs font-black text-white leading-none mb-1">System Secure</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">No Alerts Detected</p>
           </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 shrink-0 z-40">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden h-full"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
