'use client';

import { createContext, useContext, useState } from 'react';

// The product page's gallery (left) and buy panel (right) are separate client
// islands that must agree on WHICH variant is selected. This tiny context is the
// one place that holds it: picking a colour/size in the buy panel swaps the gallery.
const Ctx = createContext<{ variantId: string; setVariantId: (id: string) => void } | null>(null);

export function VariantSelection({ initialId, children }: { initialId: string; children: React.ReactNode }) {
  const [variantId, setVariantId] = useState(initialId);
  return <Ctx.Provider value={{ variantId, setVariantId }}>{children}</Ctx.Provider>;
}

export function useVariantSelection() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useVariantSelection must be used inside <VariantSelection>.');
  return ctx;
}
