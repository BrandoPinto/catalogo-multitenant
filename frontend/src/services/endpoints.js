// src/services/endpoints.js
import api from './api'

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
}

// ── Company ──────────────────────────────────────────────────
export const companyApi = {
  get: () => api.get('/company'),
  update: (formData) => api.post('/admin/company', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

// ── Categories ───────────────────────────────────────────────
export const categoriesApi = {
  list: () => api.get('/categories'),
  adminList: () => api.get('/admin/categories'),
  create: (data) => api.post('/admin/categories', data),
  update: (id, data) => api.put(`/admin/categories/${id}`, data),
  delete: (id) => api.delete(`/admin/categories/${id}`),
}

// ── Products ─────────────────────────────────────────────────
export const productsApi = {
  list: (params = {}) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  adminList: (params = {}) => api.get('/admin/products', { params }),
  create: (formData) => api.post('/admin/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, formData) => api.put(`/admin/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/admin/products/${id}`),
  toggle: (id) => api.patch(`/admin/products/${id}/toggle`),
  feature: (id) => api.patch(`/admin/products/${id}/feature`),
  addImages: (id, formData) => api.post(`/admin/products/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteImage: (productId, imageId) => api.delete(`/admin/products/${productId}/images/${imageId}`),
}

// ── Banners ──────────────────────────────────────────────────
export const bannersApi = {
  list: () => api.get('/banners'),
  adminList: () => api.get('/admin/banners'),
  create: (formData) => api.post('/admin/banners', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, formData) => api.put(`/admin/banners/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/admin/banners/${id}`),
}

// ── Users ────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/admin/users'),
  create: (data) => api.post('/admin/users', data),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  delete: (id) => api.delete(`/admin/users/${id}`),
}

// ── Inventory ────────────────────────────────────────────────
export const inventoryApi = {
  reasons: {
    list: () => api.get('/admin/inventory/reasons'),
    create: (data) => api.post('/admin/inventory/reasons', data),
    update: (id, data) => api.put(`/admin/inventory/reasons/${id}`, data),
    delete: (id) => api.delete(`/admin/inventory/reasons/${id}`),
  },
  movements: {
    list: (params = {}) => api.get('/admin/inventory/movements', { params }),
    create: (data) => api.post('/admin/inventory/movements', data),
    delete: (id) => api.delete(`/admin/inventory/movements/${id}`),
  },
  stock: (params = {}) => api.get('/admin/inventory/stock', { params }),
  report: (params = {}) => api.get('/admin/inventory/report', { params }),
  salesReport: (params = {}) => api.get('/admin/inventory/sales-report', { params }),
}
