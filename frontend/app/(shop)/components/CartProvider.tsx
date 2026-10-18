'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { addToCart, getCart, removeCartItem, updateCartItem } from '@/lib/api';
import type { CartView } from '@/lib/types';

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
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getCart()
      .then(setCart)
      .catch(() => setCart(null))
      .finally(() => setLoading(false));
  }, []);

  const flashToast = useCallback(() => {
    setToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 2500);
  }, []);

  const add = useCallback(
    async (variantId: string, quantity = 1) => {
      setCart(await addToCart(variantId, quantity));
      flashToast();
    },
    [flashToast],
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
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        Added to cart <span className="toast-accent">✓</span>
      </div>
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
