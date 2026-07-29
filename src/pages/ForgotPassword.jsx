import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetPassword } from '../api/authApi'

const STEPS = { EMAIL: 'email', RESET: 'reset', SUCCESS: 'success' }

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep]               = useState(STEPS.EMAIL)
  const [email, setEmail]             = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  // Step 1 — verify email (frontend only: just move to step 2)
  const handleEmailSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email address.'); return }
    setStep(STEPS.RESET)
  }

  // Step 2 — submit new password
  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    if (newPassword.length < 6)          { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      await resetPassword({ email, newPassword, confirmPassword })
      setStep(STEPS.SUCCESS)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.Message || 'Reset failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      {/* ── Top Nav ── */}
      <header className="bg-surface border-b border-outline-variant flex justify-between items-center w-full px-md h-16 sticky top-0 z-50">
        <div className="flex items-center gap-xs">
          <span className="text-headline-md font-headline-md font-bold text-primary">HRMS Portal</span>
          <span className="material-symbols-outlined text-secondary ml-xs text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified_user
          </span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-grow flex items-center justify-center px-md py-xl">
        <div
          className="w-full max-w-[480px] bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"
          style={{ boxShadow: '0px 4px 12px rgba(15,23,42,0.07)' }}
        >
          {/* Security Banner */}
          <div className="bg-surface-container-low px-md py-xs flex items-center justify-between border-b border-outline-variant">
            <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">SECURE ENDPOINT</span>
            </div>
            <span className="text-label-sm font-label-sm text-secondary font-semibold">TLS 1.3 ACTIVE</span>
          </div>

          {/* ── Step Progress ── */}
          <div className="flex px-lg pt-md gap-xs">
            {[STEPS.EMAIL, STEPS.RESET].map((s, i) => (
              <div key={s} className="flex items-center gap-xs flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 transition-colors ${
                  step === STEPS.SUCCESS || (i === 0 && step === STEPS.RESET)
                    ? 'bg-secondary text-on-secondary'
                    : step === s
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {step === STEPS.SUCCESS || (i === 0 && step === STEPS.RESET)
                    ? <span className="material-symbols-outlined text-[14px]">check</span>
                    : i + 1}
                </div>
                <span className={`text-label-sm font-label-sm ${step === s ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                  {i === 0 ? 'Verify Email' : 'New Password'}
                </span>
                {i === 0 && <div className="flex-1 h-px bg-outline-variant mx-xs" />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Enter Email ── */}
          {step === STEPS.EMAIL && (
            <div className="px-lg pt-md pb-lg">
              <div className="text-center mb-md">
                <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-sm">
                  <span className="material-symbols-outlined text-on-primary-container text-[28px]">mail</span>
                </div>
                <h1 className="text-headline-lg font-headline-lg text-primary">Forgot Password?</h1>
                <p className="text-body-md font-body-md text-on-surface-variant mt-xs">
                  Enter the email address associated with your account.
                </p>
              </div>

              {error && (
                <div className="mb-md bg-error-container text-on-error-container text-sm rounded-lg px-sm py-2 flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-md">
                <div className="space-y-xs">
                  <label className="text-label-md font-label-md text-on-surface-variant block" htmlFor="fp-email">
                    Work Email
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">alternate_email</span>
                    <input
                      id="fp-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full h-[44px] pl-lg pr-sm border border-outline-variant rounded bg-surface text-body-md font-body-md focus-ring transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  id="fp-continue"
                  className="w-full h-[44px] bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90 transition-all flex items-center justify-center gap-xs"
                >
                  Continue
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2: New Password ── */}
          {step === STEPS.RESET && (
            <div className="px-lg pt-md pb-lg">
              <div className="text-center mb-md">
                <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center mx-auto mb-sm">
                  <span className="material-symbols-outlined text-on-secondary-container text-[28px]">lock_reset</span>
                </div>
                <h1 className="text-headline-lg font-headline-lg text-primary">Set New Password</h1>
                <p className="text-body-md font-body-md text-on-surface-variant mt-xs">
                  Resetting password for <span className="font-semibold text-on-surface">{email}</span>
                </p>
              </div>

              {error && (
                <div className="mb-md bg-error-container text-on-error-container text-sm rounded-lg px-sm py-2 flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-sm">
                {/* New Password */}
                <div className="space-y-xs">
                  <label className="text-label-md font-label-md text-on-surface-variant block" htmlFor="new-password">
                    New Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                    <input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full h-[44px] pl-lg pr-12 border border-outline-variant rounded bg-surface text-body-md font-body-md focus-ring transition-all"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">{showNew ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-xs">
                  <label className="text-label-md font-label-md text-on-surface-variant block" htmlFor="confirm-password">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">lock_open</span>
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter new password"
                      className={`w-full h-[44px] pl-lg pr-12 border rounded bg-surface text-body-md font-body-md focus-ring transition-all ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-error'
                          : 'border-outline-variant'
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-label-sm text-error flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[14px]">cancel</span>
                      Passwords do not match
                    </p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="text-label-sm text-emerald-600 flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Passwords match
                    </p>
                  )}
                </div>

                <div className="flex gap-sm pt-xs">
                  <button
                    type="button"
                    onClick={() => { setStep(STEPS.EMAIL); setError('') }}
                    className="flex-1 h-[44px] border border-outline-variant text-on-surface text-label-md font-label-md rounded hover:bg-surface-container transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    id="fp-reset-submit"
                    disabled={loading}
                    className="flex-2 flex-grow-[2] h-[44px] bg-secondary text-on-secondary text-label-md font-label-md rounded hover:opacity-90 transition-all flex items-center justify-center gap-xs disabled:opacity-50"
                  >
                    {loading ? (
                      <><span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>Resetting...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[20px]">lock_reset</span>Reset Password</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 3: Success ── */}
          {step === STEPS.SUCCESS && (
            <div className="px-lg pt-md pb-lg text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-md">
                <span className="material-symbols-outlined text-emerald-600 text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <h2 className="text-headline-lg font-headline-lg text-on-surface mb-xs">Password Reset!</h2>
              <p className="text-body-md font-body-md text-on-surface-variant mb-lg">
                Your password has been updated successfully. You can now log in with your new password.
              </p>
              <button
                id="fp-go-login"
                onClick={() => navigate('/login')}
                className="w-full h-[44px] bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90 transition-all flex items-center justify-center gap-xs"
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
                Go to Login
              </button>
            </div>
          )}

          {/* Footer links */}
          {step !== STEPS.SUCCESS && (
            <div className="px-lg pb-md border-t border-outline-variant pt-sm text-center">
              <p className="text-body-md font-body-md text-on-surface-variant">
                Remember your password?{' '}
                <Link to="/login" className="text-secondary font-bold hover:underline">Sign In</Link>
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-surface border-t border-outline-variant flex flex-col md:flex-row justify-between items-center w-full px-md py-sm mt-auto">
        <div className="flex items-center gap-xs mb-xs md:mb-0">
          <span className="text-label-md font-bold text-on-surface">HRMS Portal</span>
          <span className="text-label-sm text-on-surface-variant">© 2024 HRMS Systems. All rights reserved.</span>
        </div>
        <nav className="flex gap-md">
          <a href="#" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Terms of Service</a>
        </nav>
      </footer>
    </div>
  )
}
