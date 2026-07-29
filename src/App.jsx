import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { checkAdminExists } from './api/authApi'
import SetupAdmin from './pages/SetupAdmin.jsx'
import Login from './pages/Login.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import HrDashboard from './pages/hr/HrDashboard.jsx'
import ManagerDashboard from './pages/manager/ManagerDashboard.jsx'
import EmployeeDashboard from './pages/employee/EmployeeDashboard.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'

function RootGate() {
  const [adminExists, setAdminExists] = useState(null) // null = loading

  useEffect(() => {
    checkAdminExists()
      .then((res) => {
        const exists = res.data?.data?.adminExists ?? res.data?.adminExists ?? false
        setAdminExists(exists)
      })
      .catch(() => setAdminExists(false)) // fail safe: on error, show registration (safer for fresh installs)
  }, [])

  if (adminExists === null) {
    return <div className="min-h-screen flex items-center justify-center text-on-surface-variant">Loading...</div>
  }

  return adminExists ? <Navigate to="/login" replace /> : <SetupAdmin />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<RootGate />} />
        <Route path="/register" element={<SetupAdmin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/hr/dashboard" element={
          <ProtectedRoute allowedRoles={['HR']}><HrDashboard /></ProtectedRoute>
        } />
        <Route path="/manager/dashboard" element={
          <ProtectedRoute allowedRoles={['Manager']}><ManagerDashboard /></ProtectedRoute>
        } />
        <Route path="/employee/dashboard" element={
          <ProtectedRoute allowedRoles={['Employee']}><EmployeeDashboard /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
