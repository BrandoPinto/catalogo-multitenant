// src/layouts/PublicLayout.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCompany } from '../hooks/useCompany'
import { categoriesApi } from '../services/endpoints'
import { PLACEHOLDER_IMG, buildWhatsAppUrl } from '../utils/helpers'
import useCartStore from '../store/cartStore'
import CartDrawer from '../components/public/CartDrawer'
import WelcomePopup from '../components/public/WelcomePopup'

export default function PublicLayout({ children }) {
  const { company, loading } = useCompany()
  const [categories, setCategories] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const { openCart, getCount } = useCartStore()
  const cartCount = getCount()

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) navigate(`/?search=${encodeURIComponent(search.trim())}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navbar ─────────────────────────────── */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-md bg-white/95 backdrop-blur-sm' : 'bg-white'}`}>
        {/* Top bar */}
        <div className="bg-brand text-white text-xs py-1.5 text-center">
          {loading ? '...' : (company?.description || `Bienvenido a ${company?.name}`)}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            {company?.logo_url
              ? <img src={company.logo_url} alt={company.name} className="h-10 w-auto object-contain" />
              : <span className="text-xl font-bold font-display text-brand">{company?.name || '...'}</span>
            }
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar productos…"
                className="w-full pl-4 pr-10 py-2 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Desktop categories */}
          <nav className="hidden md:flex items-center gap-1">
            {categories.slice(0, 5).map(cat => (
              <Link key={cat.id} to={`/?category=${cat.id}`}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-brand rounded-md hover:bg-gray-50 transition whitespace-nowrap">
                {cat.name}
              </Link>
            ))}
          </nav>

          {/* Cart button */}
          <button onClick={openCart} className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 transition shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(m => !m)} className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 animate-slide-down">
            {categories.map(cat => (
              <Link key={cat.id} to={`/?category=${cat.id}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 text-sm font-medium text-gray-700">
                {cat.name}
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cat.product_count}</span>
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* ── Main ───────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Cart ───────────────────────────────── */}
      <CartDrawer />

      {/* ── Welcome popup ──────────────────────── */}
      <WelcomePopup />

      {/* ── WhatsApp flotante ──────────────────── */}
      {company?.whatsapp_active && company?.whatsapp_number && (
        <a href={buildWhatsAppUrl(company.whatsapp_number, `¡Hola! 👋 Estoy visitando el catálogo de *${company.name}* y me gustaría obtener información.`)}
          target="_blank" rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition hover:scale-110 active:scale-95"
          style={{ backgroundColor: '#25D366' }}
          title="Escribir por WhatsApp">
          <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}

      {/* ── Footer ─────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-300 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <div className="text-white font-display text-xl font-bold mb-2">
                {company?.name || '—'}
              </div>
              <p className="text-sm text-gray-400 max-w-xs">{company?.description || 'Tu catálogo online'}</p>

              {/* Social links */}
              {(() => {
                const links = [
                  { key: 'facebook',  color: '#1877F2', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /> },
                  { key: 'instagram', color: '#E1306C', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth={2.5} strokeLinecap="round" /><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></> },
                  { key: 'tiktok',    color: '#ffffff', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12a4 4 0 104 4V4a5 5 0 005 5" /> },
                  { key: 'youtube',   color: '#FF0000', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></> },
                ].filter(l => company?.[`${l.key}_active`] && company?.[`${l.key}_url`])

                if (!links.length) return null
                return (
                  <div className="flex gap-3 mt-4">
                    {links.map(l => (
                      <a key={l.key} href={company[`${l.key}_url`]} target="_blank" rel="noopener noreferrer"
                        className="w-9 h-9 rounded-full flex items-center justify-center transition hover:opacity-80"
                        style={{ backgroundColor: l.color === '#ffffff' ? '#333' : l.color }}>
                        <svg className="w-4 h-4" fill="none" stroke="white" viewBox="0 0 24 24">
                          {l.icon}
                        </svg>
                      </a>
                    ))}
                  </div>
                )
              })()}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Categorías</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                {categories.map(cat => (
                  <Link key={cat.id} to={`/?category=${cat.id}`}
                    className="text-sm text-gray-400 hover:text-white transition">
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <Link to="/admin/login" className="text-xs text-gray-600 hover:text-gray-400 transition">
                Panel de Administración
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} {company?.name}. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
