// src/components/CompanyBootstrap.jsx
import { useEffect } from 'react'
import { companyApi } from '../services/endpoints'
import useCompanyStore from '../store/companyStore'

export default function CompanyBootstrap({ children }) {
  const { company, setCompany, setError } = useCompanyStore()

  useEffect(() => {
    if (company) return
    companyApi.get()
      .then(r => setCompany(r.data.data))
      .catch(err => {
        const msg = err?.response?.data?.message || 'No se pudo conectar con la empresa'
        setError(msg)
      })
  }, [])

  // Update favicon, title and theme-color when company loads
  useEffect(() => {
    if (!company) return

    if (company.name) {
      document.title = company.name
    }

    if (company.primary_color) {
      document.querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', company.primary_color)
    }

    if (company.logo_url) {
      let link = document.querySelector("link[rel~='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = company.logo_url
      link.type = 'image/png'
    }
  }, [company])

  return children
}
