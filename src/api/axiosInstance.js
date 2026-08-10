import axios from 'axios'

// Point this at your HRMS_BACKEND base URL (matches Jwt:Issuer in appsettings.json)
// Use Vite env var VITE_API_BASE_URL to configure the backend host/port.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const api = axios.create({
  baseURL,
})

// Attach the JWT to every outgoing request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hrms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If the token is invalid/expired, force logout back to /login
// But allow 401 responses in the response object first (don't redirect immediately)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if it's truly an auth error (not just a permission issue)
    // Check if we're trying to access a protected endpoint without proper permissions
    if (error.response?.status === 401) {
      // Check if there IS a token - if there is, it's likely a permission issue, not auth
      const hasToken = localStorage.getItem('hrms_token')
      if (!hasToken) {
        // No token at all - redirect to login
        localStorage.removeItem('hrms_token')
        window.location.href = '/login'
      }
      // If there IS a token, just return the error - let the caller handle it
    }
    return Promise.reject(error)
  }
)

export default api
