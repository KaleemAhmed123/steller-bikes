import { Schema, model, InferSchemaType } from 'mongoose';

// Store settings — a single document for the whole shop. Two concerns share it:
//   - shop-facing identity (address, phone, hours, delivery policy) — the Settings tab;
//   - operational config (categories, payment toggles, announcement) — the Platform tab.
// Shop-info fields default to '' so the storefront keeps its honest "coming soon".
// Payment toggles default ON so a fresh shop can sell; announcement is off (empty).
const settingsSchema = new Schema(
  {
    addressLine1: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pin: { type: String, default: '' },
    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    hours: { type: String, default: '' },
    deliveryPolicy: { type: String, default: '' },
    email: { type: String, default: '' },
    // Operational config (Platform tab).
    categories: { type: [String], default: [] }, // canonical category list (dropdown source)
    codEnabled: { type: Boolean, default: true }, // cash-on-delivery on/off
    onlinePaymentEnabled: { type: Boolean, default: true }, // Razorpay on/off (on top of env config)
    announcement: { type: String, default: '' }, // storefront banner line ('' = hidden)
    offerTypes: { type: [String], default: [] }, // master list of offer-type keys (Platform tab)
    // Site content (Site content tab). No defaults here on purpose: they live in
    // lib/siteContent.ts and are merged on read, so there is one copy of the copy.
    hero: {
      statValue: String,
      statLabel: String,
      tagline: String,
      ctaLabel: String,
      ctaHref: String,
      promoTitle: String,
      promoSubtitle: String,
      promoHref: String,
    },
    offerSection: {
      enabled: Boolean,
      title: String,
      subtitle: String,
      offerTypes: { type: [String], default: undefined }, // undefined (not []) so the default key list applies
    },
    retailers: [{ _id: false, name: String, logo: String, href: String }],
  },
  { timestamps: true },
);

export type Settings = InferSchemaType<typeof settingsSchema>;
export const SettingsModel = model('Settings', settingsSchema);
