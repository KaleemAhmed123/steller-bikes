import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STRIP_STYLE, STRIP_STYLE_MAX, countdownEndsAtSchema, nextNewYear, stripStyleSchema, withPromoStrip } from '../src/lib/promoStrip.js';

// The promo strip rules: the default look, and what a style key may be.

test('a shop that never picked a style gets the default look', () => {
  assert.equal(withPromoStrip(null).announcementStyle, DEFAULT_STRIP_STYLE);
  assert.equal(withPromoStrip({}).announcementStyle, DEFAULT_STRIP_STYLE);
  assert.equal(withPromoStrip({ announcementStyle: '' }).announcementStyle, DEFAULT_STRIP_STYLE);
});

test('a stored style wins, and the rest of the document is kept', () => {
  const merged = withPromoStrip({ announcement: 'Diwali sale', announcementStyle: 'diwali' });
  assert.equal(merged.announcementStyle, 'diwali');
  assert.equal((merged as { announcement: string }).announcement, 'Diwali sale');
});

test('a style key is lowercase words joined by hyphens', () => {
  const ok = (v: string) => stripStyleSchema.safeParse(v).success;
  assert.ok(ok('diwali'));
  assert.ok(ok('diwali-night'));
  assert.ok(ok(' new-year ')); // trimmed
  assert.ok(!ok(''));
  assert.ok(!ok('Diwali'));
  assert.ok(!ok('diwali night'));
  assert.ok(!ok('<script>'));
  assert.ok(!ok('a'.repeat(STRIP_STYLE_MAX + 1)));
});

// ---- countdown --------------------------------------------------------------

test('the next New Year is midnight 1 January in India (18:30 UTC the evening before)', () => {
  assert.equal(nextNewYear(new Date('2026-11-01T10:00:00Z')).toISOString(), '2026-12-31T18:30:00.000Z');
  // 19:00 UTC on 31 Dec is already 00:30 on 1 Jan in India, so the NEXT New Year is a year on.
  assert.equal(nextNewYear(new Date('2026-12-31T19:00:00Z')).toISOString(), '2027-12-31T18:30:00.000Z');
});

test('a shop that never set a countdown date counts down to the next New Year, as an ISO string', () => {
  const now = new Date('2026-11-01T10:00:00Z');
  assert.equal(withPromoStrip(null, now).countdownEndsAt, '2026-12-31T18:30:00.000Z');
});

test('a stored countdown date wins and is sent as an ISO string', () => {
  const stored = new Date('2026-11-12T12:30:00Z');
  assert.equal(withPromoStrip({ countdownEndsAt: stored }).countdownEndsAt, '2026-11-12T12:30:00.000Z');
});

test('the countdown date must be a real ISO timestamp', () => {
  const parse = (v: string) => countdownEndsAtSchema.safeParse(v);
  const ok = parse('2026-11-12T12:30:00.000Z');
  assert.ok(ok.success && ok.data instanceof Date);
  assert.ok(!parse('tomorrow').success);
  assert.ok(!parse('2026-13-45').success);
  assert.ok(!parse('').success);
});

test('a corrupt stored countdown date falls back to the default instead of breaking the endpoint', () => {
  const now = new Date('2026-11-01T10:00:00Z');
  assert.equal(withPromoStrip({ countdownEndsAt: 'garbage' }, now).countdownEndsAt, '2026-12-31T18:30:00.000Z');
});
