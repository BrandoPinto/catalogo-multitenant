// src/pages/public/ProductDetailPage.jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { productsApi } from '../../services/endpoints'
import PublicLayout from '../../layouts/PublicLayout'
import { Skeleton } from '../../components/ui'
import { formatPrice, PLACEHOLDER_IMG, buildWhatsAppUrl, productWhatsAppMessage } from '../../utils/helpers'
import useCompanyStore from '../../store/companyStore'
import useCartStore from '../../store/cartStore'
import toast from 'react-hot-toast'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { company } = useCompanyStore()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [error, setError] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [copied, setCopied] = useState(false)
  const { addItem, openCart } = useCartStore()

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success('Link copiado')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('No se pudo copiar el link')
    }
  }

  useEffect(() => {
    setLoading(true)
    productsApi.get(id)
      .then(r => setProduct(r.data.data))
      .catch(() => setError('Producto no encontrado'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-10">
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-2">{[1,2,3].map(i => <Skeleton key={i} className="w-16 h-16 rounded-lg" />)}</div>
        </div>
        <div className="space-y-4 pt-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-1/3 mt-4" />
        </div>
      </div>
    </PublicLayout>
  )

  if (error || !product) return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Producto no encontrado</h2>
        <Link to="/" className="btn-brand px-5 py-2 rounded-full text-sm font-medium inline-block">
          Volver al catálogo
        </Link>
      </div>
    </PublicLayout>
  )

  const images = product.images?.length ? product.images : [{ url: PLACEHOLDER_IMG }]
  const hasDiscount = product.compare_price && Number(product.compare_price) > Number(product.price)
  const discount = hasDiscount ? Math.round((1 - product.price / product.compare_price) * 100) : null

  const hasSizes = product.sizes_enabled == 1 && product.sizes?.length > 0

  const stockForSelected = hasSizes && selectedSize
    ? (product.size_stocks?.find(s => s.size === selectedSize)?.stock ?? null)
    : (!hasSizes && product.stock !== null && product.stock !== undefined ? Number(product.stock) : null)

  const isOutOfStock = stockForSelected !== null && stockForSelected === 0

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) { toast.error('Selecciona una talla'); return }
    if (isOutOfStock) { toast.error('Sin stock disponible'); return }
    addItem(product, selectedSize, quantity)
    toast.success('Agregado al carrito')
    openCart()
  }

  return (
    <PublicLayout>
      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <nav className="text-sm text-gray-400 flex items-center gap-1">
          <Link to="/" className="hover:text-brand">Inicio</Link>
          <span>/</span>
          {product.category_name && (
            <>
              <Link to={`/?category=${product.category_id}`} className="hover:text-brand">{product.category_name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-600 truncate">{product.name}</span>
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid md:grid-cols-2 gap-10 animate-fade-in">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 group">
            <img
              src={images[activeImg]?.url || PLACEHOLDER_IMG}
              alt={product.name}
              className="w-full h-full object-cover transition-opacity duration-200"
              onError={e => { e.target.src = PLACEHOLDER_IMG }}
            />
            {discount && (
              <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                -{discount}%
              </span>
            )}
            {/* Arrow navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center text-gray-700 hover:bg-white transition opacity-0 group-hover:opacity-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveImg(i => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center text-gray-700 hover:bg-white transition opacity-0 group-hover:opacity-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {/* Dots indicator */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === activeImg ? 'bg-white w-4' : 'bg-white/60 hover:bg-white/80'
                      }`} />
                  ))}
                </div>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition
                    ${i === activeImg ? 'border-brand shadow-sm' : 'border-transparent hover:border-gray-200'}`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover"
                    onError={e => { e.target.src = PLACEHOLDER_IMG }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4 py-2">
          {product.category_name && (
            <Link to={`/?category=${product.category_id}`}
              className="text-xs font-semibold uppercase tracking-widest text-brand hover:opacity-70">
              {product.category_name}
            </Link>
          )}

          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>

            {/* Share buttons */}
            <div className="flex items-center gap-1.5 shrink-0 pt-1">
              <button
                onClick={handleCopyLink}
                title="Copiar link"
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition
                  ${copied ? 'border-green-300 bg-green-50 text-green-600' : 'border-gray-200 text-gray-400 hover:border-brand hover:text-brand'}`}>
                {copied ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${product.name} - ${window.location.href}`)}`}
                target="_blank" rel="noopener noreferrer"
                title="Compartir por WhatsApp"
                className="w-8 h-8 rounded-full flex items-center justify-center text-white transition hover:opacity-80"
                style={{ backgroundColor: '#25D366' }}>
                <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Price + stock */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl font-bold text-gray-900">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <span className="text-xl text-gray-400 line-through">{formatPrice(product.compare_price)}</span>
            )}
            {discount && (
              <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                Ahorras {discount}%
              </span>
            )}
            {product.stock !== null && product.stock !== undefined && !hasSizes && (
              <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
                product.stock <= 5 ? 'bg-red-100 text-red-600' :
                product.stock <= 20 ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                Stock {product.stock}
              </span>
            )}
          </div>

          {/* SKU */}
          {product.sku && (
            <p className="text-xs text-gray-400">SKU: <span className="font-mono">{product.sku}</span></p>
          )}

          {/* Description */}
          {product.description && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Sizes */}
          {hasSizes && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Talla</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(size => {
                  const sStock = product.size_stocks?.find(s => s.size === size)?.stock ?? null
                  return (
                    <button key={size} type="button"
                      onClick={() => setSelectedSize(size === selectedSize ? null : size)}
                      className={`relative px-4 py-2 text-sm font-semibold rounded-xl border-2 transition
                        ${selectedSize === size
                          ? 'border-brand bg-brand text-white shadow-sm'
                          : 'border-gray-200 text-gray-700 hover:border-brand hover:text-brand'}`}>
                      {size}
                      {sStock !== null && sStock <= 5 && sStock > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" title={`Quedan ${sStock}`} />
                      )}
                      {sStock === 0 && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
                          <span className="text-gray-400 text-[10px]">—</span>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {selectedSize && (() => {
                const sStock = product.size_stocks?.find(s => s.size === selectedSize)?.stock
                return sStock !== null && sStock !== undefined
                  ? <p className={`text-xs mt-2 font-medium ${sStock <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                      {sStock === 0 ? 'Sin stock en esta talla' : `${sStock} unidades disponibles`}
                    </p>
                  : null
              })()}
            </div>
          )}

          {/* Featured badge */}
          {(product.featured === 1 || product.featured === true) && (
            <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full w-fit border border-amber-200">
              ⭐ Producto Destacado
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">Cantidad</span>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition font-bold text-lg">
                  −
                </button>
                <span className="w-10 text-center text-sm font-bold text-gray-900 select-none">{quantity}</span>
                <button type="button" onClick={() => setQuantity(q => q + 1)}
                  className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition font-bold text-lg">
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={handleAddToCart} disabled={isOutOfStock}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition shadow-sm
                  ${isOutOfStock
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'btn-brand active:scale-[.98]'}`}>
                {isOutOfStock ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Agotado
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Agregar al carrito
                  </>
                )}
              </button>

              {company?.whatsapp_active && company?.whatsapp_number && (
                <a href={buildWhatsAppUrl(company.whatsapp_number, productWhatsAppMessage(product, company.name, selectedSize))}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-white font-semibold text-sm transition hover:opacity-90 active:scale-[.98] shadow-sm"
                  style={{ backgroundColor: '#25D366' }}>
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Back */}
          <Link to="/"
            className="mt-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-brand transition group w-fit">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al catálogo
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}
