// src/pages/admin/InventoryPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { inventoryApi } from '../../services/endpoints'
import { Button, Input, StatCard } from '../../components/ui'
import { getErrorMessage } from '../../utils/helpers'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const TABS = ['Stock', 'Historial', 'Informe', 'Motivos']

const TYPE_LABELS = { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste' }
const TYPE_COLORS = {
  entrada: 'bg-green-100 text-green-700',
  salida:  'bg-red-100 text-red-700',
  ajuste:  'bg-yellow-100 text-yellow-700',
  any:     'bg-gray-100 text-gray-600',
}

// ─── Movement Modal ───────────────────────────────────────────
function MovementModal({ product, reasons, onClose, onSaved, initialSize = null }) {
  const hasSizes = product.sizes_enabled == 1 && product.sizes?.length > 0
  const [selectedSize, setSelectedSize] = useState(initialSize)
  const [form, setForm] = useState({
    type: 'entrada', reason_id: '', reason_text: '', quantity: '', notes: '', sale_price: '',
  })
  const [saving, setSaving] = useState(false)

  const filteredReasons = reasons.filter(r => r.active && (r.type === 'ambos' || r.type === form.type))
  const selectedReason  = reasons.find(r => r.id === Number(form.reason_id))
  const isSaleReason    = selectedReason?.is_sale && form.type === 'salida'
  const currentSizeStock = hasSizes && selectedSize
    ? (product.size_stocks?.find(ss => ss.size === selectedSize)?.stock ?? 0)
    : (product.stock ?? 0)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (hasSizes && !selectedSize) { toast.error('Selecciona una talla'); return }
    if (!form.quantity || Number(form.quantity) <= 0) { toast.error('La cantidad debe ser mayor a 0'); return }
    setSaving(true)
    try {
      await inventoryApi.movements.create({
        product_id:  product.id,
        size:        selectedSize || undefined,
        type:        form.type,
        reason_id:   form.reason_id || undefined,
        reason_text: form.reason_text || undefined,
        quantity:    Number(form.quantity),
        notes:       form.notes || undefined,
        sale_price:  isSaleReason && form.sale_price ? Number(form.sale_price) : undefined,
      })
      toast.success('Movimiento registrado')
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-800">Registrar movimiento</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Size selector (only for sized products) */}
          {hasSizes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Talla <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(s => {
                  const sStock = product.size_stocks?.find(ss => ss.size === s)?.stock ?? 0
                  return (
                    <button key={s} type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition flex flex-col items-center min-w-[52px] ${
                        selectedSize === s
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-gray-200 text-gray-600 hover:border-brand/50'
                      }`}>
                      <span>{s}</span>
                      <span className={`text-[10px] font-normal mt-0.5 ${sStock <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                        {sStock} uds
                      </span>
                    </button>
                  )
                })}
              </div>
              {!selectedSize && (
                <p className="text-xs text-amber-600 mt-1.5">Selecciona una talla para continuar</p>
              )}
            </div>
          )}

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de movimiento</label>
            <div className="grid grid-cols-3 gap-2">
              {['entrada', 'salida', 'ajuste'].map(t => (
                <button key={t} type="button"
                  onClick={() => { set('type', t); set('reason_id', '') }}
                  className={`py-2 rounded-lg text-sm font-medium border transition ${
                    form.type === t
                      ? t === 'entrada' ? 'bg-green-50 border-green-300 text-green-700'
                        : t === 'salida' ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-yellow-50 border-yellow-300 text-yellow-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            {form.type === 'ajuste' && (
              <p className="text-xs text-yellow-600 mt-1.5">El ajuste establece el stock al valor exacto ingresado.</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo</label>
            <select value={form.reason_id} onChange={e => set('reason_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand">
              <option value="">— Sin motivo específico —</option>
              {filteredReasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {selectedReason?.allows_custom_text && (
            <Input label="Detalle del motivo" value={form.reason_text}
              onChange={e => set('reason_text', e.target.value)} placeholder="Describe el motivo específico..." />
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {form.type === 'ajuste' ? 'Nuevo stock' : 'Cantidad'}
              <span className="ml-2 text-xs font-normal text-gray-400">
                Stock actual: {currentSizeStock}
                {selectedSize && <span className="ml-1 text-brand font-medium">({selectedSize})</span>}
              </span>
            </label>
            <input type="number" min="0.01" step="any" value={form.quantity}
              onChange={e => set('quantity', e.target.value)} required placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
            {form.quantity && form.type !== 'ajuste' && (
              <p className="text-xs text-gray-400 mt-1">
                Stock resultante:{' '}
                <span className="font-medium text-gray-700">
                  {form.type === 'entrada'
                    ? (currentSizeStock + Number(form.quantity)).toFixed(0)
                    : (currentSizeStock - Number(form.quantity)).toFixed(0)}
                </span>
              </p>
            )}
          </div>

          {/* Sale price override (only when reason is_sale + salida) */}
          {isSaleReason && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 space-y-2">
              <div className="flex items-center gap-2 text-green-700 text-xs font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Este movimiento se contará como venta
              </div>
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">
                  Precio de venta unitario
                  <span className="ml-1 font-normal text-green-600">(se usa el precio del producto si se deja vacío)</span>
                </label>
                <input type="number" min="0" step="0.01" value={form.sale_price}
                  onChange={e => set('sale_price', e.target.value)}
                  placeholder={`${product.price} (precio actual)`}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white" />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observaciones (opcional)</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">Guardar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Reason Modal ─────────────────────────────────────────────
function ReasonModal({ reason, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: reason?.name || '',
    type: reason?.type || 'ambos',
    allows_custom_text: reason?.allows_custom_text ? true : false,
    is_sale: reason?.is_sale ? true : false,
    active: reason?.active !== undefined ? Boolean(reason.active) : true,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      if (reason) {
        await inventoryApi.reasons.update(reason.id, form)
        toast.success('Motivo actualizado')
      } else {
        await inventoryApi.reasons.create(form)
        toast.success('Motivo creado')
      }
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{reason ? 'Editar motivo' : 'Nuevo motivo'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Nombre del motivo" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Ej: Venta directa, Compra a proveedor..." required />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Aplica para</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand">
              <option value="ambos">Cualquier tipo</option>
              <option value="entrada">Solo entradas</option>
              <option value="salida">Solo salidas</option>
              <option value="ajuste">Solo ajustes</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.allows_custom_text}
              onChange={e => set('allows_custom_text', e.target.checked)}
              className="w-4 h-4 rounded text-brand focus:ring-brand" />
            <div>
              <span className="text-sm font-medium text-gray-700">Permitir texto personalizado</span>
              <p className="text-xs text-gray-400">El usuario podrá añadir un detalle específico</p>
            </div>
          </label>

          {(form.type === 'salida' || form.type === 'ambos') && (
            <label className="flex items-center gap-3 cursor-pointer rounded-xl bg-green-50 border border-green-200 p-3">
              <input type="checkbox" checked={form.is_sale}
                onChange={e => set('is_sale', e.target.checked)}
                className="w-4 h-4 rounded text-green-600 focus:ring-green-500" />
              <div>
                <span className="text-sm font-medium text-green-800">Contar como venta</span>
                <p className="text-xs text-green-600">Las salidas con este motivo se registran en el informe de ventas</p>
              </div>
            </label>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="w-4 h-4 rounded text-brand focus:ring-brand" />
            <span className="text-sm font-medium text-gray-700">Activo</span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">Guardar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tab: Stock ───────────────────────────────────────────────
function StockTab({ reasons }) {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [movProduct, setMovProduct]   = useState(null)  // { product, initialSize }
  const [expandedIds, setExpandedIds] = useState(new Set())

  const toggleExpand = (id) => setExpandedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await inventoryApi.stock({ search })
      setData(res.data.data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const totals   = data?.totals
  const products = data?.products || []

  const stockColor = (v) => v === null ? 'text-gray-400' : v <= 5 ? 'text-red-600' : v <= 20 ? 'text-yellow-600' : 'text-green-600'

  return (
    <div className="space-y-4">
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Total Productos"  value={totals.total_products} icon="📦" />
          <StatCard title="Unidades totales" value={Number(totals.total_units).toFixed(0)} icon="🗂️" />
          <StatCard title="Stock bajo (≤5)"  value={totals.low_stock_count} icon="⚠️" />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <input type="search" placeholder="Buscar producto o SKU..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Producto</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">SKU</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Categoría</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Stock</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Movs.</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Cargando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Sin productos</td></tr>
              ) : products.map(p => {
                const isSized    = p.sizes_enabled == 1 && p.size_stocks?.length > 0
                const isExpanded = expandedIds.has(p.id)
                return (
                  <React.Fragment key={p.id}>
                    {/* Product row */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {isSized && (
                            <button onClick={() => toggleExpand(p.id)}
                              className="text-gray-400 hover:text-brand transition shrink-0">
                              <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                          <span className="font-medium text-gray-800">{p.name}</span>
                          {isSized && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                              Tallas
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">{p.sku || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{p.category_name || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${stockColor(p.stock)}`}>
                          {p.stock !== null ? Number(p.stock).toFixed(0) : '—'}
                        </span>
                        {isSized && <span className="text-xs text-gray-400 ml-1">total</span>}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-400">{p.total_movements}</td>
                      <td className="px-5 py-3 text-right">
                        {!isSized && (
                          <Button size="sm" variant="outline" onClick={() => setMovProduct({ product: p, initialSize: null })}>
                            + Movimiento
                          </Button>
                        )}
                        {isSized && (
                          <button onClick={() => toggleExpand(p.id)}
                            className="text-xs text-brand hover:underline font-medium">
                            {isExpanded ? 'Ocultar' : 'Ver tallas'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Size sub-rows */}
                    {isSized && isExpanded && p.size_stocks.map(ss => (
                      <tr key={`${p.id}-${ss.size}`} className="bg-purple-50/40">
                        <td className="pl-14 pr-5 py-2 text-sm">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-300 shrink-0" />
                            <span className="font-semibold text-purple-700">{ss.size}</span>
                          </span>
                        </td>
                        <td className="px-5 py-2 text-gray-400 text-xs">—</td>
                        <td className="px-5 py-2 text-gray-400 text-xs">—</td>
                        <td className="px-5 py-2 text-right">
                          <span className={`font-semibold text-sm ${stockColor(ss.stock)}`}>
                            {ss.stock}
                          </span>
                        </td>
                        <td className="px-5 py-2"></td>
                        <td className="px-5 py-2 text-right">
                          <Button size="sm" variant="outline"
                            onClick={() => setMovProduct({ product: p, initialSize: ss.size })}>
                            + Mov.
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {movProduct && (
        <MovementModal
          product={movProduct.product}
          initialSize={movProduct.initialSize}
          reasons={reasons}
          onClose={() => setMovProduct(null)}
          onSaved={() => { setMovProduct(null); load() }} />
      )}
    </div>
  )
}

// ─── Tab: Historial ───────────────────────────────────────────
function HistorialTab({ isAdmin }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [filters, setFilters]   = useState({ type: '', date_from: '', date_to: '', page: 1 })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { ...filters, per_page: 30 }
      const res = await inventoryApi.movements.list(params)
      setData(res.data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await inventoryApi.movements.delete(toDelete.id)
      toast.success('Movimiento eliminado y stock ajustado')
      setToDelete(null)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const movements = data?.data || []
  const meta = data?.meta || {}
  const colSpan = isAdmin ? 10 : 9

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <select value={filters.type} onChange={e => setF('type', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand">
            <option value="">Todos los tipos</option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Desde</span>
            <input type="date" value={filters.date_from} onChange={e => setF('date_from', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Hasta</span>
            <input type="date" value={filters.date_to} onChange={e => setF('date_to', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
          </div>
          <Button size="sm" variant="outline" onClick={() => setFilters({ type: '', date_from: '', date_to: '', page: 1 })}>
            Limpiar
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Producto</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Talla</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Motivo</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Antes</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Cantidad</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Después</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Usuario</th>
                {isAdmin && <th className="px-5 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={colSpan} className="px-5 py-10 text-center text-gray-400">Cargando...</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={colSpan} className="px-5 py-10 text-center text-gray-400">Sin movimientos</td></tr>
              ) : movements.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })}
                    <span className="block text-xs text-gray-400">
                      {new Date(m.created_at).toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-medium text-gray-800">{m.product_name}</span>
                    {m.product_sku && <span className="block text-xs text-gray-400 font-mono">{m.product_sku}</span>}
                  </td>
                  <td className="px-5 py-3">
                    {m.size
                      ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">{m.size}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[m.type]}`}>
                      {TYPE_LABELS[m.type]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-[160px]">
                    <span className="truncate block">{m.reason_name || m.reason_custom || '—'}</span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500">{Number(m.stock_before).toFixed(0)}</td>
                  <td className="px-5 py-3 text-right font-semibold">
                    <span className={m.type === 'entrada' ? 'text-green-600' : m.type === 'salida' ? 'text-red-600' : 'text-yellow-600'}>
                      {m.type === 'entrada' ? '+' : m.type === 'salida' ? '-' : '='}{Number(m.quantity).toFixed(0)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">{Number(m.stock_after).toFixed(0)}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{m.created_by_name || '—'}</td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setToDelete(m)}
                        title="Eliminar movimiento"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.total > meta.per_page && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {meta.total} movimientos · página {meta.current_page} de {Math.ceil(meta.total / meta.per_page)}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={filters.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={filters.page >= Math.ceil(meta.total / meta.per_page)}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !deleting && setToDelete(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Eliminar movimiento</h3>
                <p className="text-xs text-gray-400 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-700 space-y-1">
              <p><span className="font-medium">{toDelete.product_name}</span>{toDelete.size && <span className="ml-1 text-purple-600 font-medium">({toDelete.size})</span>}</p>
              <p className="text-xs text-gray-500">
                {TYPE_LABELS[toDelete.type]} · {Number(toDelete.quantity).toFixed(0)} uds ·{' '}
                {new Date(toDelete.created_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })}
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              El stock del producto se ajustará automáticamente para revertir este movimiento.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setToDelete(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleDelete} loading={deleting}>
                Sí, eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Informe ─────────────────────────────────────────────
function InformeTab() {
  const today = new Date().toISOString().slice(0, 10)
  const firstDay = today.slice(0, 8) + '01'

  const [filters, setFilters] = useState({ date_from: firstDay, date_to: today })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await inventoryApi.report(filters)
      setData(res.data.data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const byType = {}
  ;(data?.by_type || []).forEach(r => { byType[r.type] = r })

  return (
    <div className="space-y-4">
      {/* Date range */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Desde</span>
            <input type="date" value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Hasta</span>
            <input type="date" value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Cargando informe...</div>
      ) : (
        <>
          {/* Summary by type */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Entradas" value={Number(byType['entrada']?.total_qty || 0).toFixed(0)} icon="📥"
              trend={`${byType['entrada']?.movements || 0} movimientos`} />
            <StatCard title="Salidas"  value={Number(byType['salida']?.total_qty  || 0).toFixed(0)} icon="📤"
              trend={`${byType['salida']?.movements  || 0} movimientos`} />
            <StatCard title="Ajustes"  value={Number(byType['ajuste']?.total_qty  || 0).toFixed(0)} icon="⚖️"
              trend={`${byType['ajuste']?.movements  || 0} movimientos`} />
          </div>

          {/* Top products */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700 text-sm">Productos con más actividad</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Producto</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Entradas</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Salidas</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Stock actual</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Movimientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.by_product || []).length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Sin datos en el período</td></tr>
                  ) : (data?.by_product || []).map(p => (
                    <tr key={p.product_id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {p.product_name}
                        {p.sku && <span className="block text-xs text-gray-400 font-mono">{p.sku}</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-green-600 font-semibold">+{Number(p.entradas).toFixed(0)}</td>
                      <td className="px-5 py-3 text-right text-red-600 font-semibold">-{Number(p.salidas).toFixed(0)}</td>
                      <td className="px-5 py-3 text-right text-gray-800 font-semibold">{Number(p.current_stock || 0).toFixed(0)}</td>
                      <td className="px-5 py-3 text-center text-gray-500">{p.movements}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily activity */}
          {(data?.daily || []).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-700 text-sm">Actividad diaria</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Día</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Entradas</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Salidas</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Movimientos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.daily.map(d => (
                      <tr key={d.day} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-700">
                          {new Date(d.day + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-5 py-3 text-right text-green-600 font-semibold">+{Number(d.entradas).toFixed(0)}</td>
                        <td className="px-5 py-3 text-right text-red-600 font-semibold">-{Number(d.salidas).toFixed(0)}</td>
                        <td className="px-5 py-3 text-center text-gray-500">{d.movements}</td>
                      </tr>
                    ))}
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

// ─── Tab: Motivos ─────────────────────────────────────────────
function MotivosTab() {
  const [reasons, setReasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | 'new' | reason object

  const load = async () => {
    setLoading(true)
    try {
      const res = await inventoryApi.reasons.list()
      setReasons(res.data.data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este motivo?')) return
    try {
      await inventoryApi.reasons.delete(id)
      toast.success('Motivo eliminado')
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModal('new')}>+ Nuevo motivo</Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-gray-400">Cargando...</div>
        ) : reasons.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p>No hay motivos configurados.</p>
            <p className="text-xs mt-1">Crea motivos para clasificar los movimientos de inventario.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Texto libre</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reasons.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[r.type]}`}>
                      {r.type === 'ambos' ? 'Cualquiera' : TYPE_LABELS[r.type]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {r.allows_custom_text
                      ? <span className="text-green-600 text-xs font-medium">Sí</span>
                      : <span className="text-gray-400 text-xs">No</span>}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setModal(r)}>Editar</Button>
                      <Button size="sm" variant="outline"
                        className="text-red-500 hover:text-red-700 hover:border-red-300"
                        onClick={() => handleDelete(r.id)}>Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== null && (
        <ReasonModal
          reason={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function InventoryPage() {
  const [tab, setTab]         = useState(0)
  const [reasons, setReasons] = useState([])
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    inventoryApi.reasons.list()
      .then(res => setReasons(res.data.data))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold text-gray-800">Inventario</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === i ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <StockTab reasons={reasons} />}
      {tab === 1 && <HistorialTab isAdmin={isAdmin} />}
      {tab === 2 && <InformeTab />}
      {tab === 3 && <MotivosTab />}
    </div>
  )
}
