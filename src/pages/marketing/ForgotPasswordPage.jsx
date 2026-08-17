import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mail, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Sparkles,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Logo from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleResetRequest = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      setError('Please enter your registered merchant email address.')
      setIsLoading(false)
      return
    }

    try {
      // 1. Check if email is associated with a registered restaurant
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id, business_name, email')
        .eq('email', cleanEmail)
        .maybeSingle()

      // 2. Dispatch Supabase password reset email with redirect URL to /reset-password
      const redirectUrl = `${window.location.origin}/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      })

      if (resetError) {
        console.warn('Supabase reset notice:', resetError.message)
        // If Supabase Auth reports user not found or rate limit, provide helpful guidance
        if (resetError.message?.toLowerCase().includes('rate limit')) {
          throw new Error('Too many requests. Please wait a few moments before trying again.')
        }
      }

      // Always show success state for security (avoids email enumeration) while acknowledging registered merchants
      setIsSuccess(true)
    } catch (err) {
      console.error('Password reset error:', err)
      setError(err.message || 'Unable to process reset request. Please try again or contact support.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12 relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      {/* Navigation Top Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-6 sm:mb-8 z-10">
        <Link 
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-900/60 hover:bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <Logo showText={true} iconSize={32} />
        </Link>
      </div>

      {/* Main Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-black/80 border border-slate-800/20 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] z-10"
      >
        {/* Left Hero Column */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8 sm:p-10 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-black uppercase tracking-widest">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Identity & Access Recovery</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Reset your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                  Merchant Password.
                </span>
              </h1>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                Enter the email address associated with your Servora restaurant account. We will send you a secure verification link to regain control.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>End-to-end cryptographic link security</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>Instant restaurant node session recovery</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-medium relative z-10">
            <span>Servora Security Protocol</span>
            <Link to="/contact" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Need Assistance?
            </Link>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 bg-white p-8 sm:p-10 lg:p-14 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-6">
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="request-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      Forgot Password?
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
                      No worries! Enter your registered merchant email below.
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm font-semibold text-red-700 leading-snug">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleResetRequest} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        Merchant Email Address
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <Input
                          required
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="partner@tigerbistro.com"
                          className="h-16 pl-14 rounded-2xl bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white text-slate-900 font-bold placeholder:text-slate-400 text-sm transition-all"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Dispatching Link...</span>
                        </div>
                      ) : (
                        <>
                          <span>Send Recovery Link</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="pt-6 border-t border-slate-100 text-center space-y-3">
                    <p className="text-xs text-slate-500 font-medium">
                      Remember your credentials?{' '}
                      <Link to="/login" className="text-blue-600 font-bold hover:underline">
                        Sign in to console
                      </Link>
                    </p>
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
                      Recovery Link Dispatched
                    </h2>
                    <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                      We have sent a secure password reset link to <strong className="text-slate-900 font-bold">{email}</strong>. Please check your inbox and spam folder.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Steps:</p>
                    <ul className="text-xs text-slate-600 font-medium space-y-1 list-disc list-inside">
                      <li>Click the verification link received in your email.</li>
                      <li>Set your new secure merchant password.</li>
                      <li>Sign into your Servora restaurant console.</li>
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => { setIsSuccess(false); setEmail('') }}
                      className="flex-1 h-13 rounded-xl border-slate-200 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Try Another Email
                    </Button>
                    <Link to="/login" className="flex-1">
                      <Button className="w-full h-13 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer">
                        Return to Sign In
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
