import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    
    // Check for plan in localStorage
    const plan = localStorage.getItem('servora_plan')
    setHasPlan(!!plan)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleDashboardRedirect = () => {
    navigate('/dashboard')
    setMobileMenuOpen(false)
  }

  return (
    <nav
      className={cn(
        'fixed top-0 inset-x-0 z-[100] transition-all duration-500',
        isScrolled 
          ? 'h-20 bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 shadow-xl shadow-slate-900/5' 
          : 'h-24 bg-transparent'
      )}
    >
      <div className="w-full h-full px-6 lg:px-12 flex items-center justify-between">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-2 group">
          <Logo showText={true} iconSize={32} />
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
              className="bg-slate-900 hover:bg-black text-white h-12 px-8 rounded-2xl font-bold text-sm shadow-xl shadow-slate-950/20 active:scale-95 transition-all flex items-center gap-2 group"
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
                  "font-bold text-sm h-12 px-6 rounded-2xl",
                  isScrolled ? "text-slate-600" : "text-slate-900"
                )}
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
              <Button 
                className="bg-slate-900 hover:bg-black text-white h-12 px-8 rounded-2xl font-bold text-sm shadow-xl shadow-slate-950/20 active:scale-95 transition-all flex items-center gap-2 group"
                onClick={() => navigate('/register')}
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className={cn(
            "lg:hidden p-2 rounded-xl shadow-inner active:scale-90 transition-transform",
            isScrolled ? "bg-slate-100 text-slate-900" : "bg-white/20 text-slate-900"
          )}
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-white z-[200] transition-transform duration-500 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="h-24 px-6 flex items-center justify-between border-b border-slate-100">
          <Logo showText={true} iconSize={32} />
          <button 
            className="p-2 rounded-xl bg-slate-100 text-slate-900 shadow-inner"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="block text-2xl font-black text-slate-900 tracking-tighter"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          
          <div className="pt-8 space-y-4">
            {hasPlan ? (
              <Button 
                className="w-full h-16 rounded-2xl font-bold bg-slate-900 text-white text-lg shadow-2xl shadow-slate-950/20 flex items-center justify-center gap-2"
                onClick={handleDashboardRedirect}
              >
                <LayoutDashboard className="w-6 h-6" />
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="w-full h-16 rounded-2xl font-bold border-slate-200 text-slate-900 text-lg"
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                >
                  Merchant Sign In
                </Button>
                <Button 
                  className="w-full h-16 rounded-2xl font-bold bg-slate-900 text-white text-lg shadow-2xl shadow-slate-950/20"
                  onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                >
                  Initialize System
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
