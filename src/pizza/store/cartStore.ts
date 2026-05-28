import { create } from 'zustand';
import type { ExtraOption, Variant } from '../data/menuData';

export interface CartItem {
  cartId: string;
  productId: string;
  name: string;
  nameTh: string;
  quantity: number;
  basePrice: number;
  selectedVariant: Variant | null;
  selectedExtras: ExtraOption[];
  image: string;
}

export function calcItemTotal(item: CartItem): number {
  const variantMod = item.selectedVariant?.priceModifier ?? 0;
  const extrasTotal = item.selectedExtras.reduce((sum, e) => sum + e.price, 0);
  return (item.basePrice + variantMod + extrasTotal) * item.quantity;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'cartId'>) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,

  addItem: (item) => {
    const cartId = `${item.productId}-${item.selectedVariant?.id ?? 'base'}-${item.selectedExtras.map(e => e.id).join('-')}-${Date.now()}`;
    set((state) => ({ items: [...state.items, { ...item, cartId }] }));
  },

  removeItem: (cartId) => {
    set((state) => ({ items: state.items.filter((i) => i.cartId !== cartId) }));
  },

  updateQuantity: (cartId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) => i.cartId === cartId ? { ...i, quantity } : i),
    }));
  },

  clearCart: () => set({ items: [] }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  getTotal: () => get().items.reduce((sum, item) => sum + calcItemTotal(item), 0),
  getCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
