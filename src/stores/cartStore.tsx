import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem } from "../types/types";

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface CartStore {
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (item: MenuItem) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, _get) => ({
      cart: [],

      addToCart: (item) => {
        set((state) => {
          const existing = state.cart.find((c) => c.id === item.id);
          if (existing) {
            return {
              cart: state.cart.map((c) =>
                c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
              ),
            };
          }
          return { cart: [...state.cart, { ...item, quantity: 1 }] };
        });
      },

      removeFromCart: (item) => {
        set((state) => {
          const existing = state.cart.find((c) => c.id === item.id);
          if (!existing) return state;

          const newQuantity = existing.quantity - 1;
          if (newQuantity <= 0) {
            return { cart: state.cart.filter((c) => c.id !== item.id) };
          }

          return {
            cart: state.cart.map((c) =>
              c.id === item.id ? { ...c, quantity: newQuantity } : c
            ),
          };
        });
      },

      clearCart: () => set({ cart: [] }),
    }),
    {
      name: "mai-sushi-cart",
      version: 1,
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
