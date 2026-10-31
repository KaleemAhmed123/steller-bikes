import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminApi, uploadImage, uploadMedia } from '../lib/api';
import { uploadPhoto } from '../lib/photoUpload';

// The signed-upload path, against a pretend server and a pretend Cloudinary. It proves the browser asks OUR server
// for a signature first, sends exactly those signed fields to Cloudinary, never sends a secret or preset, and
// stores the hosted link that comes back.

const realFetch = globalThis.fetch;
const SIGNATURE = {
  cloudName: 'demo-cloud',
  apiKey: '123456',
  timestamp: 1_700_000_000,
  allowedFormats: 'jpg,png',
  resourceType: 'image',
  signature: 'abc123signature',
  maxVideoMb: 1,
};
let sent: { url: string; method?: string; body?: BodyInit | null }[] = [];

// `server` answers our API; `cloudinary` answers api.cloudinary.com.
function pretend(server: { status: number; json: object }, cloudinary?: { ok: boolean; json: object }) {
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    sent.push({ url: String(url), method: init?.method, body: init?.body });
    if (String(url).startsWith('https://api.cloudinary.com/')) {
      return { ok: cloudinary?.ok ?? false, json: async () => cloudinary?.json ?? {} } as Response;
    }
    return { ok: server.status < 400, status: server.status, json: async () => server.json } as Response;
  }) as typeof fetch;
}
const signed = (over: object = {}) => ({ status: 200, json: { data: { ...SIGNATURE, ...over } } });
const toCloudinary = () => sent.filter((c) => c.url.startsWith('https://api.cloudinary.com/'));
const photo = (type = 'image/jpeg', bytes = 1000) => new File([new Uint8Array(bytes)], 'shop.jpg', { type });
const HOSTED = 'https://res.cloudinary.com/demo-cloud/image/upload/v1/shop.jpg';

beforeEach(() => {
  sent = [];
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('the admin asks our server whether uploads are set up', async () => {
  pretend({ status: 200, json: { data: { enabled: true } } });
  assert.deepEqual(await adminApi.uploads.status(), { enabled: true });
  assert.match(sent[0].url, /\/api\/admin\/uploads$/);
});

test('a photo: first a signature from our server, then Cloudinary gets exactly the signed fields, and the hosted link comes back', async () => {
  pretend(signed(), { ok: true, json: { secure_url: HOSTED, resource_type: 'image' } });
  assert.equal(await uploadImage(photo()), HOSTED);

  assert.match(sent[0].url, /\/api\/admin\/uploads\/sign$/);
  assert.equal(sent[0].method, 'POST');
  assert.deepEqual(JSON.parse(String(sent[0].body)), { kind: 'image' });

  const [cloud] = toCloudinary();
  assert.equal(cloud.url, 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
  const form = cloud.body as FormData;
  assert.equal(form.get('api_key'), '123456');
  assert.equal(form.get('timestamp'), '1700000000');
  assert.equal(form.get('allowed_formats'), 'jpg,png');
  assert.equal(form.get('signature'), 'abc123signature');
  assert.ok(form.get('file'));
  assert.equal(form.get('upload_preset'), null, 'no unsigned preset any more');
  assert.equal(form.get('api_secret'), null, 'the secret never reaches the browser');
});

test('server not set up: the owner gets the server\'s plain message and nothing goes to Cloudinary', async () => {
  pretend({ status: 503, json: { error: { message: 'Photo upload is not set up on the server yet. Paste an image link instead.' } } });
  await assert.rejects(uploadImage(photo()), /not set up on the server/);
  assert.equal(toCloudinary().length, 0);
});

test('Cloudinary\'s own error message is shown when it refuses a file', async () => {
  pretend(signed(), { ok: false, json: { error: { message: 'Invalid Signature' } } });
  await assert.rejects(uploadImage(photo()), /Invalid Signature/);
});

test('the About page flow: a wrong type or an oversize photo is refused before anything is sent at all', async () => {
  pretend(signed(), { ok: true, json: { secure_url: HOSTED } });
  await assert.rejects(uploadPhoto(photo('application/pdf'), { w: 800, h: 600 }), /JPG, PNG or WebP/);
  await assert.rejects(uploadPhoto(photo('image/jpeg', 6 * 1024 * 1024), { w: 800, h: 600 }), /over 5 MB/);
  assert.equal(sent.length, 0);
  assert.equal((await uploadPhoto(photo('image/webp'), { w: 800, h: 600 })).url, HOSTED);
});

test('a video over the server\'s cap is refused after signing but before uploading; a small one goes to the "auto" address', async () => {
  pretend(signed({ resourceType: 'auto', maxVideoMb: 1 }), { ok: true, json: { secure_url: 'https://res.cloudinary.com/demo-cloud/video/upload/v1/hero.mp4', resource_type: 'video' } });
  await assert.rejects(uploadMedia(new File([new Uint8Array(2 * 1024 * 1024)], 'hero.mp4', { type: 'video/mp4' })), /over 1 MB/);
  assert.equal(toCloudinary().length, 0);

  const small = await uploadMedia(new File([new Uint8Array(1000)], 'hero.mp4', { type: 'video/mp4' }));
  assert.equal(small.type, 'video');
  assert.equal(toCloudinary()[0].url, 'https://api.cloudinary.com/v1_1/demo-cloud/auto/upload');
  assert.deepEqual(JSON.parse(String(sent.find((c) => c.url.includes('/sign'))!.body)), { kind: 'media' });
});
