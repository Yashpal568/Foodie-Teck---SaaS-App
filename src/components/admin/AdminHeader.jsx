import { useState } from 'react'
import { Menu, Search, Bell, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

export default function AdminHeader({ onMenuClick }) {
  const [copied, setCopied] = useState(false)

  const copyKey = () => {
    navigator.clipboard.writeText('SYS-ADM-2026-KEY')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="h-20 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 sticky top-0 shadow-sm">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-slate-500 hover:bg-slate-100"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        {/* Global Search Interface */}
        <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2 w-96 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all shadow-inner">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Search Global Customers, Subscriptions..."
            className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 w-full placeholder:text-slate-400 placeholder:font-medium tracking-tight"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 hidden sm:flex">
          <Bell className="w-5 h-5 text-slate-500" />
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </Button>

        <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 h-10 px-4 rounded-full border-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors shadow-sm cursor-pointer shadow-blue-500/10">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-inner">SO</div>
              <span className="hidden sm:inline-block font-black text-xs text-blue-900 tracking-tighter uppercase mr-1">System Owner</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl border-slate-200 mt-2">
            <div className="px-3 py-3 border-b border-slate-100 mb-2">
              <p className="text-sm font-black text-slate-900 tracking-tight leading-none">Root Authorization</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest break-all">admin@servora.com</p>
            </div>
            <div 
              className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors mb-2"
              onClick={copyKey}
            >
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest leading-none">Access Key</span>
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </div>
            <DropdownMenuItem 
               className="h-10 rounded-xl font-bold text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer flex gap-3"
               onClick={() => {
                 localStorage.removeItem('servora_admin_token')
                 localStorage.removeItem('servora_admin_user')
                 window.location.href = '/admin/login'
               }}
            >
               Sign Out Securely
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
