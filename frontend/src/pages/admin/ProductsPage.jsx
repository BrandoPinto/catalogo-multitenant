// src/pages/admin/ProductsPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { productsApi } from '../../services/endpoints'
import { Button, Badge, Pagination, ConfirmDialog, EmptyState } from '../../components/ui'
import { formatPrice, getErrorMessage, PLACEHOLDER_IMG } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [meta, setMeta]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [draftSearch, setDraft] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const navigate = useNavigate()

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params = { page, per_page: 15 }
    if (search) params.search = search
    productsApi.adminList(params)
      .then(r => { setProducts(r.data.data); setMeta(r.data.meta) })
      .catch(() => toast.error('Error al cargar productos'))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(draftSearch)
    setPage(1)
  }

  const handleToggle = async (product) => {
    try {
      await productsApi.toggle(product.id)
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, active: p.active == 1 ? 0 : 1 } : p))
      toast.success(product.active == 1 ? 'Producto desactivado' : 'Producto activado')
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const handleFeature = async (product) => {
    try {
      await productsApi.feature(product.id)
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, featured: p.featured == 1 ? 0 : 1 } : p))
      toast.success(product.featured == 1 ? 'Quitado de destacados' : 'Marcado como destacado')
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(toDelete.id)
    try {
      await productsApi.delete(toDelete.id)
      toast.success('Producto eliminado')
      setToDelete(null)
      fetchProducts()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Productos</h1>
          {meta && <p className="text-sm text-gray-400">{meta.total} en total</p>}
        </div>
        <Button onClick={() => navigate('/admin/products/new')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Producto
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input value={draftSearch} onChange={e => setDraft(e.target.value)}
          placeholder="Buscar por nombre o SKU…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
        <Button type="submit" variant="secondary">Buscar</Button>
        {search && <Button type="button" variant="ghost" onClick={() => { setSearch(''); setDraft(''); setPage(1) }}>Limpiar</Button>}
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="skeleton w-12 h-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState icon="📦" title="Sin productos"
            description="Empieza creando tu primer producto"
            action={<Button onClick={() => navigate('/admin/products/new')}>Crear producto</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Categoría</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Destacado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.main_image || PLACEHOLDER_IMG} alt=""
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100 border"
                          onError={e => { e.target.src = PLACEHOLDER_IMG }} />
                        <div>
                          <p className="font-medium text-gray-800 line-clamp-1 max-w-[200px]">{p.name}</p>
                          {p.sku && <p className="text-xs text-gray-400 font-mono">{p.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{p.category_name || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-gray-800">{formatPrice(p.price)}</span>
                      {p.compare_price && <p className="text-xs text-gray-400 line-through">{formatPrice(p.compare_price)}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(p)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border transition
                          ${p.active == 1 ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                        {p.active == 1 ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleFeature(p)} title="Alternar destacado"
                        className={`text-lg transition ${p.featured == 1 ? 'opacity-100' : 'opacity-25 hover:opacity-60'}`}>
                        ⭐
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/products/${p.id}/edit`)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="!text-red-400 hover:!bg-red-50"
                          onClick={() => setToDelete(p)}>
                          Borrar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination meta={meta} onPage={p => { setPage(p) }} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={!!deleting}
        title="Eliminar producto"
        message={`¿Eliminar "${toDelete?.name}"? Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
