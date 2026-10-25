'use client';

import { useEffect, useState } from 'react';
import { getSettings } from '@/lib/api';

// The live flat Kanpur delivery fee (paise) for client components that show the delivery
// message. Starts at the default so the text never flashes empty, then the owner's value
// replaces it. Display only — the server prices every order itself.
export function useKanpurFee(): number {
  const [fee, setFee] = useState(29900);
  useEffect(() => {
    getSettings()
      .then((s) => setFee(s.kanpurDeliveryFee))
      .catch(() => undefined);
  }, []);
  return fee;
}
