import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { DarkModeToggle } from './DarkModeToggle'
import { sendCode, resetPassword, signInWithGoogle, signInWithGitHub } from '../utils/auth'
import { supabase } from '../lib/supabase'
import logo from '../assets/Acodera-logo.png'

export function RightPanel({ onSuccess }) {
  const { login, oauthLogin } = useAuth()

  // Self-signup is disabled — this panel only handles sign-in, forgot/reset
  // password, and OAuth. New CRM accounts must be created by an admin.
  const [mode, setMode] = useState('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [passUpdated, setPassUpdated] = useState(false)
  const [devCode, setDevCode] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email) {
        setLoading(true)
        try {
          const userMeta = session.user.user_metadata || {}
          const displayName = userMeta.full_name || userMeta.name || session.user.email.split('@')[0]
          await oauthLogin(session.user.email, displayName)
          await supabase.auth.signOut()
          onSuccess()
        } catch (err) {
          setErrors({ form: err.message })
        } finally {
          setLoading(false)
        }
      }
    })
  }, [])

  const switchTab = (t) => {
    setMode(t)
    setErrors({})
    setCode('')
    setDevCode(null)
    setPassUpdated(false)
  }

  const goToMode = (m) => {
    setMode(m)
    setErrors({})
    setCode('')
    setDevCode(null)
  }

  const validateLogin = () => {
    const e = {}
    if (!email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email'
    if (!password) e.password = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!validateLogin()) return
    setLoading(true)
    setErrors({})
    try {
      await login(email, password)
      onSuccess()
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setErrors({ email: 'Required' }); return }
    setLoading(true)
    setErrors({})
    try {
      const resp = await sendCode(email, 'reset')
      setDevCode(resp.code || null)
      goToMode('reset')
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    const e2 = {}
    if (!code) e2.code = 'Required'
    if (!password) e2.password = 'Required'
    else if (password.length < 6) e2.password = 'At least 6 characters'
    if (password !== confirmPassword) e2.confirmPassword = 'Passwords do not match'
    setErrors(e2)
    if (Object.keys(e2).length > 0) return
    setLoading(true)
    try {
      await resetPassword(email, code, password)
      setPassUpdated(true)
      setTimeout(() => switchTab('login'), 2000)
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider) => {
    try {
      if (provider === 'google') await signInWithGoogle()
      else await signInWithGitHub()
    } catch (err) {
      setErrors({ form: err.message })
    }
  }

  const ErrBox = ({ msg }) => msg ? (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-[11px] border border-red-500/20 bg-red-500/10 px-4 py-3">
      <p className="text-[13px] text-red-500">{msg}</p>
    </motion.div>
  ) : null

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <div className="lg:hidden flex items-center justify-between mb-8">
        <img src={logo} alt="Acodera" className="h-8 w-auto" />
        <DarkModeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="mb-8">
          <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-[var(--ink)] leading-[1.1]">
            {mode === 'login' && 'Welcome back.'}
            {mode === 'forgot' && 'Reset password.'}
            {mode === 'reset' && 'Enter new password.'}
          </h1>
          <p className="mt-2 text-[15px] text-[var(--muted)] leading-[1.4] tracking-[-0.01em]">
            {mode === 'login' && 'Sign in to continue to your dashboard.'}
            {mode === 'forgot' && "Enter your email and we'll send you a reset code."}
            {mode === 'reset' && 'Enter the code from your email and your new password.'}
          </p>
        </div>

        <ErrBox msg={errors.form} />

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            onSubmit={
              mode === 'login' ? handleLogin :
              mode === 'forgot' ? handleForgot :
              handleReset
            }
            className="space-y-4"
          >
            {mode === 'login' && (
              <>
                <input id="loginEmail" name="loginEmail" type="email" placeholder="Email address" autoComplete="email"
                  value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })) }}
                  className={`apple-input ${errors.email ? '!ring-2 !ring-red-500/50' : ''}`} />
                <div className="relative">
                  <input id="loginPassword" name="loginPassword" type={showPassword ? 'text' : 'password'} placeholder="Password" autoComplete="current-password"
                    value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })) }}
                    className={`apple-input pr-12 ${errors.password ? '!ring-2 !ring-red-500/50' : ''}`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input id="rememberMe" name="rememberMe" type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--hairline)] text-[var(--accent)] focus:ring-[var(--accent)]" />
                    <span className="text-[13px] text-[var(--muted)]">Remember me</span>
                  </label>
                  <button type="button" onClick={() => goToMode('forgot')}
                    className="text-[13px] text-[var(--accent)] hover:underline transition-colors">
                    Forgot password?
                  </button>
                </div>
                <button type="submit" disabled={loading} className="apple-btn mt-2">
                  {loading ? <Loader2 size={17} className="animate-spin" /> : 'Sign In'}
                </button>
              </>
            )}

            {mode === 'forgot' && (
              <>
                <input id="forgotEmail" name="forgotEmail" type="email" placeholder="Email address" autoComplete="email"
                  value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })) }}
                  className={`apple-input ${errors.email ? '!ring-2 !ring-red-500/50' : ''}`} />
                <button type="submit" disabled={loading} className="apple-btn">
                  {loading ? <Loader2 size={17} className="animate-spin" /> : 'Send Reset Code'}
                </button>
                <div className="text-center">
                  <button type="button" onClick={() => switchTab('login')}
                    className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                    Back to sign in
                  </button>
                </div>
              </>
            )}

            {mode === 'reset' && (
              <>
                {passUpdated ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <CheckCircle size={36} className="text-emerald-500" />
                    <p className="text-[15px] text-emerald-600 font-medium">Password updated!</p>
                    <p className="text-[13px] text-[var(--muted)]">Redirecting to sign in...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] text-[var(--muted)]">Code sent to <span className="font-medium text-[var(--ink)]">{email}</span></p>
                    {devCode && (
                      <div className="rounded-[14px] border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-5 py-4 text-center">
                        <p className="text-[12px] text-[var(--accent)]/70 mb-1.5 font-medium tracking-[-0.01em]">Sandbox mode — your code</p>
                        <p className="text-[28px] font-mono font-bold tracking-[0.2em] text-[var(--accent)]">{devCode}</p>
                      </div>
                    )}
                    <input id="resetCode" name="resetCode" type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                      value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={`apple-input text-center text-[20px] font-mono tracking-[0.3em] ${errors.code ? '!ring-2 !ring-red-500/50' : ''}`} />
                    <div className="relative">
                      <input id="resetPassword" name="resetPassword" type={showPassword ? 'text' : 'password'} placeholder="New password" autoComplete="new-password"
                        value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })) }}
                        className={`apple-input pr-12 ${errors.password ? '!ring-2 !ring-red-500/50' : ''}`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)]">
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    <input id="resetConfirmPassword" name="resetConfirmPassword" type="password" placeholder="Confirm new password" autoComplete="new-password"
                      value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: undefined })) }}
                      className={`apple-input ${errors.confirmPassword ? '!ring-2 !ring-red-500/50' : ''}`} />
                    <button type="submit" disabled={loading} className="apple-btn">
                      {loading ? <Loader2 size={17} className="animate-spin" /> : 'Reset Password'}
                    </button>
                    <div className="text-center">
                      <button type="button" onClick={() => switchTab('login')}
                        className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                        Back to sign in
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.form>
        </AnimatePresence>

        {mode !== 'reset' && !passUpdated && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--hairline)]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[12px] text-[var(--muted)] bg-[var(--canvas)]">or continue with</span>
              </div>
            </div>

            <div className="space-y-3">
              <button type="button" onClick={() => handleOAuth('google')} className="apple-ghost flex items-center justify-center gap-2.5">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
              <button type="button" onClick={() => handleOAuth('github')} className="apple-ghost flex items-center justify-center gap-2.5">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
