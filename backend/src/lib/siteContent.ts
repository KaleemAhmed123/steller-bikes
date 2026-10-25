import { z } from 'zod';

// Admin-editable storefront content (the "Site content" admin page): the text laid
// over the hero video, the homepage offer rail, and the Authorized Retailers grid.
// It lives on the single Settings document. THE DEFAULTS BELONG HERE and nowhere
// else — the public + admin GET routes merge them over whatever is stored, so a
// fresh database already shows the Canva copy and the frontend carries no copy.

// A key is how an offer type is stored on products and in URLs: "diwali", "new-year".
export const OFFER_KEY_MAX = 40;
const OFFER_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const offerKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(OFFER_KEY_MAX)
  .regex(OFFER_KEY_RE, 'Offer types are lowercase words joined by hyphens, e.g. new-year.');

// "New Year!" → "new-year". Lets the admin type a human name; we store the key.
export function toOfferKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, OFFER_KEY_MAX);
}

// Links are either a site path ("/shop") or https — never javascript:/http:/data:.
const linkOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || v.startsWith('https://'), {
    message: 'A link must start with / (a page on this site) or https://',
  });

// A video for the hero: '' = use the one bundled with the site, else a /path or https link
// (Cloudinary after an admin upload). Never javascript:/http:/data:.
const videoLinkOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || v.startsWith('https://'), {
    message: 'A video link must start with / or https://',
  });

const heroSchema = z.object({
  statValue: z.string().trim().max(40),
  statLabel: z.string().trim().max(60),
  tagline: z.string().trim().max(80),
  ctaLabel: z.string().trim().max(40),
  ctaHref: linkOrEmpty,
  promoTitle: z.string().trim().max(60),
  promoSubtitle: z.string().trim().max(60),
  promoHref: linkOrEmpty, // '' = the Stellar Originals text is NOT clickable
  videoDesktop: videoLinkOrEmpty, // wide-screen hero video; '' = bundled default
  videoMobile: videoLinkOrEmpty, // phone (portrait) hero video; '' = bundled default
});

const offerSectionSchema = z.object({
  enabled: z.boolean(),
  title: z.string().trim().max(60),
  subtitle: z.string().trim().max(160),
  offerTypes: z.array(offerKeySchema).max(10),
});

const retailerSchema = z.object({
  name: z.string().trim().min(1, 'Every retailer needs a name.').max(60),
  logo: z
    .string()
    .trim()
    .min(1, 'Every retailer needs a logo (paste a link or upload).')
    .max(500)
    .refine((v) => v.startsWith('/') || v.startsWith('https://'), {
      message: 'A logo link must start with / or https://',
    }),
  href: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || v.startsWith('https://'), { message: 'A retailer link must start with https://' }),
});

export const RETAILERS_MAX = 24;

// The shape merged into the admin settings schema (all optional on PATCH).
export const siteContentShape = {
  hero: heroSchema,
  offerSection: offerSectionSchema,
  retailers: z.array(retailerSchema).max(RETAILERS_MAX),
};

export type Hero = z.infer<typeof heroSchema>;
export type OfferSection = z.infer<typeof offerSectionSchema>;
export type Retailer = z.infer<typeof retailerSchema>;

export const HERO_DEFAULTS: Hero = {
  statValue: '60,000+',
  statLabel: 'TRUSTED CUSTOMERS',
  tagline: 'Sellers of Various Brands',
  ctaLabel: 'EXPLORE OUR RANGES',
  ctaHref: '/shop',
  promoTitle: 'STELLAR ORIGINALS',
  promoSubtitle: 'Coming Soon',
  promoHref: '',
  videoDesktop: '',
  videoMobile: '',
};

export const OFFER_SECTION_DEFAULTS: OfferSection = {
  enabled: false, // off until the owner switches a sale season on
  title: 'Diwali Offer',
  subtitle: 'Boat Headphones available on selective products',
  offerTypes: ['diwali'],
};

// Stored value wins field-by-field (so an admin-cleared '' stays cleared and the
// line hides); anything never stored falls back to the default.
export function withSiteContent<T extends object>(doc: T | null | undefined) {
  const d = (doc ?? {}) as Partial<{ hero: Partial<Hero>; offerSection: Partial<OfferSection>; retailers: Retailer[] }>;
  return {
    ...(doc ?? {}),
    hero: { ...HERO_DEFAULTS, ...(d.hero ?? {}) },
    offerSection: { ...OFFER_SECTION_DEFAULTS, ...(d.offerSection ?? {}) },
    retailers: d.retailers ?? [],
  };
}
