// src/pages/public/HomePage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { productsApi, categoriesApi, bannersApi } from '../../services/endpoints'
import { ProductSkeleton, Pagination, EmptyState } from '../../components/ui'
import ProductCard from '../../components/public/ProductCard'
import BannerCarousel from '../../components/public/BannerCarousel'
import PublicLayout from '../../layouts/PublicLayout'
import { formatPrice, PLACEHOLDER_IMG } from '../../utils/helpers'

// Compact horizontal card used inside category sections
function CompactCard({ product }) {
  const image = product.main_image || product.images?.[0]?.url || PLACEHOLDER_IMG
  const hasDiscount = product.compare_price && Number(product.compare_price) > Number(product.price)
  const isOutOfStock = product.stock !== null && product.stock !== undefined && Number(product.stock) === 0

  return (
    <Link to={`/product/${product.id}`}
      className={`flex items-center gap-3 bg-white rounded-2xl border p-3 hover:border-brand/30 hover:shadow-md transition group
        ${isOutOfStock ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0 relative">
        <img src={image} alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { e.target.src = PLACEHOLDER_IMG }} />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Agotado</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate leading-snug">{product.name}</p>
        {product.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>
        )}
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-sm font-bold text-brand">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.compare_price)}</span>
          )}
        </div>
      </div>
      <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 group-hover:bg-brand transition-colors">
        <svg className="w-4 h-4 text-brand group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories]     = useState([])
  const [banners, setBanners]           = useState([])
  const [allProducts, setAllProducts]   = useState([])
  const [filtered, setFiltered]         = useState([])
  const [meta, setMeta]                 = useState(null)
  const [loading, setLoading]           = useState(true)
  const [loadingFiltered, setLoadingFiltered] = useState(false)
  const [drawerOpen, setDrawerOpen]     = useState(false)

  const activeCat    = searchParams.get('category') ? Number(searchParams.get('category')) : null
  const activeSearch = searchParams.get('search') || ''
  const priceMin     = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : null
  const priceMax     = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : null
  const page         = Number(searchParams.get('page') || 1)
  const isFiltered   = !!(activeCat || activeSearch)

  // Local inputs for price (avoids API call on every keystroke)
  const [inputMin, setInputMin] = useState(searchParams.get('price_min') || '')
  const [inputMax, setInputMax] = useState(searchParams.get('price_max') || '')
  // Drawer-local inputs (committed only on "Aplicar")
  const [drawerMin, setDrawerMin] = useState('')
  const [drawerMax, setDrawerMax] = useState('')

  useEffect(() => {
    setInputMin(searchParams.get('price_min') || '')
    setInputMax(searchParams.get('price_max') || '')
  }, [searchParams.get('price_min'), searchParams.get('price_max')])

  const openDrawer = () => {
    setDrawerMin(searchParams.get('price_min') || '')
    setDrawerMax(searchParams.get('price_max') || '')
    setDrawerOpen(true)
  }

  const applyDrawer = () => {
    const p = new URLSearchParams(searchParams)
    if (drawerMin) p.set('price_min', drawerMin); else p.delete('price_min')
    if (drawerMax) p.set('price_max', drawerMax); else p.delete('price_max')
    p.delete('page')
    setSearchParams(p)
    setDrawerOpen(false)
  }

  const clearPriceFilter = () => {
    setFilter('price_min', '')
    setFilter('price_max', '')
  }

  // Load static data once
  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data.data || [])).catch(() => {})
    bannersApi.list().then(r => setBanners(r.data.data || [])).catch(() => {})
  }, [])

  // Load ALL products for default home view (once)
  useEffect(() => {
    setLoading(true)
    productsApi.list({ per_page: 100 })
      .then(r => setAllProducts(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fetchFiltered = useCallback(() => {
    setLoadingFiltered(true)
    const params = { page, per_page: 20 }
    if (activeCat)    params.category_id = activeCat
    if (activeSearch) params.search      = activeSearch
    if (priceMin)     params.min_price   = priceMin
    if (priceMax)     params.max_price   = priceMax
    productsApi.list(params)
      .then(r => { setFiltered(r.data.data); setMeta(r.data.meta) })
      .catch(() => {})
      .finally(() => setLoadingFiltered(false))
  }, [page, activeCat, activeSearch, priceMin, priceMax])

  useEffect(() => {
    if (isFiltered) fetchFiltered()
  }, [isFiltered, fetchFiltered])

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  const priceFiltered = allProducts.filter(p => {
    if (priceMin !== null && Number(p.price) < priceMin) return false
    if (priceMax !== null && Number(p.price) > priceMax) return false
    return true
  })

  const featured    = priceFiltered.filter(p => p.featured == 1 || p.featured === true)
  const catSections = categories
    .map(cat => ({
      ...cat,
      products: priceFiltered.filter(p => Number(p.category_id) === cat.id).slice(0, 4),
    }))
    .filter(s => s.products.length > 0)

  const activeCatName   = categories.find(c => c.id === activeCat)?.name
  const priceActiveCount = (priceMin ? 1 : 0) + (priceMax ? 1 : 0)

  return (
    <PublicLayout>
      <BannerCarousel banners={banners} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── DESKTOP filter bar ────────────────────────── */}
        <div className="hidden md:flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none items-center">
          <button onClick={() => setSearchParams({})}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition
              ${!isFiltered && !priceMin && !priceMax ? 'btn-brand border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-brand hover:text-brand'}`}>
            Todo
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setFilter('category', cat.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition
                ${activeCat === cat.id ? 'btn-brand border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-brand hover:text-brand'}`}>
              {cat.name}
            </button>
          ))}

          <div className="shrink-0 w-px h-5 bg-gray-200 mx-1" />

          {/* Price inputs — desktop only */}
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium">Precio</span>
            <input
              type="number" min="0" placeholder="Mín"
              value={inputMin}
              onChange={e => setInputMin(e.target.value)}
              onBlur={e => setFilter('price_min', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setFilter('price_min', inputMin)}
              className="w-20 px-2.5 py-1.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-brand bg-white text-center"
            />
            <span className="text-xs text-gray-400">—</span>
            <input
              type="number" min="0" placeholder="Máx"
              value={inputMax}
              onChange={e => setInputMax(e.target.value)}
              onBlur={e => setFilter('price_max', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setFilter('price_max', inputMax)}
              className="w-20 px-2.5 py-1.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-brand bg-white text-center"
            />
            {(priceMin || priceMax) && (
              <button onClick={clearPriceFilter}
                className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-500 transition flex items-center justify-center text-xs font-bold"
                title="Quitar filtro de precio">
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── MOBILE filter bar ─────────────────────────── */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none items-center">
          <button onClick={() => setSearchParams({})}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition
              ${!isFiltered && !priceMin && !priceMax ? 'btn-brand border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}>
            Todo
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setFilter('category', cat.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition
                ${activeCat === cat.id ? 'btn-brand border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}>
              {cat.name}
            </button>
          ))}
          <div className="shrink-0 w-px h-5 bg-gray-200 mx-1" />
          {/* Price filter trigger */}
          <button onClick={openDrawer}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition
              ${priceActiveCount > 0 ? 'btn-brand border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Precio
            {priceActiveCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white/80 text-brand text-[10px] font-bold flex items-center justify-center">
                {priceActiveCount}
              </span>
            )}
          </button>
        </div>

        {/* ── FILTERED VIEW ─────────────────────────────── */}
        {isFiltered ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-800">
                  {activeSearch ? `Resultados para "${activeSearch}"` : activeCatName || 'Productos'}
                </h2>
                {meta && <p className="text-sm text-gray-400 mt-0.5">{meta.total} productos</p>}
              </div>
              <button onClick={() => setSearchParams({})}
                className="text-sm text-gray-400 hover:text-brand flex items-center gap-1 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar filtros
              </button>
            </div>

            {loadingFiltered ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon="🔍" title="No se encontraron productos"
                description={activeSearch ? `No hay resultados para "${activeSearch}"` : 'Esta categoría no tiene productos activos'}
                action={<button onClick={() => setSearchParams({})} className="btn-brand px-5 py-2 rounded-full text-sm font-medium">Ver todos</button>} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((p, i) => (
                  <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms`, opacity: 0 }}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            )}

            <Pagination meta={meta} onPage={p => setFilter('page', p)} />
          </>

        ) : loading ? (
          <div className="space-y-10">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array(4).fill(0).map((_, i) => <div key={i} className="shrink-0 w-52"><ProductSkeleton /></div>)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array(4).fill(0).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          </div>

        ) : (
          /* ── DEFAULT HOME VIEW ──────────────────────── */
          <div className="space-y-12 animate-fade-in">

            {/* Featured row */}
            {featured.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand text-white px-3 py-1.5 rounded-full shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Más Vendido
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
                  {featured.map((p, i) => (
                    <div key={p.id} className="shrink-0 w-44 sm:w-52 animate-fade-in"
                      style={{ animationDelay: `${i * 70}ms`, opacity: 0 }}>
                      <ProductCard product={p} compact />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category sections */}
            {catSections.map((cat, sectionIdx) => (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold text-gray-800">{cat.name}</h2>
                  <button onClick={() => setFilter('category', cat.id)}
                    className="text-sm font-semibold text-brand hover:opacity-70 transition flex items-center gap-1">
                    Ver más
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {cat.products.map((p, i) => (
                    <div key={p.id} className="animate-fade-in"
                      style={{ animationDelay: `${(sectionIdx * 80) + (i * 60)}ms`, opacity: 0 }}>
                      <CompactCard product={p} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {catSections.length === 0 && allProducts.length === 0 && (
              <EmptyState icon="📦" title="Sin productos aún"
                description="Agrega productos desde el panel de administración" />
            )}
          </div>
        )}
      </div>

      {/* ── Mobile price filter drawer ─────────────────── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setDrawerOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-2xl shadow-2xl animate-slide-up-full">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="px-5 pb-8 pt-3 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-base">Filtrar por precio</h3>
                <button onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Precio mínimo</label>
                  <input
                    type="number" min="0" placeholder="0"
                    value={drawerMin}
                    onChange={e => setDrawerMin(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-center"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Precio máximo</label>
                  <input
                    type="number" min="0" placeholder="Sin límite"
                    value={drawerMax}
                    onChange={e => setDrawerMax(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-center"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setDrawerMin(''); setDrawerMax(''); clearPriceFilter(); setDrawerOpen(false) }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Limpiar
                </button>
                <button
                  onClick={applyDrawer}
                  className="flex-1 py-3 rounded-xl btn-brand text-sm font-semibold transition">
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </PublicLayout>
  )
}
