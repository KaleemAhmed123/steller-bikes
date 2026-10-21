'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

// One shared toast for the whole storefront. Replaces the cart's old private
// toast so EVERY action — not just add-to-cart — can give feedback, including
// failures (the audit found several silent-failure paths). Success is announced
// politely; errors assertively. Auto-dismisses; errors linger a little longer.
type Variant = 'success' | 'error';

interface ToastValue {
  show: (message: string, variant?: Variant) => void;
}

const Ctx = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('');
  const [variant, setVariant] = useState<Variant>('success');
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, v: Variant = 'success') => {
    setMsg(message);
    setVariant(v);
    setShown(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), v === 'error' ? 4500 : 2500);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div
        className={`toast ${variant === 'error' ? 'is-error' : ''} ${shown ? 'show' : ''}`}
        role={variant === 'error' ? 'alert' : 'status'}
        aria-live={variant === 'error' ? 'assertive' : 'polite'}
      >
        {msg}
        {variant === 'success' && <span className="toast-accent"> ✓</span>}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
