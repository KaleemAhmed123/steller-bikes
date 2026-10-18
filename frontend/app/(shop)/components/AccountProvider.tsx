'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { accountApi } from '@/lib/api';
import type { Customer } from '@/lib/types';

interface AccountContextValue {
  customer: Customer | null;
  loading: boolean;
  setCustomer: (c: Customer | null) => void;
  refresh: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

// Holds the logged-in customer for the whole storefront so the header link and
// the account/checkout pages stay in sync. Fetches "me" once on load; a 401
// (not signed in) just leaves customer null.
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setCustomer(await accountApi.me());
    } catch {
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <AccountContext.Provider value={{ customer, loading, setCustomer, refresh }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>');
  return ctx;
}
