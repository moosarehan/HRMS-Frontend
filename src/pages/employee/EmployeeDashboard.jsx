import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { getMyProfile, updateMyProfile, getAllBranches, getAllDepartments } from '../../api/hrmsApi'
import LeavePanel from '../../components/LeavePanel'
import EmployeeAttendanceView from '../../components/EmployeeAttendanceView'
import TeamChat from '../../components/TeamChat'
import CompanyAnnouncementsView from '../../components/CompanyAnnouncementsView'

const NAV = [
  { key: 'department', label: 'My Department', icon: 'apartment' },
  { key: 'branch',     label: 'My Branch',     icon: 'account_tree' },
  { key: 'attendance', label: 'Attendance',    icon: 'fact_check' },
  { key: 'leave',      label: 'Leave',         icon: 'calendar_today' },
  { key: 'announcements', label: 'Announcements', icon: 'campaign' },
  { key: 'messages',   label: 'Messages',      icon: 'chat' },
  { key: 'profile',    label: 'My Profile',    icon: 'person'  },
  { key: 'settings',   label: 'Logout',        icon: 'logout'  },
]

export default function EmployeeDashboard() {
  const [activeKey, setActiveKey] = useState('department')

  const getTitle = () => {
    switch(activeKey) {
      case 'department': return 'My Department'
      case 'branch': return 'My Branch'
      case 'attendance': return 'My Attendance History'
      case 'leave': return 'Leave'
      case 'announcements': return 'Company Announcements'
      case 'messages': return 'Team Chat'
      case 'profile': return 'My Profile'
      default: return 'Employee Dashboard'
    }
  }

  const getSubtitle = () => {
    switch(activeKey) {
      case 'department': return 'View your department details (read-only)'
      case 'branch': return 'View your branch details (read-only)'
      case 'attendance': return 'View your daily attendance records and history.'
      case 'leave': return 'Apply for leave and view your leave requests.'
      case 'announcements': return 'Stay updated with company-wide news and broadcasts.'
      case 'messages': return 'Connect and communicate with team members'
      case 'profile': return 'Manage your personal information'
      default: return ''
    }
  }

  return (
    <DashboardLayout
      title={getTitle()}
      subtitle={getSubtitle()}
      navItems={NAV}
      activeKey={activeKey}
      onNavClick={setActiveKey}
      noPadding={activeKey === 'messages'}
    >
      {activeKey === 'department' && <DepartmentPanel />}
      {activeKey === 'branch' && <BranchPanel />}
      {activeKey === 'attendance' && <EmployeeAttendanceView />}
      {activeKey === 'leave' && <LeavePanel />}
      {activeKey === 'announcements' && <CompanyAnnouncementsView variant="full" />}
      {activeKey === 'messages' && <TeamChat />}
      {activeKey === 'profile' && <ProfilePanel />}
    </DashboardLayout>
  )
}

