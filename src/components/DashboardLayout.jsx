import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * DashboardLayout — premium sidebar shell matching stitch-design-3.
 *
 * Props:
 *   title      - Page title displayed in main canvas header
 *   subtitle   - Optional subtitle
 *   navItems   - [{ key, label, icon }]
 *   activeKey  - Currently active nav item key
 *   onNavClick - Called with key (except 'settings' which triggers logout)
 *   children   - Main canvas content
 */
export default function DashboardLayout({
  title,
  subtitle,
  navItems,
  activeKey,
  onNavClick,
  noPadding = false,
  children,
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleNavClick = (key) => {
    if (key === 'settings') {
      logout()
      navigate('/login', { replace: true })
    } else {
      onNavClick(key)
    }
  }

  // Generate initials avatar from user name
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <div className="bg-surface-container-low text-on-surface h-screen flex flex-col overflow-hidden">

      {/* ── Top Navigation Bar ── */}
      <header className="bg-surface border-b border-outline-variant flex justify-between items-center w-full px-md h-16 sticky top-0 z-50">
        {/* Brand */}
        <div className="flex items-center gap-base">
          <span className="text-headline-md font-headline-md font-bold text-primary">HRMS Portal</span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-md">
          <div className="flex gap-xs">
            <button
              type="button"
              className="p-xs text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full material-symbols-outlined text-[22px]"
            >
              help
            </button>
            <button
              type="button"
              className="p-xs text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full material-symbols-outlined text-[22px] relative"
            >
              notifications
            </button>
          </div>
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant bg-primary-container flex items-center justify-center flex-shrink-0">
            <span className="text-on-primary-container font-bold text-xs leading-none">{initials}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar Navigation ── */}
        <aside className="w-64 bg-surface border-r border-outline-variant flex flex-col py-md shrink-0">
          {/* Nav items */}
          <div className="flex flex-col gap-xs px-sm flex-1">
            {navItems.map((item) => {
              const isActive = activeKey === item.key && item.key !== 'settings'
              const isLogout = item.key === 'settings'

              return (
                <button
                  key={item.key}
                  id={`nav-${item.key}`}
                  type="button"
                  onClick={() => handleNavClick(item.key)}
                  className={`w-full flex items-center gap-sm px-md py-sm rounded-lg text-left transition-colors group ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container'
                      : isLogout
                      ? 'text-on-surface-variant hover:bg-error-container hover:text-error'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className={`text-label-md font-label-md ${isActive ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Sidebar Bottom: User + Status ── */}
          <div className="px-sm border-t border-outline-variant pt-md mt-4 space-y-xs">
            {/* Logged-in user card */}
            <div className="bg-surface-container p-sm rounded-xl">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-xs">LOGGED IN AS</p>
              <p className="text-label-md font-label-md text-on-surface font-semibold truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-label-sm font-label-sm text-on-surface-variant mt-0.5">{user?.role}</p>
            </div>
            {/* System status card */}
            <div className="bg-surface-container p-sm rounded-xl">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-xs">SYSTEM STATUS</p>
              <div className="flex items-center gap-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-label-md font-label-md text-on-surface font-semibold">
                  All Systems Normal
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Content Canvas ── */}
        <main className={`flex-1 ${
            noPadding
              ? 'overflow-hidden'
              : 'overflow-y-auto custom-scrollbar p-md md:p-lg space-y-lg'
          }`}>
          {/* Page Header — hidden in full-bleed (noPadding) mode */}
          {!noPadding && (
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
              <div>
                <h1 className="text-headline-lg font-headline-lg text-on-surface">{title}</h1>
                {subtitle && (
                  <p className="text-body-md font-body-md text-on-surface-variant mt-1">{subtitle}</p>
                )}
              </div>
            </div>
          )}

          {/* Slot for role-specific content */}
          {children}
        </main>
      </div>
    </div>
  )
}
