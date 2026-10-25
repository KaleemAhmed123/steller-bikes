'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { offerLabel } from '@/lib/offers';
import type { AdminCategory, AdminOfferType } from '@/lib/types';

// The operational config for the shop (owner-only). Two parts share the one
// settings document: payment toggles + storefront announcement, and the category
// list, plus the offer types (Diwali, New Year…) products can be tagged with. Shop-facing identity (address/phone/hours) lives on the Settings tab.
type Config = { codEnabled: boolean; onlinePaymentEnabled: boolean; announcement: string };

export default function AdminPlatform() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [catError, setCatError] = useState('');
  const [offers, setOffers] = useState<AdminOfferType[]>([]);
  const [newOffer, setNewOffer] = useState('');
  const [offerError, setOfferError] = useState('');

  useEffect(() => {
    adminApi.settings
      .get()
      .then((d) =>
        setCfg({
          codEnabled: d.codEnabled ?? true,
          onlinePaymentEnabled: d.onlinePaymentEnabled ?? true,
          announcement: d.announcement ?? '',
        }),
      )
      .catch((e: Error) => setError(e.message));
    adminApi.categories.list().then(setCats).catch(() => undefined);
    adminApi.offerTypes.list().then(setOffers).catch(() => undefined);
  }, []);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const saved = await adminApi.settings.update(cfg);
      setCfg({
        codEnabled: saved.codEnabled,
        onlinePaymentEnabled: saved.onlinePaymentEnabled,
        announcement: saved.announcement,
      });
      setMessage('Platform settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function addCat(e: React.FormEvent) {
    e.preventDefault();
    const name = newCat.trim();
    if (!name) return;
    setCatError('');
    try {
      setCats(await adminApi.categories.add(name));
      setNewCat('');
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Could not add category.');
    }
  }

  async function renameCat(name: string) {
    const to = prompt(`Rename “${name}” to:`, name);
    if (to === null) return; // cancelled
    const trimmed = to.trim();
    if (!trimmed || trimmed === name) return;
    setCatError('');
    try {
      setCats(await adminApi.categories.rename(name, trimmed));
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Could not rename category.');
    }
  }

  // Delete is guarded: a category still used by products can't go (block + count).
  // For a deletable one, a confirm popup guards against an accidental click.
  async function removeCat(c: AdminCategory) {
    if (c.count > 0) {
      setCatError(`${c.count} product${c.count === 1 ? '' : 's'} still use “${c.name}”. Reassign them first.`);
      return;
    }
    if (!confirm(`Delete category “${c.name}”? This cannot be undone.`)) return;
    setCatError('');
    try {
      setCats(await adminApi.categories.remove(c.name));
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Could not delete category.');
    }
  }

  async function addOffer(e: React.FormEvent) {
    e.preventDefault();
    const name = newOffer.trim();
    if (!name) return;
    setOfferError('');
    try {
      setOffers(await adminApi.offerTypes.add(name));
      setNewOffer('');
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'Could not add offer type.');
    }
  }

  // Same guard as categories: a type still on products can't be deleted.
  async function removeOffer(o: AdminOfferType) {
    if (o.count > 0) {
      setOfferError(`${o.count} product${o.count === 1 ? '' : 's'} still use “${offerLabel(o.key)}”. Untag them first.`);
      return;
    }
    if (!confirm(`Delete offer type “${offerLabel(o.key)}”? This cannot be undone.`)) return;
    setOfferError('');
    try {
      setOffers(await adminApi.offerTypes.remove(o.key));
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'Could not delete offer type.');
    }
  }

  if (error && !cfg) return <div className="notice error">{error}</div>;
  if (!cfg) return <p className="muted">Loading…</p>;

  const set = <K extends keyof Config>(key: K, value: Config[K]) => setCfg((c) => ({ ...(c as Config), [key]: value }));

  return (
    <div>
      <h1 className="admin-h1">Platform</h1>
      <p className="muted">Operational switches and the category list. Shop address/phone/hours live under Settings.</p>

      <form className="admin-form" onSubmit={saveConfig}>
        <h2 className="admin-h2">Payments</h2>
        <label className="admin-check">
          <input type="checkbox" checked={cfg.codEnabled} onChange={(e) => set('codEnabled', e.target.checked)} />
          <span>Cash on delivery</span>
        </label>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={cfg.onlinePaymentEnabled}
            onChange={(e) => set('onlinePaymentEnabled', e.target.checked)}
          />
          <span>Online payment (UPI / card / netbanking)</span>
        </label>
        <p className="muted">
          Keep at least one on. Online payment also needs Razorpay keys set on the server (see the playbook).
        </p>

        <h2 className="admin-h2">Storefront announcement</h2>
        <label className="field">
          <span>Banner text (leave blank to hide the banner)</span>
          <input
            value={cfg.announcement}
            placeholder="e.g. Diwali sale — free local delivery this week!"
            maxLength={300}
            onChange={(e) => set('announcement', e.target.value)}
          />
        </label>

        {message && <div className="notice">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        <div className="admin-actions" style={{ marginTop: 16 }}>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save platform settings'}
          </button>
        </div>
      </form>

      <h2 className="admin-h2" style={{ marginTop: 32 }}>
        Categories
      </h2>
      <p className="muted">
        These fill the product form’s category dropdown. A category in use by products can’t be deleted — rename it, or
        reassign those products first.
      </p>

      <form className="admin-filters" onSubmit={addCat}>
        <input placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
        <button type="submit" className="btn-secondary" disabled={!newCat.trim()}>
          Add category
        </button>
      </form>

      {catError && <div className="notice error">{catError}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Products</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td>{c.count}</td>
                <td className="admin-row-actions">
                  <button type="button" className="link-btn" onClick={() => renameCat(c.name)}>
                    Rename
                  </button>
                  <button type="button" className="link-btn danger" onClick={() => removeCat(c)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cats.length === 0 && <div className="empty">No categories yet. Add one above.</div>}

      <h2 className="admin-h2" style={{ marginTop: 32 }}>
        Offer types
      </h2>
      <p className="muted">
        Tag products with these (Diwali, New Year…) in the product form. Shoppers can filter by them on the shop page, and
        the homepage offer rail (Site content) shows the ones you choose. A type still on products can’t be deleted.
      </p>

      <form className="admin-filters" onSubmit={addOffer}>
        <input placeholder="New offer type, e.g. Diwali" value={newOffer} onChange={(e) => setNewOffer(e.target.value)} />
        <button type="submit" className="btn-secondary" disabled={!newOffer.trim()}>
          Add offer type
        </button>
      </form>

      {offerError && <div className="notice error">{offerError}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Offer type</th>
              <th>Key</th>
              <th>Products</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.key}>
                <td>{offerLabel(o.key)}</td>
                <td>
                  <code>{o.key}</code>
                </td>
                <td>{o.count}</td>
                <td className="admin-row-actions">
                  <button type="button" className="link-btn danger" onClick={() => removeOffer(o)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {offers.length === 0 && <div className="empty">No offer types yet. Add one above.</div>}
    </div>
  );
}
