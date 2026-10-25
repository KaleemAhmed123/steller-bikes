'use client';

import { useEffect, useState } from 'react';
import { adminApi, EMPTY_SETTINGS as EMPTY } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';

// Only the shop-info (string) fields are editable on this tab.
type ShopKey = { [K in keyof StoreSettings]-?: StoreSettings[K] extends string ? K : never }[keyof StoreSettings];

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

// "208001, 208002\n208003" -> ['208001','208002','208003']; null if anything is not a 6-digit pincode.
function parsePins(text: string): string[] | null {
  const tokens = text.split(/[\s,;]+/).filter(Boolean);
  if (tokens.length === 0 || tokens.some((t) => !/^\d{6}$/.test(t))) return null;
  return [...new Set(tokens)];
}

export default function AdminSettings() {
  const [s, setS] = useState<StoreSettings | null>(null);
  // Delivery rules are edited as text (fee in rupees, pincodes as a list) and converted on save.
  const [feeText, setFeeText] = useState('');
  const [pinText, setPinText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.settings
      .get()
      .then((data) => {
        setS({ ...EMPTY, ...data });
        setFeeText(String((data.kanpurDeliveryFee ?? EMPTY.kanpurDeliveryFee) / 100));
        setPinText((data.kanpurPincodes ?? []).join(', '));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setError('');
    setMessage('');
    const pins = parsePins(pinText);
    const feeRupees = Number(feeText);
    if (!pins) {
      setError('Kanpur pincodes: enter at least one, each exactly 6 digits, separated by commas or spaces.');
      return;
    }
    if (!Number.isFinite(feeRupees) || feeRupees < 0) {
      setError('Delivery fee must be 0 or more rupees.');
      return;
    }
    setBusy(true);
    try {
      // Only this tab's fields — the Platform and Site content tabs own the rest.
      const body = {
        ...Object.fromEntries([...FIELDS.map(([k]) => k), 'deliveryPolicy'].map((k) => [k, s[k as ShopKey]])),
        kanpurPincodes: pins,
        kanpurDeliveryFee: Math.round(feeRupees * 100),
      };
      const saved = await adminApi.settings.update(body);
      setS({ ...EMPTY, ...saved });
      setPinText((saved.kanpurPincodes ?? pins).join(', '));
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

        <h2 className="admin-h2">Delivery charges</h2>
        <p className="muted">
          Inside Kanpur every order pays this flat <strong>Fitted Delivery</strong> fee. Anywhere else nothing is added
          at checkout — our agent agrees the Delhivery charge by phone and sends an advance-payment link on the order.
        </p>
        <div className="admin-form-grid">
          <label className="field">
            <span>Flat fee inside Kanpur (₹, 0 = free)</span>
            <input
              type="number"
              min={0}
              step="1"
              inputMode="numeric"
              value={feeText}
              onChange={(e) => setFeeText(e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>Pincodes that count as “inside Kanpur” ({parsePins(pinText)?.length ?? 0} listed)</span>
          <textarea rows={3} value={pinText} onChange={(e) => setPinText(e.target.value)} />
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
