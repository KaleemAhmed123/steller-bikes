import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { DEFAULT_CONTACT, DEFAULT_MAP_LINK, shopInfoShape, withShopInfo } from '../src/lib/shopInfo.js';

// The Shop info rules: defaults, link safety, phone shape, About image limits.

const schema = z.object(shopInfoShape).partial();
const images = { hero: '', story: '', matters: '', brand: '', guarantee: '', gallery: [] as { url: string; alt: string }[] };

test('a fresh database shows the default contact and map link, and no About pictures', () => {
  const s = withShopInfo(null);
  assert.equal(s.contactName, DEFAULT_CONTACT.contactName);
  assert.equal(s.contactPhone, '+91-8931076870');
  assert.equal(s.mapLink, DEFAULT_MAP_LINK);
  assert.deepEqual(s.aboutImages, images);
});

test('stored values win, including a map link the admin cleared on purpose', () => {
  const s = withShopInfo({ mapLink: '', contactName: 'Aslam', aboutImages: { hero: '/images/a.jpg' } });
  assert.equal(s.mapLink, '');
  assert.equal(s.contactName, 'Aslam');
  assert.equal(s.contactPhone, DEFAULT_CONTACT.contactPhone); // never stored: default
  assert.equal(s.aboutImages.hero, '/images/a.jpg');
  assert.deepEqual(s.aboutImages.gallery, []);
});

test('the map link must be https (or empty)', () => {
  const ok = (mapLink: string) => schema.safeParse({ mapLink }).success;
  assert.ok(ok('https://maps.app.goo.gl/abc123'));
  assert.ok(ok(''));
  assert.ok(!ok('http://insecure.example'));
  assert.ok(!ok('javascript:alert(1)'));
});

test('a phone number looks like a phone number', () => {
  const ok = (contactPhone: string) => schema.safeParse({ contactPhone }).success;
  assert.ok(ok('+91-8931076870'));
  assert.ok(ok('8931076870'));
  assert.ok(ok('+91 89310 76870'));
  assert.ok(!ok('call me'));
  assert.ok(!ok(''));
  assert.ok(!ok('123'));
});

test('About images: site path or https only; gallery photos need an image; at most 24', () => {
  const ok = (aboutImages: object) => schema.safeParse({ aboutImages: { ...images, ...aboutImages } }).success;
  assert.ok(ok({ hero: '/images/hero.jpg', story: 'https://res.cloudinary.com/x/y.jpg' }));
  assert.ok(!ok({ hero: 'javascript:alert(1)' }));
  assert.ok(!ok({ hero: 'http://insecure.example/a.jpg' }));
  assert.ok(ok({ gallery: [{ url: '/images/a.jpg', alt: 'Shop front' }] }));
  assert.ok(!ok({ gallery: [{ url: '', alt: '' }] }));
  assert.ok(!ok({ gallery: Array.from({ length: 25 }, () => ({ url: '/images/a.jpg', alt: '' })) }));
});
