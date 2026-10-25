'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getOrder, money, syncAdvancePayments } from '@/lib/api';
import type { Order } from '@/lib/types';

// The happy-path fulfillment stages, in order. `delivery_failed` and `cancelled`
// are off-path and handled separately (no timeline).
const STAGES = ['confirmed', 'processing', 'packed', 'shipped', 'delivered'] as const;
const STAGE_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  processing: 'Preparing',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

// The page heading reflects the REAL status, so a returning customer never sees a
// stale "Order confirmed" on a delivered or cancelled order.
function heading(order: Order): { title: string; tone: 'ok' | 'warn' } {
  if (order.paymentStatus === 'refund_required')
    return { title: 'Payment received — refund due', tone: 'warn' };
  switch (order.fulfillmentStatus) {
    case 'cancelled':
      return { title: 'Order cancelled', tone: 'warn' };
    case 'delivery_failed':
      return { title: 'Delivery attempt failed', tone: 'warn' };
    case 'delivered':
      return { title: 'Delivered', tone: 'ok' };
    case 'shipped':
      return { title: 'On its way', tone: 'ok' };
    case 'packed':
      return { title: 'Packed and ready', tone: 'ok' };
    case 'processing':
      return { title: 'Being prepared', tone: 'ok' };
    default:
      return { title: 'Order confirmed', tone: 'ok' };
  }
}

// "razorpay" + "upi" -> "Paid online · UPI". COD -> "Cash on delivery".
function payLabel(order: Order): string {
  if (order.method !== 'razorpay') return 'Cash on delivery';
  const m = order.payment?.method;
  return m ? `Paid online · ${m.toUpperCase()}` : 'Paid online';
}

// Reuse the existing badge tones instead of new per-status styles.
function payBadge(status: string): string {
  if (status === 'paid') return 'badge badge-ok';
  if (status === 'failed' || status === 'refund_required') return 'badge badge-warn';
  return 'badge';
}

