import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
import { SettingsModel } from '../src/models/settings.js';
import { StaffModel } from '../src/models/staff.js';
import { requireAuth } from '../src/lib/auth.js';
import { adminRouter } from '../src/routes/admin.js';
import { settingsRouter } from '../src/routes/settings.js';

// The settings routes end to end (auth, validation, saving, defaults) for the Promo strip and
// Shop info features. Sessions are faked: the "x-staff" header stands in for a signed-in staff id.

try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to real env vars
}
const uri = process.env.MONGODB_URI;

if (!uri) {
  test('settings routes (skipped — set MONGODB_URI to run)', { skip: true }, () => {});
} else {
  let server: Server;
  let base = '';
  let ownerId = '';
  let managerId = '';

  before(async () => {
    await mongoose.connect(uri, { dbName: 'stellar-test-settings-routes' });
    await StaffModel.deleteMany({});
    ownerId = String((await StaffModel.create({ email: 'owner@test.local', passwordHash: 'x', role: 'owner' }))._id);
    managerId = String((await StaffModel.create({ email: 'manager@test.local', passwordHash: 'x', role: 'manager' }))._id);

    const app = express();
    app.use(express.json());
    app.use('/api/settings', settingsRouter);
    app.use(
      '/api/admin',
      (req, _res, next) => {
        (req as unknown as { session: object }).session = { staffId: req.header('x-staff') || undefined, destroy: () => undefined };
        next();
      },
      requireAuth,
      adminRouter,
    );
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });
  after(async () => {
    server.close();
    await SettingsModel.deleteMany({});
    await StaffModel.deleteMany({});
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    await SettingsModel.deleteMany({});
  });

  const patch = (body: object, staff = ownerId) =>
    fetch(`${base}/admin/settings`, { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-staff': staff }, body: JSON.stringify(body) });
  const message = async (res: Response) => ((await res.json()) as { error: { message: string } }).error.message;
  const data = async (res: Response) => ((await res.json()) as { data: Record<string, unknown> }).data;

  test('signed out → 401, manager → 403, owner → 200', async () => {
    assert.equal((await patch({ contactName: 'A' }, '')).status, 401);
    assert.equal((await patch({ contactName: 'A' }, managerId)).status, 403);
    assert.equal((await patch({ contactName: 'A' })).status, 200);
  });

  test('a fresh shop gets every default, on both the admin and the public route', async () => {
    const admin = await data(await fetch(`${base}/admin/settings`, { headers: { 'x-staff': ownerId } }));
    const pub = await data(await fetch(`${base}/settings`));
    for (const d of [admin, pub]) {
      assert.equal(d.announcementStyle, 'everyday');
      assert.equal(d.contactName, 'Saleem');
      assert.equal(d.contactPhone, '+91-8931076870');
      assert.equal(d.galleryMax, 24);
      assert.match(String(d.countdownEndsAt), /^\d{4}-\d{2}-\d{2}T.*Z$/);
      assert.deepEqual(d.aboutImages, { hero: '', story: '', matters: '', brand: '', guarantee: '', gallery: [] });
    }
  });

  test('Shop info: a saved map link, contact and About pictures show up on the public route', async () => {
    const res = await patch({
      mapLink: 'https://maps.app.goo.gl/abc',
      contactName: 'Aslam',
      contactPhone: '+91 98765 43210',
      aboutImages: { hero: '/images/a.jpg', story: '', matters: '', brand: '', guarantee: '', gallery: [{ url: 'https://res.cloudinary.com/x/y.jpg', alt: 'Shop' }] },
    });
    assert.equal(res.status, 200);
    const pub = await data(await fetch(`${base}/settings`));
    assert.equal(pub.mapLink, 'https://maps.app.goo.gl/abc');
    assert.equal(pub.contactName, 'Aslam');
    assert.equal((pub.aboutImages as { hero: string }).hero, '/images/a.jpg');
    assert.deepEqual((pub.aboutImages as { gallery: unknown[] }).gallery, [{ url: 'https://res.cloudinary.com/x/y.jpg', alt: 'Shop' }]);
  });

  test('Shop info: bad input is refused with a plain message and nothing is saved', async () => {
    assert.match(await message(await patch({ mapLink: 'http://insecure.example' })), /https/);
    assert.match(await message(await patch({ contactPhone: 'call me' })), /phone/i);
    const tooMany = { hero: '', story: '', matters: '', brand: '', guarantee: '', gallery: Array.from({ length: 25 }, () => ({ url: '/images/a.jpg', alt: '' })) };
    assert.equal((await patch({ aboutImages: tooMany })).status, 400);
    assert.equal((await patch({ aboutImages: { ...tooMany, hero: 'javascript:alert(1)', gallery: [] } })).status, 400);
    assert.equal(await SettingsModel.countDocuments({ mapLink: { $exists: true } }), 0);
  });

  test('an owner can clear the map link on purpose and it stays cleared', async () => {
    assert.equal((await patch({ mapLink: '' })).status, 200);
    assert.equal((await data(await fetch(`${base}/settings`))).mapLink, '');
  });

  test('Promo strip: style and countdown date are saved; a bad style or date is refused', async () => {
    const res = await patch({ announcement: 'Diwali sale', announcementStyle: 'diwali', countdownEndsAt: '2026-11-12T12:30:00.000Z' });
    assert.equal(res.status, 200);
    const pub = await data(await fetch(`${base}/settings`));
    assert.equal(pub.announcementStyle, 'diwali');
    assert.equal(pub.announcement, 'Diwali sale');
    assert.equal(pub.countdownEndsAt, '2026-11-12T12:30:00.000Z');
    assert.equal((await patch({ announcementStyle: 'Not A Style!' })).status, 400);
    assert.equal((await patch({ countdownEndsAt: 'tomorrow' })).status, 400);
  });

  test('saving one tab never disturbs another: partial saves leave the rest alone', async () => {
    await patch({ contactName: 'Aslam', announcementStyle: 'holi' });
    await patch({ mapLink: 'https://maps.app.goo.gl/zzz' });
    const pub = await data(await fetch(`${base}/settings`));
    assert.equal(pub.contactName, 'Aslam');
    assert.equal(pub.announcementStyle, 'holi');
    assert.equal(pub.mapLink, 'https://maps.app.goo.gl/zzz');
  });
}
