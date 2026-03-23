import { Link } from 'react-router-dom'
import { 
  Twitter, 
  Linkedin, 
  Github, 
  ArrowUpRight, 
  Mail, 
  Globe, 
  ShieldCheck, 
  Heart 
} from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'

const footerLinks = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "/#features" },
      { name: "Pricing", href: "/pricing" },
      { name: "QR Digital Menu", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Documentation", href: "/docs" },
      { name: "Video Tutorials", href: "/tutorials" },
      { name: "Support Center", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="relative bg-slate-950 text-white overflow-hidden pt-24 pb-12">
      {/* Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[120px] rounded-full" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[120px] rounded-full" />

      <div className="w-full px-6 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8 border-b border-white/5 pb-20">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-8">
            <Link to="/" className="flex items-center gap-2">
              <Logo showText={true} iconSize={32} />
            </Link>
            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs">
              Next-generation restaurant management platform. Empowering culinary businesses with precision QR ordering and real-time analytics.
            </p>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white shadow-inner active:scale-90 transition-transform">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white shadow-inner active:scale-90 transition-transform">
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white shadow-inner active:scale-90 transition-transform">
                <Github className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Links Sections */}
          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                {section.title}
              </h4>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      to={link.href}
                      className="text-slate-400 font-medium text-xs hover:text-white hover:translate-x-1 flex items-center gap-1 group transition-all"
                    >
                      {link.name}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="pt-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 shadow-inner">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Service Live</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              &copy; 2026 Servora Platform. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
               <ShieldCheck className="w-4 h-4 text-slate-500" />
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enterprise ISO Secured</span>
            </div>
            <div className="flex items-center gap-2 group cursor-default">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Made with</span>
               <Heart className="w-4 h-4 text-rose-500 fill-rose-500 group-hover:scale-125 transition-transform" />
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">for the culinary world</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
