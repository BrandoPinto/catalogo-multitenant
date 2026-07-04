// src/pages/admin/CompanyPage.jsx
import { useState, useEffect, useRef } from 'react'
import { companyApi, authApi } from '../../services/endpoints'
import { Button, Input } from '../../components/ui'
import { getErrorMessage, PLACEHOLDER_IMG } from '../../utils/helpers'
import useCompanyStore from '../../store/companyStore'
import toast from 'react-hot-toast'

const SOCIAL_PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  color: '#1877F2', placeholder: 'https://facebook.com/tupagina',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /> },
  { key: 'instagram', label: 'Instagram', color: '#E1306C', placeholder: 'https://instagram.com/tuusuario',
    icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth={2} strokeLinecap="round" /><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></> },
  { key: 'tiktok',    label: 'TikTok',    color: '#010101', placeholder: 'https://tiktok.com/@tuusuario',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12a4 4 0 104 4V4a5 5 0 005 5" /> },
  { key: 'youtube',   label: 'YouTube',   color: '#FF0000', placeholder: 'https://youtube.com/c/tucanal',
    icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></> },
]

const defaultSocial = () =>
  Object.fromEntries(SOCIAL_PLATFORMS.flatMap(p => [
    [`${p.key}_url`, ''], [`${p.key}_active`, false]
  ]))

const WA_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

