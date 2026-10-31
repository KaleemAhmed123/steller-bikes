import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRANK_CENTRE, pedalPose } from '../components/promo-strip/pedal';
import { seeded } from '../components/promo-strip/random';
import { specText } from '../lib/photoUpload';
import { paymentLabel } from '../lib/payment';
import { telHref } from '../lib/contact';

// The bike's pedalling maths, seeded randomness, and the small text helpers.

const points = (path: string) => [...path.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => ({ x: +m[1], y: +m[2] }));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

test('the foot always rides the crank circle and the leg bones keep their length', () => {
  for (let step = 0; step < 24; step++) {
    const pose = pedalPose((step * Math.PI) / 12);
    assert.ok(Math.abs(dist(pose.foot, CRANK_CENTRE) - 5) < 0.2, 'foot stays 5 units from the crank');
    const [hip, knee, foot] = points(pose.legPath);
    assert.ok(Math.abs(dist(hip, knee) - 12.8) < 0.3, 'thigh length');
    assert.ok(Math.abs(dist(knee, foot) - 12.8) < 0.3, 'shin length');
    assert.ok(knee.x > hip.x, 'the knee bends forward');
  }
});

test('the same angle always gives the same pose (server and browser draw the same first frame)', () => {
  assert.deepEqual(pedalPose(0.6), pedalPose(0.6));
});

test('seeded randomness repeats exactly and stays inside its range', () => {
  const a = seeded(42), b = seeded(42);
  for (let i = 0; i < 20; i++) {
    const v = a.between(3, 7);
    assert.equal(v, b.between(3, 7));
    assert.ok(v >= 3 && v < 7);
  }
  assert.notEqual(seeded(1).between(0, 1), seeded(2).between(0, 1));
});

test('the size note under an upload spells out the recommended pixels', () => {
  const text = specText({ ratio: '4:3', best: { w: 1200, h: 900 }, min: { w: 800, h: 600 }, note: 'Other shapes are trimmed to fit.' });
  assert.equal(text, 'Best 1200 × 900 px (4:3). At least 800 × 600 px. JPG, PNG or WebP, under 5 MB. Other shapes are trimmed to fit.');
});

test('payment wording follows the two switches and never comes back empty', () => {
  for (const [codEnabled, onlinePaymentEnabled] of [[true, true], [true, false], [false, true], [false, false]]) {
    assert.ok(paymentLabel({ codEnabled, onlinePaymentEnabled }).length > 0);
  }
  assert.equal(paymentLabel({ codEnabled: true, onlinePaymentEnabled: false }), 'Cash on delivery');
  assert.equal(paymentLabel({ codEnabled: false, onlinePaymentEnabled: true }), 'Online payment');
});

test('a phone number becomes a tap-to-call link', () => {
  assert.equal(telHref('+91-89310 76870'), 'tel:+918931076870');
});
