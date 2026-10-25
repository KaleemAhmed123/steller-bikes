import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
import { OrderModel } from '../src/models/order.js';

// The staff routes that raise / refresh / cancel an advance-payment link, over real
// HTTP with Razorpay's API faked. Test keys go into the environment BEFORE the routes
// (and config) load, hence the dynamic import.
process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
process.env.RAZORPAY_KEY_SECRET = 'secret_x';
try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to real env vars
}
const uri = process.env.MONGODB_URI;

const address = { name: 'Buyer', phone: '9999999999', line1: '1 St', city: 'Lucknow', state: 'UP', pin: '226001' };

type Sent = { url: string; body?: Record<string, unknown> };
const sent: Sent[] = [];
let razorpay: (url: string, body?: Record<string, unknown>) => { status: number; json: unknown } = () => ({ status: 500, json: {} });

// Fake only Razorpay; let the test's own calls to 127.0.0.1 through.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  if (!url.startsWith('https://api.razorpay.com')) return realFetch(input, init);
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
  sent.push({ url, body });
  const r = razorpay(url, body);
  return new Response(JSON.stringify(r.json), { status: r.status });
}) as typeof fetch;

const link = (over: Record<string, unknown> = {}) => ({
  id: 'plink_r1',
  short_url: 'https://rzp.io/i/r1',
  status: 'created',
  amount_paid: 0,
  ...over,
});

if (!uri) {
  test('advance routes (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  let server: Server;
  let base = '';
  let orderId = '';

  before(async () => {
    await mongoose.connect(uri, { dbName: 'stellar-test-advance-routes' });
    const { advanceAdminRouter } = await import('../src/routes/advancePayments.js');
    const app = express();
    app.use(express.json());
    // Stand-in for requireAuth: the staff member comes from a header.
    app.use((req, res, next) => {
      res.locals.staff = { id: 's1', email: String(req.get('x-staff') ?? 'agent@stellarbikes.in'), role: 'manager' };
      next();
    });
    app.use('/orders/:id/advance-payments', advanceAdminRouter);
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: { message: String(err) } });
    });
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    globalThis.fetch = realFetch;
    server.close();
    await OrderModel.deleteMany({});
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    sent.length = 0;
    razorpay = () => ({ status: 200, json: link() });
    await OrderModel.deleteMany({});
    const o = await OrderModel.create({
      owner: 'guest:test',
      email: 'buyer@example.com',
      address,
      items: [{ variantId: new mongoose.Types.ObjectId(), name: 'Cycle', sku: 'S', quantity: 1, price: 100000 }],
      subtotal: 100000,
      total: 100000,
      idempotencyKey: `k-${Math.random()}`,
    });
    orderId = String(o._id);
  });

  const post = (path: string, body?: unknown) =>
    fetch(`${base}/orders/${orderId}/advance-payments${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  const advance = async () => (await OrderModel.findById(orderId).lean())?.advancePayments?.[0];

  test('raising a link stores it on the order, using the SERVER amount and our order id as reference', async () => {
    const res = await post('', { amount: 250000, note: 'Delivery to Lucknow' });
    assert.equal(res.status, 201);
    const adv = await advance();
    assert.equal(adv?.amount, 250000);
    assert.equal(adv?.status, 'created');
    assert.equal(adv?.razorpayLinkId, 'plink_r1');
    assert.equal(adv?.shortUrl, 'https://rzp.io/i/r1');
    assert.equal(adv?.createdBy, 'agent@stellarbikes.in');

    const call = sent[0];
    assert.equal(call.url, 'https://api.razorpay.com/v1/payment_links');
    assert.equal(call.body?.amount, 250000);
    assert.equal(call.body?.reference_id, orderId);
    assert.deepEqual(call.body?.customer, { name: 'Buyer', email: 'buyer@example.com', contact: '9999999999' });

    const detail = ((await res.json()) as { data: { advanceEnabled: boolean } }).data;
    assert.equal(detail.advanceEnabled, true);
  });

  test('only one open link at a time', async () => {
    assert.equal((await post('', { amount: 50000 })).status, 201);
    assert.equal((await post('', { amount: 60000 })).status, 409);
    assert.equal(sent.length, 1); // Razorpay was not asked a second time
  });

  test('bad amounts are refused before Razorpay is contacted', async () => {
    assert.equal((await post('', { amount: 99 })).status, 400); // under ₹1
    assert.equal((await post('', { amount: 10_000_001 })).status, 400); // over the cap
    assert.equal((await post('', { amount: 'lots' })).status, 400);
    assert.equal((await post('', {})).status, 400);
    assert.equal(sent.length, 0);
  });

  test('a cancelled order cannot get a payment link', async () => {
    await OrderModel.updateOne({ _id: orderId }, { fulfillmentStatus: 'cancelled' });
    assert.equal((await post('', { amount: 50000 })).status, 422);
    assert.equal(sent.length, 0);
  });

  test('if Razorpay errors, nothing is stored', async () => {
    razorpay = () => ({ status: 400, json: { error: { description: 'Amount too small' } } });
    assert.equal((await post('', { amount: 50000 })).status, 500);
    assert.equal(await advance(), undefined);
  });

  test('refresh asks Razorpay and records a payment the webhook missed', async () => {
    await post('', { amount: 50000 });
    const adv = await advance();
    razorpay = () => ({
      status: 200,
      json: link({ status: 'paid', amount_paid: 50000, payments: [{ payment_id: 'pay_x', method: 'upi', status: 'captured' }] }),
    });
    assert.equal((await post(`/${adv?._id}/refresh`)).status, 200);
    const after = await advance();
    assert.equal(after?.status, 'paid');
    assert.equal(after?.paymentId, 'pay_x');
  });

  test('cancel withdraws an open link', async () => {
    await post('', { amount: 50000 });
    const adv = await advance();
    razorpay = () => ({ status: 200, json: link({ status: 'cancelled' }) });
    assert.equal((await post(`/${adv?._id}/cancel`)).status, 200);
    assert.equal((await advance())?.status, 'cancelled');
  });

  test('cancelling a link that was paid a moment ago records "paid" instead of failing', async () => {
    await post('', { amount: 50000 });
    const adv = await advance();
    razorpay = (url) =>
      url.endsWith('/cancel')
        ? { status: 400, json: { error: { description: 'Link already paid' } } }
        : { status: 200, json: link({ status: 'paid', amount_paid: 50000, payments: [{ payment_id: 'pay_race', status: 'captured' }] }) };
    assert.equal((await post(`/${adv?._id}/cancel`)).status, 200);
    assert.equal((await advance())?.status, 'paid');
  });

  test('an already-finished link cannot be cancelled again', async () => {
    await post('', { amount: 50000 });
    const adv = await advance();
    await OrderModel.updateOne({ _id: orderId, 'advancePayments._id': adv?._id }, { $set: { 'advancePayments.$.status': 'paid' } });
    assert.equal((await post(`/${adv?._id}/cancel`)).status, 422);
  });
}
