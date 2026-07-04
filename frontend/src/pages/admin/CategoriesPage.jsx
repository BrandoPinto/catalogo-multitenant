// src/pages/admin/CategoriesPage.jsx
import { useState, useEffect } from 'react'
import { categoriesApi } from '../../services/endpoints'
import { Button, Input, Textarea, Modal, ConfirmDialog, EmptyState } from '../../components/ui'
import { getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY = { name: '', description: '', sort_order: 0, active: true }

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [toDelete, setToDelete]     = useState(null)

  const fetch = () => {
    setLoading(true)
    categoriesApi.adminList()
      .then(r => setCategories(r.data.data || []))
      .catch(() => toast.error('Error al cargar categorías'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (cat) => {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description || '', sort_order: cat.sort_order, active: cat.active == 1 })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    setSaving(true)
    try {
      if (editing) {
        await categoriesApi.update(editing.id, form)
        toast.success('Categoría actualizada')
      } else {
        await categoriesApi.create(form)
        toast.success('Categoría creada')
      }
      setModalOpen(false)
      fetch()
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await categoriesApi.delete(toDelete.id)
      toast.success('Categoría eliminada')
      setToDelete(null)
      fetch()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Categorías</h1>
        <Button onClick={openNew}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Categoría
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="skeleton h-5 w-32" /><div className="skeleton h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState icon="🏷️" title="Sin categorías"
            action={<Button onClick={openNew}>Crear categoría</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b">
              <tr>
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-center hidden md:table-cell">Productos</th>
                <th className="px-5 py-3 text-center hidden md:table-cell">Orden</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{cat.name}</p>
                    {cat.description && <p className="text-xs text-gray-400 line-clamp-1">{cat.description}</p>}
                  </td>
                  <td className="px-5 py-3 text-center hidden md:table-cell">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{cat.product_count || 0}</span>
                  </td>
                  <td className="px-5 py-3 text-center text-gray-400 hidden md:table-cell">{cat.sort_order}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.active == 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {cat.active == 1 ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}>Editar</Button>
                      <Button size="sm" variant="ghost" className="!text-red-400 hover:!bg-red-50"
                        onClick={() => setToDelete(cat)}>Borrar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Categoría' : 'Nueva Categoría'}>
        <div className="space-y-4">
          <Input label="Nombre *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Vestidos" autoFocus />
          <Textarea label="Descripción (opcional)" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Orden de visualización" type="number" min="0" value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 accent-[var(--color-brand)]" />
                <span className="text-sm text-gray-600">Categoría activa</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Eliminar categoría"
        message={`¿Eliminar "${toDelete?.name}"? Los productos de esta categoría quedarán sin categoría.`} />
    </div>
  )
}
