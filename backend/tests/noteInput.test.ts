import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteInputSchema } from '../src/lib/noteInput.js';

const oid = '507f1f77bcf86cd799439011'; // a well-formed ObjectId

test('general note needs no target id', () => {
  const r = noteInputSchema.safeParse({ type: 'general', body: 'remember to call supplier' });
  assert.equal(r.success, true);
});

test('order note needs a valid target id', () => {
  assert.equal(noteInputSchema.safeParse({ type: 'order', refId: oid, body: 'customer called' }).success, true);
  assert.equal(noteInputSchema.safeParse({ type: 'order', body: 'no id' }).success, false);
  assert.equal(noteInputSchema.safeParse({ type: 'order', refId: 'not-an-id', body: 'bad id' }).success, false);
});

test('product and inventory notes also require a valid id', () => {
  assert.equal(noteInputSchema.safeParse({ type: 'product', refId: oid, body: 'bestseller' }).success, true);
  assert.equal(noteInputSchema.safeParse({ type: 'inventory', refId: oid, body: 'reorder soon' }).success, true);
  assert.equal(noteInputSchema.safeParse({ type: 'inventory', refId: '', body: 'x' }).success, false);
});

test('body is required and bounded', () => {
  assert.equal(noteInputSchema.safeParse({ type: 'general', body: '' }).success, false);
  assert.equal(noteInputSchema.safeParse({ type: 'general', body: 'a'.repeat(2001) }).success, false);
});
