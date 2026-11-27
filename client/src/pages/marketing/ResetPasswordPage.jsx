import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  KeyRound,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Logo from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Note: We're not enforcing block here strictly because some auth flows
    // don't emit the exact hash. We just let Supabase handle the update attempt.
  }, [])

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length > 5) score += 33;
    if (pass.length > 8) score += 33;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 34;
    return score;
  }
  
  const strength = calculateStrength(password)

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
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      setIsSuccess(true)
      
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
    <div 
      className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12 relative font-sans"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Premium Dark Overlay */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Header Logo */}
      <div className="w-full max-w-md flex items-center justify-center mb-8 z-10">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Logo showText={true} iconSize={36} />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-slate-800 bg-slate-950/60 backdrop-blur-xl shadow-2xl shadow-black/50 text-slate-100 p-2">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="reset-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CardHeader className="text-center space-y-3 pb-6">
                  <div className="mx-auto bg-blue-500/10 p-3 rounded-full w-fit mb-2 ring-1 ring-blue-500/30">
                    <KeyRound className="w-6 h-6 text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Create New Password
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm">
                    Enter a robust new password to secure your Servora account.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-red-200">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handlePasswordUpdate} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        New Password
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <Input
                          required
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="h-12 pl-10 pr-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      {password.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-2 space-y-1.5 overflow-hidden"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Password strength</span>
                            <span className={strength < 50 ? 'text-orange-400' : strength < 100 ? 'text-blue-400' : 'text-emerald-400'}>
                              {strength < 50 ? 'Weak' : strength < 100 ? 'Good' : 'Strong'}
                            </span>
                          </div>
                          {/* Note: the custom progress component might not accept indicatorColor, we can use an inline style or inline div if needed. Shadcn default uses bg-primary */}
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                             <div 
                               className={`h-full transition-all ${strength < 50 ? 'bg-orange-500' : strength < 100 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                               style={{ width: `${strength}%` }}
                             />
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Confirm Password
                      </Label>
                      <div className="relative group">
                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <Input
                          required
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="h-12 pl-10 pr-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || !password || !confirmPassword}
                      className="w-full h-12 mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <span>Save New Password</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>

                <CardFooter className="flex justify-center border-t border-slate-800 pt-6">
                  <Link to="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                    Cancel and return to Sign In
                  </Link>
                </CardFooter>
              </motion.div>
            ) : (
              <motion.div
                key="success-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 px-2 space-y-6"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Password Updated!</h2>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">
                    Your credentials have been securely updated. Redirecting you to the sign-in console...
                  </p>
                </div>
                <div className="pt-4">
                  <Link to="/login">
                    <Button className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white font-semibold">
                      Sign In Now
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  )
}
