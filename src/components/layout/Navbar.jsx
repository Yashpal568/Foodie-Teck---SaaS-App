import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, Bell, User, Menu, ChefHat, 
  Settings, HelpCircle, BookOpen, FileText, 
  Youtube, Plus, ArrowRight, Zap, Target,
  Command, Sparkles, LogOut, LayoutDashboard,
  QrCode, ShoppingCart, BarChart3, Users,
  UtensilsCrossed, Monitor
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import CurrencySelector from '@/components/ui/currency-selector'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import Logo from '@/components/ui/Logo'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { menuItems, supportItems } from './Sidebar'

export default function Navbar({ activeItem, setActiveItem, currency, onCurrencyChange }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)

  // Combined searchable items
  const searchableItems = [
    ...menuItems.map(item => ({ ...item, category: 'Navigation', type: 'page' })),
    ...supportItems.map(item => ({ ...item, category: 'Support', type: 'page' })),
    { id: 'docs', label: 'Documentation', icon: BookOpen, category: 'Resources', route: '/dashboard', type: 'page' },
    { id: 'releases', label: 'Release Notes', icon: FileText, category: 'Resources', route: '/dashboard', type: 'page' },
    { id: 'tutorials', label: 'Video Tutorials', icon: Youtube, category: 'Resources', route: '/dashboard', type: 'page' },
    { id: 'add-item', label: 'Add Menu Item', icon: Plus, category: 'Actions', type: 'action', action: () => setActiveItem('menu') },
    { id: 'create-order', label: 'Create Quick Order', icon: Zap, category: 'Actions', type: 'action', action: () => setActiveItem('orders') },
    { id: 'gen-qr', label: 'Generate QR Codes', icon: QrCode, category: 'Actions', type: 'action', action: () => setActiveItem('qr-codes') },
  ]

  const filteredResults = searchQuery.trim() === '' 
    ? searchableItems.filter(i => i.category === 'Actions').slice(0, 3)
    : searchableItems.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleItemClick = (item) => {
    if (item.type === 'action') {
      item.action()
    } else {
      setActiveItem(item.id)
      navigate(item.route)
    }
    setShowResults(false)
    setSearchQuery('')
  }

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4 sticky top-0 z-[40]">
      <div className="flex items-center justify-between gap-8">
        
        {/* Search Bar Container */}
        <div className="flex-1 max-w-2xl hidden lg:block" ref={searchRef}>
          <div className="relative group">
            <div className="absolute inset-x-0 -inset-y-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl opacity-0 group-focus-within:opacity-10 transition-opacity duration-300 pointer-events-none" />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-600 transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search features, docs, or actions... (Ctrl+K)"
              className="pl-11 h-12 bg-slate-50 border-slate-200 rounded-2xl focus-visible:ring-0 focus:border-blue-200/50 transition-all font-medium text-slate-700 placeholder:text-slate-400"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1">
               <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 font-black px-1.5 h-6 rounded-lg text-[10px]">
                  <Command className="w-2.5 h-2.5 mr-0.5" /> K
               </Badge>
            </div>

            {/* Premium Search Results Overlay */}
            {showResults && (
              <div className="absolute top-14 left-0 right-0 bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                <div className="p-4 max-h-[480px] overflow-y-auto scrollbar-hide">
                  {filteredResults.length > 0 ? (
                    <div className="space-y-4">
                      {['Actions', 'Navigation', 'Resources', 'Support'].map(category => {
                        const items = filteredResults.filter(i => i.category === category)
                        if (items.length === 0) return null
                        return (
                          <div key={category}>
                             <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{category}</h4>
                             <div className="grid grid-cols-1 gap-1">
                               {items.map(item => (
                                 <button
                                   key={item.id}
                                   onClick={() => handleItemClick(item)}
                                   className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-slate-50 group transition-all"
                                 >
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                                      item.type === 'action' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-500'
                                   }`}>
                                     <item.icon className="w-5 h-5" />
                                   </div>
                                   <div className="text-left flex-1 min-w-0">
                                     <p className="text-sm font-black text-slate-800 tracking-tight">{item.label}</p>
                                     <p className="text-xs font-bold text-slate-400">Quick access to {item.label.toLowerCase()}</p>
                                   </div>
                                   <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                 </button>
                               ))}
                             </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                       <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                          <Search className="w-8 h-8 text-slate-200" />
                       </div>
                       <h3 className="font-black text-slate-900">No results found</h3>
                       <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">We couldn't find anything matching your search. Try different keywords.</p>
                    </div>
                  )}
                </div>
                <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <div className="flex items-center gap-4">
                     <span className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3" /> Select</span>
                     <span className="flex items-center gap-1.5"><Monitor className="w-3 h-3" /> Navigation</span>
                   </div>
                   <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-blue-500" /> Search powered by Servora AI</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-6 ml-auto flex-shrink-0">
          {/* Dashboard Mode Badge */}
          <div className="hidden xl:flex items-center gap-2 px-4 py-1.5 bg-indigo-50/50 border border-indigo-100/50 rounded-xl">
             <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
             <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Live Dashboard active</span>
          </div>

          <Separator orientation="vertical" className="h-6 opacity-50 hidden lg:block" />

          {/* Currency Selector */}
          <div className="hidden lg:block">
            <CurrencySelector 
              value={currency} 
              onChange={onCurrencyChange}
              className="h-10 border-slate-200/60 bg-slate-50/30 rounded-xl font-bold text-sm shadow-sm"
            />
          </div>

          {/* Notifications Center */}
          <NotificationDropdown />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 p-1.5 pr-4 h-12 rounded-2xl hover:bg-slate-50 hover:shadow-sm border border-transparent hover:border-slate-100 transition-all">
                <div className="relative">
                  <Avatar className="w-9 h-9 border-2 border-white shadow-xl shadow-blue-500/10">
                    <AvatarImage src="/api/placeholder/32/32" alt="User" className="aspect-square h-full w-full" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs">
                      JD
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-black text-slate-900 tracking-tight leading-none">John Doe</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Account</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-md border border-slate-100 shadow-2xl rounded-[2rem] p-2 animate-in slide-in-from-top-2 duration-200 mt-2">
              <DropdownMenuLabel className="px-4 py-3" inset={undefined}>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated as</p>
                 <p className="text-sm font-bold text-slate-900">restaurant_admin@foodie.tech</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100/50 mx-2" />
              <div className="p-1 space-y-1">
                <DropdownMenuItem onClick={() => setActiveItem('settings')} className="cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors focus:bg-slate-50" inset={undefined}>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black text-slate-700">Account Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveItem('settings')} className="cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors focus:bg-slate-50" inset={undefined}>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black text-slate-700">Settings</span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-slate-100/50 mx-2" />
              <div className="p-1">
                <DropdownMenuItem className="cursor-pointer text-rose-600 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-50 hover:text-rose-700 transition-colors focus:bg-rose-50 focus:text-rose-700" inset={undefined}>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black">Secure Sign Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
