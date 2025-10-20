// stores/cartStore.ts
import { create } from 'zustand'
import type { MenuItem } from '../types/types'

interface CartItem extends MenuItem {
  quantity: number
}

interface CartStore {
  cart: CartItem[]
  addToCart: (item: MenuItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, change: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>((set, _get) => ({
  cart: [],

  addToCart: (item: MenuItem) => {
    set((state) => {
      const existingItem = state.cart.find((cartItem) => cartItem.id === item.id)
      if (existingItem) {
        return {
          cart: state.cart.map((cartItem) =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          ),
        }
      } else {
        return { cart: [...state.cart, { ...item, quantity: 1 }] }
      }
    })
  },

  removeFromCart: (id: string) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== id),
    })),

  updateQuantity: (id: string, change: number) =>
    set((state) => {
      const existingItem = state.cart.find((item) => item.id === id)
      if (!existingItem) return state

      const newQuantity = existingItem.quantity + change
      if (newQuantity <= 0) {
        return {
          cart: state.cart.filter((item) => item.id !== id),
        }
      } else {
        return {
          cart: state.cart.map((item) =>
            item.id === id ? { ...item, quantity: newQuantity } : item
          ),
        }
      }
    }),

  clearCart: () => set({ cart: [] }),
}))
