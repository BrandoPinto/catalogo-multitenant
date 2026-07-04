// src/pages/admin/VentasPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { inventoryApi } from '../../services/endpoints'
import { getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

const fmt = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n || 0)

function SummaryCard({ label, value, sub, color = 'text-gray-800' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function VentasPage() {
  const today    = new Date().toISOString().slice(0, 10)
  const firstDay = today.slice(0, 8) + '01'

  const [filters, setFilters] = useState({ date_from: firstDay, date_to: today })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await inventoryApi.salesReport(filters)
      setData(res.data.data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const s        = data?.summary || {}
  const hasSales = Number(s.total_sales || 0) > 0

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Ventas</h1>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Desde</span>
            <input type="date" value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Hasta</span>
            <input type="date" value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
          </div>
          {/* Quick ranges */}
          <div className="flex gap-2 ml-auto flex-wrap">
            {[
              { label: 'Hoy', from: today, to: today },
              { label: 'Este mes', from: firstDay, to: today },
              { label: 'Mes anterior', from: (() => { const d = new Date(today); d.setDate(1); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,10) })(),
                to: (() => { const d = new Date(today); d.setDate(0); return d.toISOString().slice(0,10) })() },
            ].map(r => (
              <button key={r.label}
                onClick={() => setFilters({ date_from: r.from, date_to: r.to })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  filters.date_from === r.from && filters.date_to === r.to
                    ? 'bg-brand text-white border-brand'
                    : 'border-gray-200 text-gray-500 hover:border-brand hover:text-brand'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !hasSales ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
          <div className="text-6xl mb-4">💰</div>
          <p className="text-gray-500 font-semibold text-lg">Sin ventas en este período</p>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
            Activa <span className="font-semibold text-gray-600">"Contar como venta"</span> en un motivo
            de Inventario → Motivos para empezar a registrar ingresos al descontar stock
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Total ingresos"
              value={fmt(s.total_revenue)}
              color="text-green-600"
              sub={`${s.total_sales} venta${Number(s.total_sales) !== 1 ? 's' : ''} registrada${Number(s.total_sales) !== 1 ? 's' : ''}`}
            />
            <SummaryCard
              label="Unidades vendidas"
              value={Number(s.total_units || 0).toFixed(0)}
              color="text-brand"
            />
            <SummaryCard
              label="Promedio por venta"
              value={s.total_sales > 0 ? fmt(s.total_revenue / s.total_sales) : '—'}
              color="text-gray-800"
            />
            <SummaryCard
              label="Venta más alta"
              value={fmt(s.max_sale)}
              color="text-brand"
            />
          </div>

          {/* Top products */}
          {(data?.top_products || []).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Productos más vendidos</h3>
                <span className="text-xs text-gray-400">{filters.date_from} → {filters.date_to}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left bg-gray-50">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Producto</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Unidades</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Ingresos</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">% del total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.top_products.map((p, i) => {
                      const pct = s.total_revenue > 0
                        ? ((p.revenue / s.total_revenue) * 100).toFixed(1)
                        : 0
                      return (
                        <tr key={p.product_id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-gray-400 text-xs font-mono">{i + 1}</td>
                          <td className="px-5 py-3">
                            <span className="font-medium text-gray-800">{p.product_name}</span>
                            {p.sku && <span className="block text-xs text-gray-400 font-mono">{p.sku}</span>}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-600 font-semibold">
                            {Number(p.units_sold).toFixed(0)}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-green-600">{fmt(p.revenue)}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="h-1.5 bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily detail */}
          {(data?.daily || []).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-700">Detalle diario</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left bg-gray-50">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Ventas</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Uds.</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.daily.map(d => (
                      <tr key={d.day} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-700 font-medium">
                          {new Date(d.day + 'T12:00:00').toLocaleDateString('es-PE', {
                            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3 text-center text-gray-500">{d.sales_count}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{Number(d.units_sold).toFixed(0)}</td>
                        <td className="px-5 py-3 text-right font-bold text-green-600">{fmt(d.revenue)}</td>
                      </tr>
                    ))}
                    <tr className="bg-green-50 font-semibold border-t-2 border-green-100">
                      <td className="px-5 py-3 text-gray-700">Total del período</td>
                      <td className="px-5 py-3 text-center text-gray-700">{s.total_sales}</td>
                      <td className="px-5 py-3 text-right text-gray-700">{Number(s.total_units || 0).toFixed(0)}</td>
                      <td className="px-5 py-3 text-right text-green-700 text-base">{fmt(s.total_revenue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
