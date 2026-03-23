import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, 
  BarChart3, 
  Users, 
  ShieldAlert, 
  Settings2, 
  PackageSearch,
  LogOut,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Logo from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'

const navLinks = [
  { name: 'System Overview', icon: BarChart3, path: '/admin/dashboard' },
  { name: 'Merchants & Users', icon: Users, path: '/admin/customers' },
  { name: 'Subscription Plans', icon: PackageSearch, path: '/admin/plans' },
  { name: 'Revenue Tracking', icon: Building2, path: '/admin/revenue' },
  { name: 'Platform Settings', icon: Settings2, path: '/admin/settings' },
]

export default function AdminSidebar({ isOpen, setIsOpen }) {
  const location = useLocation()

  const handleLogout = () => {
    localStorage.removeItem('servora_admin_token')
    localStorage.removeItem('servora_admin_user')
    window.location.href = '/admin/login'
  }

  const SidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300 w-[260px] border-r border-slate-900 shadow-2xl relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[50px] rounded-full pointer-events-none" />

      {/* Header section with brand */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-900 z-10">
        <div className="flex items-center gap-3">
           <Logo showText={true} iconSize={28} className="text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
           <div className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-[9px] font-black uppercase tracking-widest text-blue-400">Owner</div>
        </div>
        {/* Mobile close button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-slate-400 hover:text-white"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation section */}
      <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2 z-10 no-scrollbar">
        <div className="mb-4 px-2">
           <p className="text-[10px] uppercase font-black tracking-widest text-slate-600 mb-2">Platform Control</p>
        </div>
        {navLinks.map((link) => {
          const isActive = location.pathname.startsWith(link.path)
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                "group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 relative",
                isActive 
                  ? "bg-blue-600/10 text-blue-500 shadow-inner" 
                  : "hover:bg-slate-900 hover:text-white"
              )}
            >
              {isActive && (
                 <motion.div layoutId="activeNavAdmin" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-blue-500 rounded-r-md shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              )}
              <link.icon className={cn(
                 "w-5 h-5 transition-transform duration-300",
                 isActive ? "text-blue-500" : "text-slate-500 group-hover:scale-110 group-hover:text-blue-400"
              )} />
              <span className={cn(
                 "text-sm font-bold tracking-tight",
                 isActive ? "text-blue-500" : "text-slate-400 group-hover:text-slate-200"
              )}>{link.name}</span>
            </Link>
          )
        })}
      </div>

      {/* Security Footer block */}
      <div className="p-4 border-t border-slate-900 z-10">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-800 mb-4">
           <ShieldAlert className="w-8 h-8 text-emerald-500 p-1.5 bg-emerald-500/10 rounded-lg shrink-0" />
           <div>
              <p className="text-xs font-black text-white leading-none mb-1">System Secure</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No Alerts Detected</p>
           </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 pl-2 h-12 rounded-xl transition-all"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3 opacity-70" />
          <span className="text-sm font-bold tracking-tight">Terminate Session</span>
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:block h-screen fixed inset-y-0 left-0 z-40 bg-slate-950">
        {SidebarContent}
      </aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden shadow-2xl"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="hidden lg:block w-[260px] flex-shrink-0" />
    </>
  )
}
