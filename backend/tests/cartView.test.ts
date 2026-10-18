import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCartView, type VariantInfo } from '../src/lib/cartView.js';

// The cart view is the money logic: it recomputes price × quantity, the subtotal,
// and stock flags from LIVE variant data. Run: npm test.

function variant(over: Partial<VariantInfo> = {}): VariantInfo {
  return {
    variantId: 'v1',
    name: 'Trail 29',
    slug: 'trail-29',
    sku: 'DEMO',
    size: '18 inch',
    color: 'Blue',
    image: '/images/mountain-bike.jpg',
    price: 2_499_900,
    stock: 10,
    ...over,
  };
}

test('empty cart → zero totals', () => {
  const view = computeCartView([], new Map());
  assert.deepEqual(view, { items: [], subtotal: 0, itemCount: 0 });
});

test('line total = live price × quantity, and subtotal + itemCount add up', () => {
  const map = new Map([
    ['v1', variant({ variantId: 'v1', price: 1000 })],
    ['v2', variant({ variantId: 'v2', price: 250 })],
  ]);
  const view = computeCartView(
    [
      { variantId: 'v1', quantity: 2 },
      { variantId: 'v2', quantity: 3 },
    ],
    map,
  );
  assert.equal(view.items[0].lineTotal, 2000);
  assert.equal(view.items[1].lineTotal, 750);
  assert.equal(view.subtotal, 2750);
  assert.equal(view.itemCount, 5);
});

test('price is taken from live data, never from the cart', () => {
  // The cart only carries quantity; the price here comes purely from the map.
  const map = new Map([['v1', variant({ price: 99 })]]);
  const view = computeCartView([{ variantId: 'v1', quantity: 2 }], map);
  assert.equal(view.items[0].price, 99);
  assert.equal(view.subtotal, 198);
});

test('quantity over stock is flagged (inStock:false) but still priced', () => {
  const map = new Map([['v1', variant({ price: 100, stock: 1 })]]);
  const view = computeCartView([{ variantId: 'v1', quantity: 3 }], map);
  assert.equal(view.items[0].inStock, false);
  assert.equal(view.items[0].lineTotal, 300);
});

test('a variant no longer published → available:false, excluded from subtotal', () => {
  const view = computeCartView([{ variantId: 'gone', quantity: 2 }], new Map());
  assert.equal(view.items[0].available, false);
  assert.equal(view.subtotal, 0);
  assert.equal(view.itemCount, 0);
});
