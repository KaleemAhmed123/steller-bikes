import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import mongoose from 'mongoose';
import { ProductModel } from '../src/models/product.js';
import { CartModel } from '../src/models/cart.js';
import { OrderModel } from '../src/models/order.js';
import { SettingsModel } from '../src/models/settings.js';
import { InventoryMovementModel } from '../src/models/inventoryMovement.js';
import { computeCartTotal, finalizePaidOrder, placeOrder } from '../src/lib/checkout.js';

// The delivery fee in the real money path: the SERVER prices it from the pincode.
// Kanpur pincodes add the flat fee (default ₹299); anywhere else adds nothing at
// checkout (an agent agrees the Delhivery charge by phone and raises an advance link).
try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to real env vars
}
const uri = process.env.MONGODB_URI;

const PRICE = 100000; // ₹1,000 per unit
const FEE = 29900; // ₹299
const addr = (pin: string, city = 'X') => ({ name: 'Test', phone: '9999999999', line1: '1 St', city, state: 'UP', pin });
const kanpur = addr('208001', 'Kanpur');
const lucknow = addr('226001', 'Lucknow');
const pay = (amount: number) => ({
  provider: 'razorpay' as const,
  razorpayOrderId: 'order_t',
  paymentId: 'pay_t',
  method: 'upi',
  amount,
  paidAt: new Date(),
});

async function cartWithOne(owner: string, qty = 1) {
  const p = await ProductModel.create({
    slug: `d-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Cycle',
    category: 'Test',
    description: 'd',
    image: '/images/mountain-bike.jpg',
    status: 'published',
    variants: [{ sku: 'D-1', size: 'M', color: 'Black', price: PRICE, stock: 10 }],
  });
  await CartModel.create({ owner, items: [{ variantId: p.variants[0]._id, quantity: qty }] });
}

if (!uri) {
  test('checkout delivery (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  before(async () => {
    await mongoose.connect(uri, { dbName: 'stellar-test-checkout-delivery' });
    await OrderModel.createIndexes();
  });
  after(async () => {
    await Promise.all([ProductModel, CartModel, OrderModel, SettingsModel, InventoryMovementModel].map((m) => m.deleteMany({})));
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    await Promise.all([ProductModel, CartModel, OrderModel, SettingsModel, InventoryMovementModel].map((m) => m.deleteMany({})));
  });

  test('a COD order to a Kanpur pincode carries the flat fee in shipping and total', async () => {
    await cartWithOne('guest:k');
    const id = await placeOrder({ owner: 'guest:k', email: 'k@x.com', address: kanpur, idempotencyKey: 'key-kanpur-1' });
    const o = await OrderModel.findById(id).lean();
    assert.equal(o?.subtotal, PRICE);
    assert.equal(o?.shipping, FEE);
    assert.equal(o?.total, PRICE + FEE);
  });

  test('a COD order outside Kanpur adds no fee at checkout', async () => {
    await cartWithOne('guest:l');
    const id = await placeOrder({ owner: 'guest:l', email: 'l@x.com', address: lucknow, idempotencyKey: 'key-lucknow-1' });
    const o = await OrderModel.findById(id).lean();
    assert.equal(o?.shipping, 0);
    assert.equal(o?.total, PRICE);
  });

  test('the fee is per ORDER, not per item', async () => {
    await cartWithOne('guest:q', 3);
    assert.equal(await computeCartTotal('guest:q', '208001'), PRICE * 3 + FEE);
  });

  test('the amount we ask Razorpay to charge uses the pincode too', async () => {
    await cartWithOne('guest:r');
    assert.equal(await computeCartTotal('guest:r', '208001'), PRICE + FEE);
    assert.equal(await computeCartTotal('guest:r', '226001'), PRICE);
  });

  test('the owner can change the fee, and ₹0 means free Kanpur delivery', async () => {
    await SettingsModel.create({ kanpurDeliveryFee: 49900 });
    await cartWithOne('guest:c');
    assert.equal(await computeCartTotal('guest:c', '208001'), PRICE + 49900);
    await SettingsModel.updateOne({}, { kanpurDeliveryFee: 0 });
    assert.equal(await computeCartTotal('guest:c', '208001'), PRICE);
  });

  test('an online payment that forgot the Kanpur fee is NOT fulfilled — it becomes refund_required', async () => {
    await cartWithOne('guest:o');
    // Paid only the item price to a Kanpur address: short by the delivery fee.
    const r = await finalizePaidOrder(
      { owner: 'guest:o', email: 'o@x.com', address: kanpur, idempotencyKey: 'order_short' },
      pay(PRICE),
    );
    assert.equal(r.refundRequired, true);
  });

  test('an online payment of item price + fee to Kanpur is fulfilled as paid', async () => {
    await cartWithOne('guest:p');
    const r = await finalizePaidOrder(
      { owner: 'guest:p', email: 'p@x.com', address: kanpur, idempotencyKey: 'order_full' },
      pay(PRICE + FEE),
    );
    assert.equal(r.refundRequired, false);
    const o = await OrderModel.findById(r.orderId).lean();
    assert.equal(o?.paymentStatus, 'paid');
    assert.equal(o?.shipping, FEE);
    assert.equal(o?.total, PRICE + FEE);
  });
}
