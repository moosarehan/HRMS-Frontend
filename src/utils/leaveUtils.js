export const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end - start)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

  return diffDays
}

export const formatLeaveDays = (days) => {
  const value = Number(days)
  if (!Number.isFinite(value)) return '0'

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}
