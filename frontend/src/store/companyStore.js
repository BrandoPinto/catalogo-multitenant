// src/store/companyStore.js
import { create } from 'zustand'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex)
  const nr = Math.min(255, r + amount)
  const ng = Math.min(255, g + amount)
  const nb = Math.min(255, b + amount)
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex)
  const nr = Math.max(0, r - amount)
  const ng = Math.max(0, g - amount)
  const nb = Math.max(0, b - amount)
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

function applyBrandColors(primary) {
  const root = document.documentElement
  root.style.setProperty('--color-brand', primary)
  root.style.setProperty('--color-brand-dark', darken(primary, 40))
  root.style.setProperty('--color-brand-light', lighten(primary, 100))
  // Update favicon-like meta theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', primary)
}

const useCompanyStore = create((set) => ({
  company: null,
  loading: true,
  error: null,

  setCompany: (company) => {
    if (company?.primary_color) {
      applyBrandColors(company.primary_color)
    }
    if (company?.name) {
      document.title = company.name + ' · Catálogo'
    }
    set({ company, loading: false, error: null })
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}))

export default useCompanyStore
