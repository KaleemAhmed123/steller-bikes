import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
import { StaffModel } from '../src/models/staff.js';
import { requireAuth } from '../src/lib/auth.js';
import { signParams } from '../src/lib/cloudinary.js';
import { uploadsRouter } from '../src/routes/uploads.js';

// The upload-signing endpoints: signed-in staff only, off until the server has its Cloudinary values.
// Sessions are faked: the "x-staff" header stands in for a signed-in staff id.

try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to real env vars
}
const uri = process.env.MONGODB_URI;
const KEYS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_MAX_VIDEO_MB'] as const;

if (!uri) {
  test('upload routes (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  let server: Server;
  let base = '';
  let managerId = '';
  const saved: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

  before(async () => {
    for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; } // start with uploads OFF
    await mongoose.connect(uri, { dbName: 'stellar-test-upload-routes' });
    await StaffModel.deleteMany({});
    managerId = String((await StaffModel.create({ email: 'manager@test.local', passwordHash: 'x', role: 'manager' }))._id);
    const app = express();
    app.use(express.json());
    app.use(
      '/api/admin/uploads',
      (req, _res, next) => {
        (req as unknown as { session: object }).session = { staffId: req.header('x-staff') || undefined, destroy: () => undefined };
        next();
      },
      requireAuth,
      uploadsRouter,
    );
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/uploads`;
  });
  after(async () => {
    for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    server.close();
    await StaffModel.deleteMany({});
    await mongoose.disconnect();
  });

  const call = (path: string, init: { method?: string; body?: object; staff?: string } = {}) =>
    fetch(base + path, {
      method: init.method ?? 'GET',
      headers: { 'content-type': 'application/json', 'x-staff': init.staff ?? managerId },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

  test('signed out → 401', async () => {
    assert.equal((await call('', { staff: '' })).status, 401);
    assert.equal((await call('/sign', { method: 'POST', body: { kind: 'image' }, staff: '' })).status, 401);
  });

  test('not set up on the server: status says off, and signing is refused with a plain message', async () => {
    assert.deepEqual(await (await call('')).json(), { data: { enabled: false } });
    const res = await call('/sign', { method: 'POST', body: { kind: 'image' } });
    assert.equal(res.status, 503);
    assert.match(((await res.json()) as { error: { message: string } }).error.message, /not set up/i);
  });

  test('set up: a manager can sign an upload; the answer is correct and never contains the secret', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = '123';
    process.env.CLOUDINARY_API_SECRET = 'top-secret';
    assert.deepEqual(await (await call('')).json(), { data: { enabled: true } });
    const res = await call('/sign', { method: 'POST', body: { kind: 'media' } });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(!text.includes('top-secret'));
    const d = (JSON.parse(text) as { data: Record<string, string | number> }).data;
    assert.equal(d.cloudName, 'demo');
    assert.equal(d.apiKey, '123');
    assert.equal(d.resourceType, 'auto');
    assert.equal(d.signature, signParams({ allowed_formats: String(d.allowedFormats), timestamp: Number(d.timestamp) }, 'top-secret'));
  });

  test('an unknown kind is refused', async () => {
    assert.equal((await call('/sign', { method: 'POST', body: { kind: 'zip' } })).status, 400);
    assert.equal((await call('/sign', { method: 'POST', body: {} })).status, 400);
  });
}
