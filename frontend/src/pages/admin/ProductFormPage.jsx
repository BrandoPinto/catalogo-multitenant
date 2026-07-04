// src/pages/admin/ProductFormPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { productsApi, categoriesApi } from '../../services/endpoints'
import { Button, Input, Textarea, Select, Toggle } from '../../components/ui'
import { getErrorMessage, PLACEHOLDER_IMG } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function ProductFormPage() {
  const { id } = useParams()
  const isEdit  = !!id
  const navigate = useNavigate()
  const fileRef  = useRef()

  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(isEdit)
  const [saving, setSaving]         = useState(false)
  const [images, setImages]         = useState([])
  const [newFiles, setNewFiles]     = useState([])
  const [previews, setPreviews]     = useState([])
  const [customSize, setCustomSize] = useState('')

  const [form, setForm] = useState({
    name: '', description: '', price: '', compare_price: '',
    sku: '', stock: '', category_id: '', active: true, featured: false, sort_order: 0,
    sizes_enabled: false, sizes: [],
  })
  const [errors, setErrors] = useState({})

  const PRESETS = {
    clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  }

  const loadPreset = (type) => set('sizes', PRESETS[type])

  const addSize = (raw) => {
    const s = raw.trim().toUpperCase()
    if (!s || form.sizes.includes(s)) return
    set('sizes', [...form.sizes, s])
    setCustomSize('')
  }

  const removeSize = (s) => set('sizes', form.sizes.filter(x => x !== s))

  useEffect(() => {
    categoriesApi.adminList().then(r => setCategories(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    productsApi.get(id)
      .then(r => {
        const p = r.data.data
        setForm({
          name: p.name || '', description: p.description || '',
          price: p.price || '', compare_price: p.compare_price || '',
          sku: p.sku || '', stock: p.stock ?? '',
          category_id: p.category_id || '',
          active: p.active == 1, featured: p.featured == 1,
          sort_order: p.sort_order || 0,
          sizes_enabled: p.sizes_enabled == 1 || p.sizes_enabled === true,
          sizes: Array.isArray(p.sizes) ? p.sizes : [],
        })
        setImages(p.images || [])
      })
      .catch(() => toast.error('Producto no encontrado'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: '' })) }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setNewFiles(prev => [...prev, ...files])
    const newPreviews = files.map(f => URL.createObjectURL(f))
    setPreviews(prev => [...prev, ...newPreviews])
  }

  const removeNewFile = (i) => {
    URL.revokeObjectURL(previews[i])
    setNewFiles(f => f.filter((_, j) => j !== i))
    setPreviews(p => p.filter((_, j) => j !== i))
  }

  const handleDeleteExisting = async (img) => {
    if (!isEdit) return
    try {
      await productsApi.deleteImage(id, img.id)
      setImages(imgs => imgs.filter(i => i.id !== img.id))
      toast.success('Imagen eliminada')
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())         e.name  = 'El nombre es requerido'
    if (!form.price || isNaN(form.price) || Number(form.price) < 0) e.price = 'Precio inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          if (Array.isArray(v)) fd.append(k, JSON.stringify(v))
          else fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : v)
        }
      })
      if (!isEdit) {
        newFiles.forEach(f => fd.append('images[]', f))
        await productsApi.create(fd)
        toast.success('Producto creado')
      } else {
        await productsApi.update(id, fd)
        // PUT doesn't carry $_FILES in PHP — upload images via separate POST
        if (newFiles.length > 0) {
          const imgFd = new FormData()
          newFiles.forEach(f => imgFd.append('images[]', f))
          await productsApi.addImages(id, imgFd)
        }
        toast.success('Producto actualizado')
      }
      navigate('/admin/products')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/products')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800">{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Información básica</h2>
          <Input label="Nombre *" value={form.name} onChange={e => set('name', e.target.value)}
            error={errors.name} placeholder="Nombre del producto" />
          <Textarea label="Descripción" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Descripción detallada del producto…" rows={4} />
          <Select label="Categoría" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">Sin categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Precio</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Precio actual *" type="number" step="0.01" min="0" value={form.price}
              onChange={e => set('price', e.target.value)} error={errors.price} placeholder="0.00" />
            <Input label="Precio anterior (tachado)" type="number" step="0.01" min="0" value={form.compare_price}
              onChange={e => set('compare_price', e.target.value)} placeholder="0.00" />
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Inventario</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="ABC-001" />
            <Input label="Stock (vacío = ilimitado)" type="number" min="0" value={form.stock}
              onChange={e => set('stock', e.target.value)} placeholder="∞" />
          </div>
          <Input label="Orden de visualización" type="number" min="0" value={form.sort_order}
            onChange={e => set('sort_order', e.target.value)} />
        </div>

        {/* Visibility */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Visibilidad</h2>
          <div className="space-y-3">
            <Toggle checked={form.active} onChange={e => set('active', e.target.checked)} label="Producto activo (visible en catálogo)" />
            <Toggle checked={form.featured} onChange={e => set('featured', e.target.checked)} label="Marcar como destacado" />
          </div>
        </div>

        {/* Sizes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-700">Tallas</h2>
              <p className="text-xs text-gray-400 mt-0.5">Activa si el producto tiene opciones de talla</p>
            </div>
            <Toggle checked={form.sizes_enabled} onChange={e => set('sizes_enabled', e.target.checked)} label="" />
          </div>

          {form.sizes_enabled && (
            <div className="space-y-4 pt-1">
              {/* Presets */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Cargar tallas predefinidas:</p>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={() => loadPreset('clothing')}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-brand hover:text-brand transition flex items-center gap-1.5">
                    <span>👕</span> Ropa (XS–XXXL)
                  </button>
                  <button type="button" onClick={() => loadPreset('shoes')}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-brand hover:text-brand transition flex items-center gap-1.5">
                    <span>👟</span> Zapato (35–45)
                  </button>
                </div>
              </div>

              {/* Selected sizes */}
              {form.sizes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Tallas seleccionadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {form.sizes.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 px-3 py-1 bg-brand/10 text-brand text-sm font-semibold rounded-lg">
                        {s}
                        <button type="button" onClick={() => removeSize(s)}
                          className="ml-0.5 text-brand/60 hover:text-red-500 transition text-base leading-none">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom size input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSize}
                  onChange={e => setCustomSize(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(customSize) } }}
                  placeholder="Talla personalizada (ej: 42, XXL)…"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
                />
                <button type="button" onClick={() => addSize(customSize)}
                  className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-xl hover:opacity-90 transition">
                  Agregar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Images */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Imágenes</h2>

          {/* Existing images */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {images.map(img => (
                <div key={img.id} className="relative group w-20 h-20">
                  <img src={img.url} alt="" className="w-full h-full object-cover rounded-lg border"
                    onError={e => { e.target.src = PLACEHOLDER_IMG }} />
                  <button type="button" onClick={() => handleDeleteExisting(img)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New previews */}
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {previews.map((src, i) => (
                <div key={i} className="relative group w-20 h-20">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-lg border-2 border-dashed border-brand/50" />
                  <button type="button" onClick={() => removeNewFile(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload zone */}
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand hover:bg-brand/5 transition group">
            <div className="text-3xl mb-2">📷</div>
            <p className="text-sm text-gray-500 group-hover:text-brand">Haz clic para seleccionar imágenes</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · Máx. 5MB por imagen</p>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Button type="submit" loading={saving} size="lg">
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate('/admin/products')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
