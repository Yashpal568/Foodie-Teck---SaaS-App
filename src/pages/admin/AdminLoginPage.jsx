import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Logo from '@/components/ui/Logo'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Automatically let admins through if they already have an active session
    const adminToken = localStorage.getItem('servora_admin_token')
    if (adminToken) {
       navigate('/admin/dashboard', { replace: true })
    }
  }, [navigate])

  const handleLogin = (e) => {
    e.preventDefault()
    
    // Sanitize payload to prevent trailing white-space failures
    const secureEmail = email.trim().toLowerCase()
    
    // Simulate secure platform owner verification
    if (secureEmail === 'admin@servora.com' && password === 'admin123') {
      localStorage.setItem('servora_admin_token', 'SECURE_DUMMY_TOKEN_2026')
      localStorage.setItem('servora_admin_user', JSON.stringify({ name: 'System Owner', role: 'SUPER_ADMIN' }))
      navigate('/admin/dashboard')
    } else {
      setError('Invalid platform credentials. Access denied.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/20 blur-[150px] rounded-full point-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-10">
           <Logo showText={false} iconSize={48} className="text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-black/50 backdrop-blur-xl space-y-8">
           <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                 <Lock className="w-3 h-3" /> Restricted Zone
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter">System Overseer</h1>
              <p className="text-slate-400 font-medium text-sm">Acknowledge identity to access platform controls.</p>
           </div>

           <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                   <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                   <p className="text-sm font-bold text-red-400 leading-tight">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                 <div className="space-y-2 text-left">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Admin Designation (Email)</Label>
                    <Input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white font-bold focus:border-blue-500 focus:ring-blue-500/20 shadow-inner px-5" 
                      placeholder="root@servora.tech"
                      required
                    />
                 </div>
                 
                 <div className="space-y-2 text-left">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Cryptographic Key (Password)</Label>
                    <Input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)} 
                      className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white font-bold focus:border-blue-500 focus:ring-blue-500/20 shadow-inner px-5 font-mono text-lg tracking-widest" 
                      placeholder="••••••••••"
                      required
                    />
                 </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 rounded-xl bg-blue-600 hover:bg-white hover:text-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3 group"
              >
                 Unlock Controls
                 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
           </form>

           <div className="text-center pt-6 border-t border-slate-800 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                 Secure Encrypted Channel
              </p>
           </div>
        </div>
      </motion.div>
    </div>
  )
}
