import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { orderConfirmationMessage, sendEmail } from '../src/lib/email.js';

// Pure, no network: the receipt builder is the only logic worth pinning down.
const base = {
  to: 'buyer@example.com',
  orderId: 'abc123def4567890',
  items: [
    { name: 'Mountain Cycle', quantity: 1, price: 2499900 },
    { name: 'Helmet', quantity: 2, price: 50000 },
  ],
  total: 2599900,
};

test('order confirmation: COD wording + totals + reference', () => {
  const msg = orderConfirmationMessage({ ...base, method: 'cod' });
  assert.equal(msg.to, base.to);
  assert.ok(msg.subject.includes(base.orderId.slice(-8).toUpperCase()), 'subject has the short ref');
  assert.ok(msg.text.includes('Mountain Cycle × 1'), 'lists an item line');
  assert.ok(msg.text.includes('Helmet × 2'), 'lists the second item');
  assert.ok(msg.text.includes('₹25,999.00'), 'shows the total in rupees');
  assert.ok(/pay cash/i.test(msg.text), 'COD says pay cash');
});

test('order confirmation: online payment wording', () => {
  const msg = orderConfirmationMessage({ ...base, method: 'razorpay' });
  assert.ok(/received online/i.test(msg.text), 'online says payment received');
  assert.ok(!/pay cash/i.test(msg.text), 'online does not say pay cash');
});

// sendEmail must never throw. Only exercise the no-key mock path — skip if a real
// key is configured so the test never hits the network / sends a real email.
test('sendEmail (no key) prints the mock and never throws', { skip: Boolean(config.RESEND_API_KEY) }, async () => {
  await assert.doesNotReject(() =>
    sendEmail({ to: 'x@example.com', subject: 'test', text: 'hello' }),
  );
});
