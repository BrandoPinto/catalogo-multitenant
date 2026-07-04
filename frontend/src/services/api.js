// src/services/api.js
import axios from 'axios'

// ── Detect tenant from subdomain ─────────────────────────────
function detectTenantSlug() {
  const host = window.location.hostname
  const parts = host.split('.')

  // localhost:5173?company=elegance (dev override)
  const params = new URLSearchParams(window.location.search)
  if (params.get('company')) return params.get('company')

  // subdomain.domain.com → 3+ parts
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0]
  }

  // Single-level dev: elegance.localhost
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0]
  }

  // Fallback: read from env or sessionStorage
  return import.meta.env.VITE_DEFAULT_COMPANY || sessionStorage.getItem('company_slug') || 'elegance'
}

// ── API base URL ─────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/backend'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ── Request interceptor: inject tenant + auth ────────────────
api.interceptors.request.use((config) => {
  const slug = detectTenantSlug()
  config.headers['X-Company-Slug'] = slug

  const token = localStorage.getItem('auth_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`

  return config
})

// ── Response interceptor: handle 401 ─────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      const isLoginPage = window.location.pathname === '/admin/login'
      if (!isLoginPage && window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(err)
  }
)

export { detectTenantSlug }
export default api
