import { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { getAllEmployees, getAllDepartments, getMyProfile, updateMyProfile, getAllBranches } from '../../api/hrmsApi'
import { useAuth } from '../../context/AuthContext.jsx'
import LeavePanel from '../../components/LeavePanel'

const NAV = [
  { key: 'branch',     label: 'My Branch',     icon: 'account_tree' },
  { key: 'department', label: 'My Department', icon: 'apartment' },
  { key: 'team',       label: 'Team Members',  icon: 'groups'    },
  { key: 'leave',      label: 'Leave',         icon: 'calendar_today' },
  { key: 'profile',    label: 'My Profile',    icon: 'person'    },
  { key: 'settings',   label: 'Logout',        icon: 'logout'    },
]

export default function ManagerDashboard() {
  const { user } = useAuth()
  const [activeKey, setActiveKey] = useState('branch')

  const getTitle = () => {
    switch(activeKey) {
      case 'branch': return 'My Branch'
      case 'department': return 'My Department'
      case 'team': return 'Team Members'
      case 'leave': return 'Leave'
      case 'profile': return 'My Profile'
      default: return 'Manager Dashboard'
    }
  }

  const getSubtitle = () => {
    switch(activeKey) {
      case 'branch': return 'View your branch details (read-only)'
      case 'department': return 'View your department details (read-only)'
      case 'team': return 'View members of your department. Read-only — contact HR or Admin for changes.'
      case 'leave': return 'Apply for leave and view your leave requests.'
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
    >
      {activeKey === 'branch' && <BranchPanel />}
      {activeKey === 'department' && <DepartmentPanel />}
      {activeKey === 'team' && <TeamPanel />}
      {activeKey === 'leave' && <LeavePanel />}
      {activeKey === 'profile' && <ProfilePanel />}
    </DashboardLayout>
  )
}

/* ─────────────────────────────────────────────────────── */
/*  Department Panel - Manager viewing own department      */
/* ─────────────────────────────────────────────────────── */
function DepartmentPanel() {
  const [profile, setProfile] = useState(null)
  const [department, setDepartment] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [profileRes, empRes] = await Promise.all([
        getMyProfile(),
        getAllEmployees()
      ])
      setProfile(profileRes.data.data)
      setEmployees(empRes.data.data ?? [])
      
      // If Manager has a department, fetch all departments to find theirs
      if (profileRes.data.data?.departmentId) {
        const deptRes = await getAllDepartments()
        const myDept = deptRes.data.data?.find(d => d.id === profileRes.data.data.departmentId)
        setDepartment(myDept)
      }
    } catch (err) {
      console.error('Failed to load department', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return <div className="text-center py-lg text-on-surface-variant">Loading department...</div>
  }

  if (!profile?.departmentId || !department) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm">apartment</span>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">No Department Assigned</h2>
          <p className="text-body-md text-on-surface-variant">You are not currently assigned to any department. Contact an administrator.</p>
        </div>
      </div>
    )
  }

  const isManager = (emp) => {
    const role = emp.role
    return role === 'Manager' || role === 3 || role === '3' || 
           (typeof role === 'string' && role.toLowerCase() === 'manager')
  }

  // Find managers in this department
  const departmentManagers = employees.filter(
    emp => String(emp.departmentId) === String(department.id) && isManager(emp)
  )
  
  // For Manager: show all managers assigned to that department, marking logged-in manager with (You)
  let managerNames = 'Not Assigned'
  if (departmentManagers.length > 0) {
    const formattedNames = departmentManagers.map(m => {
      const nameOrEmail = (m.fullName && m.fullName.trim() !== '') ? m.fullName : m.email
      return m.id === profile.id ? `${nameOrEmail} (You)` : nameOrEmail
    })
    managerNames = formattedNames.join(', ')
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
                <span className="material-symbols-outlined text-[20px] text-secondary">badge</span>
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase">Manager{departmentManagers.length > 1 ? 's' : ''}</p>
              </div>
              <p className="text-body-md font-semibold text-on-surface">
                {managerNames}
              </p>
              <p className="text-label-sm text-on-surface-variant">Department lead{departmentManagers.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────── */
/*  Profile Panel - Manager editing own profile            */
/* ─────────────────────────────────────────────────────── */
function ProfilePanel() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ phone: '', address: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const res = await getMyProfile()
      setProfile(res.data.data)
      setForm({
        phone: res.data.data.phone || '',
        address: res.data.data.address || '',
      })
    } catch { /* silent */ }
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setLoading(true)
    try {
      // Manager can only edit phone and address for themselves
      await updateMyProfile({
        phone: form.phone || null,
        address: form.address || null,
      })
      setSaved(true)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return <div className="text-center py-lg text-on-surface-variant">Loading profile...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-lg">
      {/* Profile Info Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg">
        <div className="flex items-center gap-md mb-lg">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
            <span className="text-on-primary-container font-bold text-2xl">
              {profile.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-headline-lg font-headline-lg text-on-surface">{profile.fullName}</h2>
            <p className="text-body-md text-on-surface-variant">{profile.email}</p>
            <p className="text-label-sm text-on-surface-variant">Role: {profile.role}</p>
          </div>
        </div>

        {/* Read-only fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg border-t border-outline-variant pt-md">
          <div>
            <p className="text-label-sm font-label-sm text-on-surface-variant mb-xs">Department</p>
            <p className="text-body-md text-on-surface">{profile.departmentName || '—'}</p>
          </div>
          <div>
            <p className="text-label-sm font-label-sm text-on-surface-variant mb-xs">Designation</p>
            <p className="text-body-md text-on-surface">{profile.designation || '—'}</p>
          </div>
          <div>
            <p className="text-label-sm font-label-sm text-on-surface-variant mb-xs">Salary</p>
            <p className="text-body-md text-on-surface">${profile.salary?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-label-sm font-label-sm text-on-surface-variant mb-xs">Phone</p>
            <p className="text-body-md text-on-surface">{profile.phone || '—'}</p>
          </div>
          <div>
            <p className="text-label-sm font-label-sm text-on-surface-variant mb-xs">Address</p>
            <p className="text-body-md text-on-surface">{profile.address || '—'}</p>
          </div>
        </div>

        {/* Editable form */}
        <form onSubmit={handleSubmit} className="space-y-sm border-t border-outline-variant pt-md">
          <h3 className="text-title-md font-title-md text-on-surface mb-sm">Editable Information</h3>
          
          {error && (
            <div className="bg-error-container text-on-error-container text-sm rounded-lg px-sm py-2 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}
          
          {saved && (
            <div className="bg-tertiary-container text-on-tertiary-container text-sm rounded-lg px-sm py-2 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Profile updated successfully
            </div>
          )}

          <div className="space-y-xs">
            <label className="text-label-md font-label-md text-on-surface-variant block">Phone</label>
            <input
              type="tel"
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
            />
          </div>

          <div className="space-y-xs">
            <label className="text-label-md font-label-md text-on-surface-variant block">Address</label>
            <input
              type="text"
              placeholder="123 Main St, City"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-DEFAULT bg-primary text-on-primary text-label-md font-label-md font-bold hover:opacity-90 transition-all flex items-center justify-center gap-xs disabled:opacity-50"
          >
            {loading
              ? <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span> Saving...</>
              : 'Save Changes'
            }
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────── */
/*  Team Panel - Manager viewing department members        */
/* ─────────────────────────────────────────────────────── */
function TeamPanel() {
  const [profile, setProfile] = useState(null)
  const [employees, setEmployees] = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const profileRes = await getMyProfile()
        setProfile(profileRes.data.data)
        
        // Backend's GetAllAsync automatically filters by DepartmentId == currentDeptId for Manager role
        // If Manager has no department, backend returns empty array
        const empRes = await getAllEmployees()
        setEmployees(empRes.data.data ?? [])
      } catch (err) {
        console.error('Failed to load team', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // useMemo must be called before any early returns to satisfy Rules of Hooks
  // Exclude the logged-in manager from the list
  const othersInDept = useMemo(() =>
    employees.filter((e) => e.id !== profile?.id), [employees, profile?.id])

  const filtered = useMemo(() =>
    othersInDept.filter((e) =>
      (e.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.designation || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.email || '').toLowerCase().includes(search.toLowerCase())
    ), [othersInDept, search])

  if (loading) {
    return <div className="text-center py-lg text-on-surface-variant">Loading team...</div>
  }

  // If profile hasn't loaded yet, show loading
  if (!profile) {
    return <div className="text-center py-lg text-on-surface-variant">Loading profile...</div>
  }

  // If Manager has no department (department was deleted), show specific message
  if (!profile.departmentId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm">group_off</span>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">No Department Assigned</h2>
          <p className="text-body-md text-on-surface-variant">Department was deleted. No employees in the department.</p>
        </div>
      </div>
    )
  }

  const active   = othersInDept.filter((e) => e.isActive).length
  const deptName = othersInDept[0]?.departmentName ?? profile?.departmentName ?? 'Your Department'

  return (
    <div className="space-y-lg">
      {/* ── Stats Bento ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
        <StatCard icon="groups"       iconColor="text-secondary"  label="Department Size"   value={othersInDept.length} sub={deptName}              />
        <StatCard icon="check_circle" iconColor="text-secondary"  label="Active Members"    value={active}           sub="Currently active"      subColor="text-emerald-600" />
        <StatCard icon="visibility_off" iconColor="text-on-surface-variant" label="Read-Only View" value="—" sub="Contact HR for edits" />
      </div>

      {/* ── Department Members Table ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
        {/* Toolbar */}
        <div className="p-md border-b border-outline-variant flex flex-col sm:flex-row gap-md justify-between items-center">
          <div>
            <h2 className="text-headline-md font-headline-md text-on-surface">{deptName} Members</h2>
            <p className="text-body-md font-body-md text-on-surface-variant mt-0.5">
              Scoped to your department by the server — no client-side filtering applied.
            </p>
          </div>
          <div className="relative w-full sm:w-72 flex-shrink-0">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-lg pr-md py-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary focus:ring-opacity-10 focus:border-secondary outline-none text-body-md font-body-md transition-all"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-lg flex items-center justify-center gap-xs text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Loading team...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Member</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Designation</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((emp) => {
                  const initials = (emp.fullName || emp.email || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                  return (
                    <tr key={emp.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-md py-md">
                        <div className="flex items-center gap-sm">
                          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                            <span className="text-on-primary-container font-bold text-xs">
                              {initials}
                            </span>
                          </div>
                          <div>
                            <div className="text-label-md font-label-md text-on-surface">{emp.fullName || emp.email}</div>
                            <div className="text-label-sm font-label-sm text-outline">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                    <td className="px-md py-md text-body-md text-on-surface-variant">
                      {emp.designation || <span className="text-outline">—</span>}
                    </td>
                    <td className="px-md py-md">
                      <span className={`inline-flex items-center px-xs py-0.5 rounded-full text-xs font-semibold ${
                        emp.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${emp.isActive ? 'bg-emerald-500' : 'bg-outline'}`} />
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-md py-md text-body-md text-on-surface-variant">
                      {emp.managerName || <span className="text-outline">—</span>}
                    </td>
                  </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-lg text-center text-on-surface-variant text-body-md font-body-md">
                      {othersInDept.length === 0
                        ? 'No employees in your department yet.'
                        : 'No members match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer */}
        {!loading && othersInDept.length > 0 && (
          <div className="p-md border-t border-outline-variant bg-surface-container-low flex justify-between items-center">
            <span className="text-label-md font-label-md text-on-surface-variant">
              Showing {filtered.length} of {othersInDept.length} members
            </span>
            <div className="flex items-center gap-xs text-label-sm font-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">info</span>
              Read-only — managed by HR &amp; Admin
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, iconColor, label, value, sub, subColor = 'text-on-surface-variant' }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl ambient-shadow flex flex-col gap-xs">
      <div className="flex items-center justify-between">
        <span className="text-label-md font-label-md text-on-surface-variant">{label}</span>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
      </div>
      <div className="text-headline-lg font-headline-lg text-on-surface">{value}</div>
      <div className={`text-label-sm font-label-sm ${subColor}`}>{sub}</div>
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
        
        // If Manager has no department, they have no branch either
        if (!profileRes.data.data?.departmentId) {
          setLoading(false)
          return
        }
        
        // Get department to find the branch
        const deptRes = await getAllDepartments()
        const myDept = deptRes.data.data?.find(d => d.id === profileRes.data.data.departmentId)
        
        if (myDept?.branchId) {
          const branchRes = await getAllBranches()
          const myBranch = branchRes.data.data?.find(b => b.id === myDept.branchId)
          setBranch(myBranch || null)
        }
      } catch (err) {
        console.error('Failed to load branch', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-lg text-on-surface-variant">Loading branch info...</div>

  // If Manager has no department assigned, show specific message
  if (!profile?.departmentId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm">account_tree</span>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">No Branch Assigned</h2>
          <p className="text-body-md text-on-surface-variant">You haven't been assigned to any department. Contact the Admin.</p>
        </div>
      </div>
    )
  }

  // If department exists but no branch found
  if (!branch) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm">account_tree</span>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">No Branch Found</h2>
          <p className="text-body-md text-on-surface-variant">Your department does not have an associated branch. Contact an administrator.</p>
        </div>
      </div>
    )
  }

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
