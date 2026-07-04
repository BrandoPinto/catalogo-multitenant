// src/pages/admin/DashboardPage.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, categoriesApi, bannersApi } from '../../services/endpoints'
import { StatCard } from '../../components/ui'
import useAuthStore from '../../store/authStore'
import useCompanyStore from '../../store/companyStore'
import { formatPrice, PLACEHOLDER_IMG } from '../../utils/helpers'

export default function DashboardPage() {
  const [stats, setStats] = useState({ products: 0, categories: 0, featured: 0, active: 0 })
  const [recentProducts, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const { company } = useCompanyStore()

  useEffect(() => {
    Promise.all([
      productsApi.adminList({ per_page: 100 }),
      categoriesApi.adminList(),
    ]).then(([pRes, cRes]) => {
      const products = pRes.data.data || []
      setStats({
        products:   pRes.data.meta?.total || products.length,
        categories: cRes.data.data?.length || 0,
        featured:   products.filter(p => p.featured == 1).length,
        active:     products.filter(p => p.active == 1).length,
      })
      setRecent(products.slice(0, 6))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Resumen de <span className="font-medium text-gray-700">{company?.name}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Productos" value={loading ? '…' : stats.products} icon="📦" />
        <StatCard title="Categorías"      value={loading ? '…' : stats.categories} icon="🏷️" />
        <StatCard title="Destacados"      value={loading ? '…' : stats.featured} icon="⭐" />
        <StatCard title="Activos"         value={loading ? '…' : stats.active} icon="✅" />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/admin/products/new', label: 'Nuevo producto', icon: '＋', color: 'brand' },
            { to: '/admin/categories',  label: 'Categorías',     icon: '🏷️',  color: 'gray' },
            { to: '/admin/banners',     label: 'Banners',        icon: '🖼️',  color: 'gray' },
            { to: '/admin/company',     label: 'Mi empresa',     icon: '⚙️',  color: 'gray' },
          ].map(a => (
            <Link key={a.to} to={a.to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-brand hover:shadow-sm transition text-center group">
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-medium text-gray-600 group-hover:text-brand transition">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent products */}
      {recentProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-700">Productos recientes</h2>
            <Link to="/admin/products" className="text-xs text-brand hover:underline">Ver todos →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Producto</th>
                  <th className="px-5 py-3 text-left hidden md:table-cell">Categoría</th>
                  <th className="px-5 py-3 text-right">Precio</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentProducts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.main_image || PLACEHOLDER_IMG} alt=""
                          className="w-8 h-8 rounded-lg object-cover bg-gray-100"
                          onError={e => { e.target.src = PLACEHOLDER_IMG }} />
                        <div>
                          <p className="font-medium text-gray-800 line-clamp-1">{p.name}</p>
                          {p.featured == 1 && <span className="text-[10px] text-amber-600">★ Destacado</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{p.category_name || '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-800">{formatPrice(p.price)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.active == 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.active == 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
