'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../components/CartProvider';
import { useToast } from '../components/ToastProvider';
import { DeliveryInfo } from '../components/DeliveryInfo';
import { useKanpurFee } from '../components/useKanpurFee';
import { money } from '@/lib/api';
import { safeSrc, imgError } from '@/lib/img';

// The cart page: live lines, quantity steppers, remove, subtotal, and checkout.
export default function CartPage() {
  const { cart, loading, update, remove } = useCart();
  const { show } = useToast();
  const kanpurFee = useKanpurFee();
  // Variant ids with a request in flight — locks that line's buttons so rapid
  // clicks can't race (out-of-order responses used to leave the wrong quantity).
  const [pending, setPending] = useState<Set<string>>(new Set());

  async function run(variantId: string, action: () => Promise<void>) {
    if (pending.has(variantId)) return;
    setPending((p) => new Set(p).add(variantId));
    try {
      await action();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not update the cart.', 'error');
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(variantId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="cart-page">
        <div className="skeleton skeleton-line" style={{ width: 160, height: 24, margin: '20px 0 24px' }} />
        {[0, 1].map((i) => (
          <div className="cart-line" key={i}>
            <div className="skeleton cart-thumb" />
            <div className="cart-line-info">
              <div className="skeleton skeleton-line" style={{ width: '50%' }} />
              <div className="skeleton skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = cart?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="cart-page">
        <h1>Your cart</h1>
        <div className="empty empty-cart">
          <span className="empty-mark">🛒</span>
          <p className="empty-title">Your cart is empty</p>
          <p className="muted">
            Browse the range and add a cycle — it’ll show up here, ready to check out.
          </p>
          <Link href="/shop" className="btn-primary empty-cta">
            Browse cycles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Your cart</h1>

      <div className="cart-lines">
        {items.map((line) => (
          <div key={line.variantId} className="cart-line">
            {line.available ? (
              <>
                {/* ponytail: small fixed thumb, few per page — raw img is fine; convert to next/image if cart LCP ever matters. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="cart-thumb" src={safeSrc(line.image)} alt={line.name ?? ''} onError={imgError} />
                <div className="cart-line-info">
                  <Link href={`/p/${line.slug}`} className="cart-line-name">
                    {line.name}
                  </Link>
                  <span className="muted">
                    {line.size} · {line.color}
                  </span>
                  {line.inStock === false && (
                    <span className="add-feedback err">
                      Only {line.stock} in stock — reduce the quantity
                    </span>
                  )}
                </div>

                <div className="qty-stepper">
                  <button
                    type="button"
                    disabled={pending.has(line.variantId) || line.quantity <= 1}
                    onClick={() => run(line.variantId, () => update(line.variantId, line.quantity - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    type="button"
                    disabled={pending.has(line.variantId)}
                    onClick={() => run(line.variantId, () => update(line.variantId, line.quantity + 1))}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <span className="cart-line-total">{money(line.lineTotal ?? 0)}</span>
              </>
            ) : (
              <div className="cart-line-info">
                <span className="cart-line-name">This item is no longer available</span>
              </div>
            )}

            <button
              type="button"
              className="cart-remove"
              disabled={pending.has(line.variantId)}
              onClick={() => run(line.variantId, () => remove(line.variantId))}
              aria-label="Remove item"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-subtotal">
          <span>Subtotal</span>
          <span>{money(cart?.subtotal ?? 0)}</span>
        </div>
        <p className="muted">Delivery charges are added at checkout, based on your pincode.</p>
        <DeliveryInfo fee={kanpurFee} />
        <Link href="/checkout" className="btn-primary btn-block">
          Proceed to checkout
        </Link>
      </div>
    </div>
  );
}
