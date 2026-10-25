'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi, money } from '@/lib/api';
import type { OrderDetail, PaymentDetail } from '@/lib/types';
import { Notes } from '../../components/Notes';
import { StatusDot } from '../../components/StatusDot';
import { AdvancePaymentCard } from '../../components/AdvancePaymentCard';
import { PageSkeleton } from '@/components/PageSkeleton';

// Friendly label for a status option in the change dropdown.
function statusLabel(s: string): string {
  if (s === 'cancelled') return 'Cancel order (restock)';
  return `Mark ${s.replace('_', ' ')}`;
}

// Label for a payment-status option (same moves as the Payments tab).
function paymentLabel(s: string): string {
  if (s === 'paid') return 'Mark paid (cash received)';
  if (s === 'refunded') return 'Mark refunded';
  return `Mark ${s.replace('_', ' ')}`;
}

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState('');
  const [target, setTarget] = useState(''); // chosen next status in the dropdown
  // Payment actions are owner-only (payments.manage): for a manager this stays null
  // and the card is simply not shown — the server is the real gate, not this check.
  const [pay, setPay] = useState<PaymentDetail | null>(null);
  const [payTarget, setPayTarget] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');

  const load = useCallback(() => {
    adminApi
      .order(id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
    adminApi.payments
      .get(id)
      .then(setPay)
      .catch(() => setPay(null));
  }, [load, id]);

  async function applyPayment() {
    if (!payTarget) return;
    setPayBusy(true);
    setPayError('');
    try {
      const fresh = await adminApi.payments.setStatus(id, payTarget);
      setPay(fresh);
      setPayTarget('');
      load(); // the summary line above shows the payment status too
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Could not update the payment.');
    } finally {
      setPayBusy(false);
    }
  }

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
  if (!data) return <PageSkeleton />;

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

      {pay && (
        <div className="admin-card" style={{ marginTop: 16 }}>
          <h2 className="admin-h2">
            Payment{' '}
            <span className="status-pill">
              <StatusDot status={pay.order.paymentStatus} />
              {pay.order.paymentStatus.replace('_', ' ')}
            </span>
          </h2>
          <p className="muted">
            {pay.order.method === 'cod' ? 'Cash on delivery' : 'Paid online'} · {money(pay.order.total)}
            {pay.order.payment?.paymentId && <> · {pay.order.payment.paymentId}</>}
          </p>
          {payError && <div className="notice error">{payError}</div>}
          {pay.nextStatuses.length === 0 ? (
            <p className="muted">No manual payment action is available for this order.</p>
          ) : (
            <div className="status-change">
              <label className="field">
                <span>Change payment to</span>
                <select value={payTarget} onChange={(e) => setPayTarget(e.target.value)}>
                  <option value="">Choose…</option>
                  {pay.nextStatuses.map((st) => (
                    <option key={st} value={st}>
                      {paymentLabel(st)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn-primary" disabled={payBusy || !payTarget} onClick={applyPayment}>
                {payBusy ? 'Updating…' : 'Update payment'}
              </button>
            </div>
          )}
        </div>
      )}

      <AdvancePaymentCard detail={data} onChange={setData} />

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
