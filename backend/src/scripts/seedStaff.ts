import process from 'node:process';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDb } from '../db.js';
import { StaffModel } from '../models/staff.js';

// Create or update a staff login from env vars. This is how the FIRST owner is
// made (there's no admin yet to create it), and how managers are added later.
//   STAFF_EMAIL=you@shop.com STAFF_PASSWORD=secret STAFF_ROLE=owner npm run seed:staff
// STAFF_ROLE defaults to 'owner'. Password is bcrypt-hashed; plaintext is never stored.
async function run(): Promise<void> {
  const email = process.env.STAFF_EMAIL?.toLowerCase().trim();
  const password = process.env.STAFF_PASSWORD;
  const role = (process.env.STAFF_ROLE ?? 'owner').trim();

  if (!email || !password) {
    console.error('Set STAFF_EMAIL and STAFF_PASSWORD (and optional STAFF_ROLE=owner|manager).');
    process.exit(1);
  }
  if (role !== 'owner' && role !== 'manager') {
    console.error('STAFF_ROLE must be "owner" or "manager".');
    process.exit(1);
  }

  await connectDb();
  const passwordHash = await bcrypt.hash(password, 10);
  await StaffModel.updateOne(
    { email },
    { $set: { passwordHash, role, active: true }, $setOnInsert: { email } },
    { upsert: true },
  );
  console.log(`Seeded staff ${email} (${role}).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('seed:staff failed:', err);
  process.exit(1);
});
