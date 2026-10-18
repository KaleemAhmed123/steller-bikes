import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import mongoose from 'mongoose';
import { CartModel } from '../src/models/cart.js';
import { OrderModel } from '../src/models/order.js';
import { mergeGuestCart, claimGuestOrders } from '../src/lib/customerAuth.js';

// The two guest→customer "attach" operations touch the DB, so they run against
// Atlas in a scratch db. Skipped without MONGODB_URI. Run: npm test.
try {
  process.loadEnvFile();
} catch {
  /* no .env */
}
const uri = process.env.MONGODB_URI;

const ADDR = { name: 'A', phone: '9999999999', line1: '1 St', city: 'Kanpur', state: 'UP', pin: '208001' };
const vid = () => new mongoose.Types.ObjectId();

async function makeOrder(owner: string, email: string, key: string) {
  const variantId = vid();
  return OrderModel.create({
    owner,
    email,
    address: ADDR,
    items: [{ variantId, name: 'C', sku: 'S', quantity: 1, price: 1000 }],
    subtotal: 1000,
    total: 1000,
    idempotencyKey: key,
  });
}

if (!uri) {
  test('account flows (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  before(async () => {
    await mongoose.connect(uri, { dbName: 'raju-cycles-test-account' });
  });
  after(async () => {
    await Promise.all([CartModel.deleteMany({}), OrderModel.deleteMany({})]);
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    await Promise.all([CartModel.deleteMany({}), OrderModel.deleteMany({})]);
  });

  test('mergeGuestCart folds the guest cart into the customer, summing overlaps', async () => {
    const shared = vid();
    const only = vid();
    await CartModel.create({ owner: 'guest:g1', items: [{ variantId: shared, quantity: 2 }, { variantId: only, quantity: 1 }] });
    await CartModel.create({ owner: 'customer:c1', items: [{ variantId: shared, quantity: 3 }] });

    await mergeGuestCart('guest:g1', 'c1');

    const cust = await CartModel.findOne({ owner: 'customer:c1' }).lean();
    const guest = await CartModel.findOne({ owner: 'guest:g1' }).lean();
    assert.equal(guest, null, 'guest cart is removed after merge');
    assert.equal(cust!.items.length, 2);
    const sharedLine = cust!.items.find((i) => String(i.variantId) === String(shared));
    assert.equal(sharedLine!.quantity, 5, 'overlapping variant quantities are summed (3 + 2)');
  });

  test('mergeGuestCart creates the customer cart when none exists yet', async () => {
    const v = vid();
    await CartModel.create({ owner: 'guest:g2', items: [{ variantId: v, quantity: 4 }] });
    await mergeGuestCart('guest:g2', 'c2');
    const cust = await CartModel.findOne({ owner: 'customer:c2' }).lean();
    assert.equal(cust!.items[0]!.quantity, 4);
  });

  test('claimGuestOrders relabels only matching-email guest orders', async () => {
    await makeOrder('guest:g3', 'buyer@x.com', 'k1'); // should be claimed
    await makeOrder('guest:g9', 'buyer@x.com', 'k2'); // different guest, same email → claimed
    await makeOrder('guest:g4', 'someone@else.com', 'k3'); // different email → left alone
    await makeOrder('customer:c9', 'buyer@x.com', 'k4'); // already a customer order → unchanged

    await claimGuestOrders('buyer@x.com', 'c3');

    const claimed = await OrderModel.countDocuments({ owner: 'customer:c3' });
    assert.equal(claimed, 2, 'both guest orders for this email are claimed');
    const untouched = await OrderModel.findOne({ idempotencyKey: 'k3' }).lean();
    assert.equal(untouched!.owner, 'guest:g4', 'other emails are never claimed');
  });
}
