import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Wrap any dashboard route: <ProtectedRoute allowedRoles={['Admin']}><AdminDashboard/></ProtectedRoute>
export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useAuth()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in, but wrong role for this page -> bounce to their own dashboard
    return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />
  }

  return children
}
