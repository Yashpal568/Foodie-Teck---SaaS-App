import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  KeyRound,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Logo from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [hasValidSession, setHasValidSession] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if recovery access token is present in URL hash or active recovery session
    const hash = window.location.hash
    const hasRecoveryHash = hash.includes('type=recovery') || hash.includes('access_token=')

    // Listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && hasRecoveryHash)) {
        setHasValidSession(true)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.')
      setIsLoading(false)
      return
    }

    try {
      // Update Supabase Auth user password
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        throw updateError
      }

      setIsSuccess(true)
      
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 3000)
    } catch (err) {
      console.error('Password update error:', err)
      setError(err.message || 'Failed to update password. Your recovery link may have expired.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12 relative overflow-hidden font-sans select-none">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Logo */}
      <div className="w-full max-w-lg flex items-center justify-center mb-6 sm:mb-8 z-10">
        <Link to="/" className="flex items-center gap-2">
          <Logo showText={true} iconSize={36} />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-black/80 border border-slate-800/20 p-8 sm:p-10 z-10"
      >
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="reset-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-black uppercase tracking-widest mx-auto">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Security Update</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Create New Password
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">
                  Choose a robust password to safeguard your restaurant node.
                </p>
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm font-semibold text-red-700 leading-snug">{error}</p>
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    New Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <Input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="h-14 pl-12 pr-12 rounded-2xl bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 font-bold placeholder:text-slate-400 text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <Input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="h-14 pl-12 pr-12 rounded-2xl bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 font-bold placeholder:text-slate-400 text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Password strength checklist */}
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${password.length >= 6 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span>At least 6 characters long</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${password && password === confirmPassword ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span>Both passwords match</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-15 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating Credentials...</span>
                    </div>
                  ) : (
                    <>
                      <span>Save New Password</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-4 border-t border-slate-100 text-center">
                <Link to="/login" className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
                  Cancel and return to Sign In
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center space-y-6 py-4"
            >
              <div className="w-16 h-16 bg-emerald-100 border border-emerald-200 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Password Updated!
                </h2>
                <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                  Your merchant credentials have been successfully updated. Redirecting you to the sign-in console...
                </p>
              </div>

              <div className="pt-2">
                <Link to="/login">
                  <Button className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer">
                    Sign In Now
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
