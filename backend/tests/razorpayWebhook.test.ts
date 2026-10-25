import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
import { OrderModel } from '../src/models/order.js';

// The Razorpay webhook over real HTTP: signature gate, raw-body handling, and the
// order actually being updated. The secret must be in the environment BEFORE the
// route (and its config) is first loaded, hence the dynamic import below.
const SECRET = 'whsec_route_test';
process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to real env vars
}
const uri = process.env.MONGODB_URI;

const address = { name: 'T', phone: '9999999999', line1: '1 St', city: 'Lucknow', state: 'UP', pin: '226001' };
const sign = (body: string) => createHmac('sha256', SECRET).update(body).digest('hex');
const paidEvent = (linkId: string, amountPaid = 50000) =>
  JSON.stringify({
    event: 'payment_link.paid',
    payload: {
      payment_link: { entity: { id: linkId, status: 'paid', amount_paid: amountPaid } },
      payment: { entity: { id: 'pay_wh1', method: 'upi' } },
    },
  });

if (!uri) {
  test('razorpay webhook (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  let server: Server;
  let base = '';

  before(async () => {
    await mongoose.connect(uri, { dbName: 'stellar-test-webhook' });
    const { webhooksRouter } = await import('../src/routes/webhooks.js');
    const app = express();
    app.use('/api/webhooks', express.raw({ type: '*/*', limit: '100kb' }), webhooksRouter);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/webhooks/razorpay`;
  });
  after(async () => {
    server.close();
    await OrderModel.deleteMany({});
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    await OrderModel.deleteMany({});
    await OrderModel.create({
      owner: 'guest:test',
      email: 'buyer@example.com',
      address,
      items: [{ variantId: new mongoose.Types.ObjectId(), name: 'Cycle', sku: 'S', quantity: 1, price: 100000 }],
      subtotal: 100000,
      total: 100000,
      idempotencyKey: `k-${Math.random()}`,
      advancePayments: [{ amount: 50000, razorpayLinkId: 'plink_wh', shortUrl: 'https://rzp.io/i/wh' }],
    });
  });

  const status = async () => (await OrderModel.findOne().lean())?.advancePayments?.[0]?.status;
  const post = (body: string, signature?: string) =>
    fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(signature ? { 'X-Razorpay-Signature': signature } : {}) },
      body,
    });

  test('a correctly signed "paid" event marks the advance paid', async () => {
    const body = paidEvent('plink_wh');
    assert.equal((await post(body, sign(body))).status, 200);
    assert.equal(await status(), 'paid');
    const adv = (await OrderModel.findOne().lean())?.advancePayments?.[0];
    assert.equal(adv?.paymentId, 'pay_wh1');
    assert.equal(adv?.method, 'upi');
  });

  test('a retry of the same event is accepted and changes nothing more', async () => {
    const body = paidEvent('plink_wh');
    await post(body, sign(body));
    const before = (await OrderModel.findOne().lean())?.advancePayments?.[0]?.paidAt;
    assert.equal((await post(body, sign(body))).status, 200);
    assert.deepEqual((await OrderModel.findOne().lean())?.advancePayments?.[0]?.paidAt, before);
  });

  test('a wrong or missing signature is refused and nothing changes', async () => {
    const body = paidEvent('plink_wh');
    assert.equal((await post(body, 'deadbeef')).status, 401);
    assert.equal((await post(body)).status, 401);
    assert.equal(await status(), 'created');
  });

  test('a signature for a different body is refused (body tampered after signing)', async () => {
    const signed = sign(paidEvent('plink_wh', 100));
    assert.equal((await post(paidEvent('plink_wh', 50000), signed)).status, 401);
    assert.equal(await status(), 'created');
  });

  test('an under-paid event is accepted (200) but leaves the advance open', async () => {
    const body = paidEvent('plink_wh', 100);
    assert.equal((await post(body, sign(body))).status, 200);
    assert.equal(await status(), 'created');
  });

  test('events we do not handle are acknowledged so Razorpay stops retrying', async () => {
    const body = JSON.stringify({ event: 'payment.authorized', payload: {} });
    assert.equal((await post(body, sign(body))).status, 200);
    assert.equal(await status(), 'created');
  });
}
