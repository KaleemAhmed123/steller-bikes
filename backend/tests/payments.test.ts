import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPaymentTransition, nextPaymentStatuses, PaymentError } from '../src/lib/payments.js';

test('COD unpaid can be marked paid (cash collected)', () => {
  assert.deepEqual(nextPaymentStatuses('cod', 'unpaid'), ['paid']);
  assert.doesNotThrow(() => assertPaymentTransition('cod', 'unpaid', 'paid'));
});

test('refund_required can be marked refunded (any method)', () => {
  assert.deepEqual(nextPaymentStatuses('razorpay', 'refund_required'), ['refunded']);
  assert.doesNotThrow(() => assertPaymentTransition('razorpay', 'refund_required', 'refunded'));
});

test('illegal transitions are rejected', () => {
  // online paid is terminal; COD can't jump to refunded; nothing can go backwards.
  assert.deepEqual(nextPaymentStatuses('razorpay', 'paid'), []);
  assert.throws(() => assertPaymentTransition('razorpay', 'paid', 'refunded'), PaymentError);
  assert.throws(() => assertPaymentTransition('cod', 'unpaid', 'refunded'), PaymentError);
  assert.throws(() => assertPaymentTransition('cod', 'paid', 'unpaid'), PaymentError);
});
