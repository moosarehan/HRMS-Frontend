import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentLeavePeriod, getAllLeaveTypes } from '../api/hrmsApi'
import { useAuth } from './AuthContext'

const LeaveContext = createContext(null)

export function LeaveProvider({ children }) {
  const { token } = useAuth()
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [leaveTypes, setLeaveTypes] = useState([])
  const [periodLoading, setPeriodLoading] = useState(false)
  const [typesLoading, setTypesLoading] = useState(false)
  const [periodError, setPeriodError] = useState(null)
  const [typesError, setTypesError] = useState(null)

  // Load current leave period and leave types ONLY when user is authenticated
  useEffect(() => {
    // Don't load if no token (user not logged in)
    if (!token) {
      setCurrentPeriod(null)
      setLeaveTypes([])
      setPeriodLoading(false)
      setTypesLoading(false)
      return
    }

    const loadInitialData = async () => {
      // Load current period
      setPeriodLoading(true)
      try {
        const res = await getCurrentLeavePeriod()
        setCurrentPeriod(res.data?.data || null)
        setPeriodError(null)
      } catch (err) {
        console.error('Failed to load current leave period:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          url: err.config?.url
        })
        // 400/404 might mean no period exists yet - this is OK, don't treat as error
        if (err.response?.status === 400 || err.response?.status === 404) {
          setCurrentPeriod(null)
          setPeriodError(null)
        } else {
          setPeriodError(err.response?.data?.message || 'Failed to load leave period')
          setCurrentPeriod(null)
        }
      } finally {
        setPeriodLoading(false)
      }

      // Load leave types
      setTypesLoading(true)
      try {
        const res = await getAllLeaveTypes()
        setLeaveTypes(res.data?.data || [])
        setTypesError(null)
      } catch (err) {
        console.error('Failed to load leave types:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          url: err.config?.url
        })
        setTypesError(err.response?.data?.message || 'Failed to load leave types')
        setLeaveTypes([])
      } finally {
        setTypesLoading(false)
      }
    }

    loadInitialData()
  }, [token])

  const refreshCurrentPeriod = async () => {
    setPeriodLoading(true)
    try {
      const res = await getCurrentLeavePeriod()
      setCurrentPeriod(res.data?.data || null)
      setPeriodError(null)
      return res.data?.data
    } catch (err) {
      setPeriodError(err.response?.data?.message || 'Failed to load leave period')
      setCurrentPeriod(null)
      return null
    } finally {
      setPeriodLoading(false)
    }
  }

  return (
    <LeaveContext.Provider
      value={{
        currentPeriod,
        leaveTypes,
        periodLoading,
        typesLoading,
        periodError,
        typesError,
        refreshCurrentPeriod,
      }}
    >
      {children}
    </LeaveContext.Provider>
  )
}

export const useLeave = () => {
  const context = useContext(LeaveContext)
  if (!context) {
    throw new Error('useLeave must be used within LeaveProvider')
  }
  return context
}
