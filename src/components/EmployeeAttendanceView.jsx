import { useState, useEffect, useMemo } from 'react'
import {
  getMyProfile,
  getMyTodayAttendance,
  getMyAttendanceHistory,
  clockIn,
  clockOut
} from '../api/hrmsApi'

// Helper functions to format date and time for input
const formatDateForInput = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

// Get Monday of the current week
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
};

export default function EmployeeAttendanceView() {
  const [profile, setProfile] = useState(null)
  const [todayData, setTodayData] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [historyData, setHistoryData] = useState([])
  const [weeklyHistory, setWeeklyHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Filter states
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [startDate, setStartDate] = useState(formatDateForInput(startOfMonth))
  const [endDate, setEndDate] = useState(formatDateForInput(today))
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Emergency Clock Out Modal states
  const [showClockOutModal, setShowClockOutModal] = useState(false)
  const [clockOutForm, setClockOutForm] = useState({
    reason: '',
    notes: ''
  })

  // Load user profile & attendance data
  const loadData = async () => {
    try {
      setLoading(true)
      const weekStart = formatDateForInput(getStartOfWeek(new Date()))
      const weekEnd = formatDateForInput(new Date())
      const [profRes, todayRes, histRes, weekRes] = await Promise.all([
        getMyProfile(),
        getMyTodayAttendance(),
        getMyAttendanceHistory(startDate, endDate),
        getMyAttendanceHistory(weekStart, weekEnd)
      ])
      setProfile(profRes.data.data)
      setTodayData(todayRes.data.data)
      setHistoryData(histRes.data.data || [])
      setWeeklyHistory(weekRes.data.data || [])
    } catch (err) {
      console.error('Failed to load attendance data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [startDate, endDate])

  // Update clock every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(clockInterval)
  }, [])

  const formatTime = (date) => {
    let hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`
  }

  const formatElapsed = (seconds) => {
    if (seconds < 0) seconds = 0
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Shift & Today's Attendance Calculations
  const hasShift = profile?.shiftId && todayData?.hasShift
  const shiftName = todayData?.shiftName || profile?.shiftName || 'N/A'
  const attendanceRecord = todayData?.todayAttendance
  const isOffDay = hasShift && !todayData?.isWorkingDayToday
  const isOnLeave = todayData?.isOnLeaveToday

  // Weekly stats: calculate total hours worked this week from real data
  const weeklyStats = useMemo(() => {
    let totalMinutes = 0
    let onTimeCount = 0
    let totalDays = 0
    let overtimeMinutes = 0

    weeklyHistory.forEach(record => {
      if (record.clockIn) {
        totalDays++
        const clockInTime = new Date(record.clockIn)
        const startTimeObj = new Date(record.startTime)

        // On-time: clocked in at or before shift start
        if (clockInTime <= startTimeObj) onTimeCount++

        if (record.clockOut) {
          const clockOutTime = new Date(record.clockOut)
          const workedMs = clockOutTime - clockInTime
          const workedMins = Math.floor(workedMs / 60000)
          totalMinutes += workedMins

          // Overtime: time beyond scheduled shift end
          const endTimeObj = new Date(record.endTime)
          if (clockOutTime > endTimeObj) {
            overtimeMinutes += Math.floor((clockOutTime - endTimeObj) / 60000)
          }
        } else {
          // Currently clocked in — count up to now
          const now = new Date()
          const workedMs = now - clockInTime
          totalMinutes += Math.floor(workedMs / 60000)
        }
      }
    })

    const totalHours = totalMinutes / 60
    const overtimeHours = overtimeMinutes / 60
    const onTimePercent = totalDays > 0 ? Math.round((onTimeCount / totalDays) * 100) : 0

    // Expected hours: shift duration * 5 working days (approximate)
    let expectedHours = 40
    if (todayData?.shiftStartTime && todayData?.shiftEndTime) {
      const [sh, sm] = todayData.shiftStartTime.split(':').map(Number)
      const [eh, em] = todayData.shiftEndTime.split(':').map(Number)
      let dailyHours = (eh * 60 + em - sh * 60 - sm) / 60
      if (dailyHours <= 0) dailyHours += 24 // overnight shift
      expectedHours = dailyHours * 5
    }

    return { totalHours, expectedHours, onTimePercent, overtimeHours, totalDays }
  }, [weeklyHistory, todayData])

  const shiftStartObj = useMemo(() => {
    if (!todayData?.shiftStartDateTime) return null
    return new Date(todayData.shiftStartDateTime)
  }, [todayData])

  const shiftEndObj = useMemo(() => {
    if (!todayData?.shiftEndDateTime) return null
    return new Date(todayData.shiftEndDateTime)
  }, [todayData])

  // State machine for current window state
  // 'NO_SHIFT' | 'BEFORE_SHIFT' | 'SHIFT_ACTIVE' | 'CLOCKED_IN' | 'CLOCKED_OUT' | 'AFTER_SHIFT'
  const currentWindowState = useMemo(() => {
    if (!hasShift) return 'NO_SHIFT'
    if (attendanceRecord?.clockIn) {
      if (!attendanceRecord.clockOut) return 'CLOCKED_IN'
      return 'CLOCKED_OUT'
    }
    if (!shiftStartObj || !shiftEndObj) return 'BEFORE_SHIFT'
    if (currentTime < shiftStartObj) return 'BEFORE_SHIFT'
    if (currentTime >= shiftStartObj && currentTime < shiftEndObj) return 'SHIFT_ACTIVE'
    return 'AFTER_SHIFT'
  }, [hasShift, attendanceRecord, shiftStartObj, shiftEndObj, currentTime])

  const isClockInEnabled = currentWindowState === 'SHIFT_ACTIVE' && !actionLoading
  const isNormalClockOutAvailable = currentWindowState === 'CLOCKED_IN' && shiftEndObj && currentTime >= shiftEndObj
  const isEmergencyClockOutNeeded = currentWindowState === 'CLOCKED_IN' && shiftEndObj && currentTime < shiftEndObj
  const hasPendingEmergencyRequest = attendanceRecord?.emergencyClockOutStatus === 'Pending'
  const isClockOutEnabled = (isNormalClockOutAvailable || isEmergencyClockOutNeeded) && !actionLoading && !hasPendingEmergencyRequest

  // Auto clock-out when shift ends
  useEffect(() => {
    const checkAutoClockOut = async () => {
      // Only auto clock-out if:
      // 1. User is clocked in
      // 2. Shift has ended (current time >= shift end time)
      // 3. No emergency clock-out pending
      // 4. Not already clocked out
      if (
        currentWindowState === 'CLOCKED_IN' &&
        shiftEndObj &&
        currentTime >= shiftEndObj &&
        !hasPendingEmergencyRequest &&
        attendanceRecord?.clockIn &&
        !attendanceRecord?.clockOut
      ) {
        console.log('Auto clock-out triggered: Shift ended')
        try {
          await clockOut({ emergencyReason: null, autoClockOut: true })
          await loadData() // Reload to show "Shift Ended" state
        } catch (err) {
          console.error('Auto clock-out failed:', err)
        }
      }
    }

    checkAutoClockOut()
  }, [currentTime, currentWindowState, shiftEndObj, attendanceRecord, hasPendingEmergencyRequest])

  // Calculate elapsed time if clocked in
  const elapsedSeconds = useMemo(() => {
    if (currentWindowState !== 'CLOCKED_IN' || !attendanceRecord?.clockIn) return 0
    const clockInTime = new Date(attendanceRecord.clockIn)
    return Math.floor((currentTime - clockInTime) / 1000)
  }, [currentWindowState, attendanceRecord, currentTime])

  // Formatted history table data
  const formattedHistoryData = useMemo(() => {
    return historyData.map(record => {
      const d = new Date(record.date)
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'long' })
      const clockInTime = record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
      const clockOutTime = record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
      
      let hoursStr = '0h 0m'
      if (record.clockIn && record.clockOut) {
        const diffMs = new Date(record.clockOut) - new Date(record.clockIn)
        const diffMins = Math.floor(diffMs / 60000)
        const h = Math.floor(diffMins / 60)
        const m = diffMins % 60
        hoursStr = `${h}h ${m}m`
      } else if (record.clockIn && !record.clockOut) {
        const diffMs = currentTime - new Date(record.clockIn)
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000)
          const h = Math.floor(diffMins / 60)
          const m = diffMins % 60
          hoursStr = `${h}h ${m}m`
        }
      }

      const status = record.clockIn ? 'Present' : 'Absent'
      const statusColor = record.clockIn ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'

      return {
        id: record.id,
        dateStr,
        dayStr,
        status,
        statusColor,
        clockInTime,
        clockOutTime,
        hoursStr
      }
    })
  }, [historyData, currentTime])

  const filteredAttendance = useMemo(() => {
    return formattedHistoryData.filter(record => {
      const statusMatch = statusFilter === 'all' || record.status.toLowerCase() === statusFilter.toLowerCase()
      const searchLower = searchTerm.toLowerCase()
      const searchMatch = !searchTerm ||
        record.dateStr.toLowerCase().includes(searchLower) ||
        record.dayStr.toLowerCase().includes(searchLower) ||
        record.status.toLowerCase().includes(searchLower)

      return statusMatch && searchMatch
    })
  }, [formattedHistoryData, statusFilter, searchTerm])

  const resetFilters = () => {
    setStartDate(formatDateForInput(startOfMonth))
    setEndDate(formatDateForInput(today))
    setStatusFilter('all')
    setSearchTerm('')
  }

  const handleClockInClick = async () => {
    if (!isClockInEnabled) return
    try {
      setActionLoading(true)
      await clockIn()
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to clock in')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClockOutClick = () => {
    if (!isClockOutEnabled) return
    if (isEmergencyClockOutNeeded) {
      setClockOutForm({ reason: '', notes: '' })
      setShowClockOutModal(true)
    } else {
      // Normal Clock Out
      handleNormalClockOut()
    }
  }

  const handleNormalClockOut = async () => {
    try {
      setActionLoading(true)
      await clockOut({ emergencyReason: null })
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to clock out')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmEmergencyClockOut = async () => {
    if (!clockOutForm.reason && !clockOutForm.notes) {
      alert('Please select or enter a reason for early clock out.')
      return
    }
    try {
      setActionLoading(true)
      const combinedReason = clockOutForm.reason
        ? `${clockOutForm.reason}${clockOutForm.notes ? `: ${clockOutForm.notes}` : ''}`
        : clockOutForm.notes
      await clockOut({ emergencyReason: combinedReason })
      setShowClockOutModal(false)
      setClockOutForm({ reason: '', notes: '' })
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to request emergency clock out')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant animate-pulse block mb-sm">hourglass_empty</span>
          <p className="text-body-md text-on-surface-variant">Loading attendance data...</p>
        </div>
      </div>
    )
  }

  const isSingleDateSelected = startDate === endDate
  const emptyStateText = isSingleDateSelected
    ? "No attendance exists for this date"
    : "No attendance records found for the selected range"

  return (
    <div className="space-y-lg">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-md">
        <div className="flex-1">
          <h3 className="text-headline-lg font-headline-lg text-on-surface">
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'; })()}, {profile?.fullName?.split(' ')[0] || 'Employee'}
          </h3>
          <p className="text-body-lg text-on-surface-variant">
            {isOffDay ? "Here's your attendance overview for the week." : `Your attendance status for today, ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`}
          </p>
        </div>
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-sm bg-surface-container-high px-md py-sm rounded-lg border border-outline-variant">
            <span className="material-symbols-outlined text-primary">schedule</span>
            <span className="font-headline-md text-headline-md tabular-nums">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* Main Status Cards */}
      {isOnLeave ? (
        /* On Leave State — Bento Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          {/* Main Leave Card */}
          <div className="lg:col-span-8 bg-surface-container-lowest border border-surface-container-highest rounded-xl p-xl relative overflow-hidden flex flex-col justify-center min-h-[320px] shadow-sm">
            {/* Subtle background decoration */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-tertiary-fixed opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-primary-fixed opacity-10 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-tertiary-container rounded-full flex items-center justify-center mb-md shadow-sm">
                <span className="material-symbols-outlined text-tertiary text-[40px]">sick</span>
              </div>
              <h3 className="text-headline-lg font-headline-lg text-on-surface mb-xs">Enjoy your day off!</h3>
              <p className="text-on-surface-variant font-body-lg max-w-lg mb-lg">
                You are on approved leave today. No clock-in is required.
              </p>
              
              {todayData?.leaveType && (
                <div className="bg-tertiary-container px-lg py-sm rounded-full border border-tertiary-container-highest flex items-center gap-sm mb-md">
                  <span className="material-symbols-outlined text-on-tertiary-container">event_available</span>
                  <span className="font-label-md text-on-tertiary-container">{todayData.leaveType}</span>
                </div>
              )}
              
              <div className="bg-surface-container-low px-lg py-sm rounded-full border border-surface-container-highest flex items-center gap-sm mb-lg">
                <span className="material-symbols-outlined text-primary">event</span>
                <span className="font-label-md text-on-surface">Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="inline-flex items-center gap-sm px-xl py-md bg-surface-container-highest text-outline font-label-md rounded-lg border border-outline-variant">
                <span className="material-symbols-outlined">block</span>
                No Active Shift Today
              </div>
            </div>
          </div>

          {/* Side Stats Panel */}
          <div className="lg:col-span-4 flex flex-col gap-lg">
            <div className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-lg flex-1 shadow-sm">
              <h4 className="font-label-md text-on-surface-variant uppercase mb-md tracking-wider">This Week's Stats</h4>
              <div className="space-y-md">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Hours Logged</span>
                  <span className="font-label-md text-on-surface">{weeklyStats.totalHours.toFixed(1)} / {weeklyStats.expectedHours}h</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((weeklyStats.totalHours / weeklyStats.expectedHours) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-sm pt-sm">
                  <div className="bg-surface-container-low p-sm rounded-lg text-center">
                    <p className="text-label-sm text-on-surface-variant">On Time</p>
                    <p className="font-headline-md text-primary">{weeklyStats.onTimePercent}%</p>
                  </div>
                  <div className="bg-surface-container-low p-sm rounded-lg text-center">
                    <p className="text-label-sm text-on-surface-variant">Overtime</p>
                    <p className="font-headline-md text-secondary">{weeklyStats.overtime}h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : isOffDay ? (
        /* Off Day State — Bento Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          {/* Main Off-Day Card */}
          <div className="lg:col-span-8 bg-surface-container-lowest border border-surface-container-highest rounded-xl p-xl relative overflow-hidden flex flex-col justify-center min-h-[320px] shadow-sm">
            {/* Subtle background decoration */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary-fixed opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-secondary-fixed opacity-10 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-md shadow-sm">
                <span className="material-symbols-outlined text-primary text-[40px]">calendar_month</span>
              </div>
              <h3 className="text-headline-lg font-headline-lg text-on-surface mb-xs">Enjoy your day off!</h3>
              <p className="text-on-surface-variant font-body-lg max-w-lg mb-lg">
                Today is a scheduled day off for you. No clock-in is required.
              </p>
              <div className="bg-surface-container-low px-lg py-sm rounded-full border border-surface-container-highest flex items-center gap-sm mb-lg">
                <span className="material-symbols-outlined text-primary">event</span>
                <span className="font-label-md text-on-surface">Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="inline-flex items-center gap-sm px-xl py-md bg-surface-container-highest text-outline font-label-md rounded-lg border border-outline-variant">
                <span className="material-symbols-outlined">block</span>
                No Active Shift Today
              </div>
            </div>
          </div>

          {/* Side Stats Panel */}
          <div className="lg:col-span-4 flex flex-col gap-lg">
            <div className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-lg flex-1 shadow-sm">
              <h4 className="font-label-md text-on-surface-variant uppercase mb-md tracking-wider">This Week's Stats</h4>
              <div className="space-y-md">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Hours Logged</span>
                  <span className="font-label-md text-on-surface">{weeklyStats.totalHours.toFixed(1)} / {weeklyStats.expectedHours}h</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((weeklyStats.totalHours / weeklyStats.expectedHours) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-sm pt-sm">
                  <div className="bg-surface-container-low p-sm rounded-lg text-center">
                    <p className="text-label-sm text-on-surface-variant">On Time</p>
                    <p className="font-headline-md text-primary">{weeklyStats.onTimePercent}%</p>
                  </div>
                  <div className="bg-surface-container-low p-sm rounded-lg text-center">
                    <p className="text-label-sm text-on-surface-variant">Overtime</p>
                    <p className="font-headline-md text-secondary">{weeklyStats.overtimeHours.toFixed(1)}h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : !hasShift ? (
        /* Null Shift State Banner */
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 text-center space-y-2">
          <span className="material-symbols-outlined text-[48px] text-amber-600">warning</span>
          <h4 className="text-xl font-bold text-amber-900">Shift not assigned. Contact Admin.</h4>
          <p className="text-amber-700 text-sm">
            You do not currently have an active shift assigned to your account. Please reach out to your Administrator to assign a shift schedule.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-lg">
          {/* Banner alert when shift start time has arrived (Rule 7) */}
          {currentWindowState === 'SHIFT_ACTIVE' && (
            <div className="bg-blue-600 text-white px-lg py-md rounded-xl flex items-center justify-between shadow-md">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-[28px] animate-bounce">notifications_active</span>
                <div>
                  <p className="font-bold text-lg">Mark your attendance now</p>
                  <p className="text-sm text-blue-100">Your shift start time has arrived. Please clock in to record your attendance.</p>
                </div>
              </div>
              <button
                onClick={handleClockInClick}
                disabled={actionLoading}
                className="px-lg py-sm bg-white text-blue-700 font-bold rounded-lg hover:bg-blue-50 transition-colors shadow"
              >
                Clock In
              </button>
            </div>
          )}

          {/* Action Card (Clock In / Out) */}
          <div className="relative overflow-hidden bg-surface-container-lowest border border-surface-container-highest rounded-xl p-lg shadow-sm group">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-lg">
              <div className="space-y-sm flex-1">
                {/* Subtext above "Shift: {ShiftName}" for Rule 6 & Rule 10 */}
                {(currentWindowState === 'BEFORE_SHIFT' || currentWindowState === 'AFTER_SHIFT') && (
                  <p className="text-sm font-semibold text-amber-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Shift hasn't started yet
                  </p>
                )}

                {currentWindowState === 'CLOCKED_IN' && (
                  <div className="inline-flex items-center gap-sm px-md py-xs bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-label-sm font-bold uppercase tracking-wider">Currently In Office</span>
                  </div>
                )}

                {currentWindowState === 'CLOCKED_OUT' && (
                  <div className="inline-flex items-center gap-sm px-md py-xs bg-gray-100 text-gray-700 rounded-full border border-gray-300">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    <span className="text-label-sm font-bold uppercase tracking-wider">Shift Completed</span>
                  </div>
                )}

                <h4 className="text-headline-lg font-headline-lg text-on-surface">Shift: {shiftName}</h4>
                <p className="text-body-md text-on-surface-variant">
                  Schedule: {todayData?.shiftStartTime ? todayData.shiftStartTime.substring(0, 5) : '09:00'} - {todayData?.shiftEndTime ? todayData.shiftEndTime.substring(0, 5) : '18:00'}
                </p>

                {/* Active Clock In Information */}
                {currentWindowState === 'CLOCKED_IN' && (
                  <div className="mt-md flex items-center gap-lg">
                    <div>
                      <p className="text-label-sm text-on-surface-variant mb-xs">Clocked In At</p>
                      <p className="text-headline-md font-headline-md text-on-surface">
                        {attendanceRecord?.clockIn ? new Date(attendanceRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </p>
                    </div>
                    <div className="w-px h-10 bg-outline-variant"></div>
                    <div>
                      <p className="text-label-sm text-on-surface-variant mb-xs">Time Elapsed</p>
                      <p className="text-headline-md font-headline-md text-primary tabular-nums">
                        {formatElapsed(elapsedSeconds)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Emergency Clock Out Pending Notification */}
                {attendanceRecord?.emergencyClockOutStatus === 'Pending' && (
                  <div className="mt-md p-md bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600">hourglass_top</span>
                    <span>Emergency Clock Out request is pending Admin approval.</span>
                  </div>
                )}
              </div>

              {/* Only show Clock Out button for EMERGENCY clock-out (before shift ends) */}
              {isEmergencyClockOutNeeded && (
                <div className="flex flex-col gap-md w-full md:w-auto min-w-60">
                  <button
                    onClick={handleClockOutClick}
                    disabled={!isClockOutEnabled}
                    title={hasPendingEmergencyRequest ? 'Emergency clock-out request pending approval' : 'Clock out before shift end time'}
                    className={`w-full py-md px-lg border-2 rounded-xl font-bold flex items-center justify-center gap-md transition-all ${
                      isClockOutEnabled
                        ? 'border-primary text-primary hover:bg-primary/5 active:scale-95 cursor-pointer shadow-sm'
                        : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span className="material-symbols-outlined">logout</span>
                    {hasPendingEmergencyRequest ? 'Awaiting Approval...' : 'Clock Out Early (Request)'}
                  </button>
                </div>
              )}
            </div>

            {/* Background Decorative Element */}
            <div className="absolute -right-12 -bottom-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <span className="material-symbols-outlined text-[240px]">timer</span>
            </div>
          </div>
        </div>
      )}

      {/* Attendance History Section */}
      <section className="bg-surface-container-lowest border border-surface-container-highest rounded-xl shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="px-lg py-lg border-b border-surface-container-highest flex flex-col sm:flex-row sm:items-center justify-between gap-md">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary-container">history</span>
            <h4 className="text-headline-md font-headline-md text-on-surface">My Attendance History</h4>
          </div>
          <button
            onClick={() => {
              const todayStr = formatDateForInput(new Date());
              setStartDate(todayStr);
              setEndDate(todayStr);
            }}
            className={`flex items-center gap-xs px-md py-sm rounded-lg text-label-md font-bold transition-all ${
              startDate === formatDateForInput(new Date()) && endDate === formatDateForInput(new Date())
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-outline-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">today</span>
            Today
          </button>
        </div>

        {/* Filter Controls Section */}
        <div className="px-lg py-lg bg-surface-container-low border-b border-surface-container-highest space-y-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
            {/* Start Date Filter */}
            <div>
              <label className="block text-label-sm font-bold text-on-surface-variant mb-xs">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-label-sm font-bold text-on-surface-variant mb-xs">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Status Filter Dropdown */}
            <div>
              <label className="block text-label-sm font-bold text-on-surface-variant mb-xs">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              >
                <option value="all">All</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-md py-sm border border-outline-variant rounded-lg text-label-md font-bold text-on-surface-variant hover:bg-surface-container-lowest transition-colors flex items-center justify-center gap-sm"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Reset
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-label-sm font-bold text-on-surface-variant mb-xs">Search (Date, Day, or Status)</label>
            <input
              type="text"
              placeholder="Search attendance records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface text-body-md placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-lg py-md text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">Date</th>
                <th className="px-lg py-md text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-lg py-md text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">Clock In</th>
                <th className="px-lg py-md text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">Clock Out</th>
                <th className="px-lg py-md text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest">
              {filteredAttendance.length > 0 ? (
                filteredAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-lg py-md">
                      <p className="text-body-md font-medium text-on-surface">{record.dateStr}</p>
                      <p className="text-label-xs text-on-surface-variant">{record.dayStr}</p>
                    </td>
                    <td className="px-lg py-md">
                      <span className={`inline-flex items-center px-xs py-0.5 rounded-full text-label-xs font-bold border ${record.statusColor}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-lg py-md text-body-md text-on-surface font-medium">{record.clockInTime}</td>
                    <td className="px-lg py-md text-body-md text-on-surface font-medium">{record.clockOutTime}</td>
                    <td className="px-lg py-md text-body-md text-on-surface-variant">{record.hoursStr}</td>
                  </tr>
                ))
              ) : (
                /* Empty state as per Rule 11 */
                <tr>
                  <td colSpan="5" className="px-lg py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-sm">
                      <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">event_busy</span>
                      <p className="text-body-lg font-semibold text-on-surface-variant">{emptyStateText}</p>
                      <p className="text-label-sm text-on-surface-variant/70">Adjust your date range or filters to search again.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-lg py-md bg-surface-container-low flex items-center justify-between border-t border-surface-container-highest">
          <p className="text-label-sm text-on-surface-variant">
            Showing {filteredAttendance.length} of {historyData.length} entries
          </p>
        </div>
      </section>

      {/* Emergency Clock Out Modal */}
      {showClockOutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-md">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg max-w-md w-full border border-surface-container-highest overflow-hidden">
            {/* Modal Header */}
            <div className="px-lg py-lg flex items-center justify-between border-b border-surface-container-highest">
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center text-error">
                  <span className="material-symbols-outlined">logout</span>
                </div>
                <h2 className="text-headline-md font-headline-md font-bold text-on-surface">Clock Out Early</h2>
              </div>
              <button
                onClick={() => setShowClockOutModal(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-sm rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-lg space-y-lg">
              <div className="p-md bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-md">
                <span className="material-symbols-outlined text-amber-600 mt-xs">info</span>
                <p className="text-body-md text-amber-900">
                  Your shift end time is <span className="font-bold">{todayData?.shiftEndTime ? todayData.shiftEndTime.substring(0, 5) : '18:00'}</span>.
                  Clocking out early requires an emergency reason for Admin approval.
                </p>
              </div>

              <div className="space-y-lg">
                <div className="space-y-sm">
                  <label className="text-label-md font-bold text-on-surface-variant">Reason for early clock-out *</label>
                  <div className="relative">
                    <select
                      value={clockOutForm.reason}
                      onChange={(e) => setClockOutForm({ ...clockOutForm, reason: e.target.value })}
                      className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-lg px-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body-md"
                    >
                      <option value="">Select Reason</option>
                      <option value="Personal Emergency">Personal Emergency</option>
                      <option value="Medical Reason">Medical Reason</option>
                      <option value="Work Completed">Work Completed</option>
                      <option value="Other">Other</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                  </div>
                </div>

                <div className="space-y-sm">
                  <label className="text-label-md font-bold text-on-surface-variant">Additional Details</label>
                  <textarea
                    value={clockOutForm.notes}
                    onChange={(e) => setClockOutForm({ ...clockOutForm, notes: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body-md resize-none"
                    placeholder="Provide additional details..."
                    rows="3"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-lg py-lg bg-surface-container-low flex justify-end items-center gap-md border-t border-surface-container-highest">
              <button
                onClick={() => setShowClockOutModal(false)}
                className="px-lg h-10 text-label-md font-bold text-secondary hover:bg-surface-container-highest rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEmergencyClockOut}
                disabled={actionLoading}
                className="px-lg h-10 text-label-md bg-primary text-on-primary rounded-lg shadow-sm hover:bg-primary/90 active:scale-95 transition-all font-bold disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
