import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import mongoose from 'mongoose';
import { ProductModel } from '../src/models/product.js';
import { OrderModel } from '../src/models/order.js';
import { InventoryMovementModel } from '../src/models/inventoryMovement.js';
import { transitionOrder, TransitionError } from '../src/lib/fulfillment.js';
import { adjustStock, InventoryError } from '../src/lib/inventory.js';

// Stock-touching admin flows (cancel-restock, adjust) need a transaction-capable
// DB, so they run against Atlas in raju-cycles-test. Skipped without MONGODB_URI.
try {
  process.loadEnvFile();
} catch {
  /* no .env */
}
const uri = process.env.MONGODB_URI;

const ADDR = { name: 'A', phone: '9999999999', line1: '1 St', city: 'Kanpur', state: 'UP', pin: '208001' };

async function seedVariant(stock: number): Promise<string> {
  const p = await ProductModel.create({
    slug: 'adm-test',
    name: 'Adm Cycle',
    category: 'Test',
    description: 'd',
    image: '/images/mountain-bike.jpg',
    status: 'published',
    variants: [{ sku: 'ADM-1', size: 'M', color: 'Black', price: 1000, stock }],
  });
  return String(p.variants[0]._id);
}

async function makeOrder(variantId: string, quantity: number, fulfillmentStatus: string, key: string) {
  return OrderModel.create({
    owner: 'guest:x',
    email: 'x@x.com',
    address: ADDR,
    items: [{ variantId, name: 'Adm Cycle', sku: 'ADM-1', quantity, price: 1000 }],
    subtotal: 1000 * quantity,
    total: 1000 * quantity,
    method: 'cod',
    paymentStatus: 'unpaid',
    fulfillmentStatus,
    idempotencyKey: key,
  });
}

if (!uri) {
  test('admin flows (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  before(async () => {
    await mongoose.connect(uri, { dbName: 'raju-cycles-test-admin' });
  });
  after(async () => {
    await Promise.all([ProductModel.deleteMany({}), OrderModel.deleteMany({}), InventoryMovementModel.deleteMany({})]);
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    await Promise.all([ProductModel.deleteMany({}), OrderModel.deleteMany({}), InventoryMovementModel.deleteMany({})]);
  });

  test('cancel restores stock exactly once + logs a movement', async () => {
    const variantId = await seedVariant(1); // 1 left on hand; order holds 2 (already sold)
    const order = await makeOrder(variantId, 2, 'confirmed', 'o1');

    await transitionOrder('owner@x.com', String(order._id), 'cancelled', '');
    const p = await ProductModel.findOne({ 'variants._id': variantId }).lean();
    assert.equal(p!.variants[0].stock, 3); // 1 + 2 restored
    const moves = await InventoryMovementModel.find({ reason: `Cancel ${order._id}` }).lean();
    assert.equal(moves.length, 1);

    // A second cancel is illegal now (terminal), so stock is not restored again.
    await assert.rejects(
      () => transitionOrder('owner@x.com', String(order._id), 'cancelled', ''),
      (e) => e instanceof TransitionError,
    );
    const p2 = await ProductModel.findOne({ 'variants._id': variantId }).lean();
    assert.equal(p2!.variants[0].stock, 3);
  });

  test('illegal transition (skip steps) is rejected', async () => {
    const variantId = await seedVariant(5);
    const order = await makeOrder(variantId, 1, 'confirmed', 'o2');
    await assert.rejects(
      () => transitionOrder('o@x.com', String(order._id), 'shipped', 'T'),
      (e) => e instanceof TransitionError && e.code === 'ILLEGAL',
    );
  });

  test('shipping requires a tracking reference', async () => {
    const variantId = await seedVariant(5);
    const order = await makeOrder(variantId, 1, 'packed', 'o3');
    await assert.rejects(
      () => transitionOrder('o@x.com', String(order._id), 'shipped', '   '),
      (e) => e instanceof TransitionError && e.code === 'TRACKING_REQUIRED',
    );
  });

  test('adjustStock changes stock + logs a movement; cannot go negative', async () => {
    const variantId = await seedVariant(5);
    const r = await adjustStock('o@x.com', variantId, -2, 'Damaged in store');
    assert.equal(r.after, 3);
    const p = await ProductModel.findOne({ 'variants._id': variantId }).lean();
    assert.equal(p!.variants[0].stock, 3);
    assert.equal((await InventoryMovementModel.countDocuments({})), 1);

    await assert.rejects(
      () => adjustStock('o@x.com', variantId, -100, 'too many'),
      (e) => e instanceof InventoryError && e.code === 'INSUFFICIENT',
    );
    const p2 = await ProductModel.findOne({ 'variants._id': variantId }).lean();
    assert.equal(p2!.variants[0].stock, 3); // unchanged by the rejected adjust
  });
}
