import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productQuerySchema, buildProductFilter } from '../src/lib/productQuery.js';

// The catalogue filter is the only branching logic in step 2. This checks it
// parses + builds the right MongoDB query, and rejects garbage. Run: npm test.

test('no filters → only published products', () => {
  const parsed = productQuerySchema.parse({});
  assert.deepEqual(buildProductFilter(parsed), { status: 'published' });
});

test('category is passed through as an exact match', () => {
  const parsed = productQuerySchema.parse({ category: 'City' });
  assert.equal(buildProductFilter(parsed).category, 'City');
});

test('search builds a case-insensitive $or over name + description', () => {
  const parsed = productQuerySchema.parse({ q: 'trail' });
  const filter = buildProductFilter(parsed);
  assert.ok(Array.isArray(filter.$or));
  assert.equal(filter.$or.length, 2);
  assert.ok((filter.$or[0].name as RegExp).test('Trail 29'));
  assert.ok((filter.$or[0].name as RegExp).flags.includes('i'));
});

test('regex-special characters in search are escaped (matched literally)', () => {
  const parsed = productQuerySchema.parse({ q: '29.' });
  const rx = buildProductFilter(parsed).$or[0].name as RegExp;
  assert.ok(rx.test('29.'));
  assert.ok(!rx.test('29x')); // the "." is literal, not a wildcard
});

test('price range uses $elemMatch so both bounds hit the same variant', () => {
  const parsed = productQuerySchema.parse({ minPrice: '1000', maxPrice: '5000' });
  assert.deepEqual(buildProductFilter(parsed).variants, {
    $elemMatch: { price: { $gte: 1000, $lte: 5000 } },
  });
});

test('a single price bound works on its own', () => {
  const parsed = productQuerySchema.parse({ minPrice: '2000' });
  assert.deepEqual(buildProductFilter(parsed).variants, {
    $elemMatch: { price: { $gte: 2000 } },
  });
});

test('garbage price is rejected at the boundary', () => {
  assert.equal(productQuerySchema.safeParse({ minPrice: 'abc' }).success, false);
});
