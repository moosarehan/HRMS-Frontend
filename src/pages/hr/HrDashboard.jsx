import { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LeavePanel from '../../components/LeavePanel'
import { 
  getAllEmployees, 
  getAllDepartments, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee,
  getMyProfile,
  updateMyProfile,
  getAllBranches,
  getBranchDepartments
} from '../../api/hrmsApi'

const NAV = [
  { key: 'branch',     label: 'My Branch',           icon: 'account_tree' },
  { key: 'department', label: 'My Department',       icon: 'apartment' },
  { key: 'employees',  label: 'Employees & Managers', icon: 'group'     },
  { key: 'leave',      label: 'Leave',               icon: 'calendar_today' },
  { key: 'profile',    label: 'My Profile',          icon: 'person'    },
  { key: 'settings',   label: 'Logout',              icon: 'logout'    },
]

const ROLE_BADGE = {
  Manager:  { bg: 'bg-amber-100 text-amber-800',    dot: 'bg-amber-500'   },
  Employee: { bg: 'bg-emerald-100 text-emerald-800',dot: 'bg-emerald-500' },
}

export default function HrDashboard() {
  const [activeKey, setActiveKey] = useState('branch')
  // Share employees state across panels to avoid API filtering issues
  const [sharedEmployees, setSharedEmployees] = useState([])

  const getTitle = () => {
    switch(activeKey) {
      case 'branch': return 'My Branch'
      case 'department': return 'My Department'
      case 'employees': return 'Employees & Managers'
      case 'leave': return 'Leave'
      case 'profile': return 'My Profile'
      default: return 'HR Dashboard'
    }
  }

  const getSubtitle = () => {
    switch(activeKey) {
      case 'branch': return 'View your branch details (read-only)'
      case 'department': return 'View your department details (read-only)'
      case 'employees': return 'Create, manage, and remove employee and manager accounts.'
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
      {activeKey === 'department' && <DepartmentPanel sharedEmployees={sharedEmployees} onEmployeesLoad={setSharedEmployees} />}
      {activeKey === 'employees' && <EmployeesPanel sharedEmployees={sharedEmployees} onEmployeesLoad={setSharedEmployees} />}
      {activeKey === 'leave' && <LeavePanel />}
      {activeKey === 'profile' && <ProfilePanel />}
    </DashboardLayout>
  )
}

/* ─────────────────────────────────────────────────────── */
/*  Department Panel - HR viewing own department           */
/* ─────────────────────────────────────────────────────── */
function DepartmentPanel({ sharedEmployees, onEmployeesLoad }) {
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
      const fetchedEmployees = empRes.data.data ?? []
      setEmployees(fetchedEmployees)
      onEmployeesLoad?.(fetchedEmployees) // Share with parent
      
      // If HR has a department, fetch all departments to find theirs
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

  useEffect(() => { 
    // Use shared employees if available, otherwise load fresh
    if (sharedEmployees.length > 0) {
      setEmployees(sharedEmployees)
      // Still need to load profile and department
      const loadProfileAndDept = async () => {
        try {
          const profileRes = await getMyProfile()
          setProfile(profileRes.data.data)
          if (profileRes.data.data?.departmentId) {
            const deptRes = await getAllDepartments()
            const myDept = deptRes.data.data?.find(d => d.id === profileRes.data.data.departmentId)
            setDepartment(myDept)
          }
        } catch (err) {
          console.error('Failed to load profile/department', err)
        } finally {
          setLoading(false)
        }
      }
      loadProfileAndDept()
    } else {
      load()
    }
  }, [])

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

  // Find managers in this department
  // More robust role checking
  const isManager = (emp) => {
    const role = emp.role
    // Check if role is "Manager" string, or number 3, or string "3"
    return role === 'Manager' || role === 3 || role === '3' || 
           (typeof role === 'string' && role.toLowerCase() === 'manager')
  }
  
  const departmentManagers = employees.filter(
    emp => String(emp.departmentId) === String(department.id) && isManager(emp)
  )
  
  // For HR: show names of ALL managers assigned to that department (use email if fullName is empty/whitespace)
  const managerNames = departmentManagers.length > 0 
    ? departmentManagers.map(m => (m.fullName && m.fullName.trim() !== '') ? m.fullName : m.email).join(', ')
    : 'Not Assigned'

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
/*  Profile Panel - HR editing own profile                 */
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
      // HR can only edit phone and address for themselves
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
/*  Employees Panel - HR managing Managers/Employees       */
/* ─────────────────────────────────────────────────────── */
function EmployeesPanel({ sharedEmployees, onEmployeesLoad }) {
  const [profile, setProfile] = useState(null)
  const [employees,   setEmployees]   = useState([])
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', role: 'Employee',
    designation: '', salary: '', departmentId: '', phone: '', address: '',
  })
  const [editingEmpId, setEditingEmpId] = useState(null)
  const [search, setSearch]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const load = async () => {
    try {
      const [profileRes, empRes, deptRes] = await Promise.all([
        getMyProfile(),
        getAllEmployees(), 
        getAllDepartments()
      ])
      setProfile(profileRes.data.data)
      // Backend already scopes HR's view to Employee/Manager only — no extra filtering needed
      const fetchedEmployees = empRes.data.data ?? []
      setEmployees(fetchedEmployees)
      onEmployeesLoad?.(fetchedEmployees) // Share with parent
      setDepartments(deptRes.data.data ?? [])
    } catch { /* silent */ } finally {
      setInitialLoading(false)
    }
  }
  
  useEffect(() => { 
    // Use shared employees if available, otherwise load fresh
    if (sharedEmployees.length > 0) {
      setEmployees(sharedEmployees)
      // Still need to load profile and departments
      Promise.all([getMyProfile(), getAllDepartments()])
        .then(([profileRes, deptRes]) => {
          setProfile(profileRes.data.data)
          setDepartments(deptRes.data.data ?? [])
        })
        .catch(() => {})
        .finally(() => setInitialLoading(false))
    } else {
      load()
    }
  }, [])

  // useMemo must be called before any early returns to satisfy Rules of Hooks
  const filtered = useMemo(() =>
    employees.filter((e) =>
      (e.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.role || '').toLowerCase().includes(search.toLowerCase())
    ), [employees, search])

  // Show loading state initially
  if (initialLoading) {
    return <div className="text-center py-lg text-on-surface-variant">Loading employees...</div>
  }

  // If profile hasn't loaded yet, show loading
  if (!profile) {
    return <div className="text-center py-lg text-on-surface-variant">Loading profile...</div>
  }

  // If HR has no department (department was deleted), show specific message
  if (!profile.departmentId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm">group_off</span>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">Department Deleted</h2>
          <p className="text-body-md text-on-surface-variant">Department was deleted by Admin. No employees/managers exist.</p>
        </div>
      </div>
    )
  }


  const ROLE_MAP = { Manager: 3, Employee: 4 }
  const getRoleNum = (role) => {
    if (typeof role === 'number') return role
    if (typeof role === 'string') {
      const num = Number(role)
      if (!isNaN(num)) return num
      return ROLE_MAP[role] || 4
    }
    return 4
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (editingEmpId) {
        // HR editing Manager or Employee - can edit: Salary, Phone, Address, Designation, Department
        // MUST preserve the existing role - HR cannot change roles
        await updateEmployee(editingEmpId, {
          salary:       form.salary ? Number(form.salary) : 0,
          phone:        form.phone || null,
          address:      form.address || null,
          designation:  form.designation || null,
          departmentId: form.departmentId ? Number(form.departmentId) : null,
          role:         getRoleNum(form.role), // Preserve existing role
          isActive:     true,
        })
      } else {
        // Creating new employee/manager
        await createEmployee({
          fullName:     form.fullName,
          email:        form.email,
          password:     form.password,
          role:         ROLE_MAP[form.role] || 4,
          salary:       form.salary ? Number(form.salary) : 0,
          designation:  form.designation || null,
          departmentId: form.departmentId ? Number(form.departmentId) : null,
          phone:        form.phone || null,
          address:      form.address || null,
        })
      }
      setForm({ 
        fullName: '', email: '', password: '', role: 'Employee', 
        designation: '', salary: '', departmentId: '', phone: '', address: '' 
      })
      setEditingEmpId(null)
      await load()
    } catch (err) {
      // Backend returns 400 if HR tries Admin/HR role — surfaced directly from API
      const backendMsg = err.response?.data?.message || err.response?.data?.Message || err.response?.data?.title
      const validationErrors = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : null
      setError(validationErrors || backendMsg || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (emp) => {
    setEditingEmpId(emp.id)
    setForm({
      fullName: emp.fullName || '',
      email: emp.email || '',
      password: '',
      role: emp.role || 'Employee',
      phone: emp.phone || '',
      address: emp.address || '',
      designation: emp.designation || '',
      salary: emp.salary ? String(emp.salary) : '',
      departmentId: emp.departmentId ? String(emp.departmentId) : '',
    })
  }

  const handleCancelEdit = () => {
    setEditingEmpId(null)
    setForm({
      fullName: '', email: '', password: '', role: 'Employee',
      designation: '', salary: '', departmentId: '', phone: '', address: '',
    })
    setError('')
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return
    try {
      await deleteEmployee(id)
      await load()
    } catch (err) {
      const backendMsg = err.response?.data?.message || err.response?.data?.Message || err.response?.data?.title
      setError(backendMsg || 'You cannot delete this account.')
    }
  }

  const managers  = employees.filter((e) => e.role === 'Manager').length
  const emps      = employees.filter((e) => e.role === 'Employee').length

  return (
    <div className="space-y-lg">
      {/* ── Stats Bento ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <StatCard icon="group"   iconColor="text-secondary" label="Total Personnel"  value={employees.length}  sub="In your scope"          />
        <StatCard icon="badge"   iconColor="text-secondary" label="Managers"         value={managers}           sub="Department leads"       subColor="text-amber-600" />
        <StatCard icon="person"  iconColor="text-secondary" label="Employees"        value={emps}               sub="Individual contributors" subColor="text-emerald-600" />
        <StatCard icon="apartment" iconColor="text-secondary" label="Departments"    value={departments.length} sub="Active departments"      />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        {/* ── Employees Table ── */}
        <div className="xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
          {/* Toolbar */}
          <div className="p-md border-b border-outline-variant flex flex-col sm:flex-row gap-md justify-between items-center">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Search by name, email, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-lg pr-md py-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary focus:ring-opacity-10 focus:border-secondary outline-none text-body-md font-body-md transition-all"
              />
            </div>
            <span className="text-label-md font-label-md text-on-surface-variant whitespace-nowrap">
              {filtered.length} records
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Employee</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Role</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Department</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Phone</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Address</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Salary</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((emp) => {
                  const badge = ROLE_BADGE[emp.role] || ROLE_BADGE.Employee
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
                      <td className="px-md py-md">
                        <span className={`inline-flex items-center px-xs py-0.5 rounded-full text-xs font-semibold ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mr-1.5`} />
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-md py-md text-body-md text-on-surface-variant">
                        {emp.departmentName || <span className="text-outline">—</span>}
                      </td>
                      <td className="px-md py-md text-body-md text-on-surface-variant">
                        {emp.phone || <span className="text-outline">—</span>}
                      </td>
                      <td className="px-md py-md text-body-md text-on-surface-variant max-w-xs truncate">
                        {emp.address || <span className="text-outline">—</span>}
                      </td>
                      <td className="px-md py-md text-body-md font-semibold">
                        ${emp.salary?.toLocaleString()}
                      </td>
                      <td className="px-md py-md text-right">
                        <div className="flex justify-end gap-xs">
                          <button
                            type="button"
                            onClick={() => handleEdit(emp)}
                            className="p-xs hover:bg-surface-container transition-colors rounded text-on-surface-variant material-symbols-outlined text-[20px]"
                            title="Edit"
                          >
                            edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(emp.id)}
                            className="p-xs hover:bg-error-container hover:text-error transition-colors rounded text-on-surface-variant material-symbols-outlined text-[20px]"
                            title="Delete"
                          >
                            delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-lg text-center text-on-surface-variant text-body-md font-body-md">
                      {employees.length === 0 
                        ? 'No employees assigned to this department yet.' 
                        : 'No matches for your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

          {/* ── Add / Edit Employee / Manager Form ── */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg h-fit">
            <h2 className="text-headline-md font-headline-md text-on-surface mb-md">
              {editingEmpId ? 'Edit Employee / Manager' : 'Add Employee / Manager'}
            </h2>
            {error && (
              <div className="mb-md bg-error-container text-on-error-container text-sm rounded-lg px-sm py-2 flex items-center gap-xs">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-sm">
              {/* Show all fields when creating new user */}
              {!editingEmpId && (
                <>
                  <div className="space-y-xs">
                    <label className="text-label-md font-label-md text-on-surface-variant block">Full Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="Jane Smith"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-md font-label-md text-on-surface-variant block">Email *</label>
                    <input
                      required
                      type="email"
                      placeholder="jane@company.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-md font-label-md text-on-surface-variant block">Password *</label>
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                    />
                  </div>
                </>
              )}

              {/* HR can edit: Salary, Phone, Address, Designation, Department */}
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

              <div className="space-y-xs">
                <label className="text-label-md font-label-md text-on-surface-variant block">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Team Lead"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                />
              </div>

              <div className="space-y-xs">
                <label className="text-label-md font-label-md text-on-surface-variant block">Salary</label>
                <input
                  type="number"
                  placeholder="45000"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                />
              </div>

              {/* Role — HR can only create Employee or Manager, cannot edit role */}
              {!editingEmpId && (
                <div className="space-y-xs">
                  <label className="text-label-md font-label-md text-on-surface-variant block">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                  </select>
                  <p className="text-label-sm font-label-sm text-on-surface-variant">
                    HR can only create Employee or Manager accounts.
                  </p>
                </div>
              )}

              <div className="space-y-xs">
                <label className="text-label-md font-label-md text-on-surface-variant block">Department</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                >
                  <option value="">No department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-sm pt-xs">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 rounded-DEFAULT bg-primary text-on-primary text-label-md font-label-md font-bold hover:opacity-90 transition-all flex items-center justify-center gap-xs disabled:opacity-50"
                >
                  {loading
                    ? <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span> Saving...</>
                    : editingEmpId ? 'Update' : 'Create Account'
                  }
                </button>
                {editingEmpId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="h-11 px-md rounded-DEFAULT border border-outline-variant text-label-md font-label-md text-on-surface-variant hover:bg-surface-container transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
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
        
        // If HR has no department, they have no branch either
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

  // If HR has no department assigned, show specific message
  if (!profile?.departmentId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-sm">account_tree</span>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-xs">No Branch Assigned</h2>
          <p className="text-body-md text-on-surface-variant">You haven't been assigned to a department yet. Contact the Admin.</p>
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
