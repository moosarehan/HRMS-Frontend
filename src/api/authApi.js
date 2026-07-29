import api from './axiosInstance'

// Backend contract reminder (from AuthController):
// GET  /api/auth/admin-exists     -> { adminExists: bool }
// POST /api/auth/register-admin   -> RegisterAdminDto { fullName, email, password }
// POST /api/auth/login            -> LoginDto { email, password }

export const checkAdminExists = () => api.get('/auth/admin-exists')

export const registerAdmin = (payload) => api.post('/auth/register-admin', payload)

export const login = (payload) => api.post('/auth/login', payload)

export const resetPassword = (payload) => api.post('/auth/reset-password', payload)
