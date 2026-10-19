import { config } from '../config.js';
import { logger } from './log.js';

const log = logger('mail');

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

// Send one email. Real send via Resend when RESEND_API_KEY is set; otherwise a
// console mock (dev needs no account). Email is a side-effect — it must NEVER
// throw into the request path (no 500 on a paid order, no orphaned signup). So
// failures are logged and swallowed. One `fetch`, no SDK (ponytail).
export async function sendEmail(msg: EmailMessage): Promise<void> {
  // Never touch the network in tests (no quota spend, no flakiness).
  if (config.NODE_ENV === 'test') return;
  if (!config.RESEND_API_KEY) {
    console.log(
      [
        '',
        '──────────── MOCK EMAIL (dev) ────────────',
        `To:      ${msg.to}`,
        `Subject: ${msg.subject}`,
        '',
        msg.text,
        '──────────────────────────────────────────',
        '',
      ].join('\n'),
    );
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.MAIL_FROM,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string; name?: string };
      log.error('send failed', { to: msg.to, subject: msg.subject, status: res.status, reason: body.message ?? body.name });
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    log.info('sent', { to: msg.to, subject: msg.subject, id: json.id });
  } catch (err) {
    // Network/unexpected — log, never throw.
    log.error('send error', { to: msg.to, subject: msg.subject, message: err instanceof Error ? err.message : String(err) });
  }
}

// --- Order confirmation ------------------------------------------------------

// Format paise (integer) as rupees, e.g. 2499900 -> "₹24,999.00".
function rupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
}

export interface OrderReceipt {
  to: string;
  orderId: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  method: 'cod' | 'razorpay';
}

// Build the order-confirmation email (pure — no I/O, so it's easy to test). The
// wording reflects how the customer pays: cash on delivery vs already paid online.
export function orderConfirmationMessage(r: OrderReceipt): EmailMessage {
  const ref = r.orderId.slice(-8).toUpperCase();
  const paid = r.method === 'razorpay';
  const lines = r.items.map((i) => `  ${i.name} × ${i.quantity} — ${rupees(i.price * i.quantity)}`);
  const payNote = paid
    ? 'Payment received online — your order is confirmed.'
    : 'Pay cash when your order is delivered.';
  return {
    to: r.to,
    subject: `Your Stellar Bikes order ${ref}`,
    text: [
      'Thank you for your order!',
      '',
      `Order reference: ${ref}`,
      '',
      'Items:',
      ...lines,
      '',
      `Total: ${rupees(r.total)}`,
      '',
      payNote,
      '',
      // Deep-linking the specific order would 404 on a cold click (the order page
      // is cookie/session-scoped). Point to the account instead: it lists orders
      // for signed-in customers, and verifying the same email links guest orders.
      `Track your order anytime — sign in at ${config.FRONTEND_ORIGIN}/account`,
      '',
      "We'll be in touch to arrange delivery.",
      '',
      '— Stellar Bikes',
    ].join('\n'),
  };
}

// Compose + send an order confirmation. Fire-and-forget safe (sendEmail never throws).
export function sendOrderConfirmation(r: OrderReceipt): Promise<void> {
  return sendEmail(orderConfirmationMessage(r));
}
