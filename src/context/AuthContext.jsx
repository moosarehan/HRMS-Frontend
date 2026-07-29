import { createContext, useContext, useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'

const AuthContext = createContext(null)

// Standard .NET ClaimTypes come through JWTs under these long URIs
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
const NAME_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
const NAMEID_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('hrms_token'))
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    try {
      const decoded = jwtDecode(token)
      setUser({
        id: decoded[NAMEID_CLAIM] || decoded.sub,
        name: decoded[NAME_CLAIM],
        email: decoded.email,
        role: decoded[ROLE_CLAIM] || decoded.role,
        employeeId: decoded.employeeId ? parseInt(decoded.employeeId, 10) : null,
        departmentId: decoded.departmentId || null,
        fullName: decoded[NAME_CLAIM],
      })
    } catch {
      setUser(null)
    }
  }, [token])

  const loginWithToken = (jwt) => {
    localStorage.setItem('hrms_token', jwt)
    setToken(jwt)
  }

  const logout = () => {
    localStorage.removeItem('hrms_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