/* ─────────────────────────────────────────────────────── */
/*  Department Panel - Employee viewing own department     */
/* ─────────────────────────────────────────────────────── */
function DepartmentPanel() {
  const [profile, setProfile] = useState(null)
  const [department, setDepartment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const profileRes = await getMyProfile()
        setProfile(profileRes.data.data)
        
        // If employee has no department, show appropriate message
        if (!profileRes.data.data?.departmentId) {
          setLoading(false)
          return
        }
        
        // Get department info
        const deptRes = await getAllDepartments()
        const myDept = deptRes.data.data?.find(d => d.id === profileRes.data.data.departmentId)
        setDepartment(myDept || null)
      } catch (err) {
        console.error('Failed to load department', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-center py-lg text-on-surface-variant">Loading department...</div>
  }

  // If employee has no department assigned
  if (!profile?.departmentId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg text-center">
          <span className="material-symbols-outlined text-[48px] text-error mb-sm">domain_disabled</span>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">Not Part of Any Department</h2>
          <p className="text-body-md text-on-surface-variant">Your department has been deleted or you have been unassigned. Please contact your administrator for reassignment.</p>
        </div>
      </div>
    )
  }

  // If department exists
  if (!department) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm">apartment</span>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">Department Not Found</h2>
          <p className="text-body-md text-on-surface-variant">Your department information could not be loaded. Contact an administrator.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-lg">
      {/* Department Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
        <div className="bg-primary-container p-lg border-b border-outline-variant">
          <div className="flex items-center gap-md">
            <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[32px] text-on-primary">apartment</span>
            </div>
            <div>
              <h2 className="text-headline-lg font-headline-lg text-on-primary-container">{department.name}</h2>
              <p className="text-body-md text-on-primary-container opacity-80">
                {department.description || 'No description available'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="bg-surface-container p-md rounded-lg">
              <div className="flex items-center gap-xs mb-xs">
                <span className="material-symbols-outlined text-[20px] text-secondary">groups</span>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase">Total Employees</p>
              </div>
              <p className="text-headline-md font-headline-md text-on-surface">{department.employeeCount || 0}</p>
              <p className="text-label-sm text-on-surface-variant">Members in department</p>
            </div>

            <div className="bg-surface-container p-md rounded-lg">
              <div className="flex items-center gap-xs mb-xs">
                <span className="material-symbols-outlined text-[20px] text-secondary">info</span>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase">Read-Only</p>
              </div>
              <p className="text-body-md font-semibold text-on-surface">View Only</p>
              <p className="text-label-sm text-on-surface-variant">Contact HR for changes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BranchPanel() {
  const [profile, setProfile] = useState(null)
  const [branch, setBranch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const profileRes = await getMyProfile()
        setProfile(profileRes.data.data)
        
        // If employee has no branch assigned, show appropriate message
        if (!profileRes.data.data?.branchId) {
          setLoading(false)
          return
        }
        
        // Get all branches and find the one matching user's branchId
        const branchesRes = await getAllBranches()
        const myBranch = branchesRes.data.data?.find(b => b.id === profileRes.data.data.branchId)
        setBranch(myBranch || null)
      } catch (err) {
        console.error('Failed to load branch', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-lg text-on-surface-variant">Loading branch info...</div>

  // If employee has no branch assigned
  if (!profile?.branchId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg text-center">
          <span className="material-symbols-outlined text-[48px] text-error mb-sm">location_off</span>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">Not Part of Any Branch</h2>
          <p className="text-body-md text-on-surface-variant">Your branch has been deleted or you have been unassigned. Please contact your administrator for reassignment.</p>
        </div>
      </div>
    )
  }

  // If branch data couldn't be loaded
  if (!branch) return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg text-center">
        <span className="material-symbols-outlined text-[48px] text-error mb-sm">location_off</span>
        <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">Branch No Longer Exists</h2>
        <p className="text-body-md text-on-surface-variant">Your branch has been deleted. Please contact your administrator for further assistance.</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-lg">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
        <div className="bg-primary-container p-lg border-b border-outline-variant">
          <div className="flex items-center gap-md">
            <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[32px] text-on-primary">account_tree</span>
            </div>
            <div>
              <h2 className="text-headline-lg font-headline-lg text-on-primary-container">{branch.name}</h2>
              <p className="text-body-md text-on-primary-container opacity-80">{branch.city || 'No city specified'}</p>
            </div>
          </div>
        </div>
        <div className="p-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
            <div className="bg-surface-container p-md rounded-lg">
              <div className="flex items-center gap-xs mb-xs">
                <span className="material-symbols-outlined text-[20px] text-secondary">call</span>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase">Phone</p>
              </div>
              <p className="text-body-md font-semibold text-on-surface">{branch.phone || '—'}</p>
            </div>
            <div className="bg-surface-container p-md rounded-lg">
              <div className="flex items-center gap-xs mb-xs">
                <span className="material-symbols-outlined text-[20px] text-secondary">location_on</span>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase">Address</p>
              </div>
              <p className="text-body-md font-semibold text-on-surface">{branch.address || '—'}</p>
            </div>
            <div className="bg-surface-container p-md rounded-lg">
              <div className="flex items-center gap-xs mb-xs">
                <span className="material-symbols-outlined text-[20px] text-secondary">apartment</span>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase">Departments</p>
              </div>
              <p className="text-headline-md font-headline-md text-on-surface">{branch.departmentCount}</p>
            </div>
            <div className="bg-surface-container p-md rounded-lg">
              <div className="flex items-center gap-xs mb-xs">
                <span className="material-symbols-outlined text-[20px] text-secondary">groups</span>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase">Employees</p>
              </div>
              <p className="text-headline-md font-headline-md text-on-surface">{branch.employeeCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfilePanel() {
  const [profile, setProfile] = useState(null)
  const [form,    setForm]    = useState({ phone: '', address: '' })
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const load = async () => {
    try {
      const res = await getMyProfile()
      const data = res.data.data
      setProfile(data)
      setForm({
        phone:   data.phone   || '',
        address: data.address || '',
      })
    } catch { /* silent */ }
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await updateMyProfile(form)
      setSaved(true)
      await load()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-xl gap-xs text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading your profile...
      </div>
    )
  }

  // Initials for avatar
  const initials = profile.fullName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="max-w-4xl mx-auto space-y-lg">
      {/* Profile Header Hero Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg">
        <div className="flex flex-col sm:flex-row items-center gap-md">
          <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-headline-lg font-bold text-headline-lg shrink-0">
            {initials}
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-xs mb-xs">
              <h2 className="text-headline-md font-headline-md text-on-surface">{profile.fullName}</h2>
              <span className="px-xs py-0.5 rounded-full text-label-sm font-label-sm font-semibold bg-tertiary-container text-on-tertiary-container">
                {profile.role}
              </span>
            </div>
            <p className="text-body-md font-body-md text-on-surface-variant">{profile.email}</p>
            {profile.designation && (
              <p className="text-label-md font-label-md text-secondary font-semibold mt-1">
                {profile.designation}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {/* Read-only Details Panel */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg space-y-md">
          <h3 className="text-title-lg font-title-lg text-on-surface border-b border-outline-variant pb-xs flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px] text-secondary">badge</span>
            Employment Information
          </h3>
          <dl className="space-y-sm">
            <InfoRow label="Employee ID" value={`#${profile.id}`} />
            <InfoRow label="Full Name" value={profile.fullName} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Role" value={profile.role} />
            <InfoRow label="Phone" value={profile.phone || 'Not provided'} />
            <InfoRow label="Address" value={profile.address || 'Not provided'} />
            <InfoRow label="Branch" value={profile.branchName || 'Unassigned'} />
            <InfoRow label="Department" value={profile.departmentName || 'Unassigned'} />
            <InfoRow label="Designation" value={profile.designation || 'N/A'} />
            <InfoRow label="Salary" value={`$${profile.salary?.toLocaleString() ?? 0}`} />
            <InfoRow label="Status" value={profile.isActive ? 'Active' : 'Inactive'} />
          </dl>
        </div>

        {/* Editable Phone & Address Panel */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg space-y-md">
          <h3 className="text-title-lg font-title-lg text-on-surface border-b border-outline-variant pb-xs flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px] text-secondary">edit_square</span>
            Contact Details
          </h3>

          {error && (
            <div className="bg-error-container text-on-error-container text-body-md p-sm rounded-lg flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-emerald-100 text-emerald-800 text-body-md p-sm rounded-lg flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Profile updated successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-md">
            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block" htmlFor="phone">
                Phone Number
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">call</span>
                <input
                  id="phone"
                  type="text"
                  placeholder="+1 555 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full h-11 pl-lg pr-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block" htmlFor="address">
                Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-sm top-3 text-outline text-[20px]">home</span>
                <textarea
                  id="address"
                  rows={3}
                  placeholder="123 Main St, City, Country"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full pl-lg pr-sm py-2 border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all resize-none"
                />
              </div>
            </div>

            <div className="pt-xs">
              <p className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-xs mb-sm">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Only Phone and Address are editable here.
              </p>
              <button
                type="submit"
                id="save-profile"
                disabled={loading}
                className="w-full h-11 rounded-DEFAULT bg-secondary text-on-secondary text-label-md font-label-md font-bold hover:opacity-90 transition-all flex items-center justify-center gap-xs disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-sm border-b border-outline-variant pb-sm last:border-0 last:pb-0">
      <dt className="text-body-md font-body-md text-on-surface-variant flex-shrink-0 w-32">{label}</dt>
      <dd className="text-body-md font-body-md text-on-surface font-medium text-right break-all">{value}</dd>
    </div>
  )
}
