'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../components/CartProvider';
import { useAccount } from '../components/AccountProvider';
import { checkout, money } from '@/lib/api';
import type { SavedAddress } from '@/lib/types';

const EMPTY = { email: '', name: '', phone: '', line1: '', city: '', state: '', pin: '' };

// Copy a saved address into the checkout form shape (keeping the given email).
function fromSaved(a: SavedAddress, email: string): typeof EMPTY {
  return { email, name: a.name, phone: a.phone, line1: a.line1, city: a.city, state: a.state, pin: a.pin };
}

export default function CheckoutPage() {
  const { cart, loading, refresh } = useCart();
  const { customer } = useAccount();
  const router = useRouter();
  // One idempotency key per checkout attempt — reused on retries so a double
  // submit can't create two orders.
  const idempotencyKey = useRef(crypto.randomUUID()).current;

  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const prefilled = useRef(false);

  // When a logged-in customer lands here, prefill their email and default
  // address once (don't clobber anything they start typing).
  useEffect(() => {
    if (!customer || prefilled.current) return;
    prefilled.current = true;
    const def = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];
    setForm(def ? fromSaved(def, customer.email) : { ...EMPTY, email: customer.email });
  }, [customer]);

  const items = cart?.items ?? [];
  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function pickAddress(id: string) {
    const a = customer?.addresses.find((x) => x.id === id);
    if (a) setForm(fromSaved(a, customer!.email));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { orderId } = await checkout({
        email: form.email,
        address: {
          name: form.name,
          phone: form.phone,
          line1: form.line1,
          city: form.city,
          state: form.state,
          pin: form.pin,
        },
        idempotencyKey,
      });
      await refresh();
      router.push(`/order/${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setSubmitting(false);
    }
  }

  if (loading) return <p className="muted cart-status">Loading…</p>;
  if (items.length === 0) {
    return (
      <div className="empty">
        Your cart is empty. <Link href="/shop">Browse cycles →</Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      <div className="checkout-grid">
        <form className="checkout-form" onSubmit={onSubmit}>
          <h3>Delivery details</h3>

          {customer && customer.addresses.length > 0 && (
            <label className="field">
              <span className="field-label">Use a saved address</span>
              <select defaultValue="" onChange={(e) => e.target.value && pickAddress(e.target.value)}>
                <option value="">Choose an address…</option>
                {customer.addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label ? `${a.label} — ` : ''}{a.name}, {a.city} ({a.pin})
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field">
            <span className="field-label">Email</span>
            <input type="email" required value={form.email} onChange={set('email')} />
          </label>
          <label className="field">
            <span className="field-label">Full name</span>
            <input required value={form.name} onChange={set('name')} />
          </label>
          <label className="field">
            <span className="field-label">Phone (10 digits)</span>
            <input required inputMode="numeric" pattern="\d{10}" value={form.phone} onChange={set('phone')} />
          </label>
          <label className="field">
            <span className="field-label">Address</span>
            <input required value={form.line1} onChange={set('line1')} />
          </label>
          <div className="field-row">
            <label className="field">
              <span className="field-label">City</span>
              <input required value={form.city} onChange={set('city')} />
            </label>
            <label className="field">
              <span className="field-label">State</span>
              <input required value={form.state} onChange={set('state')} />
            </label>
            <label className="field">
              <span className="field-label">PIN (6 digits)</span>
              <input required inputMode="numeric" pattern="\d{6}" value={form.pin} onChange={set('pin')} />
            </label>
          </div>

          {error && (
            <div className="notice error">
              {error} <Link href="/cart">Review cart →</Link>
            </div>
          )}

          <button type="submit" className="btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Placing order…' : 'Place order (Cash on Delivery)'}
          </button>
        </form>

        <aside className="checkout-summary">
          <h3>Your order</h3>
          {items.map((line) => (
            <div key={line.variantId} className="summary-line">
              <span>
                {line.name} × {line.quantity}
              </span>
              <span>{money(line.lineTotal ?? 0)}</span>
            </div>
          ))}
          <div className="cart-subtotal">
            <span>Total</span>
            <span>{money(cart?.subtotal ?? 0)}</span>
          </div>
          <p className="muted">Pay cash on delivery</p>
        </aside>
      </div>
    </div>
  );
}
