import { z } from 'zod';

// "Shop info" (Admin → Platform → Shop info): where the Open in Maps button goes, who to
// contact, and the pictures on the About page. Lives on the single Settings document.
// THE DEFAULTS BELONG HERE and nowhere else — the public + admin GET routes merge them over
// whatever is stored, so a fresh database already shows the shop's contact and map link.

// ponytail: the owner's first link was a Google "search viewer" page. A Maps *share* link
// (Google Maps → Share → Copy link) is what opens the phone's Maps app; the admin says so.
export const DEFAULT_MAP_LINK =
  'https://www.google.com/searchviewer/10?client=ms-android-samsung-gs-rev1&hs=PlYB&sca_esv=aafa6ca6a126c165&hl=en-IN&cs=1&output=search&svid=CCYSESoPCg0vZy8xMWNzYjJiNnN3GAo';
export const DEFAULT_CONTACT = { contactName: 'Saleem', contactPhone: '+91-8931076870' };

// The fixed picture slots of the About page, one per section (the gallery is a free list).
export const ABOUT_IMAGE_SLOTS = ['hero', 'story', 'matters', 'brand', 'guarantee'] as const;
export const GALLERY_MAX = 24;

// A picture is a site path ("/images/x.jpg") or https (Cloudinary after an upload). '' = none.
const imageLink = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || v.startsWith('https://'), {
    message: 'An image link must start with / or https://',
  });

const requiredImage = imageLink.refine((v) => v !== '', { message: 'Every gallery photo needs an image.' });

type Slot = (typeof ABOUT_IMAGE_SLOTS)[number];
// Every slot is built from the one list above, so adding a picture slot is a one-line change here.
const slotShape = Object.fromEntries(ABOUT_IMAGE_SLOTS.map((slot) => [slot, imageLink])) as Record<Slot, typeof imageLink>;

const aboutImagesSchema = z.object({
  ...slotShape,
  gallery: z
    .array(z.object({ url: requiredImage, alt: z.string().trim().max(120) }))
    .max(GALLERY_MAX),
});

// The shape merged into the admin settings schema (all optional on PATCH).
export const shopInfoShape = {
  // '' = no map link, and the shop's location row is plain text.
  mapLink: z
    .string()
    .trim()
    .max(1000)
    .refine((v) => v === '' || v.startsWith('https://'), { message: 'The map link must start with https://' }),
  contactName: z.string().trim().min(1, 'Enter a contact name.').max(60),
  contactPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 -]{5,24}$/, 'Enter a phone number, e.g. +91-8931076870.'),
  aboutImages: aboutImagesSchema,
};

export type AboutImages = z.infer<typeof aboutImagesSchema>;

const EMPTY_ABOUT_IMAGES: AboutImages = {
  ...(Object.fromEntries(ABOUT_IMAGE_SLOTS.map((slot) => [slot, ''])) as Record<Slot, string>),
  gallery: [],
};

// Stored value wins field by field (an admin-cleared '' map link stays cleared); anything
// never stored falls back to its default.
export function withShopInfo<T extends object>(doc: T | null | undefined) {
  const d = (doc ?? {}) as Partial<{ mapLink: string; contactName: string; contactPhone: string; aboutImages: Partial<AboutImages> }>;
  return {
    ...(doc ?? {}),
    mapLink: d.mapLink ?? DEFAULT_MAP_LINK,
    contactName: d.contactName || DEFAULT_CONTACT.contactName,
    contactPhone: d.contactPhone || DEFAULT_CONTACT.contactPhone,
    aboutImages: { ...EMPTY_ABOUT_IMAGES, ...(d.aboutImages ?? {}) },
    galleryMax: GALLERY_MAX, // so the admin form never hard-codes the limit the server enforces
  };
}
