import { formatLeaveDays } from '../utils/leaveUtils'

/**
 * LeaveStatCard — displays remaining leave days for a specific leave type
 * 
 * Props:
 *   leaveType - The leave type object: { id, name, description }
 *   remainingDays - Number of remaining leave days
 *   totalAllowed - Total allowed days for this leave type
 *   isLoading - Whether data is still loading
 *   icon - Material icon name (optional, defaults to 'calendar_today')
 */
export default function LeaveStatCard({
  leaveType,
  remainingDays,
  totalAllowed,
  isLoading = false,
  icon = 'calendar_today',
}) {
  const displayName = leaveType?.name || 'Unknown Leave Type'
  const percentage = totalAllowed > 0 ? Math.round((remainingDays / totalAllowed) * 100) : 0
  
  // Determine color based on remaining days
  let statusColor = 'text-emerald-600' // Green - plenty left
  let bgColor = 'bg-emerald-50'
  if (percentage <= 25) {
    statusColor = 'text-error' // Red - critical
    bgColor = 'bg-error-container'
  } else if (percentage <= 50) {
    statusColor = 'text-warning' // Orange/Amber - caution
    bgColor = 'bg-warning-container'
  }

  return (
    <div className="bg-surface-container rounded-xl ambient-shadow p-md border border-outline-variant">
      <div className="flex items-start justify-between mb-md">
        <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}>
          <span className={`material-symbols-outlined text-[24px] ${statusColor}`}>
            {icon}
          </span>
        </div>
        <span className="text-label-sm font-label-sm text-on-surface-variant">
          {displayName}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-xs">
          <div className="h-6 bg-surface-container-highest rounded animate-pulse w-16"></div>
          <div className="h-4 bg-surface-container-highest rounded animate-pulse w-20"></div>
        </div>
      ) : (
        <>
          <div className="mb-md">
            <p className={`text-display-sm font-display-sm ${statusColor}`}>
              {formatLeaveDays(remainingDays)}/{formatLeaveDays(totalAllowed)}
            </p>
            <p className="text-body-sm text-on-surface-variant">Remaining days</p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${statusColor.replace('text-', 'bg-')}`}
              style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
            ></div>
          </div>
          <p className="text-label-xs text-on-surface-variant mt-xs">
            {percentage}% used
          </p>
        </>
      )}
    </div>
  )
}
