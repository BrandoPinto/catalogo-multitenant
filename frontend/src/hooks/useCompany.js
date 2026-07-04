// src/hooks/useCompany.js
import { useEffect } from 'react'
import { companyApi } from '../services/endpoints'
import useCompanyStore from '../store/companyStore'

export function useCompany() {
  const { company, loading, error, setCompany, setLoading, setError } = useCompanyStore()

  useEffect(() => {
    if (company) return
    setLoading(true)
    companyApi.get()
      .then((res) => setCompany(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar empresa'))
  }, [])

  return { company, loading, error }
}
