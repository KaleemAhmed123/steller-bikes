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

// --- Per-variant media (images + videos, explicit order) ---------------------

test('variant media defaults to none and is re-numbered by position', () => {
  const none = productInputSchema.parse(good);
  assert.deepEqual(none.variants[0].media, []);

  const p = productInputSchema.parse({
    ...good,
    variants: [
      {
        ...good.variants[0],
        media: [
          { url: '/b.mp4', type: 'video', position: 7 },
          { url: '/a.jpg', type: 'image', position: 2 },
          { url: 'https://res.cloudinary.com/x/c.jpg', type: 'image', position: 9 },
        ],
      },
    ],
  });
  // Sorted by the position the admin set, then re-numbered 0..n-1 (no gaps/ties).
  assert.deepEqual(
    p.variants[0].media.map((m) => [m.url, m.position]),
    [['/a.jpg', 0], ['/b.mp4', 1], ['https://res.cloudinary.com/x/c.jpg', 2]],
  );
});

test('equal positions keep the order they were sent in', () => {
  const p = productInputSchema.parse({
    ...good,
    variants: [
      {
        ...good.variants[0],
        media: [
          { url: '/first.jpg', type: 'image', position: 0 },
          { url: '/second.jpg', type: 'image', position: 0 },
        ],
      },
    ],
  });
  assert.deepEqual(p.variants[0].media.map((m) => m.url), ['/first.jpg', '/second.jpg']);
});

test('variant media is capped at 10, and rejects unsafe urls / unknown types', () => {
  const item = (i: number) => ({ url: `/p${i}.jpg`, type: 'image', position: i });
  const withMedia = (media: unknown[]) => ({ ...good, variants: [{ ...good.variants[0], media }] });

  assert.equal(productInputSchema.safeParse(withMedia(Array.from({ length: 10 }, (_, i) => item(i)))).success, true);
  assert.equal(productInputSchema.safeParse(withMedia(Array.from({ length: 11 }, (_, i) => item(i)))).success, false);
  assert.equal(productInputSchema.safeParse(withMedia([{ url: 'javascript:alert(1)', type: 'image', position: 0 }])).success, false);
  assert.equal(productInputSchema.safeParse(withMedia([{ url: 'http://insecure.example/a.jpg', type: 'image', position: 0 }])).success, false);
  assert.equal(productInputSchema.safeParse(withMedia([{ url: '/a.gif', type: 'audio', position: 0 }])).success, false);
});
