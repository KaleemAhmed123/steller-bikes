import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { config } from '../src/config.js';
import { verifyPaymentSignature } from '../src/lib/razorpay.js';

// Pure unit test — no DB, no network. It computes the expected signature with the
// SAME secret the function uses, so it checks the thing that can actually break:
// the signed string format (order|payment), the hex digest, and that a tampered
// or wrong-length signature is rejected.
const secret = config.RAZORPAY_KEY_SECRET || '';
const orderId = 'order_TESTorder';
const paymentId = 'pay_TESTpayment';
const good = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

test('verifyPaymentSignature accepts a correctly-signed payload', () => {
  assert.equal(verifyPaymentSignature(orderId, paymentId, good), true);
});

test('verifyPaymentSignature rejects a tampered signature (same length)', () => {
  const tampered = (good[0] === '0' ? '1' : '0') + good.slice(1);
  assert.equal(verifyPaymentSignature(orderId, paymentId, tampered), false);
});

test('verifyPaymentSignature rejects a wrong-length signature', () => {
  assert.equal(verifyPaymentSignature(orderId, paymentId, 'short'), false);
});

test('verifyPaymentSignature rejects a valid signature meant for a different order', () => {
  assert.equal(verifyPaymentSignature('order_OTHER', paymentId, good), false);
});
