import { Schema, model, InferSchemaType } from 'mongoose';

// Store settings — a single document of shop details the storefront shows
// (address, phone, hours, delivery policy). Every field defaults to '' so the
// storefront can keep its honest "coming soon" placeholder until it's filled.
// There is no admin UI yet (owner-only); set these directly or in a later phase.
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
  },
  { timestamps: true },
);

export type Settings = InferSchemaType<typeof settingsSchema>;
export const SettingsModel = model('Settings', settingsSchema);
