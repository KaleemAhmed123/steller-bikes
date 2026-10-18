import process from 'node:process';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { ProductModel } from '../models/product.js';
import { OrderModel } from '../models/order.js';

// Insert a few CLEARLY-FAKE demo orders so the admin has a realistic queue to
// look at. All use owner "guest:demo" / demo@example.com and idempotencyKey
// "demo-*", so they're easy to spot and clear. They do NOT touch stock (purely
// illustrative). Run after `npm run seed`. Re-running replaces the demo set.
async function run(): Promise<void> {
  await connectDb();

  const products = await ProductModel.find({ status: 'published' }).lean();
  if (products.length === 0) {
    console.error('No products found — run `npm run seed` first.');
    process.exit(1);
  }

  await OrderModel.deleteMany({ owner: 'guest:demo' });

  const address = { name: 'Demo Customer', phone: '9000000000', line1: '1 Demo Street', city: 'Kanpur', state: 'UP', pin: '208001' };
  const states = ['confirmed', 'packed', 'delivered'];

  const demos = states.map((fulfillmentStatus, i) => {
    const p = products[i % products.length];
    const v = p.variants[0];
    const total = v.price;
    return {
      owner: 'guest:demo',
      email: 'demo@example.com',
      address,
      items: [{ variantId: v._id, name: p.name, sku: v.sku, quantity: 1, price: v.price }],
      subtotal: total,
      discount: 0,
      shipping: 0,
      tax: 0,
      total,
      method: 'cod',
      paymentStatus: 'unpaid',
      fulfillmentStatus,
      tracking: fulfillmentStatus === 'delivered' ? 'DEMO-TRACK-001' : '',
      idempotencyKey: `demo-${i}-${Date.now()}`,
    };
  });

  await OrderModel.insertMany(demos);
  console.log(`Seeded ${demos.length} demo orders (owner guest:demo — fake, clear before launch).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('seed:demo failed:', err);
  process.exit(1);
});
