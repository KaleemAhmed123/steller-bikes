'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Wishlist = a per-browser convenience ONLY. There is no wishlist backend, so
// this persists to localStorage on this device and is not tied to an account.
// Documented as a frontend-only feature (see build-step-1.md). No invented API.

const KEY = 'rc_wishlist_v1';

interface WishlistValue {
  slugs: Set<string>;
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  count: number;
  ready: boolean;
}

const Ctx = createContext<WishlistValue | null>(null);

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [slugs, setSlugs] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSlugs(new Set(read()));
    setReady(true);
  }, []);

  const toggle = useCallback((slug: string) => {
    setSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* private mode / blocked storage — wishlist just won't persist */
      }
      return next;
    });
  }, []);

  const has = useCallback((slug: string) => slugs.has(slug), [slugs]);

  return (
    <Ctx.Provider value={{ slugs, has, toggle, count: slugs.size, ready }}>{children}</Ctx.Provider>
  );
}

export function useWishlist(): WishlistValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}
