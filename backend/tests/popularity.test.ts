import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachSoldCount } from '../src/lib/popularity.js';

// attachSoldCount is the only logic in the popularity feature: it sums a
// product's variants' sold units. The route feeds it a map built from orders
// (cancelled ones already excluded by the $match), so this checks the summing.

const products = [
  { slug: 'a', variants: [{ _id: 'v1' }, { _id: 'v2' }] },
  { slug: 'b', variants: [{ _id: 'v3' }] },
  { slug: 'c', variants: [{ _id: 'v4' }] },
];

test('soldCount sums every variant of a product', () => {
  const units = new Map([['v1', 3], ['v2', 2], ['v3', 5]]);
  const out = attachSoldCount(products, units);
  assert.equal(out.find((p) => p.slug === 'a')!.soldCount, 5);
  assert.equal(out.find((p) => p.slug === 'b')!.soldCount, 5);
});

test('a product with no sales gets soldCount 0', () => {
  const out = attachSoldCount(products, new Map([['v1', 3]]));
  assert.equal(out.find((p) => p.slug === 'c')!.soldCount, 0);
});

test('units from a variant not in any product are ignored', () => {
  const out = attachSoldCount(products, new Map([['ghost', 99]]));
  assert.equal(out.reduce((n, p) => n + p.soldCount, 0), 0);
});

test('the original product fields are preserved', () => {
  const out = attachSoldCount(products, new Map([['v1', 1]]));
  assert.equal(out[0].slug, 'a');
  assert.equal(out[0].variants.length, 2);
});
