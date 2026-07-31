import { useState, useEffect, useMemo } from 'react'
import {
  getAdminTimesheet,
  approveEmergencyClockOut,
  rejectEmergencyClockOut,
  getAllEmployees,
  getAllBranches,
  getAllDepartments
} from '../../api/hrmsApi'
import ExportButton from '../../components/ExportButton'

// Helper function to format date for input
const formatDateForInput = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

// Stitch Design Summary Card Component (clickable)
const AttendanceSummaryCard = ({ title, count, icon, bgColor, textColor, iconColor, active, onClick }) => (
  <button
    onClick={onClick}
    className={`${bgColor} border-2 ${active ? 'border-gray-800 ring-2 ring-gray-300' : 'border-outline-variant'} rounded-xl ambient-shadow p-md space-y-xs w-full text-left transition-all hover:scale-[1.02] active:scale-[0.98]`}
  >
    <div className="flex justify-between items-start">
      <span className={`material-symbols-outlined ${iconColor} text-[32px]`}>{icon}</span>
      <span className={`${textColor} text-headline-lg font-headline-lg font-bold`}>{count}</span>
    </div>
    <div>
      <h3 className={`${textColor} font-label-md font-label-md font-semibold`}>{title}</h3>
      <p className={`${textColor} text-label-sm opacity-75`}>As of selected date</p>
    </div>
  </button>
);

