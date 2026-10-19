'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getOrder, money } from '@/lib/api';
import type { Order } from '@/lib/types';

// Order confirmation. Fetched in the browser (the guest cookie belongs to the
// backend origin, so only the browser can send it), and scoped to this guest.
export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrder(params.id)
      .then(setOrder)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="muted cart-status">Loading your order…</p>;
  if (error || !order) {
    return (
      <div className="empty">
        {error || 'Order not found.'} <Link href="/">Home →</Link>
      </div>
    );
  }

  const paidOnline = order.method === 'razorpay';
  const needsRefund = order.paymentStatus === 'refund_required';
  const payLabel = needsRefund
    ? 'Paid online — refund due'
    : paidOnline
      ? 'Paid online'
      : 'Cash on delivery';

  return (
    <div className="order-page">
      <div className="order-success">
        <h1>{needsRefund ? 'Payment received' : 'Order confirmed'}</h1>
        <p className="muted">
          Reference <strong>{order._id.slice(-8).toUpperCase()}</strong> · {payLabel}
        </p>
      </div>

      <div className="order-items">
        {order.items.map((it) => (
          <div key={it.variantId} className="summary-line">
            <span>
              {it.name} ({it.sku}) × {it.quantity}
            </span>
            <span>{money(it.price * it.quantity)}</span>
          </div>
        ))}
        <div className="cart-subtotal">
          <span>Total</span>
          <span>{money(order.total)}</span>
        </div>
      </div>

      <p className="muted order-note">
        {needsRefund ? (
          <>
            We received your payment, but an item just went out of stock, so we couldn&apos;t complete
            this order. We&apos;ll refund you in full and contact you on {order.address.phone}.
          </>
        ) : (
          <>
            We&apos;ll contact you on {order.address.phone} to arrange delivery to {order.address.city},{' '}
            {order.address.state} — {order.address.pin}.{paidOnline ? '' : ' Pay cash when it arrives.'}
          </>
        )}
      </p>

      <Link href="/shop" className="btn-primary">
        Continue shopping
      </Link>
    </div>
  );
}
