// src/pages/admin/UsersPage.jsx
import { useState, useEffect } from 'react'
import { usersApi } from '../../services/endpoints'
import { Button, Input, Select, Modal, ConfirmDialog, EmptyState, Badge } from '../../components/ui'
import { getErrorMessage } from '../../utils/helpers'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const EMPTY = { name: '', email: '', password: '', role: 'editor', active: true }

export default function UsersPage() {
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [toDelete, setToDelete]   = useState(null)
  const [errors, setErrors]       = useState({})
  const { user: currentUser }     = useAuthStore()

  const fetch = () => {
    setLoading(true)
    usersApi.list()
      .then(r => setUsers(r.data.data || []))
      .catch(() => toast.error('Error al cargar usuarios'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const openNew = () => {
    setEditing(null); setForm(EMPTY); setErrors({}); setModalOpen(true)
  }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, active: u.active == 1 })
    setErrors({}); setModalOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nombre requerido'
    if (!editing && !form.email.trim()) e.email = 'Email requerido'
    if (!editing && form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (editing && form.password && form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (editing) {
        await usersApi.update(editing.id, payload)
        toast.success('Usuario actualizado')
      } else {
        await usersApi.create(payload)
        toast.success('Usuario creado')
      }
      setModalOpen(false)
      fetch()
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await usersApi.delete(toDelete.id)
      toast.success('Usuario eliminado')
      setToDelete(null)
      fetch()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Usuarios</h1>
        <Button onClick={openNew}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="skeleton w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon="👤" title="Sin usuarios"
            action={<Button onClick={openNew}>Crear usuario</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b">
              <tr>
                <th className="px-5 py-3 text-left">Usuario</th>
                <th className="px-5 py-3 text-center">Rol</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 flex items-center gap-1.5">
                          {u.name}
                          {u.id === currentUser?.id && (
                            <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">Tú</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge color={u.role === 'admin' ? 'brand' : 'gray'}>
                      {u.role === 'admin' ? 'Admin' : 'Editor'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.active == 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.active == 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Editar</Button>
                      {u.id !== currentUser?.id && (
                        <Button size="sm" variant="ghost" className="!text-red-400 hover:!bg-red-50"
                          onClick={() => setToDelete(u)}>Borrar</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <div className="space-y-4">
          <Input label="Nombre *" value={form.name} onChange={e => set('name', e.target.value)}
            error={errors.name} placeholder="Nombre completo" autoFocus />
          {!editing && (
            <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)}
              error={errors.email} placeholder="usuario@empresa.com" />
          )}
          <Input label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
            type="password" value={form.password} onChange={e => set('password', e.target.value)}
            error={errors.password} placeholder="Mínimo 8 caracteres" />
          <Select label="Rol" value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="admin">Administrador (acceso total)</option>
            <option value="editor">Editor (sin gestión de usuarios)</option>
          </Select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
              className="w-4 h-4 accent-[var(--color-brand)]" />
            <span className="text-sm text-gray-600">Usuario activo</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Eliminar usuario"
        message={`¿Eliminar al usuario "${toDelete?.name}"? Esta acción no se puede deshacer.`} />
    </div>
  )
}
