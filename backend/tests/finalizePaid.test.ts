import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import mongoose from 'mongoose';
import { ProductModel } from '../src/models/product.js';
import { CartModel } from '../src/models/cart.js';
import { OrderModel } from '../src/models/order.js';
import { InventoryMovementModel } from '../src/models/inventoryMovement.js';
import { finalizePaidOrder } from '../src/lib/checkout.js';

// finalizePaidOrder is the money path AFTER a payment is verified. It must never
// drop a payment: a clean match places a paid order; anything else (amount
// mismatch, cart unusable, sold out) is recorded as refund_required. Needs a
// replica-set db (transactions) → runs against Atlas in its own db, skipped
// without MONGODB_URI. Run: npm test.
try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to real env vars
}
const uri = process.env.MONGODB_URI;

// A pincode OUTSIDE Kanpur (Lucknow) so these tests keep paying exactly the item price; the Kanpur
// flat delivery fee has its own tests in checkoutDelivery.test.ts.
const address = { name: 'Test', phone: '9999999999', line1: '1 St', city: 'Lucknow', state: 'UP', pin: '226001' };
const PRICE = 100000; // paise per unit

// A verified Razorpay payment record for `amount` paise.
const pay = (amount: number) => ({
  provider: 'razorpay' as const,
  razorpayOrderId: 'order_test',
  paymentId: 'pay_test',
  method: 'upi',
  amount,
  paidAt: new Date(),
});

async function seedProduct(stock: number): Promise<string> {
  const product = await ProductModel.create({
    slug: 'test-item',
    name: 'Test Cycle',
    category: 'Test',
    description: 'test',
    image: '/images/mountain-bike.jpg',
    status: 'published',
    variants: [{ sku: 'T-1', size: 'M', color: 'Black', price: PRICE, stock }],
  });
  return String(product.variants[0]._id);
}

if (!uri) {
  test('finalizePaidOrder (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  before(async () => {
    await mongoose.connect(uri, { dbName: 'raju-cycles-test-paid' });
    await OrderModel.createIndexes();
  });

  after(async () => {
    await Promise.all([
      ProductModel.deleteMany({}),
      CartModel.deleteMany({}),
      OrderModel.deleteMany({}),
      InventoryMovementModel.deleteMany({}),
    ]);
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Promise.all([
      ProductModel.deleteMany({}),
      CartModel.deleteMany({}),
      OrderModel.deleteMany({}),
      InventoryMovementModel.deleteMany({}),
    ]);
  });

  test('paid amount matches cart → paid order, stock decremented', async () => {
    const variantId = await seedProduct(5);
    await CartModel.create({ owner: 'guest:ok', items: [{ variantId, quantity: 1 }] });

    const r = await finalizePaidOrder(
      { owner: 'guest:ok', email: 'ok@x.com', address, idempotencyKey: 'order_ok' },
      pay(PRICE),
    );

    assert.equal(r.refundRequired, false);
    const order = await OrderModel.findById(r.orderId).lean();
    assert.equal(order!.paymentStatus, 'paid');
    assert.equal(order!.method, 'razorpay');
    assert.equal(order!.total, PRICE);
    assert.equal(order!.payment?.paymentId, 'pay_test', 'payment record is stored');
    assert.equal(order!.payment?.method, 'upi');
    const product = await ProductModel.findOne({ slug: 'test-item' }).lean();
    assert.equal(product!.variants[0].stock, 4, 'stock decremented 5 - 1');
    assert.equal((await CartModel.findOne({ owner: 'guest:ok' }))!.items.length, 0, 'cart cleared');
  });

  test('paid amount != cart total → refund_required, stock untouched', async () => {
    const variantId = await seedProduct(5);
    await CartModel.create({ owner: 'guest:mismatch', items: [{ variantId, quantity: 1 }] });

    // Customer somehow paid less than the live cart total (e.g. cart changed).
    const r = await finalizePaidOrder(
      { owner: 'guest:mismatch', email: 'm@x.com', address, idempotencyKey: 'order_mismatch' },
      pay(PRICE - 1),
    );

    assert.equal(r.refundRequired, true);
    const order = await OrderModel.findById(r.orderId).lean();
    assert.equal(order!.paymentStatus, 'refund_required');
    const product = await ProductModel.findOne({ slug: 'test-item' }).lean();
    assert.equal(product!.variants[0].stock, 5, 'no stock moved on a refund');
  });

  test('paid but item no longer in stock → refund_required, no oversell', async () => {
    const variantId = await seedProduct(0); // sold out between pay-start and verify
    await CartModel.create({ owner: 'guest:gone', items: [{ variantId, quantity: 1 }] });

    const r = await finalizePaidOrder(
      { owner: 'guest:gone', email: 'g@x.com', address, idempotencyKey: 'order_gone' },
      pay(PRICE),
    );

    assert.equal(r.refundRequired, true);
    const order = await OrderModel.findById(r.orderId).lean();
    assert.equal(order!.paymentStatus, 'refund_required');
    const product = await ProductModel.findOne({ slug: 'test-item' }).lean();
    assert.equal(product!.variants[0].stock, 0, 'stock never goes negative');
  });

  test('same razorpay order verified twice → one order, returned both times', async () => {
    const variantId = await seedProduct(5);
    await CartModel.create({ owner: 'guest:idem', items: [{ variantId, quantity: 1 }] });

    const first = await finalizePaidOrder(
      { owner: 'guest:idem', email: 'i@x.com', address, idempotencyKey: 'order_idem' },
      pay(PRICE),
    );
    const second = await finalizePaidOrder(
      { owner: 'guest:idem', email: 'i@x.com', address, idempotencyKey: 'order_idem' },
      pay(PRICE),
    );

    assert.equal(first.orderId, second.orderId, 'same order id');
    assert.equal(await OrderModel.countDocuments({}), 1, 'no duplicate order');
    const product = await ProductModel.findOne({ slug: 'test-item' }).lean();
    assert.equal(product!.variants[0].stock, 4, 'stock decremented once only');
  });
}
