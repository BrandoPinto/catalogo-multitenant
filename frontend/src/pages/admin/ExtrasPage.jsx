// src/pages/admin/ExtrasPage.jsx
import { useState, useEffect, useRef } from 'react'
import { companyApi } from '../../services/endpoints'
import { Button, Toggle } from '../../components/ui'
import { getErrorMessage } from '../../utils/helpers'
import useCompanyStore from '../../store/companyStore'
import toast from 'react-hot-toast'

export default function ExtrasPage() {
  const { company, setCompany } = useCompanyStore()
  const fileRef = useRef()

  const [form, setForm] = useState({ popup_active: false, popup_link: '' })
  const [currentImage, setCurrentImage] = useState(null)
  const [newFile, setNewFile]           = useState(null)
  const [preview, setPreview]           = useState(null)
  const [removeImage, setRemoveImage]   = useState(false)
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    if (!company) return
    setForm({
      popup_active: company.popup_active == 1,
      popup_link:   company.popup_link || '',
    })
    setCurrentImage(company.popup_image_url || null)
  }, [company])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (preview) URL.revokeObjectURL(preview)
    setNewFile(file)
    setPreview(URL.createObjectURL(file))
    setRemoveImage(false)
  }

  const handleRemoveImage = () => {
    if (preview) URL.revokeObjectURL(preview)
    setCurrentImage(null)
    setNewFile(null)
    setPreview(null)
    setRemoveImage(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('popup_active', form.popup_active ? '1' : '0')
      fd.append('popup_link',   form.popup_link)
      if (newFile)      fd.append('popup_image', newFile)
      if (removeImage)  fd.append('remove_popup_image', '1')
      const res = await companyApi.update(fd)
      setCompany(res.data.data)
      setCurrentImage(res.data.data.popup_image_url || null)
      setNewFile(null)
      setPreview(null)
      setRemoveImage(false)
      toast.success('Configuración guardada')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const displayImage = preview || currentImage

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-gray-800">Extras</h1>

      {/* Popup de bienvenida */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-700">Popup de bienvenida</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Aparece al entrar al catálogo. Se muestra una vez por sesión.
          </p>
        </div>

        {/* Toggle */}
        <div className={`rounded-xl border p-4 transition ${
          form.popup_active ? 'border-brand/30 bg-brand/5' : 'border-gray-100'
        }`}>
          <Toggle
            checked={form.popup_active}
            onChange={e => setForm(f => ({ ...f, popup_active: e.target.checked }))}
            label="Activar popup al inicio"
          />
          {form.popup_active && (
            <p className="text-xs text-brand mt-2 ml-11">
              El popup aparecerá cuando los clientes entren al catálogo
            </p>
          )}
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagen promocional
            <span className="ml-1.5 text-xs font-normal text-gray-400">JPG, PNG, WEBP · Recomendado 600×400 px</span>
          </label>

          {displayImage ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img src={displayImage} alt="Popup preview"
                className="w-full object-contain max-h-72" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 rounded-lg shadow hover:bg-white transition border border-gray-200">
                  Cambiar
                </button>
                <button type="button" onClick={handleRemoveImage}
                  className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition shadow text-lg leading-none">
                  ×
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-brand hover:bg-brand/5 transition group">
              <div className="text-4xl mb-2">🖼️</div>
              <p className="text-sm text-gray-500 group-hover:text-brand font-medium">
                Haz clic para subir una imagen
              </p>
              <p className="text-xs text-gray-400 mt-1">Recomendado: 600×400 px</p>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {/* Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Enlace al hacer clic
            <span className="ml-1.5 text-xs font-normal text-gray-400">— opcional</span>
          </label>
          <input
            type="url"
            value={form.popup_link}
            onChange={e => setForm(f => ({ ...f, popup_link: e.target.value }))}
            placeholder="https://ejemplo.com"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
          <p className="text-xs text-gray-400 mt-1">
            Si se configura, al hacer clic en el popup abrirá esta URL
          </p>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} loading={saving}>
            Guardar configuración
          </Button>
        </div>
      </div>
    </div>
  )
}
