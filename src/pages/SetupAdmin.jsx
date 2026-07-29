import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerAdmin } from '../api/authApi'

export default function SetupAdmin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '', address: '', salary: '' })
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!agreed) {
      setError('Please accept the terms to continue.')
      return
    }
    setLoading(true)
    try {
      await registerAdmin({ ...form, salary: parseFloat(form.salary) || 0 })
      navigate('/login')
    } catch (err) {
      console.error('Registration error details:', err.response)
      const data = err.response?.data
      const msg = data?.message || data?.Message || data?.data?.message || (data?.errors ? Object.values(data.errors).flat().join(' ') : null) || 'Registration failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      {/* ── Top Navigation Bar ── */}
      <header className="bg-surface border-b border-outline-variant flex justify-between items-center w-full px-md h-16 sticky top-0 z-50">
        <div className="flex items-center gap-xs">
          <span className="text-headline-md font-headline-md font-bold text-primary">HRMS Portal</span>
        </div>
        <div className="flex items-center gap-xs">
          <button
            type="button"
            className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-low p-base transition-colors rounded-lg text-[22px]"
          >
            help
          </button>
          <button
            type="button"
            className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-low p-base transition-colors rounded-lg text-[22px]"
          >
            notifications
          </button>
        </div>
      </header>

      {/* ── Main Registration Section ── */}
      <main className="flex-grow flex items-center justify-center py-xl px-md relative overflow-hidden">
        {/* Atmospheric Background Blobs (from stitch design) */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary-fixed rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-fixed-dim rounded-full blur-[120px]" />
        </div>

        {/* ── Registration Card ── */}
        <div className="w-full max-w-[480px] bg-surface-container-lowest border border-outline-variant ambient-shadow z-10 p-lg flex flex-col gap-md rounded-xl">

          {/* Card Header */}
          <div className="text-center space-y-xs">
            <div className="flex justify-center items-center gap-xs text-secondary mb-xs">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              <span className="text-label-sm font-label-sm uppercase tracking-widest">
                SSL Secured Environment
              </span>
            </div>
            <h1 className="text-headline-lg font-headline-lg text-primary">Create Admin Account</h1>
            <p className="text-body-md font-body-md text-on-surface-variant">
              One-time setup — this form only works until the first admin is created.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-error-container text-on-error-container text-sm rounded-lg px-sm py-2 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-sm">
            {/* Full Name */}
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full h-11 px-sm border border-outline-variant rounded-DEFAULT font-body-md focus-ring transition-all bg-surface-bright"
              />
            </div>

            {/* Work Email */}
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="email">
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
                className="w-full h-11 px-sm border border-outline-variant rounded-DEFAULT font-body-md focus-ring transition-all bg-surface-bright"
              />
            </div>

            {/* Password */}
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full h-11 px-sm pr-10 border border-outline-variant rounded-DEFAULT font-body-md focus-ring transition-all bg-surface-bright"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface material-symbols-outlined text-[20px]"
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </button>
              </div>
            </div>

            {/* Phone + Salary row */}
            <div className="grid grid-cols-2 gap-sm">
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="phone">
                  Phone <span className="text-on-surface-variant opacity-60">(optional)</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[18px]">phone</span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+1 555 000 0000"
                    className="w-full h-11 pl-lg pr-sm border border-outline-variant rounded-DEFAULT font-body-md focus-ring transition-all bg-surface-bright"
                  />
                </div>
              </div>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="salary">
                  Annual Salary
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[18px]">payments</span>
                  <input
                    id="salary"
                    name="salary"
                    type="number"
                    min="0"
                    step="1"
                    value={form.salary}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full h-11 pl-lg pr-sm border border-outline-variant rounded-DEFAULT font-body-md focus-ring transition-all bg-surface-bright"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="address">
                Address <span className="text-on-surface-variant opacity-60">(optional)</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[18px]">location_on</span>
                <input
                  id="address"
                  name="address"
                  type="text"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="123 Main St, City, Country"
                  className="w-full h-11 pl-lg pr-sm border border-outline-variant rounded-DEFAULT font-body-md focus-ring transition-all bg-surface-bright"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-sm pt-xs">
              <input
                id="terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 rounded-DEFAULT border-2 border-outline-variant text-secondary mt-0.5 cursor-pointer"
              />
              <label htmlFor="terms" className="text-body-md font-body-md text-on-surface-variant select-none cursor-pointer text-sm leading-snug">
                I understand this creates the system's primary administrator account and agree to the{' '}
                <span className="text-secondary hover:underline">Terms of Service</span>.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="register-submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-on-primary font-label-md font-bold hover:opacity-90 transition-all rounded-DEFAULT flex items-center justify-center gap-xs disabled:opacity-50 mt-md"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                  Processing...
                </>
              ) : (
                <>
                  Create Admin Account
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Card Footer */}
          <div className="pt-sm border-t border-outline-variant mt-xs text-center space-y-sm">
            <p className="text-body-md font-body-md text-on-surface-variant">
              Already have an account?{' '}
              <Link to="/login" className="text-secondary font-bold hover:underline">
                Sign In
              </Link>
            </p>
            <div className="flex items-center justify-center gap-md opacity-60">
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">lock</span>
                <span className="text-label-sm text-on-surface-variant">ISO 27001</span>
              </div>
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">shield</span>
                <span className="text-label-sm text-on-surface-variant">SOC2 Type II</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Page Footer ── */}
      <footer className="bg-surface border-t border-outline-variant flex flex-col md:flex-row justify-between items-center w-full px-md py-sm mt-auto">
        <div className="mb-xs md:mb-0">
          <span className="font-bold text-on-surface text-label-md">HRMS Portal</span>
          <span className="text-label-sm text-on-surface-variant ml-xs">© 2024 HRMS Systems. All rights reserved.</span>
        </div>
        <nav className="flex gap-md">
          <a href="#" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">Terms of Service</a>
        </nav>
      </footer>
    </div>
  )
}
