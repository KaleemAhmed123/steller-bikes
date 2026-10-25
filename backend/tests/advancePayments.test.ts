import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { createHmac } from 'node:crypto';
import mongoose from 'mongoose';
import { OrderModel } from '../src/models/order.js';
import { nextAdvanceState, applyLinkSnapshot } from '../src/lib/advancePayments.js';
import { createPaymentLink, verifyWebhookSignature } from '../src/lib/razorpay.js';

// Advance-payment links: the rules for how a link moves (pure), how a Razorpay
// update lands on an order (DB), the webhook signature, and the shape of the one
// request we send Razorpay (fetch is faked — no keys or network needed).

// ---- pure rules -------------------------------------------------------------
const open = { status: 'created', amount: 50000 };

test('an open link becomes paid only when Razorpay says paid AND the full amount arrived', () => {
  const now = new Date('2026-10-26T10:00:00Z');
  assert.deepEqual(
    nextAdvanceState(open, { id: 'plink_1', status: 'paid', amountPaid: 50000, paymentId: 'pay_1', method: 'upi' }, now),
    { status: 'paid', paymentId: 'pay_1', method: 'upi', paidAt: now },
  );
  // Under-paid: Razorpay says paid but less than we asked for — don't mark it paid.
  assert.equal(nextAdvanceState(open, { id: 'plink_1', status: 'paid', amountPaid: 49999 }), null);
  // Still waiting.
  assert.equal(nextAdvanceState(open, { id: 'plink_1', status: 'created', amountPaid: 0 }), null);
});

test('cancelled and expired links are recorded', () => {
  assert.deepEqual(nextAdvanceState(open, { id: 'p', status: 'cancelled', amountPaid: 0 }), { status: 'cancelled' });
  assert.deepEqual(nextAdvanceState(open, { id: 'p', status: 'expired', amountPaid: 0 }), { status: 'expired' });
});

test('a finished link never changes again (no double-count, no un-paying)', () => {
  const paid = { status: 'paid', amount: 50000 };
  assert.equal(nextAdvanceState(paid, { id: 'p', status: 'paid', amountPaid: 50000, paymentId: 'pay_2' }), null);
  assert.equal(nextAdvanceState(paid, { id: 'p', status: 'cancelled', amountPaid: 0 }), null);
  assert.equal(nextAdvanceState({ status: 'cancelled', amount: 1 }, { id: 'p', status: 'paid', amountPaid: 100 }), null);
});

// ---- webhook signature ------------------------------------------------------
test('webhook signature: accepts the real HMAC of the raw body, rejects anything else', () => {
  const secret = 'whsec_test';
  const body = Buffer.from('{"event":"payment_link.paid"}');
  const good = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyWebhookSignature(body, good, secret), true);
  assert.equal(verifyWebhookSignature(body, good, 'other-secret'), false);
  assert.equal(verifyWebhookSignature(Buffer.from('{"event":"x"}'), good, secret), false); // body changed
  assert.equal(verifyWebhookSignature(body, 'short', secret), false);
  assert.equal(verifyWebhookSignature(body, good, ''), false); // no secret configured → always refuse
  assert.equal(verifyWebhookSignature(body, '', secret), false);
});

// ---- the request we send Razorpay ------------------------------------------
test('createPaymentLink sends paise, our order id as reference, and returns the short url', async () => {
  const realFetch = globalThis.fetch;
  let seen: { url: string; init: RequestInit } | undefined;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return new Response(JSON.stringify({ id: 'plink_abc', short_url: 'https://rzp.io/i/abc', status: 'created' }), { status: 200 });
  }) as typeof fetch;
  try {
    const link = await createPaymentLink({
      amountPaise: 250000,
      description: 'Delivery advance',
      referenceId: 'order123',
      customer: { name: 'A', email: 'a@example.com', contact: '9999999999' },
      callbackUrl: 'https://shop.example/order/order123',
    });
    assert.equal(link.id, 'plink_abc');
    assert.equal(link.shortUrl, 'https://rzp.io/i/abc');
    assert.equal(seen?.url, 'https://api.razorpay.com/v1/payment_links');
    const body = JSON.parse(String(seen?.init.body));
    assert.equal(body.amount, 250000);
    assert.equal(body.currency, 'INR');
    assert.equal(body.reference_id, 'order123');
    assert.equal(body.accept_partial, false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('createPaymentLink surfaces Razorpay’s error message', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { description: 'Amount too small' } }), { status: 400 })) as typeof fetch;
  try {
    await assert.rejects(
      createPaymentLink({
        amountPaise: 1,
        description: 'x',
        referenceId: 'o',
        customer: { name: 'A', email: 'a@example.com', contact: '9999999999' },
        callbackUrl: 'https://x.example',
      }),
      /Amount too small/,
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ---- landing a Razorpay update on an order (DB) -----------------------------
try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to real env vars
}
const uri = process.env.MONGODB_URI;
const address = { name: 'T', phone: '9999999999', line1: '1 St', city: 'Lucknow', state: 'UP', pin: '226001' };

async function orderWithLink(status = 'created') {
  const o = await OrderModel.create({
    owner: 'guest:test',
    email: 'buyer@example.com',
    address,
    items: [{ variantId: new mongoose.Types.ObjectId(), name: 'Cycle', sku: 'S', quantity: 1, price: 100000 }],
    subtotal: 100000,
    total: 100000,
    idempotencyKey: `k-${Math.random()}`,
    advancePayments: [{ amount: 50000, status, razorpayLinkId: 'plink_db', shortUrl: 'https://rzp.io/i/db' }],
  });
  return String(o._id);
}

if (!uri) {
  test('advance payments DB (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  before(async () => {
    await mongoose.connect(uri, { dbName: 'stellar-test-advance' });
  });
  after(async () => {
    await OrderModel.deleteMany({});
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    await OrderModel.deleteMany({});
  });

  test('a paid webhook marks the advance paid once; a repeat is ignored', async () => {
    const id = await orderWithLink();
    const snap = { id: 'plink_db', status: 'paid', amountPaid: 50000, paymentId: 'pay_9', method: 'upi' };
    assert.equal((await applyLinkSnapshot(snap))?.status, 'paid');
    assert.equal(await applyLinkSnapshot(snap), null); // webhook retry: nothing changes

    const adv = (await OrderModel.findById(id).lean())?.advancePayments?.[0];
    assert.equal(adv?.status, 'paid');
    assert.equal(adv?.paymentId, 'pay_9');
    assert.ok(adv?.paidAt);
  });

  test('an under-payment leaves the advance open', async () => {
    const id = await orderWithLink();
    assert.equal(await applyLinkSnapshot({ id: 'plink_db', status: 'paid', amountPaid: 100 }), null);
    assert.equal((await OrderModel.findById(id).lean())?.advancePayments?.[0]?.status, 'created');
  });

  test('a cancelled link is recorded, and a later "paid" cannot revive it', async () => {
    const id = await orderWithLink();
    await applyLinkSnapshot({ id: 'plink_db', status: 'cancelled', amountPaid: 0 });
    await applyLinkSnapshot({ id: 'plink_db', status: 'paid', amountPaid: 50000, paymentId: 'pay_late' });
    const adv = (await OrderModel.findById(id).lean())?.advancePayments?.[0];
    assert.equal(adv?.status, 'cancelled');
    assert.equal(adv?.paymentId, undefined);
  });

  test('a link we have never heard of is ignored', async () => {
    await orderWithLink();
    assert.equal(await applyLinkSnapshot({ id: 'plink_unknown', status: 'paid', amountPaid: 50000 }), null);
  });
}
