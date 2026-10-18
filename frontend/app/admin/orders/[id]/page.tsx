'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi, money } from '@/lib/api';
import type { OrderDetail } from '@/lib/types';

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState('');

  const load = useCallback(() => {
    adminApi
      .order(id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function go(status: string) {
    setBusy(true);
    setError('');
    try {
      const fresh = await adminApi.transition(id, status, tracking);
      setData(fresh);
      setTracking('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <div className="notice error">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  const o = data.order;

  return (
    <div>
      <Link href="/admin/orders" className="back-link">
        ← Orders
      </Link>
      <h1 className="admin-h1">Order {o._id.slice(-8).toUpperCase()}</h1>

      <div className="admin-cols">
        <div>
          <h2 className="admin-h2">Items</h2>
          <table className="admin-table">
            <tbody>
              {o.items.map((it) => (
                <tr key={it.variantId}>
                  <td>
                    {it.name} ({it.sku})
                  </td>
                  <td>× {it.quantity}</td>
                  <td>{money(it.price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <strong>Total {money(o.total)}</strong> · {o.method.toUpperCase()} · {o.paymentStatus}
          </p>
        </div>

        <div>
          <h2 className="admin-h2">Delivery</h2>
          <p className="order-address">
            {o.address.name}
            <br />
            {o.address.phone}
            <br />
            {o.address.line1}
            <br />
            {o.address.city}, {o.address.state} — {o.address.pin}
            <br />
            {o.email}
          </p>
          {o.tracking && <p className="muted">Tracking: {o.tracking}</p>}
        </div>
      </div>

      <h2 className="admin-h2">
        Status: <span className="status-pill">{o.fulfillmentStatus}</span>
      </h2>
      {error && <div className="notice error">{error}</div>}

      {data.nextStates.includes('shipped') && (
        <label className="field">
          <span className="field-label">Tracking reference (required to ship)</span>
          <input value={tracking} onChange={(e) => setTracking(e.target.value)} />
        </label>
      )}

      <div className="admin-actions">
        {data.nextStates.length === 0 && <span className="muted">No further actions.</span>}
        {data.nextStates.map((s) => (
          <button key={s} type="button" className="btn-primary" disabled={busy} onClick={() => go(s)}>
            {s === 'cancelled' ? 'Cancel order (restock)' : `Mark ${s.replace('_', ' ')}`}
          </button>
        ))}
      </div>
    </div>
  );
}
