import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
import { SettingsModel } from '../src/models/settings.js';
import {
  KANPUR_DEFAULT_FEE,
  KANPUR_DEFAULT_PINS,
  clearPincodeCache,
  deliveryFor,
  loadDeliveryRules,
  lookupPincode,
} from '../src/lib/delivery.js';
import { deliveryRouter } from '../src/routes/delivery.js';

// Delivery rules: flat fee inside Kanpur (by pincode LIST, deterministic), nothing added
// elsewhere; plus the India Post pincode lookup used only to autofill city/state.

const rules = { kanpurPins: KANPUR_DEFAULT_PINS, kanpurFee: KANPUR_DEFAULT_FEE };

test('Kanpur pincodes get the flat fee, others get none', () => {
  assert.deepEqual(deliveryFor('208001', rules), { kanpur: true, fee: 29900 });
  assert.deepEqual(deliveryFor('208027', rules), { kanpur: true, fee: 29900 });
  assert.deepEqual(deliveryFor('226001', rules), { kanpur: false, fee: 0 }); // Lucknow
  assert.deepEqual(deliveryFor('208028', rules), { kanpur: false, fee: 0 }); // just outside the default list
  assert.deepEqual(deliveryFor(' 208001 ', rules), { kanpur: true, fee: 29900 }); // stray spaces
  assert.deepEqual(deliveryFor('20800', rules), { kanpur: false, fee: 0 }); // not a full pincode
});

test('the default list is exactly 208001–208027 and the default fee is ₹299', () => {
  assert.equal(KANPUR_DEFAULT_PINS.length, 27);
  assert.equal(KANPUR_DEFAULT_PINS[0], '208001');
  assert.equal(KANPUR_DEFAULT_PINS.at(-1), '208027');
  assert.equal(KANPUR_DEFAULT_FEE, 29900);
});

// ---- India Post lookup (fetch faked) ----------------------------------------
const realFetch = globalThis.fetch;
let calls = 0;
let reply: () => Response | Promise<Response> = () => new Response('[]');
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  if (!url.startsWith('https://api.postalpincode.in')) return realFetch(input, init);
  calls++;
  return reply();
}) as typeof fetch;
const indiaPost = (body: unknown, status = 200) => () => new Response(JSON.stringify(body), { status });

test('lookup returns the district as city and the state, and remembers the answer', async () => {
  clearPincodeCache();
  calls = 0;
  reply = indiaPost([{ Status: 'Success', PostOffice: [{ District: 'Kanpur Nagar', State: 'Uttar Pradesh' }] }]);
  assert.deepEqual(await lookupPincode('208001'), { status: 'ok', city: 'Kanpur Nagar', state: 'Uttar Pradesh' });
  await lookupPincode('208001');
  assert.equal(calls, 1); // second call came from the cache
});

test('a pincode shared by several districts uses the most common one, not the first listed', async () => {
  clearPincodeCache();
  // Shape of the real 208001 answer: rural Kanpur Dehat offices listed first, city offices more numerous.
  const dehat = { District: 'Kanpur Dehat', State: 'Uttar Pradesh' };
  const nagar = { District: 'Kanpur Nagar', State: 'Uttar Pradesh' };
  reply = indiaPost([{ Status: 'Success', PostOffice: [dehat, dehat, nagar, nagar, nagar] }]);
  assert.deepEqual(await lookupPincode('208001'), { status: 'ok', city: 'Kanpur Nagar', state: 'Uttar Pradesh' });
});

test('an unknown pincode is not_found; a broken API is unavailable (and retried soon)', async () => {
  clearPincodeCache();
  reply = indiaPost([{ Status: 'Error', PostOffice: null }]);
  assert.deepEqual(await lookupPincode('999999'), { status: 'not_found' });

  clearPincodeCache();
  calls = 0;
  reply = indiaPost({}, 503);
  assert.deepEqual(await lookupPincode('110001'), { status: 'unavailable' });
  reply = () => {
    throw new Error('network down');
  };
  clearPincodeCache();
  assert.deepEqual(await lookupPincode('110001'), { status: 'unavailable' });
});

// ---- settings + HTTP route (DB) ----------------------------------------------
try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to real env vars
}
const uri = process.env.MONGODB_URI;

if (!uri) {
  test('delivery rules DB (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  let server: Server;
  let base = '';
  before(async () => {
    await mongoose.connect(uri, { dbName: 'stellar-test-delivery' });
    const app = express();
    app.use('/api/delivery', deliveryRouter);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/delivery`;
  });
  after(async () => {
    globalThis.fetch = realFetch;
    server.close();
    await SettingsModel.deleteMany({});
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    await SettingsModel.deleteMany({});
    clearPincodeCache();
    reply = indiaPost([{ Status: 'Success', PostOffice: [{ District: 'Kanpur Nagar', State: 'Uttar Pradesh' }] }]);
  });

  test('with no settings saved, the defaults apply', async () => {
    assert.deepEqual(await loadDeliveryRules(), { kanpurPins: KANPUR_DEFAULT_PINS, kanpurFee: 29900 });
  });

  test('the owner can change the fee and the pincode list', async () => {
    await SettingsModel.create({ kanpurPincodes: ['208010', '209001'], kanpurDeliveryFee: 35000 });
    const r = await loadDeliveryRules();
    assert.deepEqual(deliveryFor('209001', r), { kanpur: true, fee: 35000 });
    assert.deepEqual(deliveryFor('208001', r), { kanpur: false, fee: 0 }); // removed from the list
  });

  test('a fee of ₹0 is respected (free Kanpur delivery), not mistaken for "unset"', async () => {
    await SettingsModel.create({ kanpurDeliveryFee: 0 });
    assert.equal((await loadDeliveryRules()).kanpurFee, 0);
  });

  test('GET /api/delivery/:pin for a Kanpur pincode: autofill + the flat fee', async () => {
    const body = (await (await fetch(`${base}/208001`)).json()) as { data: Record<string, unknown> };
    assert.deepEqual(body.data, { pin: '208001', kanpur: true, fee: 29900, lookup: 'ok', city: 'Kanpur Nagar', state: 'Uttar Pradesh' });
  });

  test('outside Kanpur there is no fee, and the lookup still autofills', async () => {
    reply = indiaPost([{ Status: 'Success', PostOffice: [{ District: 'Lucknow', State: 'Uttar Pradesh' }] }]);
    const body = (await (await fetch(`${base}/226001`)).json()) as { data: Record<string, unknown> };
    assert.equal(body.data.kanpur, false);
    assert.equal(body.data.fee, 0);
    assert.equal(body.data.city, 'Lucknow');
  });

  test('if India Post is down the fee is still right and the customer is told to type city/state', async () => {
    reply = () => {
      throw new Error('down');
    };
    const body = (await (await fetch(`${base}/208001`)).json()) as { data: Record<string, unknown> };
    assert.equal(body.data.fee, 29900);
    assert.equal(body.data.lookup, 'unavailable');
    assert.equal(body.data.city, '');
  });

  test('a malformed pincode is a 400 and never reaches India Post', async () => {
    calls = 0;
    for (const bad of ['2080', 'abcdef', '2080011', '20800a']) {
      assert.equal((await fetch(`${base}/${bad}`)).status, 400, bad);
    }
    assert.equal(calls, 0);
  });
}
