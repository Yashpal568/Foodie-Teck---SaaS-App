import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight, LayoutDashboard, ChevronRight, LogIn, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { supabase, getCachedSession } from '@/lib/supabase'

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'About Us', href: '/about' },
  { name: 'Documentation', href: '/docs' },
  { name: 'Contact Us', href: '/contact' },
]

export default function MarketingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hasPlan, setHasPlan] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // 🔒 Auto-close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    
    const checkAuth = async () => {
      const { data: { session } } = await getCachedSession()
      setHasPlan(!!session)
    }
    checkAuth()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleDashboardRedirect = () => {
    navigate('/dashboard')
    setMobileMenuOpen(false)
  }

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 inset-x-0 z-100 transition-all duration-300',
          isScrolled 
            ? 'h-16 sm:h-20 bg-white/90 backdrop-blur-2xl border-b border-slate-200/60 shadow-md shadow-slate-900/5' 
            : 'h-16 sm:h-22 bg-white/80 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-b border-slate-100/60 sm:border-transparent'
        )}
      >
        <div className="w-full h-full px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-2 group">
            <Logo showText={true} iconSize={28} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'text-sm font-bold tracking-tight transition-all relative py-2',
                  location.pathname === item.href 
                    ? 'text-blue-600' 
                    : (isScrolled ? 'text-slate-600 hover:text-blue-600' : 'text-slate-900 hover:text-blue-600')
                )}
              >
                {item.name}
                {location.pathname === item.href && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            {hasPlan ? (
              <Button 
                className="bg-slate-900 hover:bg-black text-white h-11 px-7 rounded-2xl font-bold text-sm shadow-xl shadow-slate-950/20 active:scale-95 transition-all flex items-center gap-2 group"
                onClick={handleDashboardRedirect}
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "font-bold text-sm h-11 px-5 rounded-2xl",
                    isScrolled ? "text-slate-600" : "text-slate-900"
                  )}
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
                <Button 
                  className="bg-slate-900 hover:bg-black text-white h-11 px-7 rounded-2xl font-bold text-sm shadow-xl shadow-slate-950/20 active:scale-95 transition-all flex items-center gap-2 group"
                  onClick={() => navigate('/register')}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </>
            )}
          </div>

          {/* Mobile Toggle Button */}
          <button 
            type="button"
            aria-label="Open Mobile Menu"
            className="lg:hidden p-2 rounded-xl bg-slate-100/90 text-slate-900 border border-slate-200/80 active:scale-90 transition-all shadow-xs"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* 📱 Fullscreen Solid Mobile Menu Overlay (Outside Nav Stacking Context) */}
      <div 
        className={cn(
          "fixed inset-0 w-full h-dvh bg-white z-99999 flex flex-col justify-between overflow-y-auto transition-all duration-300 lg:hidden",
          mobileMenuOpen ? "opacity-100 pointer-events-auto translate-x-0" : "opacity-0 pointer-events-none translate-x-full"
        )}
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Mobile Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 shrink-0 bg-white">
          <Logo showText={true} iconSize={32} />
          <button 
            type="button"
            aria-label="Close Mobile Menu"
            className="p-2.5 rounded-2xl bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Navigation Links */}
        <div className="flex-1 px-6 py-8 overflow-y-auto space-y-3 bg-white">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4 px-2">Navigation</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-2xl font-bold text-lg transition-all",
                  isActive 
                    ? "bg-blue-50 text-blue-600 font-black shadow-xs" 
                    : "text-slate-800 hover:bg-slate-50 active:bg-slate-100"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{item.name}</span>
                <ChevronRight className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-300")} />
              </Link>
            )
          })}
        </div>

        {/* Action Bottom Section */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/80 shrink-0 space-y-3">
          {hasPlan ? (
            <Button 
              className="w-full h-14 rounded-2xl font-black bg-slate-900 text-white text-base shadow-xl shadow-slate-950/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              onClick={handleDashboardRedirect}
            >
              <LayoutDashboard className="w-5 h-5" />
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="w-full h-13 rounded-2xl font-black border-slate-300 text-slate-900 bg-white text-base shadow-xs hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
              >
                <LogIn className="w-4 h-4 text-slate-600" />
                Merchant Sign In
              </Button>
              <Button 
                className="w-full h-13 rounded-2xl font-black bg-slate-900 text-white text-base shadow-xl shadow-slate-950/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Initialize System
              </Button>
            </>
          )}
          <p className="text-center text-[11px] font-semibold text-slate-400 pt-1">
            © 2026 Servora • Next-Gen Restaurant OS
          </p>
        </div>
      </div>
    </>
  )
}
