import { useState } from 'react';
import { adminApi } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';

// What every Shop info tab does when its Save is pressed: send just its own fields, then
// report success or the server's message. One copy here, so the three tabs stay thin.
export function useSave(onSaved: (saved: StoreSettings) => void) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(patch: Partial<StoreSettings>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      onSaved(await adminApi.settings.update(patch));
      setMessage('Saved. The shop shows it on the next page load.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, error, save };
}
