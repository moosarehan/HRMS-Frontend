import { useState, useEffect, useMemo } from 'react'
import { 
  getEmployeeQuotasForCurrentPeriod, 
  getEmployeeLeaveHistory,
  applyForLeave
} from '../api/hrmsApi'
import { useLeave } from '../context/LeaveContext'
import { useAuth } from '../context/AuthContext'
import { useLeaveSetupStatus } from '../hooks/useLeaveSetupStatus'
import { calculateDays } from '../utils/leaveUtils'
import LeaveStatCard from './LeaveStatCard'

export default function LeavePanel() {
  const { user } = useAuth()
  const { currentPeriod, leaveTypes, periodLoading } = useLeave()
  const { setupStatus, loading } = useLeaveSetupStatus(user?.employeeId)
  const [quotas, setQuotas] = useState([])
  const [leaveHistory, setLeaveHistory] = useState([])
  const [error, setError] = useState('')
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  
  // Apply Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    noOfDays: 0,
    description: '',
  })

  // Load employee leave data
  useEffect(() => {
    const loadEmployeeLeaveData = async () => {
      if (!user?.employeeId) {
        setQuotas([])
        setLeaveHistory([])
        return
      }

      if (!setupStatus || loading) {
        return
      }

      if (!setupStatus.isSetupComplete) {
        setQuotas([])
        setLeaveHistory([])
        setError('')
        return
      }

      try {
        const [quotasRes, historyRes] = await Promise.all([
          getEmployeeQuotasForCurrentPeriod(user.employeeId),
          getEmployeeLeaveHistory(user.employeeId)
        ])
        const quotasData = quotasRes.data?.data || []
        const quotasWithRemaining = quotasData.map(q => ({
          ...q,
          remainingDays: q.remainingDays !== undefined ? q.remainingDays : (q.allocatedDays - q.usedDays)
        }))
        setQuotas(quotasWithRemaining)
        setLeaveHistory(historyRes.data?.data || [])
        setError('')
      } catch (dataErr) {
        console.error('❌ Failed to load quotas/history:', dataErr)
      }
    }

    loadEmployeeLeaveData()
  }, [user?.employeeId, setupStatus, loading])

  // Update days when date changes
  useEffect(() => {
    const days = calculateDays(leaveForm.startDate, leaveForm.endDate)
    setLeaveForm(prev => ({ ...prev, noOfDays: days }))
  }, [leaveForm.startDate, leaveForm.endDate])

  const handleApplyLeave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await applyForLeave({
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        leaveTypeId: parseInt(leaveForm.leaveTypeId),
        noOfDays: leaveForm.noOfDays,
        description: leaveForm.description || null,
      })
      
      setApplyModalOpen(false)
      setLeaveForm({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        noOfDays: 0,
        description: '',
      })
      showToast('Leave request submitted successfully', 'check_circle', 'success')
      
      // Reload leave history
      const historyRes = await getEmployeeLeaveHistory(user.employeeId)
      setLeaveHistory(historyRes.data?.data || [])
    } catch (err) {
      console.error('Failed to apply for leave:', err)
      showToast(err.response?.data?.message || 'Failed to submit leave request', 'error', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const showToast = (message, icon, type) => {
    setToast({ message, icon, type })
    setTimeout(() => setToast(null), 3000)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800'
      case 'pending':
        return 'bg-amber-100 text-amber-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Check for pending leave applications
  const getPendingLeaves = () => {
    return leaveHistory.filter(request => 
      request.status?.toLowerCase() === 'pending'
    )
  }

  // Check for active approved leaves (currently ongoing)
  const getActiveApprovedLeaves = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of day for comparison
    
    return leaveHistory.filter(request => {
      if (request.status?.toLowerCase() !== 'approved') return false
      
      const startDate = new Date(request.startDate)
      const endDate = new Date(request.endDate) 
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999) // Set to end of day
      
      // Check if today is between start and end date (inclusive)
      return today >= startDate && today <= endDate
    })
  }

  // Check if employee can apply for new leave
  const canApplyForLeave = () => {
    const pendingLeaves = getPendingLeaves()
    const activeApprovedLeaves = getActiveApprovedLeaves()
    
    // Block if has pending leave
    if (pendingLeaves.length > 0) return { canApply: false, reason: 'pending' }
    
    // Block if currently on approved leave
    if (activeApprovedLeaves.length > 0) return { canApply: false, reason: 'active' }
    
    return { canApply: true, reason: null }
  }

  // Get blocking message for UI
  // Get current active leave type or "N/A"
  const getCurrentLeaveType = () => {
    const activeLeaves = getActiveApprovedLeaves()
    if (activeLeaves.length === 0) return "N/A"
    
    // If multiple active leaves, show the most recent one
    const mostRecent = activeLeaves.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0]
    return mostRecent.leaveTypeName
  }

  const getBlockingMessage = () => {
    const { canApply, reason } = canApplyForLeave()
    if (canApply) return null
    
    if (reason === 'pending') {
      const pendingLeaves = getPendingLeaves()
      const latestPending = pendingLeaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      return `You have a pending ${latestPending.leaveTypeName} request. Wait for approval/rejection before applying again.`
    }
    
    if (reason === 'active') {
      const activeLeaves = getActiveApprovedLeaves()
      const latestActive = activeLeaves.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0]
      return `You are currently on ${latestActive.leaveTypeName} until ${formatDate(latestActive.endDate)}. Cannot apply for new leave.`
    }
    
    return null
  }

  const getQuotaByTypeName = (typeName) => {
    if (quotas.length === 0) {
      console.log(`No quotas available, looking for: ${typeName}`)
      return null
    }
    
    console.log(`\n=== Looking for leave type: "${typeName}" ===`)
    quotas.forEach((q, idx) => {
      console.log(`Quota ${idx}:`, {
        id: q.id,
        leaveTypeId: q.leaveTypeId,
        leaveTypeName: q.leaveTypeName,
        allocatedDays: q.allocatedDays,
        usedDays: q.usedDays,
        remainingDays: q.remainingDays
      })
    })
    
    const quota = quotas.find(q => {
      const match = q.leaveTypeName?.toLowerCase() === typeName.toLowerCase()
      console.log(`  Comparing "${q.leaveTypeName}" with "${typeName}": ${match}`)
      return match
    })
    
    console.log(`Result: ${quota ? 'FOUND' : 'NOT FOUND'}\n`)
    return quota || null
  }

  // Show loading state
  if (periodLoading || loading) {
    return (
      <div className="text-center py-lg text-on-surface-variant">
        Loading leave information...
      </div>
    )
  }

  // Show error states based on setup status
  // If setup status failed to load or has incomplete setup, show messages
  if (!setupStatus || !setupStatus.isSetupComplete) {
    const hasPeriod = setupStatus?.hasPeriod
    const hasQuota = setupStatus?.hasQuota
    
    // Determine what's missing
    const missingPeriod = !hasPeriod
    const missingQuota = !hasQuota
    
    let message = ''
    let title = 'Setup Required'
    
    if (missingPeriod && missingQuota) {
      message = 'Both quota and leave period not registered by admin'
    } else if (missingQuota) {
      message = 'Contact admin - quota isn\'t registered'
    } else if (missingPeriod) {
      message = 'Contact admin - leave period not registered'
    } else {
      message = 'Leave setup is incomplete. Please contact your administrator.'
    }

    return (
      <div className="flex flex-col items-center justify-center py-xl gap-md">
        <span className="material-symbols-outlined text-[48px] text-error">warning</span>
        <div className="text-center">
          <h3 className="font-headline-sm text-headline-sm mb-2">{title}</h3>
          <p className="text-on-surface-variant">{message}</p>
        </div>
      </div>
    )
  }

  console.log('📍 QUOTAS STATE:', quotas)
  
  // Get leave application status
  const leaveApplicationStatus = canApplyForLeave()
  const blockingMessage = getBlockingMessage()
  
  // Dynamically create cards from quotas array
  const getCardIcon = (name) => {
    const lower = name?.toLowerCase() || ''
    if (lower.includes('annual') || lower.includes('vacation')) return 'flight'
    if (lower.includes('sick')) return 'medical_services'
    return 'personal_injury'
  }

  return (
    <div className="p-margin-desktop max-w-container-max mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-lg mb-xl">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface">
            Good Morning, {user?.fullName?.split(' ')[0]}
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Manage your time off and view team attendance.
          </p>
        </div>
        <div className="flex gap-md">
          <button
            onClick={() => setApplyModalOpen(true)}
            disabled={!leaveApplicationStatus.canApply}
            className={`px-lg py-md rounded-xl font-label-md flex items-center gap-sm shadow-md transition-all ${
              leaveApplicationStatus.canApply 
                ? 'bg-secondary text-on-secondary hover:opacity-90 active:scale-95' 
                : 'bg-surface-container-low text-on-surface-variant cursor-not-allowed opacity-60'
            }`}
            title={blockingMessage || "Apply for new leave"}
          >
            <span className="material-symbols-outlined">add</span>
            Apply for Leave
          </button>
          <button
            onClick={() => setHistoryModalOpen(true)}
            className="bg-surface-container-lowest border border-outline-variant px-lg py-md rounded-xl font-label-md flex items-center gap-sm hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined">history</span>
            Leave History
          </button>
        </div>
      </div>

      {/* Leave Application Status Notice */}
      {blockingMessage && (
        <div className="mb-xl">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-lg flex items-start gap-md">
            <span className="material-symbols-outlined text-amber-600 text-[24px] flex-shrink-0 mt-1">
              {leaveApplicationStatus.reason === 'pending' ? 'schedule' : 'block'}
            </span>
            <div>
              <h3 className="font-label-lg text-label-lg text-amber-800 mb-xs">
                {leaveApplicationStatus.reason === 'pending' 
                  ? 'Leave Application Pending' 
                  : 'Currently on Leave'}
              </h3>
              <p className="text-body-md text-amber-700">
                {blockingMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
        {quotas.length === 0 ? (
          <div className="col-span-3 text-center py-lg text-on-surface-variant">
            No leave quotas configured
          </div>
        ) : (
          quotas.map((quota) => (
            <LeaveStatCard
              key={quota.id}
              leaveType={{ name: quota.leaveTypeName }}
              remainingDays={quota.remainingDays ?? 0}
              totalAllowed={quota.allocatedDays ?? 0}
              icon={getCardIcon(quota.leaveTypeName)}
            />
          ))
        )}
      </div>



      {/* Recent Requests Table */}
      <section className="glass-panel rounded-xl overflow-hidden mb-xl">
        <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-headline-sm text-headline-sm">My Recent Requests</h3>
          <button 
            onClick={() => setHistoryModalOpen(true)}
            className="text-secondary font-label-md text-label-md hover:opacity-80"
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-xl py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-xl py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-xl py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Status
                </th>
                <th className="px-xl py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Requested On
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {leaveHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-xl py-xl text-center">
                    <div className="flex flex-col items-center gap-4">
                      <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
                        inbox
                      </span>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm mb-2">No Leave History</h3>
                        <p className="text-on-surface-variant">
                          You haven't applied for any leaves yet. Click "Apply for Leave" to submit your first request.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                leaveHistory.slice(0, 2).map((request) => (
                  <tr key={request.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-xl py-lg">
                      <div className="flex items-center gap-md">
                        <div className="w-2 h-10 bg-secondary rounded-full"></div>
                        <div>
                          <p className="font-label-md text-label-md">{getCurrentLeaveType()}</p>
                          <p className="text-body-sm text-on-surface-variant">
                            {getCurrentLeaveType() !== "N/A" ? `Currently on ${getCurrentLeaveType()}` : 'No active leave'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-xl py-lg">
                      <p className="font-body-md text-body-md">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {request.noOfDays} Working Days
                      </p>
                    </td>
                    <td className="px-xl py-lg">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-xl py-lg font-body-md text-body-md">
                      {formatDate(request.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Apply for Leave Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-surface-container-lowest w-full max-w-[560px] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-headline-sm text-headline-sm">New Leave Request</h3>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
                onClick={() => setApplyModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleApplyLeave} className="p-xl space-y-lg max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant">Leave Type</label>
                  <select
                    value={leaveForm.leaveTypeId}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, leaveTypeId: e.target.value }))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl font-body-md p-3 focus:ring-2 focus:ring-secondary/20 transition-all"
                    required
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant">Days Calculated</label>
                  <input
                    type="number"
                    value={leaveForm.noOfDays}
                    readOnly
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl font-body-md p-3 opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl font-body-md p-3 focus:ring-2 focus:ring-secondary/20"
                    required
                  />
                </div>
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl font-body-md p-3 focus:ring-2 focus:ring-secondary/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Reason for Leave</label>
                <textarea
                  value={leaveForm.description}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl font-body-md p-3 focus:ring-2 focus:ring-secondary/20"
                  placeholder="Briefly describe the reason for your request..."
                  rows={4}
                />
              </div>

              <div className="p-md bg-secondary/5 rounded-xl border border-secondary/10 flex gap-md">
                <span className="material-symbols-outlined text-secondary">info</span>
                <p className="text-body-sm text-secondary">
                  Your manager will be notified immediately of this request once submitted.
                </p>
              </div>

              <div className="p-lg border-t border-outline-variant bg-surface-container-low flex justify-end gap-md -mx-xl -mb-xl">
                <button
                  type="button"
                  className="px-lg py-md rounded-xl font-label-md text-on-surface-variant hover:bg-surface-container-high transition-all"
                  onClick={() => setApplyModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-secondary text-on-secondary px-xl py-md rounded-xl font-label-md shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden max-h-[80vh]">
            <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-headline-sm text-headline-sm">All Leave Applications</h3>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                onClick={() => setHistoryModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-x-auto max-h-[60vh]">
              {leaveHistory.length === 0 ? (
                <div className="text-center py-xl p-lg">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant">inbox</span>
                  <h3 className="font-headline-sm text-headline-sm mt-4 mb-2">No Leave History</h3>
                  <p className="text-on-surface-variant">You haven't applied for any leaves yet.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low sticky top-0">
                    <tr>
                      <th className="px-xl py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                        Leave Type
                      </th>
                      <th className="px-xl py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-xl py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-xl py-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                        Requested On
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {leaveHistory.map((request) => (
                      <tr key={request.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-xl py-lg">
                          <div>
                            <p className="font-label-md text-label-md">{request.leaveTypeName}</p>
                            {request.description && (
                              <p className="text-body-sm text-on-surface-variant mt-1">{request.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-xl py-lg">
                          <p className="font-body-md text-body-md">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </p>
                          <p className="text-body-sm text-on-surface-variant">
                            {request.noOfDays} Days
                          </p>
                        </td>
                        <td className="px-xl py-lg">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(request.status)}`}>
                            {request.status}
                          </span>
                          {request.rejectionReason && (
                            <div className="mt-2 p-2 bg-error-container rounded text-on-error-container text-body-sm">
                              <strong>Reason:</strong> {request.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="px-xl py-lg font-body-md text-body-md">
                          {formatDate(request.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help/Quota Modal */}
      {helpModalOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden">
            <div className="p-lg border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm">Your Leave Quotas</h3>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                onClick={() => setHelpModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-lg">
              <div className="space-y-md">
                {quotas.map((quota) => (
                  <div key={quota.id} className="border border-outline-variant rounded-lg p-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-label-md text-label-md">{quota.leaveTypeName}</h4>
                      <span className="text-body-sm text-on-surface-variant">
                        {quota.remainingDays} / {quota.allocatedDays} days
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-low h-2 rounded-full">
                      <div 
                        className="bg-secondary h-full rounded-full" 
                        style={{ width: `${((quota.usedDays / quota.allocatedDays) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-body-sm text-on-surface-variant mt-1">
                      <span>Used: {quota.usedDays} days</span>
                      <span>Remaining: {quota.remainingDays} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-lg right-lg bg-inverse-surface text-inverse-on-surface px-lg py-md rounded-xl shadow-xl flex items-center gap-md z-[110]">
          <span className={`material-symbols-outlined ${
            toast.type === 'success' ? 'text-secondary-fixed-dim' : 
            toast.type === 'error' ? 'text-error' : 'text-on-surface-variant'
          }`}>
            {toast.icon}
          </span>
          <span className="font-label-md">{toast.message}</span>
        </div>
      )}
    </div>
  )
}