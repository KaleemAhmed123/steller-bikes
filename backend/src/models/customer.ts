import { Schema, model, InferSchemaType } from 'mongoose';

// One saved delivery address in a customer's address book. Same fields as an
// order address, plus a label ("Home", "Shop") and a default flag.
const savedAddressSchema = new Schema({
  label: { type: String, default: '', trim: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pin: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
});

// A storefront shopper account. Password is a bcrypt hash, never plaintext.
// Email-verification + password-reset tokens are stored HASHED (sha256), so a
// leaked database can't be used to verify or reset anyone's account.
const customerSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    addresses: { type: [savedAddressSchema], default: [] },
    verifyTokenHash: { type: String, default: '' },
    verifyExpires: { type: Date },
    resetTokenHash: { type: String, default: '' },
    resetExpires: { type: Date },
  },
  { timestamps: true },
);

export type Customer = InferSchemaType<typeof customerSchema>;
export const CustomerModel = model('Customer', customerSchema);
