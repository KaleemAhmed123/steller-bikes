import { Schema, model, InferSchemaType } from 'mongoose';

// A back-office user. Password is stored as a bcrypt hash, never plaintext.
// role drives permissions (see lib/permissions.ts). active:false locks them out.
const staffSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager'], required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type Staff = InferSchemaType<typeof staffSchema>;
export const StaffModel = model('Staff', staffSchema);
