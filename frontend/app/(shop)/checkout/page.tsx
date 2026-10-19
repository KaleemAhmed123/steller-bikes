'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../components/CartProvider';
import { useAccount } from '../components/AccountProvider';
import {
  checkout,
  createRazorpayOrder,
  verifyRazorpayPayment,
  razorpayEnabled,
  money,
} from '@/lib/api';
import type { Address, SavedAddress } from '@/lib/types';

const EMPTY = { email: '', name: '', phone: '', line1: '', city: '', state: '', pin: '' };

// Load Razorpay's hosted checkout.js once, on demand (no npm dependency). The
// popup it opens is Razorpay's own — card/UPI details never touch our page.
let razorpayScript: Promise<void> | null = null;
function loadRazorpay(): Promise<void> {
  if (typeof window !== 'undefined' && (window as unknown as { Razorpay?: unknown }).Razorpay) {
    return Promise.resolve();
  }
  if (!razorpayScript) {
    razorpayScript = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve();
      s.onerror = () => {
        razorpayScript = null;
        reject(new Error('Could not load the payment window. Check your connection.'));
      };
      document.body.appendChild(s);
    });
  }
  return razorpayScript;
}

// The fields Razorpay hands back to the success handler.
interface RazorpayResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

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
  const [pay, setPay] = useState<'cod' | 'online'>('cod');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const prefilled = useRef(false);
  const online = razorpayEnabled();

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

  function address(): Address {
    return {
      name: form.name,
      phone: form.phone,
      line1: form.line1,
      city: form.city,
      state: form.state,
      pin: form.pin,
    };
  }

  async function payCod() {
    const { orderId } = await checkout({ email: form.email, address: address(), idempotencyKey });
    await refresh();
    router.push(`/order/${orderId}`);
  }

  // Online: create a Razorpay order (server sets the amount), open Razorpay's
  // popup, then verify what it returns on our server. Stock + the paid order are
  // created only after verify succeeds.
  async function payOnline() {
    const { razorpayOrderId, amount, keyId } = await createRazorpayOrder();
    await loadRazorpay();
    const Razorpay = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay;
    const rzp = new Razorpay({
      key: keyId,
      amount,
      currency: 'INR',
      order_id: razorpayOrderId,
      name: 'Stellar Bikes',
      description: 'Order payment',
      prefill: { email: form.email, contact: form.phone, name: form.name },
      theme: { color: '#3d82ff' },
      modal: {
        // Customer closed the popup without paying — let them try again.
        ondismiss: () => setSubmitting(false),
      },
      handler: async (result: RazorpayResult) => {
        try {
          const { orderId } = await verifyRazorpayPayment({
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
            razorpaySignature: result.razorpay_signature,
            email: form.email,
            address: address(),
          });
          await refresh();
          router.push(`/order/${orderId}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Payment verification failed');
          setSubmitting(false);
        }
      },
    });
    rzp.open();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (pay === 'online' && online) {
        await payOnline();
        // Don't clear `submitting` here — the Razorpay popup is now open; the
        // handler/ondismiss resets it.
      } else {
        await payCod();
      }
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

          {online && (
            <fieldset className="pay-methods">
              <legend className="field-label">Payment</legend>
              <label className="pay-option">
                <input type="radio" name="pay" checked={pay === 'cod'} onChange={() => setPay('cod')} />
                <span>Cash on delivery</span>
              </label>
              <label className="pay-option">
                <input type="radio" name="pay" checked={pay === 'online'} onChange={() => setPay('online')} />
                <span>Pay online (UPI / card / netbanking)</span>
              </label>
            </fieldset>
          )}

          {error && (
            <div className="notice error">
              {error} <Link href="/cart">Review cart →</Link>
            </div>
          )}

          <button type="submit" className="btn-primary btn-block" disabled={submitting}>
            {submitting
              ? pay === 'online' && online
                ? 'Opening payment…'
                : 'Placing order…'
              : pay === 'online' && online
                ? 'Pay online'
                : 'Place order (Cash on Delivery)'}
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
          <p className="muted">{pay === 'online' && online ? 'Pay securely online' : 'Pay cash on delivery'}</p>
        </aside>
      </div>
    </div>
  );
}
