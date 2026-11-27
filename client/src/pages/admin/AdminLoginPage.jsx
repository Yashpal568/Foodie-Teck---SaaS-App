import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Logo from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession, clearLegacyAdminStorage } from '@/lib/adminAuth'
import { resetAdminSession } from '@/lib/adminSupabase'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    clearLegacyAdminStorage()

    verifyAdminSession().then((res) => {
      if (active && res.authenticated) {
        navigate('/admin/dashboard', { replace: true })
      }
    })

    return () => {
      active = false
    }
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Administrator email and password are required.')
      return
    }

    setIsSubmitting(true)
    try {
      clearLegacyAdminStorage()
      resetAdminSession()

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (signInError || !data?.user) {
        setError('Invalid platform credentials. Access denied.')
        return
      }

      // Server-validated JWT + role verification (never trusts browser storage or user_metadata)
      const verification = await verifyAdminSession()
      if (!verification.authenticated) {
        await supabase.auth.signOut().catch(() => {})
        setError('Access denied. Account lacks administrator privileges.')
        return
      }

      navigate('/admin/dashboard', { replace: true })
    } catch {
      setError('Unable to verify administrator credentials. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-blue-900/20 blur-[150px] rounded-full pointer-events-none" />
      
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
              <p className="text-slate-400 font-medium text-sm">Sign in with your Supabase-verified administrator account.</p>
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
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white font-bold focus:border-blue-500 focus:ring-blue-500/20 shadow-inner px-5" 
                      placeholder="admin@yourdomain.com"
                      required
                    />
                 </div>
                 
                 <div className="space-y-2 text-left">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Cryptographic Key (Password)</Label>
                    <Input 
                      type="password"
                      autoComplete="current-password"
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
                disabled={isSubmitting}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all group disabled:opacity-50"
              >
                 <span>{isSubmitting ? 'Verifying Session...' : 'Authenticate'}</span>
                 <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
           </form>

           <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Protected by Server-Verified RBAC</span>
           </div>
        </div>
      </motion.div>
    </div>
  )
}