// Order confirmation + the permanent order record. Fetched in the browser (the
// guest cookie belongs to the backend origin, so only the browser can send it),
// and scoped to this guest/customer.
export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');

  useEffect(() => {
    getOrder(params.id)
      .then(setOrder)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Razorpay sends the customer back here with ?razorpay_payment_link_status=… after they
  // pay. We never trust that query string — it only tells us to ASK the server, which
  // asks Razorpay what really happened and returns the real order.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('razorpay_payment_link_status')) return;
    syncAdvancePayments(params.id).then(setOrder).catch(() => undefined);
  }, [params.id]);

  async function checkPayment() {
    setChecking(true);
    setCheckError('');
    try {
      setOrder(await syncAdvancePayments(params.id));
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : 'Could not check just now. Please try again in a minute.');
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <div className="order-page">
        <div className="skeleton skeleton-line" style={{ width: 220, height: 32, margin: '20px 0 10px' }} />
        <div className="skeleton skeleton-line short" style={{ marginBottom: 28 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="empty">
        <span className="empty-mark">🔍</span>
        {error || 'Order not found.'} <Link href="/">Home →</Link>
      </div>
    );
  }

  const head = heading(order);
  const cancelled = order.fulfillmentStatus === 'cancelled';
  const failed = order.fulfillmentStatus === 'delivery_failed';
  const needsRefund = order.paymentStatus === 'refund_required';
  const currentStage = STAGES.indexOf(order.fulfillmentStatus as (typeof STAGES)[number]);
  const placed = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="order-page">
      <div className="order-success">
        <h1>{head.title}</h1>
        <p className="muted">
          Order <strong>#{order._id.slice(-8).toUpperCase()}</strong> · placed {placed} · {payLabel(order)}
        </p>
      </div>

      {/* Status timeline — the happy path. Off-path states show a notice instead. */}
      {cancelled || failed ? (
        <div className={`notice ${head.tone === 'warn' ? 'error' : ''} order-status-note`}>
          {cancelled
            ? 'This order was cancelled. If this is unexpected, contact us and we’ll help.'
            : 'We tried to deliver but couldn’t complete it. We’ll contact you to arrange another attempt.'}
        </div>
      ) : (
        <ol className="order-timeline" aria-label="Order status">
          {STAGES.map((stage, i) => {
            const state = i < currentStage ? 'done' : i === currentStage ? 'active' : 'todo';
            return (
              <li key={stage} className={`order-step is-${state}`}>
                <span className="order-step-dot" aria-hidden="true" />
                <span className="order-step-label">{STAGE_LABEL[stage]}</span>
              </li>
            );
          })}
        </ol>
      )}

      {order.tracking && !cancelled && (
        <p className="order-tracking">
          Tracking reference: <strong>{order.tracking}</strong>
        </p>
      )}

      {/* Items + money breakdown */}
      <div className="order-items">
        {order.items.map((it) => (
          <div key={it.variantId} className="summary-line">
            <span>
              {it.name} ({it.sku}) × {it.quantity}
            </span>
            <span>{money(it.price * it.quantity)}</span>
          </div>
        ))}

        <div className="order-totals">
          <div className="order-total-row">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="order-total-row">
              <span>Discount</span>
              <span>−{money(order.discount)}</span>
            </div>
          )}
          <div className="order-total-row">
            <span>Delivery</span>
            <span>{order.shipping > 0 ? money(order.shipping) : 'Agreed with our agent'}</span>
          </div>
          {order.tax > 0 && (
            <div className="order-total-row">
              <span>Tax</span>
              <span>{money(order.tax)}</span>
            </div>
          )}
          <div className="cart-subtotal order-grand-total">
            <span>Total</span>
            <span>{money(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Delivery address + payment facts */}
      <div className="order-facts">
        <div className="order-fact">
          <h3>Delivery to</h3>
          <p>{order.address.name}</p>
          <p className="muted">
            {order.address.line1}, {order.address.city}, {order.address.state} — {order.address.pin}
          </p>
          <p className="muted">{order.address.phone}</p>
        </div>
        <div className="order-fact">
          <h3>Payment</h3>
          <p>{payLabel(order)}</p>
          <p className="muted">
            <span className={payBadge(order.paymentStatus)}>
              {order.paymentStatus.replace('_', ' ')}
            </span>
          </p>
          {order.payment?.paidAt && (
            <p className="muted">
              Paid {new Date(order.payment.paidAt).toLocaleDateString('en-IN')}
            </p>
          )}
        </div>
      </div>

      {/* Advance payment(s) the agent asked for (e.g. the Delhivery delivery charge). */}
      {(order.advancePayments ?? [])
        .filter((a) => a.status === 'created' || a.status === 'paid')
        .map((a) => (
          <div key={a._id} className={`order-advance ${a.status === 'paid' ? 'is-paid' : ''}`}>
            {a.status === 'paid' ? (
              <>
                <h3>Advance payment received ✓</h3>
                <p>
                  We received your advance of <strong>{money(a.amount)}</strong>
                  {a.paidAt && <> on {new Date(a.paidAt).toLocaleDateString('en-IN')}</>}. Thank you!
                </p>
              </>
            ) : (
              <>
                <h3>Advance payment requested: {money(a.amount)}</h3>
                <p className="muted">
                  {a.note || 'Our agent has asked for this advance after speaking with you.'} Pay securely online
                  with UPI, card or net banking.
                </p>
                <div className="order-advance-actions">
                  <a href={a.shortUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                    Pay {money(a.amount)} now
                  </a>
                  <button type="button" className="btn-secondary" onClick={checkPayment} disabled={checking}>
                    {checking ? 'Checking…' : 'I’ve paid — refresh'}
                  </button>
                </div>
                {checkError && <p className="muted">{checkError}</p>}
              </>
            )}
          </div>
        ))}

      <p className="muted order-note">
        {needsRefund
          ? `We received your payment, but an item went out of stock, so we couldn’t complete this order. We’ll refund you in full and contact you on ${order.address.phone}.`
          : `A copy of this order has been emailed to ${order.email}. Questions? Call us and quote your order number.`}
      </p>

      <Link href="/shop" className="btn-primary">
        Continue shopping
      </Link>
    </div>
  );
}
