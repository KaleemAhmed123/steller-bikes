import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cloudinaryConfig, signParams, signUpload } from '../src/lib/cloudinary.js';

// Signing the way Cloudinary checks it. The two vectors below are Cloudinary's own worked examples
// (https://cloudinary.com/documentation/authentication_signatures, secret "abcd").

test('signature: matches Cloudinary\'s own example with only a timestamp', () => {
  assert.equal(signParams({ timestamp: 1315060510 }, 'abcd'), 'a21ad0f63beb4de2e5575204b79ab90bffb02c10');
});

test('signature: fields are sorted by name, so the order we pass them in does not matter', () => {
  const a = signParams({ timestamp: 1315060510, public_id: 'sample_image', eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' }, 'abcd');
  const b = signParams({ eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 }, 'abcd');
  assert.equal(a, 'bfd09f95f331f558cbd1320e67aa8d488770583e'); // Cloudinary's second example
  assert.equal(a, b);
});

test('config: uploads are off unless cloud name, key AND secret are all set', () => {
  assert.equal(cloudinaryConfig({}), null);
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: '123' }), null);
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: '123', CLOUDINARY_API_SECRET: '   ' }), null);
  const on = cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: ' demo ', CLOUDINARY_API_KEY: '123', CLOUDINARY_API_SECRET: 'shh' });
  assert.deepEqual(on, { cloudName: 'demo', apiKey: '123', apiSecret: 'shh', maxVideoMb: 50 });
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: 'd', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's', CLOUDINARY_MAX_VIDEO_MB: '80' })?.maxVideoMb, 80);
});

const cfg = { cloudName: 'demo', apiKey: '123', apiSecret: 'top-secret', maxVideoMb: 50 };

test('an upload signature signs exactly the fields the browser will send, and never reveals the secret', () => {
  const s = signUpload('image', cfg, 1_700_000_000_500);
  assert.equal(s.timestamp, 1_700_000_000);
  assert.equal(s.signature, signParams({ allowed_formats: s.allowedFormats, timestamp: s.timestamp }, 'top-secret'));
  assert.equal(s.resourceType, 'image');
  assert.ok(!JSON.stringify(s).includes('top-secret'));
});

test('photos allow images only; media also allows video, and uses the "auto" address', () => {
  const image = signUpload('image', cfg);
  const media = signUpload('media', cfg);
  assert.ok(!image.allowedFormats.includes('mp4'));
  assert.ok(media.allowedFormats.includes('mp4') && media.allowedFormats.includes('jpg'));
  assert.equal(media.resourceType, 'auto');
  assert.notEqual(image.signature, media.signature); // different rules, different signature
});
