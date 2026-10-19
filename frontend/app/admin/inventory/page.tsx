'use client';

import { Fragment, useEffect, useState } from 'react';
import { adminApi, money } from '@/lib/api';
import type { InventoryData } from '@/lib/types';
import { Notes } from '../components/Notes';

export default function AdminInventory() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ variantId: '', delta: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [openNotes, setOpenNotes] = useState<string | null>(null); // variantId whose notes are open

  useEffect(() => {
    adminApi.inventory().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const fresh = await adminApi.adjust(form.variantId, Number(form.delta), form.reason.trim());
      setData(fresh);
      setMessage('Stock updated.');
      setForm({ variantId: '', delta: '', reason: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adjustment failed');
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <div className="notice error">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1 className="admin-h1">Inventory</h1>

      <form className="admin-adjust" onSubmit={adjust}>
        <select
          required
          value={form.variantId}
          onChange={(e) => setForm((f) => ({ ...f, variantId: e.target.value }))}
        >
          <option value="">Choose a variant…</option>
          {data.variants.map((v) => (
            <option key={v.variantId} value={v.variantId}>
              {v.productName} — {v.size}/{v.color} ({v.sku}) · stock {v.stock}
            </option>
          ))}
        </select>
        <input
          type="number"
          required
          placeholder="Δ e.g. 5 or -2"
          value={form.delta}
          onChange={(e) => setForm((f) => ({ ...f, delta: e.target.value }))}
        />
        <input
          required
          placeholder="Reason (e.g. new stock, damaged)"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
        />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Adjust'}
        </button>
      </form>
      {message && <div className="notice">{message}</div>}
      {error && data && <div className="notice error">{error}</div>}

      <h2 className="admin-h2">Variants</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Low at</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.variants.map((v) => (
            <Fragment key={v.variantId}>
              <tr className={v.stock <= v.lowStock ? 'row-low' : ''}>
                <td>
                  {v.productName} ({v.size}/{v.color})
                </td>
                <td>{v.sku}</td>
                <td>{money(v.price)}</td>
                <td>{v.stock}</td>
                <td>{v.lowStock}</td>
                <td>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setOpenNotes((cur) => (cur === v.variantId ? null : v.variantId))}
                  >
                    {openNotes === v.variantId ? 'Hide' : 'Notes'}
                  </button>
                </td>
              </tr>
              {openNotes === v.variantId && (
                <tr>
                  <td colSpan={6}>
                    <Notes type="inventory" refId={v.variantId} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <h2 className="admin-h2">Recent stock movements</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Reason</th>
            <th>By</th>
            <th>Before → After</th>
          </tr>
        </thead>
        <tbody>
          {data.movements.map((m) => (
            <tr key={m._id}>
              <td>{new Date(m.createdAt).toLocaleString()}</td>
              <td>{m.reason}</td>
              <td>{m.actor}</td>
              <td>
                {m.before} → {m.after}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.movements.length === 0 && <div className="empty">No stock movements yet.</div>}
    </div>
  );
}
