import { useEffect, useState, useMemo } from 'react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import {
  getAllDepartments, createDepartment, updateDepartment, deleteDepartment,
  getAllEmployees, createEmployee, updateEmployee, deleteEmployee,
  getMyProfile, updateMyProfile,
  getAllBranches, createBranch, updateBranch, deleteBranch, getBranchDepartments, getBranchDeleteImpact
} from '../../api/hrmsApi'
import AdminLeaveManagementPanel from './AdminLeaveManagementPanel'
import AdminLeaveRequestsPanel from './AdminLeaveRequestsPanel'
import AttendanceManagement from './AttendanceManagement'
import AttendanceSheetPanel from './AttendanceSheetPanel'
import TeamChat from '../../components/TeamChat'

const NAV = [
  { key: 'chat',         label: 'Chat',          icon: 'forum'     },
  { key: 'branches',    label: 'Branches',        icon: 'account_tree'},
  { key: 'departments', label: 'Departments',     icon: 'apartment' },
  { key: 'employees',   label: 'User Management', icon: 'group'     },
  { key: 'attendance',   label: 'Attendance Management', icon: 'event_available' },
  { key: 'attendance-sheet', label: 'Attendance Sheet', icon: 'fact_check' },
  { key: 'leave-management', label: 'Leave Management', icon: 'calendar_today' },
  { key: 'leave-requests', label: 'Leave Requests', icon: 'assignment' },
  { key: 'profile',     label: 'My Profile',      icon: 'person'    },
  { key: 'settings',    label: 'Logout',          icon: 'logout'    },
]

// Dept icon colours cycling through stitch palette
const DEPT_COLORS = [
  { bg: 'bg-primary-container',  fg: 'text-on-primary-container',  icon: 'corporate_fare'   },
  { bg: 'bg-tertiary-container', fg: 'text-on-tertiary-container',  icon: 'account_balance'  },
  { bg: 'bg-surface-container',  fg: 'text-on-surface-variant',     icon: 'terminal'         },
  { bg: 'bg-secondary-fixed',    fg: 'text-on-secondary-fixed',     icon: 'hub'              },
]

const ROLE_BADGE = {
  Admin:    { bg: 'bg-purple-100 text-purple-800',  dot: 'bg-purple-500'  },
  HR:       { bg: 'bg-blue-100 text-blue-800',      dot: 'bg-blue-500'    },
  Manager:  { bg: 'bg-amber-100 text-amber-800',    dot: 'bg-amber-500'   },
  Employee: { bg: 'bg-emerald-100 text-emerald-800',dot: 'bg-emerald-500' },
}

export default function AdminDashboard() {
  const [activeKey, setActiveKey] = useState('departments')

  const pageInfo = {
    chat: {
      title: 'Chat',
      subtitle: 'Direct messaging with employees company-wide.',
    },
    branches: {
      title: 'Branch Management',
      subtitle: 'Oversee company branches, locations, and contact information.',
    },
    departments: {
      title: 'Department Management',
      subtitle: 'Oversee organizational structure, member counts, and edit permissions.',
    },
    employees: {
      title: 'User Management',
      subtitle: 'Manage all employee accounts, roles, departments, and salaries.',
    },
    attendance: {
      title: 'Attendance Management',
      subtitle: 'Manage shifts, employee assignments, and working days across all branches.',
    },
    'attendance-sheet': {
      title: 'Attendance Sheet',
      subtitle: 'Monitor daily attendance across all employees and branches.',
    },
    'leave-management': {
      title: 'Leave Management',
      subtitle: 'Create leave periods and allocate employee leave quotas across the organization.',
    },
    'leave-requests': {
      title: 'Leave Requests',
      subtitle: 'Review and approve employee leave requests across all departments.',
    },
    profile: {
      title: 'My Profile',
      subtitle: 'Manage your personal information',
    },
  }

  return (
      <DashboardLayout
      title={pageInfo[activeKey]?.title || 'Admin Dashboard'}
      subtitle={pageInfo[activeKey]?.subtitle}
      navItems={NAV}
      activeKey={activeKey}
      onNavClick={setActiveKey}
    >
      {activeKey === 'chat'    && <TeamChat />}
      {activeKey === 'branches'    && <BranchesPanel    />}
      {activeKey === 'departments' && <DepartmentsPanel />}
      {activeKey === 'employees'   && <EmployeesPanel   />}
      {activeKey === 'attendance'  && <AttendanceManagement />}
      {activeKey === 'attendance-sheet' && <AttendanceSheetPanel />}
      {activeKey === 'leave-management' && <AdminLeaveManagementPanel />}
      {activeKey === 'leave-requests' && <AdminLeaveRequestsPanel />}
      {activeKey === 'profile'     && <ProfilePanel     />}
    </DashboardLayout>
  )
}

