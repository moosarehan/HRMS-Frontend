import { useEffect, useState } from 'react'
import { getFractionalLeaveEligibility } from '../api/hrmsApi'

const durations = [
  { value: null, label: 'None' },
  { value: 'FullDay', label: 'Full Day', fraction: 1.0 },
  { value: 'ThreeQuarterDay', label: 'Three-Quarter Day', fraction: 0.75 },
  { value: 'HalfDay', label: 'Half Day', fraction: 0.5 },
  { value: 'QuarterDay', label: 'Quarter Day', fraction: 0.25 },
]

export default function LeaveDurationSelector({
  leaveTypeName,
  selectedDuration,
  onDurationChange,
  onDaysChange,
  disabled = false,
}) {
  const [eligibility, setEligibility] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const shouldShowDurationSelector = ['Sick Leave', 'Casual Leave'].includes(leaveTypeName)

  useEffect(() => {
    if (!shouldShowDurationSelector) {
      setEligibility(null)
      setError(null)
      return
    }

    let active = true
    const fetchEligibility = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getFractionalLeaveEligibility()
        if (active) setEligibility(res.data?.data || null)
      } catch (err) {
        console.error('Failed to fetch fractional leave eligibility:', err)
        if (active) {
          setEligibility(null)
          setError('Unable to determine today\'s shift availability. Fractional leave is unavailable.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchEligibility()
    return () => { active = false }
  }, [shouldShowDurationSelector])

  if (!shouldShowDurationSelector) return null

  const getOption = (duration) => eligibility?.eligibilities?.[duration.value]
  const optionDisabled = (duration) => {
    if (!duration.value) return disabled
    return disabled || loading || !eligibility || Boolean(error) || !getOption(duration)?.isEligible
  }
  const optionLabel = (duration) => {
    if (!duration.value) return duration.label
    if (!optionDisabled(duration)) return duration.label
    const reason = getOption(duration)?.disabledReason || (loading ? 'Checking shift availability' : 'Not enough time left in your shift today')
    return `${duration.label} — ${reason}`
  }

  return (
    <div className="space-y-3">
      <div className="space-y-xs">
        <label className="font-label-md text-label-md text-on-surface-variant">Duration</label>
        <select
          value={selectedDuration || 'None'}
          onChange={(event) => {
            const value = event.target.value === 'None' ? null : event.target.value
            onDurationChange(value)
            onDaysChange(durations.find(duration => duration.value === value)?.fraction ?? 0)
          }}
          disabled={disabled}
          className="w-full bg-surface-container-low border border-outline-variant rounded-xl font-body-md p-3 focus:ring-2 focus:ring-secondary/20 disabled:opacity-60"
        >
          {durations.map(duration => (
            <option
              key={duration.value || 'None'}
              value={duration.value || 'None'}
              disabled={optionDisabled(duration)}
            >
              {optionLabel(duration)}
            </option>
          ))}
        </select>
        <p className="text-body-sm text-on-surface-variant">
          Choose None to request one or more full days using a date range.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error-container rounded-lg flex gap-2">
          <span className="material-symbols-outlined text-error">warning</span>
          <p className="font-body-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="p-3 bg-surface-container rounded-lg flex gap-2 items-center">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="font-body-sm text-on-surface-variant">Checking your shift availability...</p>
        </div>
      )}

      {eligibility?.shift && !loading && (
        <div className="p-3 bg-surface-container rounded-lg">
          <p className="font-label-sm text-on-surface-variant mb-2">Your Shift Today</p>
          <p className="font-body-sm text-on-surface">
            {eligibility.shift.name} ({eligibility.shift.startTime} - {eligibility.shift.endTime})
          </p>
          <p className="font-body-sm text-on-surface-variant mt-2">
            Time remaining: <span className="font-semibold text-on-surface">{Math.floor(eligibility.minutesRemainingInShift / 60)}h {eligibility.minutesRemainingInShift % 60}m</span>
          </p>
        </div>
      )}
    </div>
  )
}
