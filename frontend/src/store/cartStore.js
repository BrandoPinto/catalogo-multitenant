import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart:  () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addItem: (product, size, qty = 1) => {
        const key = `${product.id}__${size ?? ''}`
        set(state => {
          const existing = state.items.find(i => i.key === key)
          if (existing) {
            return { items: state.items.map(i => i.key === key ? { ...i, quantity: i.quantity + qty } : i) }
          }
          return {
            items: [...state.items, {
              key,
              productId: product.id,
              name:      product.name,
              price:     Number(product.price),
              image:     product.main_image || product.images?.[0]?.url || null,
              size:      size ?? null,
              quantity:  qty,
            }],
          }
        })
      },

      setQuantity: (key, qty) => {
        if (qty < 1) { get().removeItem(key); return }
        set(s => ({ items: s.items.map(i => i.key === key ? { ...i, quantity: qty } : i) }))
      },

      removeItem: (key) => set(s => ({ items: s.items.filter(i => i.key !== key) })),

      clear: () => set({ items: [] }),

      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'cart-storage', partialize: s => ({ items: s.items }) }
  )
)

export default useCartStore
