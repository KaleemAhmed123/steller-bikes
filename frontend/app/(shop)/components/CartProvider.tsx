'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { addToCart, getCart, removeCartItem, updateCartItem } from '@/lib/api';
import type { CartView } from '@/lib/types';
import { useToast } from './ToastProvider';

interface CartContextValue {
  cart: CartView | null;
  loading: boolean;
  add: (variantId: string, quantity?: number) => Promise<void>;
  update: (variantId: string, quantity: number) => Promise<void>;
  remove: (variantId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

// Holds the cart for the whole app so the header count and the cart page stay
// in sync. Fetches once on load; each action replaces the cart with the fresh,
// server-recomputed view the API returns.
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  useEffect(() => {
    getCart()
      .then(setCart)
      .catch(() => setCart(null))
      .finally(() => setLoading(false));
  }, []);

  const add = useCallback(
    async (variantId: string, quantity = 1) => {
      setCart(await addToCart(variantId, quantity));
      show('Added to cart', 'success');
    },
    [show],
  );
  const update = useCallback(async (variantId: string, quantity: number) => {
    setCart(await updateCartItem(variantId, quantity));
  }, []);
  const remove = useCallback(async (variantId: string) => {
    setCart(await removeCartItem(variantId));
  }, []);
  const refresh = useCallback(async () => {
    setCart(await getCart());
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, add, update, remove, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
