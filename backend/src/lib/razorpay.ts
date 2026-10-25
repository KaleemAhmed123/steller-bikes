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

// --- Payment Links (advance payments) ----------------------------------------
// A Payment Link is a Razorpay-hosted page for ONE amount that we hand to a customer.
// Unlike the checkout popup it doesn't need the customer's browser to stay open, and
// Razorpay keeps its own record of every attempt — which is what makes "money left the
// customer's account but we never heard" recoverable (the webhook / check button).

export interface RazorpayLink {
  id: string; // 'plink_…'
  shortUrl: string;
  status: string; // created | partially_paid | paid | cancelled | expired
  amountPaid: number; // paise
  paymentId?: string;
  method?: string;
}

type RawLink = {
  id?: string;
  short_url?: string;
  status?: string;
  amount_paid?: number;
  payments?: { payment_id?: string; method?: string; status?: string }[] | null;
  error?: { description?: string };
};

function toLink(json: RawLink): RazorpayLink {
  // The payments list only appears once something was paid; take the captured one.
  const ok = json.payments?.find((p) => p.status === 'captured') ?? json.payments?.[0];
  return {
    id: json.id ?? '',
    shortUrl: json.short_url ?? '',
    status: json.status ?? '',
    amountPaid: json.amount_paid ?? 0,
    paymentId: ok?.payment_id,
    method: ok?.method,
  };
}

async function linkCall(path: string, init?: RequestInit): Promise<RazorpayLink> {
  const res = await fetch(`https://api.razorpay.com/v1/payment_links${path}`, {
    ...init,
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
  });
  const json = (await res.json().catch(() => ({}))) as RawLink;
  if (!res.ok || !json.id) throw new Error(json.error?.description ?? 'Razorpay could not complete that request.');
  return toLink(json);
}

export function createPaymentLink(input: {
  amountPaise: number;
  description: string;
  referenceId: string; // our order id — shows up in Razorpay's dashboard for reconciliation
  customer: { name: string; email: string; contact: string };
  callbackUrl: string; // where Razorpay sends the customer back after paying
}): Promise<RazorpayLink> {
  return linkCall('', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      accept_partial: false, // pay the full amount in one go
      description: input.description,
      reference_id: input.referenceId,
      customer: input.customer,
      notify: { sms: false, email: false }, // the agent already spoke to them; the link is on their order page
      reminder_enable: false,
      callback_url: input.callbackUrl,
      callback_method: 'get',
    }),
  });
}

export const fetchPaymentLink = (id: string) => linkCall(`/${encodeURIComponent(id)}`);
export const cancelPaymentLink = (id: string) => linkCall(`/${encodeURIComponent(id)}/cancel`, { method: 'POST' });

// Razorpay signs each webhook body with HMAC-SHA256 using the webhook secret and
// sends it in the X-Razorpay-Signature header. We must hash the EXACT raw bytes
// (not re-serialised JSON) and compare in constant time.
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
