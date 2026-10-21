'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi, money } from '@/lib/api';
import type { OrderDetail } from '@/lib/types';
import { Notes } from '../../components/Notes';
import { StatusDot } from '../../components/StatusDot';

// Friendly label for a status option in the change dropdown.
function statusLabel(s: string): string {
  if (s === 'cancelled') return 'Cancel order (restock)';
  return `Mark ${s.replace('_', ' ')}`;
}

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState('');
  const [target, setTarget] = useState(''); // chosen next status in the dropdown

  const load = useCallback(() => {
    adminApi
      .order(id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyStatus() {
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      const fresh = await adminApi.transition(id, target, tracking);
      setData(fresh);
      setTracking('');
      setTarget('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <div className="notice error">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  const o = data.order;
  const needsTracking = target === 'shipped'; // backend requires a tracking ref to ship

  return (
    <div>
      <Link href="/admin/orders" className="back-link">
        ← Orders
      </Link>
      <h1 className="admin-h1">Order {o._id.slice(-8).toUpperCase()}</h1>

      <div className="admin-cols">
        <div className="admin-card">
          <h2 className="admin-h2">Items</h2>
          <div className="admin-table-wrap">
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
          </div>
          <p className="order-total-line">
            <strong>Total {money(o.total)}</strong> · {o.method.toUpperCase()} ·{' '}
            <span className="status-pill"><StatusDot status={o.paymentStatus} />{o.paymentStatus.replace('_', ' ')}</span>
          </p>
        </div>

        <div className="admin-card">
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

      <div className="admin-card" style={{ marginTop: 16 }}>
        <h2 className="admin-h2">
          Status <span className="status-pill"><StatusDot status={o.fulfillmentStatus} />{o.fulfillmentStatus.replace('_', ' ')}</span>
        </h2>
        {error && <div className="notice error">{error}</div>}

        {data.nextStates.length === 0 ? (
          <p className="muted">No further actions — this order is in a final state.</p>
        ) : (
          <>
            <div className="status-change">
              <label className="field">
                <span>Change status to</span>
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Choose a status…</option>
                  {data.nextStates.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>

              {needsTracking && (
                <label className="field">
                  <span>Tracking reference (required to ship)</span>
                  <input value={tracking} onChange={(e) => setTracking(e.target.value)} />
                </label>
              )}

              <button
                type="button"
                className="btn-primary"
                disabled={busy || !target || (needsTracking && !tracking.trim())}
                onClick={applyStatus}
              >
                {busy ? 'Updating…' : 'Update status'}
              </button>
            </div>
          </>
        )}
      </div>

      <Notes type="order" refId={o._id} />
    </div>
  );
}
