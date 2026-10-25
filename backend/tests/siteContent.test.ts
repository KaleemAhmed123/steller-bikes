import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { HERO_DEFAULTS, siteContentShape, toOfferKey, withSiteContent } from '../src/lib/siteContent.js';

// The Site content rules: defaults merge, link safety, retailer limits, offer keys.

const schema = z.object(siteContentShape).partial();

test('a fresh database shows the Canva copy, offer rail OFF, no retailers', () => {
  const c = withSiteContent(null);
  assert.deepEqual(c.hero, HERO_DEFAULTS);
  assert.equal(c.offerSection.enabled, false);
  assert.deepEqual(c.retailers, []);
});

test('a stored value wins field-by-field — including an admin-cleared empty string', () => {
  const c = withSiteContent({ hero: { statValue: '70,000+', promoHref: '' } });
  assert.equal(c.hero.statValue, '70,000+');
  assert.equal(c.hero.statLabel, HERO_DEFAULTS.statLabel); // never stored → default
  assert.equal(c.hero.promoHref, '');
});

test('links must be a site path or https — never javascript:/http:/data:', () => {
  const ok = (hero: object) => schema.safeParse({ hero: { ...HERO_DEFAULTS, ...hero } }).success;
  assert.ok(ok({ ctaHref: '/shop' }));
  assert.ok(ok({ promoHref: 'https://stellarbikes.in/originals' }));
  assert.ok(ok({ promoHref: '' }));
  assert.ok(!ok({ promoHref: 'javascript:alert(1)' }));
  assert.ok(!ok({ ctaHref: 'http://insecure.example' }));
});

test('hero videos: empty (use the bundled one), a /path or https are fine; anything else is refused', () => {
  const ok = (hero: object) => schema.safeParse({ hero: { ...HERO_DEFAULTS, ...hero } }).success;
  assert.equal(HERO_DEFAULTS.videoDesktop, '');
  assert.equal(HERO_DEFAULTS.videoMobile, '');
  assert.ok(ok({ videoDesktop: '', videoMobile: '' }));
  assert.ok(ok({ videoDesktop: 'https://res.cloudinary.com/demo/video/upload/hero.mp4' }));
  assert.ok(ok({ videoMobile: '/hero_section_mobile_view_video_compressed.mp4' }));
  assert.ok(!ok({ videoDesktop: 'javascript:alert(1)' }));
  assert.ok(!ok({ videoMobile: 'http://insecure.example/v.mp4' }));
  assert.ok(!ok({ videoDesktop: 'data:video/mp4;base64,AAAA' }));
});

test('retailers need a name and a logo; max 24; href must be https', () => {
  const r = (x: object) => schema.safeParse({ retailers: [x] }).success;
  assert.ok(r({ name: 'Hero', logo: '/logos/hero.png', href: '' }));
  assert.ok(r({ name: 'Hero', logo: 'https://res.cloudinary.com/x/hero.png', href: 'https://hero.com' }));
  assert.ok(!r({ name: '', logo: '/logos/hero.png', href: '' }));
  assert.ok(!r({ name: 'Hero', logo: 'hero.png', href: '' }));
  assert.ok(!r({ name: 'Hero', logo: '/a.png', href: 'http://x.com' }));
  const many = Array.from({ length: 25 }, () => ({ name: 'A', logo: '/a.png', href: '' }));
  assert.ok(!schema.safeParse({ retailers: many }).success);
});

test('offer rail keys are validated; names become kebab-case keys', () => {
  const o = (offerTypes: string[]) =>
    schema.safeParse({ offerSection: { enabled: true, title: 't', subtitle: 's', offerTypes } }).success;
  assert.ok(o(['diwali', 'new-year']));
  assert.ok(!o(['Diwali']));
  assert.ok(!o(['new year']));
  assert.equal(toOfferKey('  New Year! '), 'new-year');
  assert.equal(toOfferKey('!!!'), '');
});
