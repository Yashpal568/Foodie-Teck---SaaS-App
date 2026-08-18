import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  User, 
  Menu, 
  ChefHat, 
  Settings, 
  LifeBuoy, 
  BookOpen, 
  FileText, 
  Youtube, 
  Plus, 
  ArrowRight, 
  Zap, 
  Command, 
  LogOut, 
  LayoutDashboard,
  QrCode, 
  ShoppingCart, 
  BarChart3, 
  Users,
  PanelLeft,
  Store
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
import Sidebar, { menuItems, supportItems } from './Sidebar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { supabase } from '@/lib/api'
import { getCachedSession } from '@/lib/supabase'
import { getPlanDetails } from '@/utils/planLimits'

export default function Navbar({ 
  activeItem, 
  setActiveItem, 
  currency, 
  onCurrencyChange, 
  restaurantId, 
  plan, 
  onUpgradeClick, 
  isCollapsed = false, 
  setIsCollapsed = () => {} 
}) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const searchRef = useRef(null)
  
  const [userProfile, setUserProfile] = useState({
    name: 'Merchant Admin',
    email: 'owner@restaurant.com',
    avatar: ''
  })

  // Sync profile with Supabase Session & Restaurant Identity
  useEffect(() => {
    const loadProfile = async () => {
      let email = ''
      let name = 'Restaurant Owner'

      // 1. Try Supabase Auth Session
      try {
        const { data: { session } } = await getCachedSession()
        const user = session?.user
        if (user?.email) {
          email = user.email
          name = user.user_metadata?.business_name || user.email.split('@')[0]
        }
      } catch (e) {}

      // 2. Query Restaurant Profile by UUID or Email
      if (restaurantId && restaurantId !== 'guest' && restaurantId !== 'default') {
        try {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId)
          let q = supabase.from('restaurants').select('business_name, email')
          if (isUUID) {
            q = q.eq('id', restaurantId)
          } else if (restaurantId.includes('@')) {
            q = q.eq('email', restaurantId.toLowerCase())
          } else {
            q = q.eq('id', restaurantId)
          }
          const { data: rest } = await q.maybeSingle()
          if (rest) {
            if (rest.business_name) name = rest.business_name
            if (rest.email) email = rest.email
          }
        } catch (e) {}
      }

      setUserProfile({
        name: name || 'Restaurant Owner',
        email: email || 'owner@servora.app',
        avatar: ''
      })
    }

    loadProfile()
  }, [restaurantId])

  // Combined searchable items
  const searchableItems = [
    ...menuItems.map(item => ({ ...item, category: 'Navigation', type: 'page' })),
    ...supportItems.map(item => ({ ...item, category: 'Support', type: 'page' })),
    { id: 'docs', label: 'Documentation', icon: BookOpen, category: 'Resources', route: '/dashboard', type: 'page' },
    { id: 'releases', label: 'Release Notes', icon: FileText, category: 'Resources', route: '/dashboard', type: 'page' },
    { id: 'tutorials', label: 'Video Tutorials', icon: Youtube, category: 'Resources', route: '/dashboard', type: 'page' },
  ]

  // Filter items based on search query
  const filteredItems = searchQuery.trim() === '' ? [] : searchableItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchResultClick = (item) => {
    if (item.action) {
      item.action()
    } else if (item.id) {
      setActiveItem(item.id)
    }
    setSearchQuery('')
    setShowResults(false)
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      sessionStorage.clear()
      navigate('/login')
    } catch (error) {
      console.error('Sign out error:', error)
      navigate('/login')
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs select-none">
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 h-16">
        
        {/* Left Side: Collapse Toggle & Search Bar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-lg">
          {/* Mobile Menu Trigger */}
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 text-slate-600 hover:bg-slate-100 rounded-xl">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-white border-r-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <Sidebar 
                  activeItem={activeItem}
                  setActiveItem={(item) => {
                    setActiveItem(item)
                    setIsMobileMenuOpen(false)
                  }}
                  isCollapsed={false}
                  setIsCollapsed={setIsCollapsed || (() => {})}
                  isMobile={true}
                  onClose={() => setIsMobileMenuOpen(false)}
                  restaurantId={restaurantId}
                />
              </SheetContent>
            </Sheet>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <PanelLeft className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
          </Button>

          {/* Search Box */}
          <div ref={searchRef} className="relative w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search features or actions... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowResults(true)
                }}
                onFocus={() => setShowResults(true)}
                className="pl-9.5 pr-8 h-9.5 bg-slate-50/80 border-slate-200/90 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-2xs"
              />
              <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-white border border-slate-200 rounded">
                ⌘K
              </kbd>
            </div>

            {/* Live Search Results Overlay */}
            {showResults && filteredItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto">
                  {filteredItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearchResultClick(item)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-slate-50 transition-colors text-xs cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <item.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-800 group-hover:text-slate-900">{item.label}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold text-slate-400 uppercase">
                        {item.category}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Tools */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Plan Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/90 border border-slate-200/90 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-slate-800 uppercase tracking-wider whitespace-nowrap">
                <span className="hidden xl:inline">{getPlanDetails(plan?.name).name} Plan ({getPlanDetails(plan?.name).formattedPrice})</span>
                <span className="inline xl:hidden">{getPlanDetails(plan?.name).name}</span>
              </span>
            </div>

            {getPlanDetails(plan?.name).name !== 'Enterprise' && (
              <button
                onClick={onUpgradeClick}
                className="hidden xl:flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Upgrade</span>
              </button>
            )}
          </div>

          <Separator orientation="vertical" className="h-5 opacity-50 hidden lg:block" />

          {/* Currency Selector */}
          <div className="hidden lg:block">
            <CurrencySelector 
              value={currency} 
              onChange={onCurrencyChange}
              className="h-9 border-slate-200/90 bg-slate-50/50 rounded-xl font-bold text-xs shadow-2xs"
            />
          </div>

          {/* Notifications Center */}
          <NotificationDropdown restaurantId={restaurantId} />

          {/* ─── 👤 CLEAN SHADCN USER PROFILE DROPDOWN ─────────────── */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2.5 p-1 sm:px-2.5 h-10 rounded-xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200/60 transition-all cursor-pointer"
              >
                <div className="relative">
                  <Avatar className="w-8 h-8 rounded-lg border border-slate-200 shadow-2xs">
                    <AvatarFallback className="bg-slate-900 text-white font-black text-xs rounded-lg">
                      {userProfile.name?.charAt(0)?.toUpperCase() || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-slate-900 tracking-tight leading-none truncate max-w-[120px]">
                    {userProfile.name}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                    Merchant
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72 bg-white border border-slate-200/90 shadow-xl rounded-2xl p-2 font-sans mt-1.5 animate-in fade-in-0 zoom-in-95 duration-150">
              {/* User Identity Header Card */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {userProfile.name?.charAt(0)?.toUpperCase() || 'M'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 truncate leading-none">
                        {userProfile.name}
                      </p>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[8px] font-bold uppercase px-1.5 py-0">
                        Active
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      {userProfile.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Links */}
              <div className="space-y-0.5 py-1">
                <DropdownMenuItem 
                  onClick={() => setActiveItem('settings')} 
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Account & Restaurant Profile</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => setActiveItem('settings')} 
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>Store Settings</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => setActiveItem('help')} 
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Help & Support</span>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="my-1 bg-slate-100" />

              {/* Sign Out Button */}
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="cursor-pointer flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus:bg-rose-50 focus:text-rose-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
