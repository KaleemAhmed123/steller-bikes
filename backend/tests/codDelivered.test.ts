import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import mongoose from 'mongoose';
import { ProductModel } from '../src/models/product.js';
import { OrderModel } from '../src/models/order.js';
import { InventoryMovementModel } from '../src/models/inventoryMovement.js';
import { transitionOrder } from '../src/lib/fulfillment.js';

// Owner rule: when a Cash-on-Delivery order is marked DELIVERED, the cash was
// handed over at the door, so it becomes PAID automatically. Online (Razorpay)
// orders and cancellations must be left alone. Needs a replica-set db (the
// transition runs in a transaction) → the in-memory one from tests/setup.ts.
try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to real env vars
}
const uri = process.env.MONGODB_URI;

const address = { name: 'Test', phone: '9999999999', line1: '1 St', city: 'Kanpur', state: 'UP', pin: '208001' };

async function makeOrder(over: Partial<{ method: string; paymentStatus: string; fulfillmentStatus: string }>) {
  const product = await ProductModel.create({
    slug: `cod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Test Cycle',
    category: 'Test',
    description: 'test',
    image: '/images/mountain-bike.jpg',
    status: 'published',
    variants: [{ sku: 'T-1', size: 'M', color: 'Black', price: 100000, stock: 5 }],
  });
  const order = await OrderModel.create({
    owner: 'guest:test',
    email: 'buyer@example.com',
    address,
    items: [{ variantId: product.variants[0]._id, name: 'Test Cycle', sku: 'T-1', quantity: 1, price: 100000 }],
    subtotal: 100000,
    total: 100000,
    idempotencyKey: `k-${Math.random()}`,
    method: 'cod',
    paymentStatus: 'unpaid',
    fulfillmentStatus: 'shipped',
    tracking: 'TRK1',
    ...over,
  });
  return String(order._id);
}

if (!uri) {
  test('COD delivered → paid (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  before(async () => {
    await mongoose.connect(uri, { dbName: 'stellar-test-cod-delivered' });
  });

  after(async () => {
    await Promise.all([ProductModel.deleteMany({}), OrderModel.deleteMany({}), InventoryMovementModel.deleteMany({})]);
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Promise.all([ProductModel.deleteMany({}), OrderModel.deleteMany({}), InventoryMovementModel.deleteMany({})]);
  });

  test('an unpaid COD order becomes paid when it is marked delivered', async () => {
    const id = await makeOrder({});
    await transitionOrder('owner', id, 'delivered', '');
    const o = await OrderModel.findById(id).lean();
    assert.equal(o?.fulfillmentStatus, 'delivered');
    assert.equal(o?.paymentStatus, 'paid');
  });

  test('an online order that is already paid stays paid and is not touched', async () => {
    const id = await makeOrder({ method: 'razorpay', paymentStatus: 'paid' });
    await transitionOrder('owner', id, 'delivered', '');
    assert.equal((await OrderModel.findById(id).lean())?.paymentStatus, 'paid');
  });

  test('a failed delivery does NOT mark a COD order paid', async () => {
    const id = await makeOrder({});
    await transitionOrder('owner', id, 'delivery_failed', '');
    const o = await OrderModel.findById(id).lean();
    assert.equal(o?.fulfillmentStatus, 'delivery_failed');
    assert.equal(o?.paymentStatus, 'unpaid');
  });

  test('cancelling a COD order leaves it unpaid', async () => {
    const id = await makeOrder({ fulfillmentStatus: 'confirmed' });
    await transitionOrder('owner', id, 'cancelled', '');
    assert.equal((await OrderModel.findById(id).lean())?.paymentStatus, 'unpaid');
  });
}
