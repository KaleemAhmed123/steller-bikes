import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowTransition } from '../src/lib/fulfillment.js';

test('legal fulfillment transitions are allowed', () => {
  assert.ok(allowTransition('confirmed', 'processing'));
  assert.ok(allowTransition('confirmed', 'cancelled'));
  assert.ok(allowTransition('processing', 'packed'));
  assert.ok(allowTransition('packed', 'shipped'));
  assert.ok(allowTransition('shipped', 'delivered'));
  assert.ok(allowTransition('shipped', 'delivery_failed'));
  assert.ok(allowTransition('delivery_failed', 'shipped'));
});

test('illegal transitions are rejected', () => {
  assert.equal(allowTransition('confirmed', 'shipped'), false); // can't skip steps
  assert.equal(allowTransition('shipped', 'cancelled'), false); // too late to cancel
  assert.equal(allowTransition('delivered', 'processing'), false); // terminal
  assert.equal(allowTransition('cancelled', 'confirmed'), false); // terminal
  assert.equal(allowTransition('nonsense', 'processing'), false); // unknown state
});
