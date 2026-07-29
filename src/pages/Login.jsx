import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api/authApi'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(form)
      const { token, role } = res.data.data // ApiResponse<AuthResponseDto> wrapper
      loginWithToken(token)
      navigate(`/${role.toLowerCase()}/dashboard`)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const trustBadges = [
    { icon: 'verified',  label: 'ISO 27001'    },
    { icon: 'security',  label: 'SOC2 TYPE II' },
    { icon: 'shield',    label: 'GDPR READY'   },
  ]

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      {/* ── Top Navigation Bar ── */}
      <header className="bg-surface border-b border-outline-variant flex justify-between items-center w-full px-md h-16 sticky top-0 z-50">
        <div className="flex items-center gap-xs">
          <span className="text-headline-md font-headline-md font-bold text-primary">HRMS Portal</span>
          <span
            className="material-symbols-outlined text-secondary ml-xs text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified_user
          </span>
        </div>
        <div className="flex items-center gap-xs">
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors p-xs rounded"
          >
            <span className="material-symbols-outlined text-[22px]">help</span>
          </button>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors p-xs rounded"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-grow flex items-center justify-center px-md py-xl">
        {/* Login Card */}
        <div
          className="w-full max-w-[480px] bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"
          style={{ boxShadow: '0px 4px 12px rgba(15, 23, 42, 0.05)' }}
        >
          {/* Security Banner */}
          <div className="bg-surface-container-low px-md py-xs flex items-center justify-between border-b border-outline-variant">
            <div className="flex items-center gap-xs">
              <span
                className="material-symbols-outlined text-on-surface-variant text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">SECURE ENDPOINT</span>
            </div>
            <span className="text-label-sm font-label-sm text-secondary font-semibold">TLS 1.3 ACTIVE</span>
          </div>

          {/* Form Header */}
          <div className="px-lg pt-lg pb-md text-center">
            <h1 className="text-headline-lg font-headline-lg text-primary mb-xs">Employee Login</h1>
            <p className="text-body-md font-body-md text-on-surface-variant">
              Enter your credentials to access the HRMS Portal.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-lg mb-md bg-error-container text-on-error-container text-sm rounded-lg px-sm py-2 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-lg pb-lg space-y-md">
            {/* Email */}
            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block" htmlFor="email">
                Work Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="name@company.com"
                className="w-full h-[44px] px-md border border-outline-variant rounded bg-surface text-body-md font-body-md focus-ring transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-xs">
              <div className="flex justify-between items-center">
                <label className="text-label-md font-label-md text-on-surface-variant" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="text-label-sm font-label-sm text-secondary hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full h-[44px] px-md pr-12 border border-outline-variant rounded bg-surface text-body-md font-body-md focus-ring transition-all"
                />
                <button
                  type="button"
                  id="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-xs">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded-sm border-outline-variant text-secondary-container focus:ring-secondary-container cursor-pointer"
              />
              <label
                htmlFor="remember"
                className="text-body-md font-body-md text-on-surface-variant select-none cursor-pointer"
              >
                Remember this device for 30 days
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full h-[44px] bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90 active:opacity-80 transition-all flex items-center justify-center gap-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                  Authenticating...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="px-lg pb-lg border-t border-outline-variant pt-md text-center">
            <p className="text-body-md font-body-md text-on-surface-variant">
              Need to set up?{' '}
              <Link to="/" className="text-secondary font-bold hover:underline">
                Register Admin
              </Link>
            </p>
          </div>

          {/* Trust Badges */}
          <div className="bg-surface-container-low px-lg py-md flex justify-center items-center gap-lg border-t border-outline-variant">
            {trustBadges.map((b) => (
              <div key={b.label} className="flex flex-col items-center opacity-60">
                <span className="material-symbols-outlined text-on-surface-variant mb-xs text-[22px]">{b.icon}</span>
                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Page Footer ── */}
      <footer className="bg-surface border-t border-outline-variant flex flex-col md:flex-row justify-between items-center w-full px-md py-sm mt-auto">
        <div className="flex items-center gap-xs mb-xs md:mb-0">
          <span className="text-label-md font-bold text-on-surface">HRMS Portal</span>
          <span className="text-label-sm text-on-surface-variant">© 2024 HRMS Systems. All rights reserved.</span>
        </div>
        <nav className="flex gap-md">
          <a href="#" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Terms of Service</a>
          <a href="#" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Security Whitepaper</a>
        </nav>
      </footer>
    </div>
  )
}
