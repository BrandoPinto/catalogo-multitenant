// src/utils/helpers.js

export function formatPrice(price) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(price)
}

export function truncate(str, max = 80) {
  if (!str) return ''
  return str.length <= max ? str : str.slice(0, max) + '…'
}

export function getErrorMessage(err) {
  return err?.response?.data?.message
    || err?.response?.data?.errors?.join(', ')
    || err?.message
    || 'Ocurrió un error inesperado'
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function buildWhatsAppUrl(number, message) {
  const clean = number.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}

export function productWhatsAppMessage(product, companyName, selectedSize = null) {
  const price = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(product.price)
  const sizeText = selectedSize ? `\n📏 Talla: *${selectedSize}*` : ''
  return `¡Hola! 👋 Vi este producto en el catálogo de *${companyName}* y me interesa:\n\n*${product.name}*\n💰 Precio: ${price}${sizeText}\n\n¿Está disponible? Me gustaría obtener más información.`
}

export const PLACEHOLDER_IMG ='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+U2luIGltYWdlbjwvdGV4dD48L3N2Zz4='
