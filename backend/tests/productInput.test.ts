import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productInputSchema } from '../src/lib/productInput.js';

// The admin product payload is the only new branching logic in step 5. This
// checks it accepts a good product and rejects the ways a form can go wrong.

const good = {
  slug: 'metro-one',
  name: 'Metro One',
  category: 'City',
  description: 'A sample city bike.',
  image: '/images/city-bike.jpg',
  variants: [{ sku: 'M-S', size: 'Small', color: 'Black', price: 1599900, stock: 10 }],
};

test('a valid product parses and fills defaults', () => {
  const p = productInputSchema.parse(good);
  assert.equal(p.featured, false);
  assert.equal(p.status, 'draft');
  assert.deepEqual(p.images, []);
  assert.equal(p.variants[0].compareAt, 0);
  assert.equal(p.variants[0].lowStock, 3);
});

test('at least one variant is required', () => {
  const r = productInputSchema.safeParse({ ...good, variants: [] });
  assert.equal(r.success, false);
});

test('a negative price is rejected', () => {
  const bad = { ...good, variants: [{ ...good.variants[0], price: -1 }] };
  assert.equal(productInputSchema.safeParse(bad).success, false);
});

test('a bad slug (spaces/caps) is rejected', () => {
  assert.equal(productInputSchema.safeParse({ ...good, slug: 'Metro One' }).success, false);
});

test('a missing name is rejected', () => {
  const { name: _omit, ...noName } = good;
  assert.equal(productInputSchema.safeParse(noName).success, false);
});

test('a bad status is rejected', () => {
  assert.equal(productInputSchema.safeParse({ ...good, status: 'live' }).success, false);
});
