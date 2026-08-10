import api from './axiosInstance'

// --- Employees (EmployeeController) ---
export const getAllEmployees = () => api.get('/employee')
export const getEmployeeById = (id) => api.get(`/employee/${id}`)
export const getMyProfile = () => api.get('/employee/me')
export const createEmployee = (payload) => api.post('/employee', payload)
export const updateEmployee = (id, payload) => api.put(`/employee/${id}`, payload)
export const updateMyProfile = (payload) => api.put('/employee/me', payload)
export const deleteEmployee = (id) => api.delete(`/employee/${id}`)

// --- Departments (DepartmentController) ---
export const getAllDepartments = () => api.get('/department')
export const createDepartment = (payload) => api.post('/department', payload)
export const updateDepartment = (id, payload) => api.put(`/department/${id}`, payload)
export const deleteDepartment = (id) => api.delete(`/department/${id}`)

// --- Branches (BranchController) ---
export const getAllBranches          = ()          => api.get('/branch')
export const getBranchById           = (id)        => api.get(`/branch/${id}`)
export const getBranchDepartments    = (branchId)  => api.get(`/branch/${branchId}/departments`)
export const getBranchDeleteImpact   = (id)        => api.get(`/branch/${id}/delete-impact`)
export const createBranch            = (data)      => api.post('/branch', data)
export const updateBranch            = (id, data)  => api.put(`/branch/${id}`, data)
export const deleteBranch            = (id)        => api.delete(`/branch/${id}`)

// --- Leave Types (LeaveController) ---
export const getAllLeaveTypes = () => api.get('/leave/types')

// --- Leave Periods (LeaveController) ---
export const getCurrentLeavePeriod = () => api.get('/leave/periods/current')
export const createLeavePeriod = (data) => api.post('/leave/periods', data)

// --- Leave Quotas (LeaveController) ---
export const getEmployeeQuotasForCurrentPeriod = (employeeId) => api.get(`/leave/quotas/employee/${employeeId}/current`)
export const getAllQuotasForPeriod = (periodId) => api.get(`/leave/quotas/period/${periodId}`)
export const getAllLeaveQuotas = () => api.get('/leave/quotas')
export const createLeaveQuota = (data) => api.post('/leave/quotas', data)
export const updateLeaveQuota = (quotaId, data) => api.put(`/leave/quotas/${quotaId}`, data)

// --- Leave Requests (LeaveController) ---
// --- Leave Requests (LeaveController) ---
export const getLeaveSetupStatus = (employeeId) => api.get(`/leave/setup-status/employee/${employeeId}`)
export const getFractionalLeaveEligibility = () => api.get(`/leave/fractional-leave-eligibility`)
export const applyForLeave = (data) => api.post('/leave/requests/apply', data)
export const getEmployeePendingLeaves = () => api.get('/leave/requests/pending')
export const getAllPendingLeaves = () => api.get('/leave/requests/pending/all')
export const approveLeaveRequest = (leaveRequestId) => api.put(`/leave/requests/${leaveRequestId}/approve`)
export const rejectLeaveRequest = (leaveRequestId, data) => api.put(`/leave/requests/${leaveRequestId}/reject`, data)
export const getEmployeeLeaveHistory = (employeeId) => api.get(`/leave/requests/history/employee/${employeeId}`)
export const getAllLeaves = () => api.get('/leave/requests/all')

// --- Shifts (ShiftController) ---
export const getAllShifts = () => api.get('/shift')
export const createShift = (data) => api.post('/shift', data)
export const updateShift = (id, data) => api.put(`/shift/${id}`, data)
export const deleteShift = (id) => api.delete(`/shift/${id}`)

// --- Employee Shift Assignment (EmployeeController) ---
export const assignEmployeeShift = (employeeId, shiftId) => api.put(`/employee/${employeeId}/shift`, { shiftId })

// --- Working Days (WorkingDaysController) ---
export const getEmployeeWorkingDays = (employeeId) => api.get(`/workingdays/employee/${employeeId}`)
export const updateEmployeeWorkingDays = (employeeId, data) => api.put(`/workingdays/employee/${employeeId}`, data)

// --- Attendance (AttendanceController) ---
export const getTodayAttendance = () => api.get('/attendance/today')
export const getEmployeeAttendance = (employeeId, date) => api.get(`/attendance/employee/${employeeId}?date=${date}`)
export const getAttendanceByDateRange = (startDate, endDate) => api.get(`/attendance/range?start=${startDate}&end=${endDate}`)
export const markAttendance = (employeeId, data) => api.post(`/attendance/employee/${employeeId}`, data)
export const getAttendanceStats = (date = null) => {
  const url = date ? `/attendance/stats?date=${date}` : '/attendance/stats';
  return api.get(url);
}

export const getMyTodayAttendance = () => api.get('/attendance/my-today')
export const getMyAttendanceHistory = (startDate, endDate) => api.get('/attendance/my-history', { params: { startDate, endDate } })
export const clockIn = () => api.post('/attendance/clock-in')
export const clockOut = (payload) => api.post('/attendance/clock-out', payload)

export const getAdminTimesheet = (date) => api.get('/attendance/admin/timesheet', { params: { date } })
export const approveEmergencyClockOut = (attendanceId) => api.put(`/attendance/admin/emergency-clock-out/${attendanceId}/approve`)
export const rejectEmergencyClockOut = (attendanceId) => api.put(`/attendance/admin/emergency-clock-out/${attendanceId}/reject`)
export const backfillShiftAssignments = () => api.post('/attendance/admin/backfill-shift-assignments')
