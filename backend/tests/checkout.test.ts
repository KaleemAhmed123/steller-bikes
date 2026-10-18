import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import mongoose from 'mongoose';
import { ProductModel } from '../src/models/product.js';
import { CartModel } from '../src/models/cart.js';
import { OrderModel } from '../src/models/order.js';
import { InventoryMovementModel } from '../src/models/inventoryMovement.js';
import { placeOrder, CheckoutError } from '../src/lib/checkout.js';

// The checkout safety test needs a replica-set database (for transactions), so
// it runs against Atlas in a SEPARATE "raju-cycles-test" db and cleans up. It is
// skipped if MONGODB_URI is not set. Run: npm test (with backend/.env present).
try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to real env vars
}
const uri = process.env.MONGODB_URI;

const address = { name: 'Test', phone: '9999999999', line1: '1 St', city: 'Kanpur', state: 'UP', pin: '208001' };

async function seedProduct(stock: number): Promise<string> {
  const product = await ProductModel.create({
    slug: 'test-item',
    name: 'Test Cycle',
    category: 'Test',
    description: 'test',
    image: '/images/mountain-bike.jpg',
    status: 'published',
    variants: [{ sku: 'T-1', size: 'M', color: 'Black', price: 100000, stock }],
  });
  return String(product.variants[0]._id);
}

if (!uri) {
  test('checkout safety (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  before(async () => {
    await mongoose.connect(uri, { dbName: 'raju-cycles-test-checkout' });
    await OrderModel.createIndexes(); // ensure the unique idempotencyKey index exists
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

  test('two buyers racing for the last unit → exactly one wins, no oversell', async () => {
    const variantId = await seedProduct(1);
    await CartModel.create({ owner: 'guest:a', items: [{ variantId, quantity: 1 }] });
    await CartModel.create({ owner: 'guest:b', items: [{ variantId, quantity: 1 }] });

    const results = await Promise.allSettled([
      placeOrder({ owner: 'guest:a', email: 'a@x.com', address, idempotencyKey: 'key-a' }),
      placeOrder({ owner: 'guest:b', email: 'b@x.com', address, idempotencyKey: 'key-b' }),
    ]);

    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r) => r.status === 'rejected');
    assert.equal(won.length, 1, 'exactly one checkout succeeds');
    assert.equal(lost.length, 1, 'exactly one checkout fails');
    assert.ok(
      lost[0].status === 'rejected' &&
        lost[0].reason instanceof CheckoutError &&
        lost[0].reason.code === 'OUT_OF_STOCK',
      'the loser fails with OUT_OF_STOCK',
    );

    const product = await ProductModel.findOne({ slug: 'test-item' }).lean();
    assert.equal(product!.variants[0].stock, 0, 'stock lands at 0, never negative');
    assert.equal(await OrderModel.countDocuments({}), 1, 'only one order was created');
  });

  test('same idempotency key twice → one order, returned both times', async () => {
    const variantId = await seedProduct(5);
    await CartModel.create({ owner: 'guest:c', items: [{ variantId, quantity: 2 }] });

    const first = await placeOrder({ owner: 'guest:c', email: 'c@x.com', address, idempotencyKey: 'dup' });
    const second = await placeOrder({ owner: 'guest:c', email: 'c@x.com', address, idempotencyKey: 'dup' });

    assert.equal(first, second, 'same order id returned');
    assert.equal(await OrderModel.countDocuments({}), 1, 'no duplicate order');

    const product = await ProductModel.findOne({ slug: 'test-item' }).lean();
    assert.equal(product!.variants[0].stock, 3, 'stock decremented once only (5 - 2)');
  });

  test('empty cart → EMPTY error, no order', async () => {
    await CartModel.create({ owner: 'guest:d', items: [] });
    await assert.rejects(
      () => placeOrder({ owner: 'guest:d', email: 'd@x.com', address, idempotencyKey: 'empty' }),
      (err) => err instanceof CheckoutError && err.code === 'EMPTY',
    );
    assert.equal(await OrderModel.countDocuments({}), 0);
  });
}
