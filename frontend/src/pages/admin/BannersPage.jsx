// src/pages/admin/BannersPage.jsx
import { useState, useEffect, useRef } from 'react'
import { bannersApi } from '../../services/endpoints'
import { Button, Modal, Input, ConfirmDialog, EmptyState } from '../../components/ui'
import { getErrorMessage, PLACEHOLDER_IMG } from '../../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY = { title: '', subtitle: '', sort_order: 0 }

export default function BannersPage() {
  const [banners, setBanners]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [file, setFile]           = useState(null)
  const [preview, setPreview]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [toDelete, setToDelete]   = useState(null)
  const fileRef = useRef()

  const fetch = () => {
    setLoading(true)
    bannersApi.adminList()
      .then(r => setBanners(r.data.data || []))
      .catch(() => toast.error('Error al cargar banners'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const openNew = () => {
    setEditing(null); setForm(EMPTY); setFile(null); setPreview(null); setModalOpen(true)
  }
  const openEdit = (b) => {
    setEditing(b)
    setForm({ title: b.title || '', subtitle: b.subtitle || '', sort_order: b.sort_order || 0 })
    setFile(null); setPreview(b.image_url || b.image || null); setModalOpen(true)
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSave = async () => {
    if (!editing && !file) return toast.error('La imagen es requerida')
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (file) fd.append('image', file)

      if (editing) {
        await bannersApi.update(editing.id, fd)
        toast.success('Banner actualizado')
      } else {
        await bannersApi.create(fd)
        toast.success('Banner creado')
      }
      setModalOpen(false)
      fetch()
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await bannersApi.delete(toDelete.id)
      toast.success('Banner eliminado')
      setToDelete(null)
      fetch()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Banners</h1>
        <Button onClick={openNew}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Banner
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(2).fill(0).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <EmptyState icon="🖼️" title="Sin banners" description="Agrega banners para mostrar en tu catálogo"
            action={<Button onClick={openNew}>Crear banner</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
              <div className="relative aspect-video bg-gray-100">
                <img src={b.image_url || b.image || PLACEHOLDER_IMG} alt={b.title || ''}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = PLACEHOLDER_IMG }} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button size="sm" onClick={() => openEdit(b)}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => setToDelete(b)}>Borrar</Button>
                </div>
                <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full ${b.active == 1 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
                  {b.active == 1 ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="p-3">
                <p className="font-medium text-gray-800 text-sm">{b.title || '(Sin título)'}</p>
                {b.subtitle && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{b.subtitle}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Banner' : 'Nuevo Banner'} size="lg">
        <div className="space-y-4">
          {/* Image */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Imagen {!editing && '*'}</label>
              <span className="text-xs text-gray-400">Recomendado: 1200×450 px · relación 16:5</span>
            </div>
            {preview ? (
              <div className="relative mb-2 aspect-video rounded-xl overflow-hidden bg-gray-100">
                <img src={preview} alt="" className="w-full h-full object-cover" onError={e => { e.target.src = PLACEHOLDER_IMG }} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 rounded-lg shadow hover:bg-white transition border border-gray-200">
                  Cambiar imagen
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand hover:bg-brand/5 transition group">
                <div className="text-3xl mb-1.5">🖼️</div>
                <p className="text-sm text-gray-500 group-hover:text-brand font-medium">Haz clic para subir una imagen</p>
                <p className="text-xs text-gray-400 mt-1">1200×450 px · JPG, PNG, WEBP</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
          <Input label="Título" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Nueva Colección" />
          <Input label="Subtítulo" value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="Texto secundario — opcional" />
          <Input label="Orden" type="number" min="0" value={form.sort_order} onChange={e => set('sort_order', Number(e.target.value))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Eliminar banner" message={`¿Eliminar el banner "${toDelete?.title || 'este banner'}"?`} />
    </div>
  )
}
