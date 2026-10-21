import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

// Razorpay integration with zero SDK: creating an order is one authenticated
// POST, and verifying a payment is one HMAC compare. A dependency can't earn
// its place here. Money is paise throughout (Razorpay's smallest-unit = paise
// for INR), which matches how the rest of the app stores money.

export interface RazorpayOrder {
  id: string; // e.g. "order_EKwxwAgItmmXdp"
  amount: number; // paise
  currency: string;
}

export interface RazorpayPayment {
  id: string; // e.g. "pay_H9oR0gLCaVlV6m"
  orderId: string; // the Razorpay order this payment belongs to
  amount: number; // paise actually paid
  status: string; // 'created' | 'authorized' | 'captured' | 'failed' | 'refunded'
  captured: boolean; // money actually collected
  method: string; // 'upi' | 'card' | 'netbanking' | 'wallet' | …
  createdAt: number; // unix seconds the payment was made
}

// Basic auth header for Razorpay's REST API (key_id:key_secret, base64).
function authHeader(): string {
  const raw = `${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

// Online pay is OFF until both keys are set — mirrors the Cloudinary pattern,
// so the shop runs fine on COD alone with no Razorpay account.
export function razorpayConfigured(): boolean {
  return Boolean(config.RAZORPAY_KEY_ID && config.RAZORPAY_KEY_SECRET);
}

// The key id is public (the browser's checkout.js needs it); the secret never
// leaves the server.
export function razorpayKeyId(): string {
  return config.RAZORPAY_KEY_ID;
}

// Create a payment order on Razorpay for the given amount (paise). `receipt` is
// our own reference for reconciliation. Throws on a non-2xx so the caller can
// return a clear checkout error.
//
// payment_capture:true makes Razorpay capture (actually collect) an approved
// payment automatically, instead of leaving it merely 'authorized' (funds held,
// not taken). We set it PER ORDER so capture never depends on the dashboard's
// account-level auto-capture toggle being on — a mis-set toggle would otherwise
// strand customers' funds with no sale recorded. See docs/specs for the webhook
// debt this pairs with.
export async function createRazorpayOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, payment_capture: true }),
  });
  const json = (await res.json().catch(() => ({}))) as Partial<RazorpayOrder> & {
    error?: { description?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.description ?? 'Could not start the online payment. Please try again.');
  }
  return { id: json.id, amount: json.amount ?? amountPaise, currency: json.currency ?? 'INR' };
}

// Fetch a payment straight from Razorpay to confirm, server-side, what actually
// happened — not just what the browser claims. The signature proves the payload
// is authentic; this proves the money was captured and for how much.
export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
  });
  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    order_id?: string;
    amount?: number;
    status?: string;
    captured?: boolean;
    method?: string;
    created_at?: number;
    error?: { description?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.description ?? 'Could not confirm the payment.');
  }
  return {
    id: json.id,
    orderId: json.order_id ?? '',
    amount: json.amount ?? 0,
    status: json.status ?? '',
    captured: Boolean(json.captured),
    method: json.method ?? '',
    createdAt: json.created_at ?? 0,
  };
}

// Verify the signature Razorpay's checkout hands back to the browser. The
// browser cannot forge this: it is HMAC-SHA256(order_id|payment_id) keyed by our
// secret. timingSafeEqual avoids leaking the answer through response timing.
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac('sha256', config.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
