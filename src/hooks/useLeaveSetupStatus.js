import { useEffect, useState } from 'react'
import { getLeaveSetupStatus } from '../api/hrmsApi'

export function useLeaveSetupStatus(employeeId) {
  const [setupStatus, setSetupStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!employeeId) {
        setLoading(false)
        setSetupStatus(null)
        return
      }

      setLoading(true)
      setSetupStatus(null)
      setError('')

      try {
        const res = await getLeaveSetupStatus(employeeId)
        setSetupStatus(res.data?.data || { isSetupComplete: false, hasPeriod: false, hasQuota: false })
      } catch (err) {
        console.error('❌ Failed to load setup status:', err)
        setSetupStatus({ isSetupComplete: false, hasPeriod: false, hasQuota: false })
        setError('Unable to load leave setup status')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [employeeId])

  return { setupStatus, loading, error }
}
