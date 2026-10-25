'use client';

import { useState } from 'react';
import { adminApi, money } from '@/lib/api';
import type { AdvancePayment, OrderDetail } from '@/lib/types';
import { StatusDot } from './StatusDot';

const LABEL: Record<AdvancePayment['status'], string> = {
  created: 'awaiting payment',
  paid: 'paid',
  cancelled: 'cancelled',
  expired: 'expired',
};

// Advance-payment requests on an order. The agent calls the customer, agrees an amount
// (usually the Delhivery delivery charge), raises a Razorpay Payment Link here, and the
// customer pays it from their order page. Statuses update by themselves (Razorpay webhook);
// "Check with Razorpay" is the manual safety net.
export function AdvancePaymentCard({
  detail,
  onChange,
}: {
  detail: OrderDetail;
  onChange: (next: OrderDetail) => void;
}) {
  const o = detail.order;
  const rows = [...(o.advancePayments ?? [])].reverse(); // newest first
  const open = rows.find((a) => a.status === 'created');
  const received = rows.filter((a) => a.status === 'paid').reduce((sum, a) => sum + a.amount, 0);

  const [rupees, setRupees] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  async function run(label: string, fn: () => Promise<OrderDetail>) {
    setBusy(label);
    setError('');
    try {
      onChange(await fn());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work. Try again.');
      return false;
    } finally {
      setBusy('');
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const paise = Math.round(Number(rupees) * 100);
    if (!Number.isFinite(paise) || paise < 100) {
      setError('Enter an amount of at least ₹1.');
      return;
    }
    if (await run('create', () => adminApi.advance.create(o._id, paise, note.trim()))) {
      setRupees('');
      setNote('');
    }
  }

  async function copy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Could not copy automatically — select the link and copy it by hand.');
    }
  }

  return (
    <div className="admin-card" style={{ marginTop: 16 }}>
      <h2 className="admin-h2">Advance payment</h2>
      <p className="muted">
        Call the customer, agree the amount (e.g. the Delhivery delivery charge), then generate a link. It appears
        under their order, where they can pay it. Paid links show up here automatically.
        {received > 0 && (
          <>
            {' '}
            <strong>Received so far: {money(received)}.</strong>
          </>
        )}
      </p>
      {error && <div className="notice error">{error}</div>}

      {rows.length > 0 && (
        <ul className="admin-advance-list">
          {rows.map((a) => (
            <li key={a._id} className="admin-advance-row">
              <div className="admin-advance-main">
                <strong>{money(a.amount)}</strong>
                <span className="status-pill">
                  <StatusDot status={a.status === 'created' ? 'pending' : a.status} />
                  {LABEL[a.status]}
                </span>
                <span className="muted">
                  {new Date(a.createdAt).toLocaleDateString('en-IN')}
                  {a.createdBy && <> · {a.createdBy}</>}
                  {a.note && <> · {a.note}</>}
                  {a.paymentId && <> · {a.paymentId}</>}
                </span>
              </div>
              {a.status === 'created' && (
                <div className="admin-advance-actions">
                  <input readOnly aria-label="Payment link" value={a.shortUrl} onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" className="btn-secondary" onClick={() => copy(a.shortUrl, a._id)}>
                    {copied === a._id ? 'Copied ✓' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!!busy}
                    onClick={() => run('refresh', () => adminApi.advance.refresh(o._id, a._id))}
                  >
                    {busy === 'refresh' ? 'Checking…' : 'Check with Razorpay'}
                  </button>
                  <button
                    type="button"
                    className="link-btn danger"
                    disabled={!!busy}
                    onClick={() => {
                      if (window.confirm('Cancel this payment link? The customer will no longer be able to pay it.'))
                        void run('cancel', () => adminApi.advance.cancel(o._id, a._id));
                    }}
                  >
                    Cancel link
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!detail.advanceEnabled ? (
        <p className="notice">
          Payment links aren’t switched on yet — they need the Razorpay keys on the server (see the playbook).
        </p>
      ) : o.fulfillmentStatus === 'cancelled' ? (
        <p className="muted">This order is cancelled, so no new payment link can be raised.</p>
      ) : open ? (
        <p className="muted">Cancel the open link above before raising a new one.</p>
      ) : (
        <form className="admin-advance-form" onSubmit={create}>
          <label className="field">
            <span>Amount ₹</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={100000}
              step="0.01"
              required
              value={rupees}
              onChange={(e) => setRupees(e.target.value)}
            />
          </label>
          <label className="field admin-advance-note">
            <span>Note the customer will see (optional)</span>
            <input
              maxLength={140}
              placeholder="e.g. Delivery charge to Lucknow via Delhivery"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={!!busy}>
            {busy === 'create' ? 'Generating…' : 'Generate payment link'}
          </button>
        </form>
      )}
    </div>
  );
}
