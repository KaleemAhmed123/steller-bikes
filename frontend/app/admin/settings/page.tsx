'use client';

import { useEffect, useState } from 'react';
import { adminApi, EMPTY_SETTINGS as EMPTY } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';

// Only the shop-info (string) fields are editable on this tab.
type ShopKey = { [K in keyof StoreSettings]: StoreSettings[K] extends string ? K : never }[keyof StoreSettings];

const FIELDS: [ShopKey, string, string][] = [
  ['addressLine1', 'Address', 'Shop no. 5, Mall Road'],
  ['city', 'City', 'Kanpur'],
  ['state', 'State', 'Uttar Pradesh'],
  ['pin', 'PIN code', '208001'],
  ['phone', 'Phone', '+91 90000 00000'],
  ['whatsapp', 'WhatsApp', '+91 90000 00000'],
  ['hours', 'Opening hours', 'Mon–Sat, 10am–8pm'],
  ['email', 'Email', 'hello@stellarbikes.in'],
];

export default function AdminSettings() {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.settings
      .get()
      .then((data) => setS({ ...EMPTY, ...data }))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      // Only this tab's fields — the Platform and Site content tabs own the rest.
      const body = Object.fromEntries([...FIELDS.map(([k]) => k), 'deliveryPolicy'].map((k) => [k, s[k as ShopKey]]));
      const saved = await adminApi.settings.update(body);
      setS({ ...EMPTY, ...saved });
      setMessage('Settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !s) return <div className="notice error">{error}</div>;
  if (!s) return <p className="muted">Loading…</p>;

  const set = (key: ShopKey, value: string) => setS((cur) => ({ ...(cur ?? EMPTY), [key]: value }));

  return (
    <div>
      <h1 className="admin-h1">Store settings</h1>
      <p className="muted">
        Shown in the storefront showroom + footer. Any field left blank keeps its honest “coming soon”.
      </p>

      <form className="admin-form" onSubmit={save}>
        <div className="admin-form-grid">
          {FIELDS.map(([key, label, placeholder]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input value={s[key]} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} />
            </label>
          ))}
        </div>

        <label className="field">
          <span>Delivery policy</span>
          <textarea
            rows={2}
            value={s.deliveryPolicy}
            placeholder="e.g. Flat Fitted Delivery in Kanpur; elsewhere charged by Delhivery distance."
            onChange={(e) => set('deliveryPolicy', e.target.value)}
          />
        </label>

        {message && <div className="notice">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        <div className="admin-actions" style={{ marginTop: 16 }}>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