export default function CompanyPage() {
  const { company, setCompany } = useCompanyStore()
  const [form, setForm]         = useState({ name: '', primary_color: '#3B82F6', secondary_color: '#1E40AF', description: '' })
  const [social, setSocial]     = useState(defaultSocial())
  const [whatsapp, setWhatsapp] = useState({ number: '', active: false })
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile]       = useState(null)
  const [saving, setSaving]           = useState(false)
  const fileRef = useRef()

  const [pwForm, setPwForm]     = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwErrors, setPwErrors] = useState({})

  useEffect(() => {
    if (company) {
      setForm({
        name:            company.name            || '',
        primary_color:   company.primary_color   || '#3B82F6',
        secondary_color: company.secondary_color || '#1E40AF',
        description:     company.description     || '',
      })
      setLogoPreview(company.logo_url || null)
      setWhatsapp({
        number: company.whatsapp_number || '',
        active: Boolean(Number(company.whatsapp_active)),
      })
      setSocial(Object.fromEntries(SOCIAL_PLATFORMS.flatMap(p => [
        [`${p.key}_url`,    company[`${p.key}_url`]    || ''],
        [`${p.key}_active`, Boolean(Number(company[`${p.key}_active`]))],
      ])))
    }
  }, [company])

  const handleLogoChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      if (form.name)            fd.append('name',            form.name)
      if (form.primary_color)   fd.append('primary_color',   form.primary_color)
      if (form.secondary_color) fd.append('secondary_color', form.secondary_color)
      if (form.description)     fd.append('description',     form.description)
      if (logoFile)             fd.append('logo',            logoFile)

      fd.append('whatsapp_number', whatsapp.number || '')
      fd.append('whatsapp_active', whatsapp.active ? '1' : '0')
      SOCIAL_PLATFORMS.forEach(p => {
        fd.append(`${p.key}_url`,    social[`${p.key}_url`]    || '')
        fd.append(`${p.key}_active`, social[`${p.key}_active`] ? '1' : '0')
      })

      const res = await companyApi.update(fd)
      setCompany(res.data.data)
      toast.success('Empresa actualizada correctamente')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    const e2 = {}
    if (!pwForm.current_password) e2.current = 'Requerida'
    if (pwForm.new_password.length < 8) e2.new = 'Mínimo 8 caracteres'
    if (pwForm.new_password !== pwForm.confirm) e2.confirm = 'Las contraseñas no coinciden'
    if (Object.keys(e2).length) { setPwErrors(e2); return }

    setPwSaving(true)
    try {
      await authApi.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      toast.success('Contraseña actualizada')
      setPwForm({ current_password: '', new_password: '', confirm: '' })
      setPwErrors({})
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setPwSaving(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setSoc = (k, v) => setSocial(s => ({ ...s, [k]: v }))

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-gray-800">Mi Empresa</h1>

      {/* Company settings */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-gray-700">Configuración general</h2>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-100 border overflow-hidden flex items-center justify-center">
              {logoPreview
                ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1"
                    onError={e => { e.target.src = PLACEHOLDER_IMG }} />
                : <span className="text-gray-400 text-2xl">🏢</span>
              }
            </div>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {logoPreview ? 'Cambiar logo' : 'Subir logo'}
              </Button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP · Recomendado: fondo transparente</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>

        <Input label="Nombre de la empresa" value={form.name}
          onChange={e => set('name', e.target.value)} placeholder="Mi Empresa S.A." />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción breve</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={2} placeholder="Descripción que aparece en el banner y footer"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none" />
        </div>

        {/* Colors */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Colores de marca</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Color principal</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                <input type="color" value={form.primary_color}
                  onChange={e => { set('primary_color', e.target.value); document.documentElement.style.setProperty('--color-brand', e.target.value) }}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                <span className="text-sm font-mono text-gray-600">{form.primary_color}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Botones, links, acentos</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Color secundario</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                <input type="color" value={form.secondary_color}
                  onChange={e => set('secondary_color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                <span className="text-sm font-mono text-gray-600">{form.secondary_color}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Sidebar, hover</p>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2">Vista previa</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" className="btn-brand px-4 py-1.5 rounded-lg text-sm font-medium">Botón principal</button>
              <span className="text-brand text-sm font-medium">Enlace</span>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: form.primary_color }}>Badge</span>
            </div>
          </div>
        </div>

        {/* Social media */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Redes sociales</label>
          <div className="space-y-3">
            {SOCIAL_PLATFORMS.map(p => {
              const activeKey = `${p.key}_active`
              const urlKey    = `${p.key}_url`
              const isActive  = social[activeKey]
              return (
                <div key={p.key} className={`rounded-xl border transition ${isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: isActive ? p.color : '#e5e7eb' }}>
                      <svg className="w-4 h-4" fill="none" stroke="white" viewBox="0 0 24 24">
                        {p.icon}
                      </svg>
                    </div>

                    {/* Label */}
                    <span className="text-sm font-medium text-gray-700 w-20 shrink-0">{p.label}</span>

                    {/* URL input */}
                    <input
                      type="url"
                      value={social[urlKey]}
                      onChange={e => setSoc(urlKey, e.target.value)}
                      placeholder={p.placeholder}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:bg-gray-50 disabled:text-gray-400"
                      disabled={!isActive}
                    />

                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => setSoc(activeKey, !isActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isActive ? 'bg-brand' : 'bg-gray-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">Activa cada red para que aparezca en el catálogo.</p>
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">WhatsApp</label>
          <div className={`rounded-xl border transition ${whatsapp.active ? 'border-green-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white ${whatsapp.active ? 'bg-[#25D366]' : 'bg-gray-300'}`}>
                {WA_ICON}
              </div>
              <span className="text-sm font-medium text-gray-700 w-20 shrink-0">WhatsApp</span>
              <input
                type="tel"
                value={whatsapp.number}
                onChange={e => setWhatsapp(w => ({ ...w, number: e.target.value }))}
                placeholder="51987654321"
                disabled={!whatsapp.active}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 disabled:bg-gray-50 disabled:text-gray-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setWhatsapp(w => ({ ...w, active: !w.active }))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${whatsapp.active ? 'bg-[#25D366]' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${whatsapp.active ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            {whatsapp.active && whatsapp.number && (
              <div className="px-4 pb-3">
                <p className="text-xs text-gray-400">
                  Número con código de país, sin espacios ni +. Ej: <span className="font-mono">51987654321</span> para Perú.
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Aparece como botón flotante en el catálogo y en cada producto.</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={saving}>Guardar cambios</Button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={handlePasswordSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-700">Cambiar contraseña</h2>
        <Input label="Contraseña actual" type="password" value={pwForm.current_password}
          onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
          error={pwErrors.current} />
        <Input label="Nueva contraseña" type="password" value={pwForm.new_password}
          onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
          error={pwErrors.new} placeholder="Mínimo 8 caracteres" />
        <Input label="Confirmar nueva contraseña" type="password" value={pwForm.confirm}
          onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
          error={pwErrors.confirm} />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={pwSaving}>Actualizar contraseña</Button>
        </div>
      </form>
    </div>
  )
}