/* ─────────────────────────────────────────────────────── */
/*  Branches Panel                                          */
/* ─────────────────────────────────────────────────────── */
function BranchesPanel() {
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState({ name: '', city: '', phone: '', address: '' })
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const res = await getAllBranches()
      setBranches(res.data.data ?? [])
    } catch { /* handled below */ }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() =>
    branches.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.city || '').toLowerCase().includes(search.toLowerCase())
    ), [branches, search])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (editingId) {
        await updateBranch(editingId, form)
      } else {
        await createBranch(form)
      }
      setForm({ name: '', city: '', phone: '', address: '' })
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (branch) => {
    setEditingId(branch.id)
    setForm({
      name: branch.name,
      city: branch.city || '',
      phone: branch.phone || '',
      address: branch.address || ''
    })
  }

  const handleDelete = async (branch) => {
    try {
      // Fetch the delete impact first
      const res = await getBranchDeleteImpact(branch.id)
      const { departmentCount, employeeCount } = res.data.data

      // Build the warning message based on whether the branch has content
      let message
      if (departmentCount === 0 && employeeCount === 0) {
        // Empty branch - lighter message
        message = `Delete "${branch.name}"? It has no departments or employees.`
      } else {
        // Branch with content - detailed warning
        message = `"${branch.name}" has ${departmentCount} department(s) and ${employeeCount} employee(s).\n\n` +
          `Deleting this branch will permanently remove all ${departmentCount} department(s), ` +
          `and all ${employeeCount} employee(s) will become unassigned (no department, no branch) ` +
          `until reassigned by Admin.\n\nContinue?`
      }

      const confirmed = window.confirm(message)
      if (!confirmed) return

      // Proceed with deletion only after confirmation
      await deleteBranch(branch.id)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete branch.')
    }
  }

  const totalEmployees = branches.reduce((s, b) => s + (b.employeeCount || 0), 0)
  const totalDepartments = branches.reduce((s, b) => s + (b.departmentCount || 0), 0)

  return (
    <div className="space-y-lg">
      {/* ── Stats Bento Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <StatCard icon="account_tree" iconColor="text-secondary"  label="Total Branches"    value={branches.length}   sub="Active locations"       />
        <StatCard icon="apartment"    iconColor="text-secondary"  label="Total Departments" value={totalDepartments}  sub="Across all branches"    />
        <StatCard icon="group"        iconColor="text-secondary"  label="Total Employees"   value={totalEmployees}    sub="Across all branches"    />
        <StatCard icon="speed"        iconColor="text-secondary"  label="System Uptime"     value="99.98%"            sub="Optimal Performance" subColor="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        {/* ── Branches Table ── */}
        <div className="xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
          <div className="p-md border-b border-outline-variant flex flex-col sm:flex-row gap-md justify-between items-center">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Search branches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-lg pr-md py-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary focus:ring-opacity-10 focus:border-secondary outline-none text-body-md font-body-md transition-all"
              />
            </div>
            <span className="text-label-md font-label-md text-on-surface-variant whitespace-nowrap">
              {filtered.length} of {branches.length} branches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Branch</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Contact</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider text-center">Depts</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider text-center">Staff</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((b, i) => {
                  const color = DEPT_COLORS[i % DEPT_COLORS.length]
                  return (
                    <tr key={b.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-md py-md">
                        <div className="flex items-center gap-sm">
                          <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                            <span className={`material-symbols-outlined text-[20px] ${color.fg}`}>account_tree</span>
                          </div>
                          <div>
                            <div className="text-label-md font-label-md text-on-surface">{b.name}</div>
                            <div className="text-label-sm font-label-sm text-outline">
                              {b.city || 'No city'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-md py-md">
                        <div className="text-body-md text-on-surface-variant">{b.phone || '—'}</div>
                        <div className="text-label-sm text-outline truncate max-w-xs">{b.address || '—'}</div>
                      </td>
                      <td className="px-md py-md text-body-md text-center font-semibold">{b.departmentCount || 0}</td>
                      <td className="px-md py-md text-body-md text-center font-semibold">{b.employeeCount || 0}</td>
                      <td className="px-md py-md text-right">
                        <div className="flex justify-end gap-xs">
                          <button
                            type="button"
                            onClick={() => handleEdit(b)}
                            className="p-xs hover:bg-surface-container transition-colors rounded text-on-surface-variant material-symbols-outlined text-[20px]"
                            title="Edit"
                          >
                            edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b)}
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
                    <td colSpan={5} className="py-lg text-center text-on-surface-variant text-body-md font-body-md">
                      {branches.length === 0 ? 'No branches yet — create one.' : 'No matches found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Add / Edit Form ── */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg h-fit">
          <h2 className="text-headline-md font-headline-md text-on-surface mb-md">
            {editingId ? 'Edit Branch' : 'Add Branch'}
          </h2>
          {error && (
            <div className="mb-md bg-error-container text-on-error-container text-sm rounded-lg px-sm py-2 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-sm">
            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block">
                Branch Name *
              </label>
              <input
                required
                placeholder="e.g. Headquarters"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-11 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
              />
            </div>
            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block">
                City
              </label>
              <input
                placeholder="e.g. New York"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full h-11 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
              />
            </div>
            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block">
                Phone
              </label>
              <input
                placeholder="+1 555 123 4567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-11 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
              />
            </div>
            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block">
                Address
              </label>
              <textarea
                rows={2}
                placeholder="Full address details"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-sm py-2 border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all resize-none"
              />
            </div>
            <div className="flex gap-sm pt-xs">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 rounded-DEFAULT bg-primary text-on-primary text-label-md font-label-md font-bold hover:opacity-90 transition-all flex items-center justify-center gap-xs disabled:opacity-50"
              >
                {loading
                  ? <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span> Saving...</>
                  : editingId ? 'Update' : 'Create'
                }
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm({ name: '', city: '', phone: '', address: '' }); setError('') }}
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

/* ─────────────────────────────────────────────────────── */
/*  Departments Panel                                       */
/* ─────────────────────────────────────────────────────── */
function DepartmentsPanel() {
  const [departments, setDepartments] = useState([])
  const [branches, setBranches] = useState([])
  const [form, setForm]     = useState({ name: '', description: '', branchName: '' })
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const [deptRes, branchRes] = await Promise.all([
        getAllDepartments(),
        getAllBranches()
      ])
      setDepartments(deptRes.data.data ?? [])
      setBranches(branchRes.data.data ?? [])
    } catch { /* handled below */ }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() =>
    departments.filter((d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(search.toLowerCase())
    ), [departments, search])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (editingId) {
        await updateDepartment(editingId, { name: form.name, description: form.description })
      } else {
        await createDepartment(form)
      }
      setForm({ name: '', description: '', branchName: '' })
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (dept) => {
    setEditingId(dept.id)
    setForm({ name: dept.name, description: dept.description || '', branchName: '' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this department? All employee records will lose their department.')) return
    try {
      await deleteDepartment(id)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.')
    }
  }

  const totalEmployees = departments.reduce((s, d) => s + (d.employeeCount || 0), 0)

  return (
    <div className="space-y-lg">
      {/* ── Stats Bento Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <StatCard icon="apartment"  iconColor="text-secondary"  label="Total Departments" value={departments.length} sub="+active"            />
        <StatCard icon="group"      iconColor="text-secondary"  label="Total Employees"   value={totalEmployees}     sub="across all depts"   />
        <StatCard icon="warning"    iconColor="text-error"      label="Security Alerts"   value={0}                  sub="Last 24 hours"      />
        <StatCard icon="speed"      iconColor="text-secondary"  label="System Uptime"     value="99.98%"             sub="Optimal Performance" subColor="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        {/* ── Departments Table ── */}
        <div className="xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
          {/* Table toolbar */}
          <div className="p-md border-b border-outline-variant flex flex-col sm:flex-row gap-md justify-between items-center">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                type="text"
                placeholder="Search departments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-lg pr-md py-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary focus:ring-opacity-10 focus:border-secondary outline-none text-body-md font-body-md transition-all"
              />
            </div>
            <span className="text-label-md font-label-md text-on-surface-variant whitespace-nowrap">
              {filtered.length} of {departments.length} departments
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Department</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Branch</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider text-center">Members</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((d, i) => {
                  const color = DEPT_COLORS[i % DEPT_COLORS.length]
                  return (
                    <tr key={d.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-md py-md">
                        <div className="flex items-center gap-sm">
                          <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                            <span className={`material-symbols-outlined text-[20px] ${color.fg}`}>{color.icon}</span>
                          </div>
                          <div>
                            <div className="text-label-md font-label-md text-on-surface">{d.name}</div>
                            <div className="text-label-sm font-label-sm text-outline">
                              {d.description || 'No description'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-md py-md text-body-md text-on-surface-variant">{d.branchName || '—'}</td>
                      <td className="px-md py-md text-body-md text-center font-semibold">{d.employeeCount}</td>
                      <td className="px-md py-md text-right">
                        <div className="flex justify-end gap-xs">
                          <button
                            type="button"
                            onClick={() => handleEdit(d)}
                            className="p-xs hover:bg-surface-container transition-colors rounded text-on-surface-variant material-symbols-outlined text-[20px]"
                            title="Edit"
                          >
                            edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(d.id)}
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
                    <td colSpan={4} className="py-lg text-center text-on-surface-variant text-body-md font-body-md">
                      {departments.length === 0 ? 'No departments yet — create one.' : 'No matches found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Add / Edit Form ── */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg h-fit">
          <h2 className="text-headline-md font-headline-md text-on-surface mb-md">
            {editingId ? 'Edit Department' : 'Add Department'}
          </h2>
          {error && (
            <div className="mb-md bg-error-container text-on-error-container text-sm rounded-lg px-sm py-2 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-sm">
            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block">
                Department Name *
              </label>
              <input
                required
                placeholder="e.g. Engineering"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-11 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
              />
            </div>
            {!editingId && (
              <div className="space-y-xs">
                <label className="text-label-md font-label-md text-on-surface-variant block">
                  Branch *
                </label>
                <select
                  required
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  className="w-full h-11 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                >
                  <option value="">Select a branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-sm py-2 border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all resize-none"
              />
            </div>
            <div className="flex gap-sm pt-xs">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 rounded-DEFAULT bg-primary text-on-primary text-label-md font-label-md font-bold hover:opacity-90 transition-all flex items-center justify-center gap-xs disabled:opacity-50"
              >
                {loading
                  ? <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span> Saving...</>
                  : editingId ? 'Update' : 'Create'
                }
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm({ name: '', description: '', branchName: '' }); setError('') }}
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

/* ─────────────────────────────────────────────────────── */
/*  Profile Panel - Admin editing own profile              */
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
      // Admin can only edit phone and address for themselves
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
/*  Employees Panel                                         */
/* ─────────────────────────────────────────────────────── */
function EmployeesPanel() {
  const [employees,   setEmployees]   = useState([])
  const [branches, setBranches] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [branchDepartments, setBranchDepartments] = useState([])
  const [myProfile, setMyProfile] = useState(null)
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', role: 'Employee',
    phone: '', address: '', designation: '', salary: '', departmentId: '', managerId: '',
  })
  const [search, setSearch]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const [empRes, profileRes, branchRes] = await Promise.all([
        getAllEmployees(), 
        getMyProfile(),
        getAllBranches()
      ])
      setEmployees(empRes.data.data ?? [])
      setMyProfile(profileRes.data.data)
      setBranches(branchRes.data.data ?? [])
      setMyProfile(profileRes.data.data)
    } catch { /* silent */ }
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (selectedBranchId) {
      getBranchDepartments(Number(selectedBranchId))
        .then(res => setBranchDepartments(res.data.data ?? []))
        .catch(() => setBranchDepartments([]))
    } else {
      setBranchDepartments([])
    }
  }, [selectedBranchId])

  const handleBranchChange = (e) => {
    setSelectedBranchId(e.target.value)
    setForm(prev => ({ ...prev, departmentId: '' })) // Clear department selection
  }

  const filtered = useMemo(() =>
    employees
      .filter((e) => e.id !== myProfile?.id) // Exclude logged-in admin from list
      .filter((e) =>
        e.fullName.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()) ||
        (e.role || '').toLowerCase().includes(search.toLowerCase())
      ), [employees, search, myProfile])

  const ROLE_MAP = { Admin: 1, HR: 2, Manager: 3, Employee: 4 }
  const ROLE_NUM_TO_STR = { 1: 'Admin', 2: 'HR', 3: 'Manager', 4: 'Employee' }

  const normalizeRole = (role) => {
    if (typeof role === 'number') {
      return ROLE_NUM_TO_STR[role] || 'Employee'
    }
    if (typeof role !== 'string') {
      return 'Employee'
    }
    const asNumber = Number(role)
    if (!Number.isNaN(asNumber) && ROLE_NUM_TO_STR[asNumber]) {
      return ROLE_NUM_TO_STR[asNumber]
    }
    const normalized = role.trim().charAt(0).toUpperCase() + role.trim().slice(1).toLowerCase()
    return ROLE_MAP[normalized] ? normalized : 'Employee'
  }

  const getRoleNum = (role) => {
    if (typeof role === 'number' && ROLE_NUM_TO_STR[role]) {
      return role
    }
    if (typeof role !== 'string') {
      return 4
    }
    const asNumber = Number(role)
    if (!Number.isNaN(asNumber) && ROLE_NUM_TO_STR[asNumber]) {
      return asNumber
    }
    const normalized = role.trim().charAt(0).toUpperCase() + role.trim().slice(1).toLowerCase()
    return ROLE_MAP[normalized] || 4
  }

  const [editingEmpId, setEditingEmpId] = useState(null)

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (editingEmpId) {
        // Build payload based on editable fields for this role
        // NOTE: Admin CANNOT change roles - only new user creation allows role assignment
        const updatePayload = {
          fullName:     form.fullName || '',
          phone:        form.phone || null,
          address:      form.address || null,
          salary:       form.salary ? Number(form.salary) : 0,
          departmentId: form.departmentId ? Number(form.departmentId) : null,
          designation:  form.designation || null,
          managerId:    form.managerId ? Number(form.managerId) : null,
          isActive:     true,
          // role is NOT included - roles cannot be changed after creation
        }

        await updateEmployee(editingEmpId, updatePayload)
      } else {
        // Creating new employee - all fields are editable
        const payload = {
          fullName:     form.fullName,
          email:        form.email,
          password:     form.password,
          phone:        form.phone || null,
          address:      form.address || null,
          designation:  form.designation || null,
          salary:       form.salary ? Number(form.salary) : 0,
          role:         ROLE_MAP[form.role] || 4,
          departmentId: form.departmentId ? Number(form.departmentId) : null,
          managerId:    form.managerId ? Number(form.managerId) : null,
        }
        await createEmployee(payload)
      }

      setForm({
        fullName: '', email: '', password: '', role: 'Employee',
        phone: '', address: '', designation: '', salary: '', departmentId: '', managerId: '',
      })
      setEditingEmpId(null)
      await load()
    } catch (err) {
      const backendMsg = err.response?.data?.message || err.response?.data?.Message || err.response?.data?.title
      const validationErrors = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : null
      setError(validationErrors || backendMsg || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (emp) => {
    setEditingEmpId(emp.id)
    setSelectedBranchId(emp.branchId ? String(emp.branchId) : '')
    setForm({
      fullName: emp.fullName || '',
      email: emp.email || '',
      password: '',
      role: normalizeRole(emp.role),
      phone: emp.phone || '',
      address: emp.address || '',
      designation: emp.designation || '',
      salary: emp.salary ? String(emp.salary) : '',
      departmentId: emp.departmentId ? String(emp.departmentId) : '',
      managerId: emp.managerId ? String(emp.managerId) : '',
    })
  }

  const handleCancelEdit = () => {
    setEditingEmpId(null)
    setSelectedBranchId('')
    setForm({
      fullName: '', email: '', password: '', role: 'Employee',
      phone: '', address: '', designation: '', salary: '', departmentId: '', managerId: '',
    })
    setError('')
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return
    try {
      await deleteEmployee(id)
      await load()
    } catch (err) {
      const backendMsg = err.response?.data?.message || err.response?.data?.Message || err.response?.data?.title
      setError(backendMsg || 'Delete failed.')
    }
  }

  const active = employees.filter((e) => e.isActive).length

  return (
    <div className="space-y-lg">
      {/* ── Stats Bento Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <StatCard icon="group"             iconColor="text-secondary" label="Total Users"      value={employees.length} sub="All roles"              />
        <StatCard icon="verified_user"     iconColor="text-secondary" label="Active Accounts"  value={active}           sub="Currently active"       subColor="text-emerald-600" />
        <StatCard icon="admin_panel_settings" iconColor="text-secondary" label="Admins & HR"   value={employees.filter(e => e.role==='Admin'||e.role==='HR').length} sub="Privileged roles" />
        <StatCard icon="badge"             iconColor="text-secondary" label="Managers"         value={employees.filter(e => e.role==='Manager').length} sub="Department leads" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        {/* ── Employees Table ── */}
        <div className="xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
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
              {filtered.length} users
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">User</th>
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
                  return (
                    <tr key={emp.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-md py-md">
                        <div className="flex items-center gap-sm">
                          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                            <span className="text-on-primary-container font-bold text-xs">
                              {emp.fullName.split(' ').map((w)=>w[0]).slice(0,2).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-label-md font-label-md text-on-surface">{emp.fullName}</div>
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
                            title="Edit user"
                          >
                            edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(emp.id)}
                            className="p-xs hover:bg-error-container hover:text-error transition-colors rounded text-on-surface-variant material-symbols-outlined text-[20px]"
                            title="Delete user"
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
                      {employees.length === 0 ? 'No users yet — create one.' : 'No matches found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Add / Edit User Form ── */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-lg h-fit">
          <h2 className="text-headline-md font-headline-md text-on-surface mb-md">
            {editingEmpId ? 'Edit User' : 'Add User'}
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
                    placeholder="John Smith"
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
                    placeholder="john@company.com"
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

            {/* Fields shown when editing - based on role restrictions */}
            {/* ADMIN can edit: Salary, Phone, Address, Designation (HR only), Department */}
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

            {/* Designation field - only show for HR when editing, or when creating new user */}
            {(!editingEmpId || form.role === 'HR') && (
              <div className="space-y-xs">
                <label className="text-label-md font-label-md text-on-surface-variant block">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Developer"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                />
              </div>
            )}

            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block">Salary</label>
              <input
                type="number"
                placeholder="50000"
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
              />
            </div>

            {/* Role selector - only when creating new user */}
            {!editingEmpId && (
              <div className="space-y-xs">
                <label className="text-label-md font-label-md text-on-surface-variant block">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
                >
                  {['Admin', 'HR', 'Manager', 'Employee'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Branch selector */}
            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block">Branch {!editingEmpId && '*'}</label>
              <select
                required={!editingEmpId}
                value={selectedBranchId}
                onChange={handleBranchChange}
                className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
              >
                <option value="">Select a branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Department selector */}
            <div className="space-y-xs">
              <label className="text-label-md font-label-md text-on-surface-variant block">Department</label>
              <select
                disabled={!selectedBranchId}
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full h-10 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all disabled:opacity-50 disabled:bg-surface-container"
              >
                {!selectedBranchId ? (
                  <option value="">Select a branch first</option>
                ) : (
                  <>
                    <option value="">No department</option>
                    {branchDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </>
                )}
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
                  : editingEmpId ? 'Update User' : 'Create User'
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

/* ── Reusable stat card (stitch bento design) ── */
function StatCard({ icon, iconColor, label, value, sub, subColor = 'text-on-surface-variant' }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl ambient-shadow flex flex-col gap-xs">
      <div className="flex items-center justify-between">
        <span className="text-label-md font-label-md text-on-surface-variant">{label}</span>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
      </div>
      <div className="text-headline-lg font-headline-lg text-on-surface">{value}</div>
      <div className={`text-label-sm font-label-sm flex items-center gap-1 ${subColor}`}>
        {sub}
      </div>
    </div>
  )
}
