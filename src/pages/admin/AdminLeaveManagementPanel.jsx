import { useEffect, useState, useMemo } from 'react'
import {
  getAllQuotasForPeriod,
  updateLeaveQuota,
  getAllEmployees,
  createLeavePeriod,
  createLeaveQuota,
  getAllLeaves,
} from '../../api/hrmsApi'
import { useLeave } from '../../context/LeaveContext'
import { formatLeaveDays } from '../../utils/leaveUtils'

export default function AdminLeaveManagementPanel() {
  const { currentPeriod, periodLoading, refreshCurrentPeriod, leaveTypes } = useLeave()
  const [quotas, setQuotas] = useState([])
  const [employees, setEmployees] = useState([])
  const [allLeaveRequests, setAllLeaveRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [quotaFormData, setQuotaFormData] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState('All Departments')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [createPeriodModalOpen, setCreatePeriodModalOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [deletingPeriod, setDeletingPeriod] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  // Pagination
  const itemsPerPage = 10

  // Check if current period has expired (for new year scenario)
  const isPeriodExpired = useMemo(() => {
    if (!currentPeriod?.endDate) return false
    const today = new Date()
    const endDate = new Date(currentPeriod.endDate)
    today.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    return today > endDate
  }, [currentPeriod])

  // Treat expired period as "no period" for UI purposes
  const effectivePeriod = isPeriodExpired ? null : currentPeriod

  // Load total employee count immediately (for stats card)
  const [totalEmployeeCount, setTotalEmployeeCount] = useState(0)

  // Load total employee count on mount (for display)
  useEffect(() => {
    const loadEmployeeCount = async () => {
      try {
        const empRes = await getAllEmployees()
        setTotalEmployeeCount(empRes.data?.data?.length || 0)
      } catch (err) {
        console.error('Failed to load employee count:', err)
      }
    }
    loadEmployeeCount()
  }, [])

  // Load employees only AFTER period exists
  useEffect(() => {
    if (!effectivePeriod?.id) {
      setEmployees([])
      setLoading(false)
      return
    }
    
    const loadData = async () => {
      setLoading(true)
      try {
        const empRes = await getAllEmployees()
        setEmployees(empRes.data?.data || [])
        setError('')
      } catch (err) {
        console.error('Failed to load employees:', err)
        setError('Failed to load employees')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [effectivePeriod])

  // Load quotas when period changes
  useEffect(() => {
    if (!effectivePeriod?.id) {
      setQuotas([])
      return
    }
    const loadQuotas = async () => {
      try {
        const [quotasRes, leavesRes] = await Promise.all([
          getAllQuotasForPeriod(effectivePeriod.id),
          getAllLeaves()
        ])
        setQuotas(quotasRes.data?.data || [])
        setAllLeaveRequests(leavesRes.data?.data || [])
      } catch (err) {
        console.error('Failed to load quotas or leaves:', err)
      }
    }
    loadQuotas()
  }, [effectivePeriod])

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(
      employees
        .filter(e => e.departmentName)
        .map(e => e.departmentName)
    )
    return Array.from(depts).sort()
  }, [employees])

  // Group quotas by employee and leave type
  const employeeQuotasMap = useMemo(() => {
    const map = new Map()
    quotas.forEach(quota => {
      if (!map.has(quota.employeeId)) {
        map.set(quota.employeeId, {})
      }
      map.get(quota.employeeId)[quota.leaveTypeId] = quota
    })
    return map
  }, [quotas])

  const allEmployeeRows = useMemo(() => {
    return employees
      .filter(emp => emp.role !== 'Admin') // Exclude admins
      .map(emp => {
        const empQuotasMap = employeeQuotasMap.get(emp.id) || {}
        const empQuotasArray = Object.values(empQuotasMap)
        
        // Find currently active approved leave for this employee
        const today = new Date(currentTime)
        today.setHours(0, 0, 0, 0) // Reset time to start of day for accurate comparison
        
        const approvedLeaves = allLeaveRequests.filter(req => {
          if (req.employeeId !== emp.id || req.status?.toLowerCase() !== 'approved') {
            return false
          }
          
          const startDate = new Date(req.startDate)
          const endDate = new Date(req.endDate)

          // Fractional leave is active only between the exact application and end times.
          if (Number(req.noOfDays) < 1) {
            return currentTime >= startDate && currentTime < endDate
          }

          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(23, 59, 59, 999)
          
          // Check if today is within the leave period (inclusive)
          return today >= startDate && today <= endDate
        })
        
        // If there's an active leave, show it; otherwise show N/A
        const currentLeave = approvedLeaves.length > 0 ? approvedLeaves[0] : null
        const approvedLeaveTypes = currentLeave ? currentLeave.leaveTypeName : 'N/A'
        
        return {
          employee: emp,
          quotasMap: empQuotasMap,
          quotasArray: empQuotasArray,
          totalAllocated: empQuotasArray.reduce((sum, q) => sum + (q.allocatedDays || 0), 0),
          totalUsed: empQuotasArray.reduce((sum, q) => sum + (q.usedDays || 0), 0),
          primaryLeaveType: approvedLeaveTypes,
          hasQuotas: empQuotasArray.length > 0,
        }
      })
  }, [employees, employeeQuotasMap, allLeaveRequests, currentTime])

  // Filter by search query only (removed department filter)
  const filteredRows = useMemo(() => {
    return allEmployeeRows.filter(row => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = searchQuery === '' || 
        row.employee.fullName.toLowerCase().includes(searchLower) ||
        row.employee.email.toLowerCase().includes(searchLower)
      
      return matchesSearch
    })
  }, [allEmployeeRows, searchQuery])

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage)
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const openAddModal = (emp) => {
    setSelectedEmployee(emp)
    setModalMode('add')
    const empQuotasMap = employeeQuotasMap.get(emp.id) || {}
    const newFormData = {}
    leaveTypes.forEach(type => {
      const existingQuota = empQuotasMap[type.id]
      newFormData[type.id] = existingQuota ? existingQuota.allocatedDays : ''
    })
    setQuotaFormData(newFormData)
    setFormError('')
    setModalOpen(true)
  }

  const openEditModal = (emp) => {
    setSelectedEmployee(emp)
    setModalMode('edit')
    const empQuotasMap = employeeQuotasMap.get(emp.id) || {}
    const newFormData = {}
    leaveTypes.forEach(type => {
      const existingQuota = empQuotasMap[type.id]
      newFormData[type.id] = existingQuota ? existingQuota.allocatedDays : ''
    })
    setQuotaFormData(newFormData)
    setFormError('')
    setModalOpen(true)
  }

  const handleQuotaFormChange = (leaveTypeId, value) => {
    setQuotaFormData(prev => ({
      ...prev,
      [leaveTypeId]: value
    }))
    setFormError('')
  }

  const validateQuotaForm = () => {
    const totalAllocated = Object.values(quotaFormData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    if (totalAllocated > effectivePeriod.totalAllowedDays) {
      setFormError(`Total quota (${totalAllocated} days) cannot exceed maximum allowed days (${effectivePeriod.totalAllowedDays} days)`)
      return false
    }
    
    const hasAnyAllocation = Object.values(quotaFormData).some(val => parseFloat(val) > 0)
    if (!hasAnyAllocation) {
      setFormError('Please allocate days to at least one leave type')
      return false
    }

    return true
  }

  const handleSubmitQuotaForm = async (e) => {
    e.preventDefault()
    
    if (!validateQuotaForm()) return

    setSubmitting(true)
    setFormError('')

    try {
      const empQuotasMap = employeeQuotasMap.get(selectedEmployee.id) || {}

      for (const leaveType of leaveTypes) {
        const allocatedDays = parseFloat(quotaFormData[leaveType.id]) || 0
        
        if (allocatedDays > 0) {
          const existingQuota = empQuotasMap[leaveType.id]
          
          if (existingQuota) {
            await updateLeaveQuota(existingQuota.id, { allocatedDays })
          } else {
            await createLeaveQuota({
              employeeId: selectedEmployee.id,
              leaveTypeId: leaveType.id,
              leavePeriodId: effectivePeriod.id,
              allocatedDays,
            })
          }
        }
      }

      const res = await getAllQuotasForPeriod(effectivePeriod.id)
      setQuotas(res.data?.data || [])
      setModalOpen(false)
      setSelectedEmployee(null)
    } catch (err) {
      console.error('Error saving quotas:', err)
      setFormError(err.response?.data?.message || 'Failed to save quotas')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePeriod = async () => {
    if (!window.confirm('Are you sure you want to delete this leave period? This action cannot be undone.')) {
      return
    }

    setDeletingPeriod(true)
    try {
      // Note: You'll need to add a deleteLeavePeriod API endpoint in hrmsApi.js
      // For now, we'll just call a placeholder
      console.log('Delete period:', currentPeriod.id)
      // await deleteLeavePeriod(currentPeriod.id)
      // Then refresh data
      setQuotas([])
      await refreshCurrentPeriod()
    } catch (err) {
      console.error('Error deleting period:', err)
    } finally {
      setDeletingPeriod(false)
    }
  }

  const calculateElapsedPercentage = () => {
    if (!effectivePeriod?.startDate || !effectivePeriod?.endDate) return 0
    const start = new Date(effectivePeriod.startDate)
    const end = new Date(effectivePeriod.endDate)
    const now = new Date()
    const total = end - start
    const elapsed = now - start
    const percentage = Math.min(100, Math.max(0, (elapsed / total) * 100))
    return Math.round(percentage)
  }

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'N/A'
  }

  if ((periodLoading || loading) && !employees.length && !currentPeriod) {
    return (
      <div className="text-center py-lg text-on-surface-variant">
        Loading leave management data...
      </div>
    )
  }

  return (
    <div className="p-margin-desktop max-w-container-max mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-background">
            Leave Administration
          </h2>
          <p className="text-on-surface-variant font-body-md text-body-md">
            Configure company-wide policies and manage employee leave quotas.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-12 gap-3 mb-lg">
        <div className="col-span-12 md:col-span-8">
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl">
            <div className="flex justify-between items-start mb-sm">
              <span className="text-secondary material-symbols-outlined">groups</span>
              <span className="text-[12px] font-label-sm text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                +{totalEmployeeCount} Total
              </span>
            </div>
            <h4 className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
              Total Employees
            </h4>
            <p className="font-headline-md text-headline-md text-on-background">
              {totalEmployeeCount}
            </p>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4">
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl">
            <div className="flex items-center gap-2 mb-md">
              <span className="material-symbols-outlined text-secondary">calendar_today</span>
              <h3 className="font-headline-sm text-headline-sm">Active Leave Period</h3>
            </div>
            {effectivePeriod ? (
              <>
                <div className="bg-surface-container-low p-md rounded-lg mb-md">
                  <p className="font-label-md text-label-md text-on-surface">
                    {effectivePeriod.startDate ? new Date(effectivePeriod.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''} - {effectivePeriod.endDate ? new Date(effectivePeriod.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
                  </p>
                  <p className="text-on-surface-variant font-body-sm text-body-sm">
                    {effectivePeriod.totalAllowedDays} Days Allowed
                  </p>
                </div>
                {/* Progress Bar */}
                <div className="mb-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-label-sm font-label-sm text-on-surface-variant">Period Progress</span>
                    <span className="text-label-sm font-label-sm text-secondary">{calculateElapsedPercentage()}%</span>
                  </div>
                  <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-secondary h-full transition-all duration-300"
                      style={{ width: `${calculateElapsedPercentage()}%` }}
                    />
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreatePeriodModalOpen(true)}
                    disabled={true}
                    className="flex-1 px-3 py-2 rounded-lg font-label-sm flex items-center justify-center gap-1 transition-opacity bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60"
                    title="Period already created. Wait for it to expire to create a new one."
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Period Created
                  </button>
                </div>
              </>
            ) : currentPeriod && isPeriodExpired ? (
              <div className="space-y-md">
                <div className="p-md bg-error-container/20 rounded-lg border border-error">
                  <p className="text-error font-label-md text-label-md mb-1">Period Expired</p>
                  <p className="text-on-error-container text-body-sm">
                    Previous period: {currentPeriod.startDate ? new Date(currentPeriod.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''} - {currentPeriod.endDate ? new Date(currentPeriod.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
                  </p>
                  <p className="text-on-error-container text-body-sm mt-1">
                    Create a new leave period for the current year.
                  </p>
                </div>
                <button
                  onClick={() => setCreatePeriodModalOpen(true)}
                  className="w-full bg-secondary text-on-secondary px-3 py-2 rounded-lg font-label-sm flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Create New Period
                </button>
              </div>
            ) : (
              <p className="text-on-surface-variant text-body-sm">No active period</p>
            )}
          </div>
        </div>
      </div>

      {/* No Period or Expired Period Message */}
      {!effectivePeriod ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg text-center">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">calendar_month</span>
            <div>
              <h3 className="font-headline-sm text-headline-sm mb-2">
                {isPeriodExpired ? 'Leave Period Expired' : 'No Leave Period Found'}
              </h3>
              <p className="text-on-surface-variant font-body-md">
                {isPeriodExpired 
                  ? 'The previous leave period has ended. Create a new leave period for the current year to continue managing employee quotas.'
                  : 'Create a leave period to start managing employee quotas and allocations.'}
              </p>
            </div>
            <button
              onClick={() => setCreatePeriodModalOpen(true)}
              className="bg-primary text-on-primary px-6 py-3 rounded font-label-md hover:opacity-90 transition-opacity"
            >
              Create Leave Period
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Quotas Table */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-low/50">
              <div>
                <h3 className="font-headline-sm text-headline-sm">Employee Leave Quotas</h3>
                <p className="text-on-surface-variant font-body-sm text-body-sm">
                  Manage allocations for {filteredRows.length} employees.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-xs">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md px-3 py-1.5 pl-10 focus:ring-2 focus:ring-secondary/20"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low/30">
                  <tr>
                    <th className="px-lg py-md text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                      Employee Name
                    </th>
                    <th className="px-md py-md text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-md py-md text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-md py-md text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                      Total Allowed
                    </th>
                    <th className="px-md py-md text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                      Days Used
                    </th>
                    <th className="px-md py-md text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                      Leave Type
                    </th>
                    <th className="px-md py-md text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider text-left">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-lg py-lg text-center text-body-md text-on-surface-variant">
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map(({ employee: emp, quotasArray, totalAllocated, totalUsed, primaryLeaveType, hasQuotas }) => {
                      return (
                        <tr key={emp.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-lg py-md">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center font-bold text-[12px]">
                                {getInitials(emp.fullName)}
                              </div>
                              <div>
                                <p className="font-label-md text-label-md">{emp.fullName || 'Unknown'}</p>
                                <p className="text-on-surface-variant text-[12px]">{emp.email || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-md py-md text-body-md">{emp.branchName || '—'}</td>
                          <td className="px-md py-md text-body-md">{emp.departmentName || '—'}</td>
                          <td className="px-md py-md font-semibold text-body-md">{effectivePeriod?.totalAllowedDays || 0} days</td>
                          <td className="px-md py-md">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${totalUsed > 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                                {formatLeaveDays(totalUsed)} days
                              </span>
                              <div className="w-12 h-2 bg-surface-container-low rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${totalUsed === 0 ? 'bg-tertiary' : totalUsed < (totalAllocated / 2) ? 'bg-secondary' : 'bg-error'}`}
                                  style={{ width: totalAllocated > 0 ? `${(totalUsed / totalAllocated) * 100}%` : '0%' }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-md py-md text-body-md">{primaryLeaveType}</td>
                          <td className="px-md py-md text-left">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (!hasQuotas) {
                                    openAddModal(emp)
                                  }
                                }}
                                disabled={hasQuotas}
                                className={`px-6 py-2 rounded font-label-md whitespace-nowrap transition-all ${
                                  hasQuotas 
                                    ? 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60' 
                                    : 'bg-tertiary text-on-tertiary hover:opacity-90 active:scale-95'
                                }`}
                                title={hasQuotas ? "Quotas already added. Use Edit Quota to modify." : "Add new quotas for all leave types"}
                              >
                                {hasQuotas ? 'Already Added' : 'Add Quota'}
                              </button>
                              <button
                                onClick={() => {
                                  openEditModal(emp)
                                }}
                                className="bg-secondary text-on-secondary px-6 py-2 rounded font-label-md hover:opacity-90 active:scale-95 transition-all whitespace-nowrap"
                                title="Edit existing quotas"
                              >
                                Edit Quota
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-md bg-surface-container-low/30 border-t border-outline-variant flex justify-between items-center">
              <span className="text-body-sm text-on-surface-variant">
                Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredRows.length)} of {filteredRows.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-outline-variant rounded text-body-md disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || filteredRows.length === 0}
                  className="px-3 py-1 border border-outline-variant rounded text-body-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Unified Quota Modal (Add/Edit) */}
      {modalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-background/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-surface-container-lowest w-full max-w-[420px] rounded-xl shadow-2xl border border-outline-variant overflow-y-auto max-h-[80vh]">
            {/* Header Section */}
            <div className="p-md border-b border-outline-variant sticky top-0 bg-surface-container-low/50">
              <div className="flex justify-between items-start mb-1">
                <h1 className="font-headline-sm text-headline-sm text-on-surface">{modalMode === 'add' ? 'Add Leave Quotas' : 'Edit Leave Quotas'}</h1>
                <button onClick={() => setModalOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{selectedEmployee?.fullName}</p>
            </div>

            {/* Modal Body */}
            <div className="p-md space-y-md">
              {formError && (
                <div className="p-2 bg-error-container/20 rounded-lg border border-error flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-error">error</span>
                  <span className="text-on-error-container font-body-sm text-body-sm">{formError}</span>
                </div>
              )}

              {/* Info Section */}
              <div className="p-2 bg-surface-container-low rounded-lg border border-outline-variant">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-on-surface font-label-sm text-label-sm uppercase tracking-wider">Total Allowed Days</h2>
                  </div>
                  <div className="text-primary font-headline-sm text-headline-sm">
                    {effectivePeriod?.totalAllowedDays || 0}
                  </div>
                </div>
              </div>

              {/* Input Cards Grid - 2 columns */}
              <div className="space-y-2">
                {leaveTypes.map(leaveType => {
                  const currentValue = parseFloat(quotaFormData[leaveType.id]) || 0
                  const totalOthers = Object.entries(quotaFormData).reduce((sum, [typeId, val]) => {
                    return typeId !== leaveType.id.toString() ? sum + (parseFloat(val) || 0) : sum
                  }, 0)
                  const maxAllowed = (effectivePeriod?.totalAllowedDays || 0) - totalOthers
                  
                  return (
                    <div key={leaveType.id} className="p-2 rounded-lg border border-outline-variant bg-surface-container-lowest">
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-label-sm text-label-sm text-on-surface">{leaveType.name}</label>
                        <span className="text-label-sm text-on-surface-variant">{currentValue} days</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={quotaFormData[leaveType.id] || ''}
                          onChange={(e) => {
                            const newVal = parseFloat(e.target.value) || 0
                            if (newVal <= maxAllowed) {
                              handleQuotaFormChange(leaveType.id, e.target.value)
                            }
                          }}
                          min="0"
                          step="0.25"
                          max={maxAllowed}
                          placeholder="0"
                          className="flex-1 px-2 py-1.5 font-body-sm text-body-sm bg-surface-container-lowest border border-outline-variant rounded focus:ring-2 focus:ring-secondary/20 focus:border-transparent"
                        />
                        <span className="text-label-sm text-on-surface-variant whitespace-nowrap">/ {maxAllowed}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary Section - Compact */}
              <div className={`p-2 rounded-lg transition-all duration-300 border text-center ${
                Object.values(quotaFormData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) > (effectivePeriod?.totalAllowedDays || 0)
                  ? 'bg-error-container/20 border-error'
                  : 'bg-surface-container border-outline-variant'
              }`}>
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-0.5">Total Allocated</div>
                <div className={`font-headline-sm text-headline-sm ${
                  Object.values(quotaFormData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) > (effectivePeriod?.totalAllowedDays || 0)
                    ? 'text-error'
                    : 'text-on-surface'
                }`}>
                  {formatLeaveDays(Object.values(quotaFormData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0))} / {formatLeaveDays(effectivePeriod?.totalAllowedDays || 0)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 items-center justify-end pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface font-label-sm hover:bg-surface-container-low transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitQuotaForm}
                  disabled={submitting || Object.values(quotaFormData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) > (effectivePeriod?.totalAllowedDays || 0)}
                  className={`px-4 py-2 rounded-lg font-label-sm flex items-center gap-1 transition-all whitespace-nowrap ${
                    modalMode === 'add'
                      ? 'bg-tertiary text-on-tertiary hover:opacity-90 disabled:opacity-50'
                      : 'bg-secondary text-on-secondary hover:opacity-90 disabled:opacity-50'
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">hourglass_empty</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">save</span>
                      {modalMode === 'add' ? 'Add' : 'Update'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Period Modal */}
      <CreateLeavePeriodModal
        isOpen={createPeriodModalOpen}
        onClose={() => setCreatePeriodModalOpen(false)}
        onSuccess={refreshCurrentPeriod}
      />
    </div>
  )
}

function CreateLeavePeriodModal({ isOpen, onClose, onSuccess }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`)
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`)
  const [totalAllowedDays, setTotalAllowedDays] = useState(20)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await createLeavePeriod({
        name: `FY ${year}`,
        startDate,
        endDate,
        totalAllowedDays: parseFloat(totalAllowedDays),
      })
      onClose()
      if (onSuccess) await onSuccess()
    } catch (err) {
      console.error('Create period error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      })
      setError(err.response?.data?.message || 'Failed to create leave period')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest w-full max-w-[560px] rounded-xl shadow-2xl border border-outline-variant">
        <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-primary-container">
          <h3 className="font-headline-sm text-headline-sm text-on-primary-container">New Leave Policy</h3>
          <button onClick={onClose} className="text-on-primary-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-lg space-y-lg">
          {error && (
            <div className="bg-error-container border border-error rounded-lg p-md text-on-error-container text-[12px]">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block text-label-md font-label-md mb-2">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                required
                min={currentYear}
                className="w-full px-md py-sm rounded-lg border border-outline bg-surface-container-lowest focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-label-md font-label-md mb-2">Total Allowed Days</label>
              <input
                type="number"
                value={totalAllowedDays}
                onChange={(e) => setTotalAllowedDays(parseInt(e.target.value, 10))}
                required
                min="1"
                className="w-full px-md py-sm rounded-lg border border-outline bg-surface-container-lowest focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block text-label-md font-label-md mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-md py-sm rounded-lg border border-outline bg-surface-container-lowest focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-label-md font-label-md mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-md py-sm rounded-lg border border-outline bg-surface-container-lowest focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-lg border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-outline-variant px-6 py-2 rounded font-label-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-secondary text-on-secondary px-6 py-2 rounded font-label-md disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Period'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
