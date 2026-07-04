import useCartStore from '../../store/cartStore'
import useCompanyStore from '../../store/companyStore'
import { formatPrice, buildWhatsAppUrl, PLACEHOLDER_IMG } from '../../utils/helpers'

function cartWhatsAppMessage(items, companyName, total) {
  const lines = items.map((item, i) => {
    const size = item.size ? ` (Talla: ${item.size})` : ''
    return `${i + 1}. *${item.name}*${size} x${item.quantity} — ${formatPrice(item.price * item.quantity)}`
  }).join('\n')
  return `¡Hola! 👋 Me gustaría hacer el siguiente pedido en *${companyName}*:\n\n${lines}\n\n*Total: ${formatPrice(total)}*\n\n¿Están disponibles?`
}

export default function CartDrawer() {
  const { items, isOpen, closeCart, setQuantity, removeItem, clear, getTotal, getCount } = useCartStore()
  const { company } = useCompanyStore()

  if (!isOpen) return null

  const total = getTotal()
  const count = getCount()
  const waUrl = company?.whatsapp_active && company?.whatsapp_number && items.length > 0
    ? buildWhatsAppUrl(company.whatsapp_number, cartWhatsAppMessage(items, company.name, total))
    : null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={closeCart} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-white shadow-2xl flex flex-col animate-slide-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-brand text-white shrink-0">
          <button onClick={closeCart}
            className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="font-semibold text-base">
            Mi carrito {count > 0 && <span className="text-white/70">({count})</span>}
          </h2>
          {items.length > 0
            ? <button onClick={clear} className="text-sm text-white/80 hover:text-white transition">Vaciar</button>
            : <div className="w-12" />}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-400 font-medium">Tu carrito está vacío</p>
              <button onClick={closeCart}
                className="mt-4 text-sm text-brand hover:underline">
                Seguir comprando
              </button>
            </div>
          ) : items.map(item => (
            <div key={item.key} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
              <img
                src={item.image || PLACEHOLDER_IMG}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg shrink-0 border border-gray-100"
                onError={e => { e.target.src = PLACEHOLDER_IMG }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
                  <button onClick={() => removeItem(item.key)}
                    className="text-gray-300 hover:text-red-400 transition shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
                {item.size && (
                  <span className="inline-block mt-1 text-[11px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-semibold">
                    Talla {item.size}
                  </span>
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <button onClick={() => setQuantity(item.key, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition font-bold text-lg">
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-800 select-none">
                      {item.quantity}
                    </span>
                    <button onClick={() => setQuantity(item.key, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition font-bold text-lg">
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Total</span>
              <span className="text-2xl font-bold text-gray-900">{formatPrice(total)}</span>
            </div>
            {waUrl ? (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" onClick={closeCart}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm transition hover:opacity-90 active:scale-[.98] shadow-md"
                style={{ backgroundColor: '#25D366' }}>
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Pedir por WhatsApp
              </a>
            ) : (
              <p className="text-center text-xs text-gray-400 py-2">WhatsApp no configurado</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
