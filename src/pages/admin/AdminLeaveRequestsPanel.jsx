import { useState, useEffect, useMemo } from 'react'
import { 
  getAllPendingLeaves, 
  getAllLeaves, 
  approveLeaveRequest, 
  rejectLeaveRequest,
  getEmployeeLeaveHistory 
} from '../../api/hrmsApi'

export default function AdminLeaveRequestsPanel() {
  const [leaveRequests, setLeaveRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  // Load leave requests based on active tab
  useEffect(() => {
    const loadLeaveRequests = async () => {
      setLoading(true)
      try {
        let res
        if (activeTab === 'pending') {
          res = await getAllPendingLeaves()
        } else {
          res = await getAllLeaves()
        }
        setLeaveRequests(res.data?.data || [])
        setError('')
      } catch (err) {
        console.error('Failed to load leave requests:', err)
        setError('Failed to load leave requests')
      } finally {
        setLoading(false)
      }
    }
    loadLeaveRequests()
  }, [activeTab])

  // Filter requests based on search term
  const filteredRequests = useMemo(() => {
    if (!searchTerm) return leaveRequests
    
    return leaveRequests.filter(request => 
      request.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.employeeId?.toString().includes(searchTerm) ||
      request.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [leaveRequests, searchTerm])

  // Filter by status for display
  const displayRequests = useMemo(() => {
    if (activeTab === 'pending') {
      return filteredRequests.filter(req => req.status === 'Pending')
    } else if (activeTab === 'approved') {
      return filteredRequests.filter(req => req.status === 'Approved')
    } else if (activeTab === 'rejected') {
      return filteredRequests.filter(req => req.status === 'Rejected')
    }
    return filteredRequests
  }, [filteredRequests, activeTab])

  const handleApprove = async (requestId) => {
    setSubmitting(true)
    try {
      await approveLeaveRequest(requestId)
      setLeaveRequests(prev => prev.filter(req => req.id !== requestId))
      showToast('Request approved successfully', 'check_circle', 'success')
    } catch (err) {
      console.error('Failed to approve request:', err)
      showToast('Failed to approve request', 'error', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectClick = (request) => {
    setSelectedRequest(request)
    setRejectModalOpen(true)
    setRejectionReason('')
  }

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      showToast('Please provide a rejection reason', 'warning', 'warning')
      return
    }

    setSubmitting(true)
    try {
      await rejectLeaveRequest(selectedRequest.id, {
        leaveRequestId: selectedRequest.id,
        rejectionReason: rejectionReason.trim()
      })
      setLeaveRequests(prev => prev.filter(req => req.id !== selectedRequest.id))
      setRejectModalOpen(false)
      showToast(`Request from ${selectedRequest.employeeName} rejected`, 'cancel', 'error')
    } catch (err) {
      console.error('Failed to reject request:', err)
      showToast('Failed to reject request', 'error', 'error')
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

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '—'
    const start = formatDate(startDate)
    const end = formatDate(endDate)
    return startDate === endDate ? start : `${start} - ${end}`
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'text-[#B45309] bg-[#FEF3C7]'
      case 'approved':
        return 'text-[#065F46] bg-[#D1FAE5]'
      case 'rejected':
        return 'text-[#991B1B] bg-[#FEE2E2]'
      default:
        return 'text-on-surface-variant bg-surface-container'
    }
  }

  const getLeaveTypeBadgeColor = (leaveType) => {
    switch (leaveType?.toLowerCase()) {
      case 'vacation':
      case 'annual':
        return 'bg-surface-container text-on-surface-variant'
      case 'sick':
      case 'sick leave':
        return 'bg-[#FEE2E2] text-[#991B1B]'
      case 'personal':
      case 'casual':
        return 'bg-[#E0E7FF] text-[#3730A3]'
      default:
        return 'bg-surface-container text-on-surface-variant'
    }
  }

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'N/A'
  }

  // Stats calculations
  const stats = useMemo(() => {
    const pending = leaveRequests.filter(req => req.status === 'Pending').length
    const approved = leaveRequests.filter(req => req.status === 'Approved').length
    const rejected = leaveRequests.filter(req => req.status === 'Rejected').length
    const urgent = leaveRequests.filter(req => 
      req.status === 'Pending' && 
      new Date(req.startDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Within 7 days
    ).length

    return { pending, approved, rejected, urgent }
  }, [leaveRequests])

  if (loading && leaveRequests.length === 0) {
    return (
      <div className="text-center py-lg text-on-surface-variant">
        Loading leave requests...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface">Leave Requests</h2>
          <p className="text-on-surface-variant font-body-lg text-body-lg">
            Manage employee time-off and scheduling approvals.
          </p>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-xl py-2 font-label-md text-label-md rounded-md transition-colors ${
              activeTab === 'pending' 
                ? 'bg-surface-container-lowest shadow-sm text-secondary' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-xl py-2 font-label-md text-label-md rounded-md transition-colors ${
              activeTab === 'approved' 
                ? 'bg-surface-container-lowest shadow-sm text-secondary' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-xl py-2 font-label-md text-label-md rounded-md transition-colors ${
              activeTab === 'rejected' 
                ? 'bg-surface-container-lowest shadow-sm text-secondary' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <button
          onClick={() => setActiveTab('pending')}
          className={`border border-outline-variant rounded-xl p-lg shadow-sm transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-[#FEF3C7] border-[#B45309]'
              : 'bg-surface-container-lowest'
          }`}
        >
          <div className="flex items-center justify-between mb-sm">
            <span className={`font-label-sm text-label-sm uppercase tracking-wider ${
              activeTab === 'pending'
                ? 'text-[#B45309]'
                : 'text-on-surface-variant'
            }`}>
              Awaiting Decision
            </span>
            <span className={`material-symbols-outlined ${
              activeTab === 'pending'
                ? 'text-[#B45309]'
                : 'text-secondary'
            }`}>pending_actions</span>
          </div>
          <p className={`font-headline-md text-headline-md ${
            activeTab === 'pending'
              ? 'text-[#B45309]'
              : 'text-on-surface'
          }`}>{stats.pending}</p>
          {stats.urgent > 0 && (
            <p className={`text-xs mt-xs flex items-center gap-1 ${
              activeTab === 'pending'
                ? 'text-[#92400E]'
                : 'text-on-error-container'
            }`}>
              <span className="material-symbols-outlined text-[14px]">priority_high</span>
              {stats.urgent} urgent requests
            </p>
          )}
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`border border-outline-variant rounded-xl p-lg shadow-sm transition-all cursor-pointer ${
            activeTab === 'approved'
              ? 'bg-[#D1FAE5] border-[#065F46]'
              : 'bg-surface-container-lowest'
          }`}
        >
          <div className="flex items-center justify-between mb-sm">
            <span className={`font-label-sm text-label-sm uppercase tracking-wider ${
              activeTab === 'approved'
                ? 'text-[#065F46]'
                : 'text-on-surface-variant'
            }`}>
              Approved (MTD)
            </span>
            <span className={`material-symbols-outlined ${
              activeTab === 'approved'
                ? 'text-[#065F46]'
                : 'text-on-secondary-fixed-variant'
            }`}>check_circle</span>
          </div>
          <p className={`font-headline-md text-headline-md ${
            activeTab === 'approved'
              ? 'text-[#065F46]'
              : 'text-on-surface'
          }`}>{stats.approved}</p>
          <p className={`text-xs mt-xs ${
            activeTab === 'approved'
              ? 'text-[#0C7A5C]'
              : 'text-secondary'
          }`}>This month</p>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`border border-outline-variant rounded-xl p-lg shadow-sm transition-all cursor-pointer ${
            activeTab === 'rejected'
              ? 'bg-[#FEE2E2] border-[#991B1B]'
              : 'bg-surface-container-lowest'
          }`}
        >
          <div className="flex items-center justify-between mb-sm">
            <span className={`font-label-sm text-label-sm uppercase tracking-wider ${
              activeTab === 'rejected'
                ? 'text-[#991B1B]'
                : 'text-on-surface-variant'
            }`}>
              Declined (MTD)
            </span>
            <span className={`material-symbols-outlined ${
              activeTab === 'rejected'
                ? 'text-[#991B1B]'
                : 'text-error'
            }`}>cancel</span>
          </div>
          <p className={`font-headline-md text-headline-md ${
            activeTab === 'rejected'
              ? 'text-[#991B1B]'
              : 'text-on-surface'
          }`}>{stats.rejected}</p>
          <p className={`text-xs mt-xs ${
            activeTab === 'rejected'
              ? 'text-[#BE123C]'
              : 'text-error'
          }`}>This month</p>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col gap-xs max-w-xl">
        <label className="font-label-md text-label-md text-on-surface">Search Employees</label>
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-secondary">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-md py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
            placeholder="Search by name, department, or ID..."
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        {error && (
          <div className="p-lg bg-error-container border-b border-error text-on-error-container">
            {error}
          </div>
        )}

        <table className="w-full border-collapse text-left">
          <thead className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
            <tr>
              <th className="px-lg py-md font-medium">EMPLOYEE NAME</th>
              <th className="px-lg py-md font-medium">LEAVE TYPE</th>
              <th className="px-lg py-md font-medium">DATES</th>
              <th className="px-lg py-md font-medium">DURATION</th>
              <th className="px-lg py-md font-medium">STATUS</th>
              {activeTab === 'pending' && (
                <th className="px-lg py-md font-medium text-right">ACTIONS</th>
              )}
            </tr>
          </thead>
          <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
            {displayRequests.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'pending' ? 6 : 5} className="px-lg py-xl text-center">
                  <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
                      inbox
                    </span>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm mb-2">No Leave Requests Found</h3>
                      <p className="text-on-surface-variant">
                        {activeTab === 'pending' 
                          ? 'No pending requests to review at this time.'
                          : `No ${activeTab} leave requests found.`
                        }
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              displayRequests.map((request) => (
                <tr key={request.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-md">
                      <div className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center font-bold text-xs">
                        {getInitials(request.employeeName)}
                      </div>
                      <span className="font-semibold text-on-surface">{request.employeeName}</span>
                    </div>
                  </td>
                  <td className="px-lg py-md">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLeaveTypeBadgeColor(request.leaveTypeName)}`}>
                      {request.leaveTypeName}
                    </span>
                  </td>
                  <td className="px-lg py-md text-on-surface-variant">
                    {formatDateRange(request.startDate, request.endDate)}
                  </td>
                  <td className="px-lg py-md text-on-surface-variant">{request.totalDays} Days</td>
                  <td className="px-lg py-md">
                    <span className={`flex items-center gap-1.5 ${getStatusColor(request.status)}`}>
                      <span className="w-2 h-2 rounded-full bg-current opacity-60"></span>
                      {request.status}
                    </span>
                  </td>
                  {activeTab === 'pending' && (
                    <td className="px-lg py-md text-right">
                      <div className="flex items-center justify-end gap-sm">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={submitting}
                          className="bg-secondary text-white px-3 py-1.5 rounded-lg font-label-sm text-label-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectClick(request)}
                          disabled={submitting}
                          className="border border-outline-variant bg-white text-on-surface px-3 py-1.5 rounded-lg font-label-sm text-label-sm hover:bg-surface-container-low active:scale-95 transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="px-lg py-md border-t border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <p className="text-label-sm font-label-sm text-on-surface-variant">
            Showing {displayRequests.length} of {leaveRequests.length} {activeTab} requests
          </p>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-md">
          <div 
            className="absolute inset-0 bg-on-background/40 backdrop-blur-sm" 
            onClick={() => setRejectModalOpen(false)}
          />
          <div className="relative bg-surface-container-lowest w-full max-w-[560px] rounded-xl shadow-2xl border border-outline-variant overflow-hidden">
            <div className="p-xl">
              <div className="flex items-center justify-between mb-lg">
                <h3 className="text-headline-sm font-headline-sm text-on-surface">
                  Reject Leave Request
                </h3>
                <button 
                  className="text-outline hover:text-on-surface transition-colors"
                  onClick={() => setRejectModalOpen(false)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mb-lg">
                <p className="text-body-md text-on-surface-variant mb-md">
                  Please provide a reason for declining{' '}
                  <span className="font-bold text-on-surface">{selectedRequest?.employeeName}</span>'s request. 
                  This will be shared with the employee.
                </p>
                
                <label className="block font-label-md text-label-md text-on-surface mb-xs">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-md bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md focus:ring-2 focus:ring-error/20 focus:border-error outline-none transition-all resize-none"
                  placeholder="e.g., Critical project deadline conflict, insufficient remaining balance..."
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-md">
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="px-lg py-2 border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={submitting || !rejectionReason.trim()}
                  className="px-lg py-2 bg-error text-white rounded-lg font-label-md text-label-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
            
            <div className="bg-error-container/20 px-xl py-sm border-t border-error-container">
              <p className="text-on-error-container text-[11px] uppercase tracking-widest font-bold">
                Action cannot be undone
              </p>
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