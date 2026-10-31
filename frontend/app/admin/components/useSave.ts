import { useState } from 'react';
import { adminApi } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';

const DEFAULT_SUCCESS = 'Saved. The shop shows it on the next page load.';

// What every settings form does when its Save button is pressed: send just its own fields, hand the
// saved settings back, and report success or the server's message. One copy here, used by the
// Shop info tabs and the Promo strip page. `success` can depend on what was saved.
export function useSave(onSaved: (saved: StoreSettings) => void, success: string | ((saved: StoreSettings) => string) = DEFAULT_SUCCESS) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(patch: Partial<StoreSettings>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const saved = await adminApi.settings.update(patch);
      onSaved(saved);
      setMessage(typeof success === 'function' ? success(saved) : success);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, error, save };
}
