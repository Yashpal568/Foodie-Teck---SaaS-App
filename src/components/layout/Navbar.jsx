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
  Zap, 
  LogOut, 
  PanelLeft,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import CurrencySelector from '@/components/ui/currency-selector'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import Sidebar, { menuItems, supportItems } from './Sidebar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { supabase, ensureValidRestaurantUUID } from '@/lib/api'
import { getCachedSession } from '@/lib/supabase'
import { getPlanDetails } from '@/utils/planLimits'

/**
 * @param {{
 *   activeItem?: any,
 *   setActiveItem?: any,
 *   currency?: any,
 *   onCurrencyChange?: any,
 *   restaurantId?: any,
 *   plan?: any,
 *   onUpgradeClick?: any,
 *   isCollapsed?: boolean,
 *   setIsCollapsed?: (collapsed: boolean) => void
 * }} props
 */
export default function Navbar({ 
  activeItem, 
  setActiveItem, 
  currency, 
  onCurrencyChange, 
  restaurantId, 
  plan, 
  onUpgradeClick, 
  isCollapsed = false, 
  setIsCollapsed = (_collapsed) => {} 
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
      let name = 'Tiger Bistro'
      let avatar = ''

      // Check KNOWN_RESTAURANTS and Session first
      const storedSession = sessionStorage.getItem('servora_user_session')
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession)
          if (parsed.email) email = parsed.email
          if (parsed.avatar || parsed.logo_url) avatar = parsed.avatar || parsed.logo_url
        } catch (e) {}
      }

      const idLower = (restaurantId || '').toLowerCase()
      const emailLower = (email || '').toLowerCase()

      // 1. Query Restaurant Profile by UUID or Email from database
      if (restaurantId && restaurantId !== 'guest' && restaurantId !== 'default') {
        try {
          const uuid = await ensureValidRestaurantUUID(restaurantId)
          let rest = null
          
          if (uuid) {
            const { data } = await supabase.from('restaurants').select('business_name, email, logo_url, cover_url').eq('id', uuid).maybeSingle()
            rest = data
          } else if (restaurantId.includes('@')) {
            const { data } = await supabase.from('restaurants').select('business_name, email, logo_url, cover_url').eq('email', restaurantId.toLowerCase()).maybeSingle()
            rest = data
          }

          if (rest) {
            if (rest.business_name) name = rest.business_name
            if (rest.email) email = rest.email
            if (rest.logo_url) avatar = rest.logo_url
          }
        } catch (e) {}
      }

      // 2. Try Supabase Auth Session if still empty
      if (!email) {
        try {
          const { data: { session } } = await getCachedSession()
          const user = session?.user
          if (user?.email) {
            email = user.email
            name = user.user_metadata?.business_name || user.email.split('@')[0]
          }
        } catch (e) {}
      }

      // Default restaurant avatar for Tiger Bistro if not yet uploaded
      if (!avatar) {
        if (idLower === 'a3b0c97f-7acb-478b-8b5a-68763af06b5c' || emailLower === 'tigerbistro99@gmail.com' || idLower.includes('tiger') || name.toLowerCase().includes('tiger')) {
          name = 'Tiger Bistro'
          email = email || 'tigerbistro99@gmail.com'
          avatar = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=120&auto=format&fit=crop&q=80'
        }
      }

      setUserProfile({
        name: name || 'Tiger Bistro',
        email: email || 'tigerbistro99@gmail.com',
        avatar: avatar || ''
      })
    }

    loadProfile()

    const handleProfileUpdate = (e) => {
      if (e.detail) {
        setUserProfile(prev => ({
          ...prev,
          name: e.detail.business_name || prev.name,
          avatar: e.detail.logo_url || prev.avatar
        }))
      }
    }

    window.addEventListener('restaurantProfileUpdated', handleProfileUpdate)
    return () => window.removeEventListener('restaurantProfileUpdated', handleProfileUpdate)
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
    sessionStorage.clear()
    localStorage.removeItem('servora_restaurant_id')
    localStorage.removeItem('servora_user_email')
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs select-none transition-all">
      <div className="flex items-center h-14 px-3 sm:px-5 lg:px-6 gap-2 sm:gap-3">

        {/* ── Mobile only (< md): Hamburger sheet + Wordmark ── */}
        <div className="flex items-center gap-2 md:hidden shrink-0">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8.5 w-8.5 text-slate-600 hover:bg-slate-100 rounded-xl">
                <Menu className="w-4.5 h-4.5" />
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

        {/* App wordmark — mobile only */}
        <div className="flex md:hidden items-center gap-1.5 flex-1 min-w-0">
          <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
            <ChefHat className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-black text-slate-900 tracking-tight">Servora</span>
        </div>

        {/* ── Desktop: Sidebar Collapse Toggle (≥ md) ── */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center h-8.5 w-8.5 p-0 bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-900 rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <PanelLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
        </Button>

        {/* ── Desktop: Spotlight Search (≥ md) ── */}
        <div ref={searchRef} className="relative hidden md:flex flex-1 min-w-0 max-w-xs lg:max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search features, orders... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
              className="pl-8 pr-9 h-8.5 bg-slate-50/80 hover:bg-slate-50 border-slate-200/80 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 rounded-xl text-xs font-medium placeholder:text-slate-400 transition-all shadow-2xs w-full"
            />
            <kbd className="hidden lg:inline-flex absolute right-2 top-1/2 -translate-y-1/2 items-center px-1.5 py-0.2 text-[9px] font-mono font-bold text-slate-400 bg-white border border-slate-200/80 rounded shadow-2xs">
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
                      <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
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

        {/* ── RIGHT: Action & Profile Cluster ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">

          {/* Plan Pill Badge — lg+ only */}
          <div className="hidden lg:flex items-center gap-1.5">
            <div className="flex items-center gap-2 h-8.5 px-3 bg-slate-50/80 border border-slate-200/80 rounded-xl shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-100 animate-pulse" />
              <span className="text-[10.5px] font-bold text-slate-700 tracking-tight uppercase whitespace-nowrap">
                <span className="hidden xl:inline">{getPlanDetails(plan?.name).name} Plan</span>
                <span className="inline xl:hidden">{getPlanDetails(plan?.name).name}</span>
              </span>
            </div>

            {getPlanDetails(plan?.name).name === 'Starter' && (
              <button
                onClick={onUpgradeClick}
                className="hidden xl:flex items-center gap-1.5 h-8.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-[10.5px] uppercase tracking-wider px-3 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                <span>Upgrade to Pro</span>
              </button>
            )}

            {getPlanDetails(plan?.name).name === 'Professional' && (
              <button
                onClick={onUpgradeClick}
                className="hidden xl:flex items-center gap-1.5 h-8.5 bg-slate-900 hover:bg-black text-white font-bold text-[10.5px] uppercase tracking-wider px-3 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Upgrade to Enterprise</span>
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden lg:block mx-0.5" />

          {/* Currency Selector */}
          <div className="hidden lg:block">
            <CurrencySelector 
              value={currency} 
              onChange={onCurrencyChange}
              className="h-8.5 border-slate-200/80 bg-slate-50/80 rounded-xl font-bold text-xs shadow-2xs"
            />
          </div>

          {/* Real-time Notification Dropdown */}
          <NotificationDropdown restaurantId={restaurantId} />

          <div className="h-4 w-px bg-slate-200 hidden sm:block mx-0.5" />

          {/* ── User Profile Dropdown Pill ── */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 h-8.5 pl-1.5 pr-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
              >
                <div className="relative">
                  <Avatar className="w-6.5 h-6.5 rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                    {userProfile.avatar && (
                      <AvatarImage 
                        src={userProfile.avatar} 
                        alt={userProfile.name} 
                        className="object-cover w-full h-full" 
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-[10px] rounded-lg">
                      {userProfile.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'TB'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                </div>

                {/* Name & Role — desktop only */}
                <div className="text-left hidden lg:block">
                  <p className="text-[11.5px] font-bold text-slate-900 tracking-tight leading-none truncate max-w-28">
                    {userProfile.name}
                  </p>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 leading-none">
                    Merchant
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-68 bg-white border border-slate-200/90 shadow-xl rounded-2xl p-1.5 font-sans mt-1.5 animate-in fade-in-0 zoom-in-95 duration-150">
              {/* User Identity Header Card */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {userProfile.avatar ? (
                      <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-xs">{userProfile.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'TB'}</span>
                    )}
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
                    <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
                      {userProfile.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Links */}
              <div className="space-y-0.5 py-1">
                <DropdownMenuItem 
                  onClick={() => setActiveItem('settings')} 
                  className="cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Account & Restaurant Profile</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => setActiveItem('settings')} 
                  className="cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>Store Settings</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => setActiveItem('help')} 
                  className="cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Help & Support</span>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="my-1 bg-slate-100" />

              {/* Sign Out */}
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="cursor-pointer flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus:bg-rose-50 focus:text-rose-700 transition-colors"
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
