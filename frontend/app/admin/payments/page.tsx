'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { adminApi, money } from '@/lib/api';
import type { Order, PaymentDetail } from '@/lib/types';
import { Notes } from '../components/Notes';

const STATUSES = ['', 'unpaid', 'pending', 'paid', 'failed', 'refund_required', 'refunded'];
const METHODS = ['', 'cod', 'razorpay'];

// Friendly label for a status action button.
function actionLabel(status: string): string {
  if (status === 'paid') return 'Mark cash collected';
  if (status === 'refunded') return 'Mark refunded';
  return `Mark ${status.replace('_', ' ')}`;
}

export default function AdminPayments() {
  const [rows, setRows] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [openNotes, setOpenNotes] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi.payments
      .list(status, method, q.trim())
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, [status, method, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="admin-h1">Payments</h1>

      <div className="admin-adjust">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replace('_', ' ') : 'All statuses'}
            </option>
          ))}
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m ? m.toUpperCase() : 'All methods'}
            </option>
          ))}
        </select>
        <input placeholder="Search email / phone / payment id" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error && <div className="notice error">{error}</div>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Ref</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <Fragment key={o._id}>
              <tr className="payment-row" onClick={() => setOpenId(o._id)}>
                <td>{o._id.slice(-8).toUpperCase()}</td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td>
                  {o.email}
                  <br />
                  <span className="muted">{o.address.phone}</span>
                </td>
                <td>{money(o.total)}</td>
                <td>{o.method.toUpperCase()}</td>
                <td>
                  <span className={`pay-status pay-${o.paymentStatus}`}>{o.paymentStatus.replace('_', ' ')}</span>
                </td>
                <td>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={(e) => {
                      e.stopPropagation(); // don't also open the detail popup
                      setOpenNotes((cur) => (cur === o._id ? null : o._id));
                    }}
                  >
                    {openNotes === o._id ? 'Hide' : 'Notes'}
                  </button>
                </td>
              </tr>
              {openNotes === o._id && (
                <tr>
                  <td colSpan={7}>
                    {/* A payment is an order → same note thread as the order. */}
                    <Notes type="order" refId={o._id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="empty">No payments match.</div>}

      {openId && (
        <PaymentModal
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}

function PaymentModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.payments
      .get(id)
      .then(setDetail)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function setStatus(status: string) {
    setBusy(true);
    setError('');
    try {
      const fresh = await adminApi.payments.setStatus(id, status);
      setDetail(fresh);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const o = detail?.order;
  const p = o?.payment;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="admin-h2">Payment {id.slice(-8).toUpperCase()}</h2>
          <button type="button" className="link-btn" onClick={onClose}>
            Close
          </button>
        </div>

        {error && <div className="notice error">{error}</div>}
        {!o ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <dl className="pay-detail">
              <dt>Status</dt>
              <dd>
                <span className={`pay-status pay-${o.paymentStatus}`}>{o.paymentStatus.replace('_', ' ')}</span>
              </dd>
              <dt>Method</dt>
              <dd>{o.method.toUpperCase()}{p?.method ? ` · ${p.method}` : ''}</dd>
              <dt>Order total</dt>
              <dd>{money(o.total)}</dd>
              {p?.amount != null && (
                <>
                  <dt>Captured</dt>
                  <dd>{money(p.amount)}</dd>
                </>
              )}
              {p?.paymentId && (
                <>
                  <dt>Payment id</dt>
                  <dd>{p.paymentId}</dd>
                </>
              )}
              {p?.razorpayOrderId && (
                <>
                  <dt>Razorpay order</dt>
                  <dd>{p.razorpayOrderId}</dd>
                </>
              )}
              {p?.paidAt && (
                <>
                  <dt>Paid at</dt>
                  <dd>{new Date(p.paidAt).toLocaleString()}</dd>
                </>
              )}
              <dt>Customer</dt>
              <dd>
                {o.email} · {o.address.phone}
              </dd>
              <dt>Placed</dt>
              <dd>{new Date(o.createdAt).toLocaleString()}</dd>
            </dl>

            <div className="admin-actions">
              {detail!.nextStatuses.length === 0 && <span className="muted">No actions available.</span>}
              {detail!.nextStatuses.map((s) => (
                <button key={s} type="button" className="btn-primary" disabled={busy} onClick={() => setStatus(s)}>
                  {actionLabel(s)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