// Main Component - Admin-only Attendance Sheet
export default function AttendanceSheetPanel({
  showBranchFilter = true,
  showDepartmentFilter = true,
  showSummaryCards = true,
  title = 'Attendance Sheet',
  subtitle = 'Monitor daily attendance across all employees and branches.'
}) {
  const [timesheetData, setTimesheetData] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('all'); // 'all', 'present', 'absent', 'emergency'
  const [branchFilter, setBranchFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // attendanceId of action in progress
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadTimesheet();
  }, [selectedDate]);

  const loadInitialData = async () => {
    try {
      const [empsRes, branchesRes, deptsRes] = await Promise.all([
        getAllEmployees(),
        getAllBranches().catch(() => ({ data: { data: [] } })),
        getAllDepartments().catch(() => ({ data: { data: [] } }))
      ]);
      setAllEmployees(empsRes.data.data || []);
      setBranches(branchesRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const loadTimesheet = async () => {
    try {
      setLoading(true);
      const res = await getAdminTimesheet(selectedDate);
      setTimesheetData(res.data.data);
    } catch (err) {
      console.error('Error loading timesheet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetToday = () => {
    setSelectedDate(formatDateForInput(new Date()));
  };

  const handleApprove = async (attendanceId) => {
    if (!window.confirm('Approve this emergency clock-out request? The employee will be clocked out immediately.')) return;
    try {
      setActionLoading(attendanceId);
      await approveEmergencyClockOut(attendanceId);
      await loadTimesheet();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (attendanceId) => {
    if (!window.confirm('Reject this emergency clock-out request? The employee will be able to submit a new request.')) return;
    try {
      setActionLoading(attendanceId);
      await rejectEmergencyClockOut(attendanceId);
      await loadTimesheet();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  // Compute stats
  const stats = useMemo(() => {
    if (!timesheetData) return { present: 0, absent: 0, emergency: 0 };
    return {
      present: timesheetData.presentEmployees?.length || 0,
      absent: timesheetData.absentEmployees?.length || 0,
      emergency: timesheetData.pendingEmergencyClockOutRequests?.length || 0
    };
  }, [timesheetData]);

  // Build a combined employee list for the "all" view
  const combinedEmployees = useMemo(() => {
    if (!timesheetData) return [];

    const presentMap = new Map();
    (timesheetData.presentEmployees || []).forEach(emp => {
      presentMap.set(emp.employeeId, {
        ...emp,
        status: 'present',
        statusLabel: 'Present',
        statusColor: 'bg-emerald-100 text-emerald-800'
      });
    });

    const absentList = (timesheetData.absentEmployees || []).map(emp => ({
      ...emp,
      status: 'absent',
      statusLabel: 'Absent',
      statusColor: 'bg-red-100 text-red-800'
    }));

    // Merge: present employees + absent employees
    const combined = [...presentMap.values(), ...absentList];

    // Enrich with branch/department info from allEmployees
    return combined.map(entry => {
      const fullEmp = allEmployees.find(e => e.id === entry.employeeId);
      return {
        ...entry,
        branchName: entry.departmentName ? (fullEmp?.branchName || fullEmp?.branch?.name || 'N/A') : 'N/A',
        departmentName: entry.departmentName || fullEmp?.departmentName || fullEmp?.department?.name || 'N/A',
        role: entry.role || fullEmp?.role || 'Employee',
        shiftName: entry.shiftName || fullEmp?.shiftName || 'N/A',
        email: fullEmp?.email || ''
      };
    });
  }, [timesheetData, allEmployees]);

  // Apply filters
  const filteredEmployees = useMemo(() => {
    let list = combinedEmployees;

    // View filter
    if (activeView === 'present') list = list.filter(e => e.status === 'present');
    if (activeView === 'absent') list = list.filter(e => e.status === 'absent');

    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(e =>
        e.employeeName?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
      );
    }

    // Branch
    if (branchFilter !== 'all') {
      list = list.filter(e => e.branchName === branchFilter);
    }

    // Department
    if (departmentFilter !== 'all') {
      list = list.filter(e => e.departmentName === departmentFilter);
    }

    return list;
  }, [combinedEmployees, activeView, searchTerm, branchFilter, departmentFilter]);

  // Emergency requests filtered
  const filteredEmergencyRequests = useMemo(() => {
    if (!timesheetData) return [];
    let list = timesheetData.pendingEmergencyClockOutRequests || [];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => r.employeeName?.toLowerCase().includes(q));
    }

    return list;
  }, [timesheetData, searchTerm]);

  // Unique branches/departments from combined data for filter dropdowns
  const branchOptions = useMemo(() => {
    const names = [...new Set(combinedEmployees.map(e => e.branchName).filter(n => n && n !== 'N/A'))];
    return names.sort();
  }, [combinedEmployees]);

  const departmentOptions = useMemo(() => {
    const names = [...new Set(combinedEmployees.map(e => e.departmentName).filter(n => n && n !== 'N/A'))];
    return names.sort();
  }, [combinedEmployees]);

  const isToday = selectedDate === formatDateForInput(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant animate-pulse block mb-sm">hourglass_empty</span>
          <p className="text-body-md text-on-surface-variant">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">{title}</h1>
          <p className="text-body-md text-on-surface-variant mt-xs">{subtitle}</p>
        </div>
        <div className="flex items-center gap-sm">
          <button
            onClick={handleSetToday}
            className={`flex items-center gap-xs px-md py-sm rounded-lg text-label-md font-bold transition-all ${
              isToday
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">today</span>
            Today
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-11 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
          />
        </div>
      </div>

      {/* Company Off Day Alert Banner */}
      {timesheetData?.isCompanyOffDay && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-lg text-center space-y-sm ambient-shadow">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-blue-600 text-[36px]">event_busy</span>
          </div>
          <div>
            <h2 className="text-headline-sm font-bold text-blue-900">Scheduled Company Off Day</h2>
            <p className="text-body-md text-blue-700 max-w-md mx-auto mt-xs">
              Every employee has an off day scheduled for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
            </p>
          </div>
        </div>
      )}

      {/* Attendance Summary Cards */}
      {showSummaryCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          <AttendanceSummaryCard
            title="Present"
            count={stats.present}
            icon="check_circle"
            bgColor="bg-emerald-100"
            textColor="text-emerald-900"
            iconColor="text-emerald-600"
            active={activeView === 'present'}
            onClick={() => setActiveView(activeView === 'present' ? 'all' : 'present')}
          />
          <AttendanceSummaryCard
            title="Absent"
            count={stats.absent}
            icon="cancel"
            bgColor="bg-red-100"
            textColor="text-red-900"
            iconColor="text-red-600"
            active={activeView === 'absent'}
            onClick={() => setActiveView(activeView === 'absent' ? 'all' : 'absent')}
          />
          <AttendanceSummaryCard
            title="Emergency Requests"
            count={stats.emergency}
            icon="warning"
            bgColor="bg-orange-100"
            textColor="text-orange-900"
            iconColor="text-orange-600"
            active={activeView === 'emergency'}
            onClick={() => setActiveView(activeView === 'emergency' ? 'all' : 'emergency')}
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow p-md">
        <div className="flex flex-col sm:flex-row gap-md">
          <div className="relative flex-1 min-w-72">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search by Employee Name or Email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-lg pr-sm py-sm border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary focus:ring-opacity-10 focus:border-secondary outline-none text-body-md font-body-md transition-all"
            />
          </div>

          {showBranchFilter && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-11 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
            >
              <option value="all">All Branches</option>
              {branchOptions.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          {showDepartmentFilter && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-11 px-sm border border-outline-variant rounded-DEFAULT bg-surface-bright text-body-md font-body-md focus-ring transition-all"
            >
              <option value="all">All Departments</option>
              {departmentOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setSearchTerm('');
              setActiveView('all');
              setBranchFilter('all');
              setDepartmentFilter('all');
            }}
            className="h-11 px-md border border-outline-variant rounded-DEFAULT bg-surface-bright text-on-surface-variant text-label-md font-label-md hover:bg-surface-container transition-all flex items-center justify-center gap-xs flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            <span className="hidden sm:inline">Reset</span>
          </button>

          <ExportButton 
            branch={branchFilter !== 'all' ? branchFilter : undefined}
            department={departmentFilter !== 'all' ? departmentFilter : undefined}
            search={searchTerm}
            date={selectedDate}
          />
        </div>
      </div>

      {/* Emergency Requests Panel (shown when emergency view is active) */}
      {activeView === 'emergency' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
          <div className="px-md py-md bg-orange-50 border-b border-outline-variant flex items-center gap-sm">
            <span className="material-symbols-outlined text-orange-600 text-[24px]">warning</span>
            <h3 className="text-label-md font-bold text-orange-900">Pending Emergency Clock-Out Requests</h3>
            <span className="ml-auto bg-orange-200 text-orange-800 text-label-sm font-bold px-xs py-0.5 rounded-full">
              {filteredEmergencyRequests.length}
            </span>
          </div>

          {filteredEmergencyRequests.length === 0 ? (
            <div className="text-center py-lg text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-xs block text-outline">task_alt</span>
              <p className="text-body-md">No pending emergency requests for this date.</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {filteredEmergencyRequests.map((req) => (
                <div key={req.attendanceId} className="px-md py-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-sm flex-1">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-700 font-bold text-xs">{req.employeeName?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-label-md font-bold text-on-surface">{req.employeeName}</p>
                      <p className="text-label-sm text-on-surface-variant">
                        Shift: {req.shiftName || 'N/A'} • Requested at {req.requestedClockOutAt ? new Date(req.requestedClockOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 sm:flex-initial">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-sm py-xs">
                      <p className="text-label-sm text-amber-800">
                        <span className="font-bold">Reason: </span>{req.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-sm flex-shrink-0">
                    <button
                      onClick={() => handleApprove(req.attendanceId)}
                      disabled={actionLoading === req.attendanceId}
                      className="px-md py-xs bg-emerald-600 text-white rounded-lg text-label-md font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      {actionLoading === req.attendanceId ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(req.attendanceId)}
                      disabled={actionLoading === req.attendanceId}
                      className="px-md py-xs bg-red-600 text-white rounded-lg text-label-md font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                      {actionLoading === req.attendanceId ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Employee Attendance Table (shown for all/present/absent views) */}
      {activeView !== 'emergency' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Employee</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Branch</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Department</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Role</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Current Shift</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Clock In</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Clock Out</th>
                  <th className="px-md py-sm text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredEmployees.map((emp, idx) => (
                  <tr key={`${emp.employeeId}-${idx}`} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-md py-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                          <span className="text-on-primary-container font-bold text-xs">{emp.employeeName?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-label-md font-label-md text-on-surface">{emp.employeeName}</p>
                          {emp.email && <p className="text-label-sm text-outline">{emp.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-md py-md text-body-md text-on-surface-variant">{emp.branchName || 'N/A'}</td>
                    <td className="px-md py-md text-body-md text-on-surface-variant">{emp.departmentName || 'N/A'}</td>
                    <td className="px-md py-md">
                      <span className="inline-block px-xs py-0.5 bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold rounded-full">{emp.role}</span>
                    </td>
                    <td className="px-md py-md">
                      <span className="inline-block px-xs py-0.5 bg-tertiary-fixed text-on-tertiary-fixed text-xs font-semibold rounded-full">
                        {emp.shiftName || 'N/A'}
                      </span>
                    </td>
                    <td className="px-md py-md text-body-md text-on-surface-variant">
                      {emp.clockIn
                        ? new Date(emp.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-outline italic">Not clocked in</span>
                      }
                    </td>
                    <td className="px-md py-md text-body-md text-on-surface-variant">
                      {emp.clockOut
                        ? new Date(emp.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-outline italic">Not clocked out</span>
                      }
                    </td>
                    <td className="px-md py-md">
                      <span className={`inline-block px-xs py-0.5 text-xs font-semibold rounded-full ${emp.statusColor}`}>
                        {emp.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-lg text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-xs block text-outline">search_off</span>
              <p className="text-body-md">No employees found matching your filters.</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-md py-sm bg-surface-container-low flex items-center justify-between border-t border-outline-variant">
            <p className="text-label-sm text-on-surface-variant">
              Showing {filteredEmployees.length} employees
              {activeView !== 'all' && ` (${activeView})`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
