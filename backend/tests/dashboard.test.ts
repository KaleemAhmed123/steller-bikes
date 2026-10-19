import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rangeStart } from '../src/lib/dashboard.js';

const DAY = 86_400_000;

test('all time → null', () => {
  assert.equal(rangeStart('all'), null);
});

test('today → IST midnight today', () => {
  const t = rangeStart('today')!;
  // Must be at or before now, and within the last 24h.
  const now = Date.now();
  assert.ok(t.getTime() <= now);
  assert.ok(now - t.getTime() < DAY);
});

test('ranges count back the right number of whole days from today', () => {
  const today = rangeStart('today')!.getTime();
  assert.equal((today - rangeStart('7d')!.getTime()) / DAY, 6);
  assert.equal((today - rangeStart('15d')!.getTime()) / DAY, 14);
  assert.equal((today - rangeStart('30d')!.getTime()) / DAY, 29);
});

test('an unknown range defaults to 30d', () => {
  assert.equal(rangeStart('nonsense')!.getTime(), rangeStart('30d')!.getTime());
});
