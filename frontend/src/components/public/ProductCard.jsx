// src/components/public/ProductCard.jsx
import { Link } from 'react-router-dom'
import { formatPrice, PLACEHOLDER_IMG, buildWhatsAppUrl, productWhatsAppMessage } from '../../utils/helpers'
import useCompanyStore from '../../store/companyStore'

const WaIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const EyeIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

export default function ProductCard({ product, compact = false }) {
  const { company } = useCompanyStore()
  const image = product.main_image || product.images?.[0]?.url || PLACEHOLDER_IMG
  const hasDiscount = product.compare_price && product.compare_price > product.price
  const discount = hasDiscount
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : null
  const isOutOfStock = product.stock !== null && product.stock !== undefined && Number(product.stock) === 0

  const waUrl = company?.whatsapp_active && company?.whatsapp_number && !isOutOfStock
    ? buildWhatsAppUrl(company.whatsapp_number, productWhatsAppMessage(product, company.name))
    : null

  return (
    <div className="product-card group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
      {/* Image */}
      <Link to={`/product/${product.id}`} className="relative aspect-[3/4] overflow-hidden bg-gray-50 block">
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isOutOfStock ? 'opacity-60' : ''}`}
          onError={e => { e.target.src = PLACEHOLDER_IMG }}
        />
        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="bg-white/95 text-gray-600 text-[11px] font-bold px-3 py-1 rounded-full tracking-widest uppercase shadow-sm">
              Agotado
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {!isOutOfStock && (product.featured === 1 || product.featured === true) ? (
            <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              ⭐ DESTACADO
            </span>
          ) : null}
          {!isOutOfStock && discount ? (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              -{discount}%
            </span>
          ) : null}
        </div>
      </Link>

      {/* Info */}
      <Link to={`/product/${product.id}`} className="p-4 flex flex-col gap-1 flex-1">
        {product.category_name && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-brand opacity-80">
            {product.category_name}
          </span>
        )}
        <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-brand transition">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{product.description}</p>
        )}
        <div className="flex items-baseline gap-2 mt-auto pt-2">
          <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.compare_price)}</span>
          )}
        </div>
      </Link>

      {/* Buttons */}
      <div className="px-4 pb-4 flex gap-2">
        {compact ? (
          <>
            <Link to={`/product/${product.id}`}
              className="flex-1 flex items-center justify-center py-2 rounded-xl border border-gray-200 text-gray-600 transition hover:border-brand hover:text-brand hover:bg-brand/5">
              <EyeIcon />
            </Link>
            {isOutOfStock ? (
              <div className="flex-1 flex items-center justify-center py-2 rounded-xl bg-gray-100 text-gray-400 text-[10px] font-bold uppercase tracking-wide cursor-not-allowed">
                Agotado
              </div>
            ) : waUrl ? (
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center py-2 rounded-xl text-white transition hover:opacity-90"
                style={{ backgroundColor: '#25D366' }}>
                <WaIcon />
              </a>
            ) : (
              <Link to={`/product/${product.id}`}
                className="flex-1 flex items-center justify-center py-2 rounded-xl text-white transition hover:opacity-90 btn-brand">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </>
        ) : (
          <>
            <Link to={`/product/${product.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium transition hover:border-brand hover:text-brand hover:bg-brand/5">
              <EyeIcon />
              Ver más
            </Link>
            {isOutOfStock ? (
              <div className="flex-1 flex items-center justify-center py-2 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed">
                Sin stock
              </div>
            ) : waUrl ? (
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
                style={{ backgroundColor: '#25D366' }}>
                <WaIcon />
                WhatsApp
              </a>
            ) : (
              <Link to={`/product/${product.id}`}
                className="flex-1 flex items-center justify-center py-2 rounded-xl text-white text-sm font-medium transition hover:opacity-90 btn-brand">
                Ver detalle
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
