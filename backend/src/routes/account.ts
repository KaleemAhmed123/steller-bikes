import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { HydratedDocument } from 'mongoose';
import { CustomerModel, type Customer } from '../models/customer.js';
import { sendEmail } from '../lib/email.js';
import { makeToken, hashToken } from '../lib/tokens.js';
import { requireCustomer, mergeGuestCart, claimGuestOrders } from '../lib/customerAuth.js';
import { loginLimiter } from '../lib/rateLimit.js';
import { config } from '../config.js';

export const accountRouter = Router();

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000; // 1h

// --- Validation -------------------------------------------------------------

const emailField = z.string().trim().email();
const passwordField = z.string().min(8, 'Use at least 8 characters.');

const signupSchema = z.object({
  email: emailField,
  password: passwordField,
  name: z.string().trim().min(1, 'Enter your name.'),
});

const addressFields = {
  label: z.string().trim().max(40).optional(),
  name: z.string().trim().min(1),
  phone: z.string().trim().regex(/^\d{10}$/, 'Enter a 10-digit phone number.'),
  line1: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  pin: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code.'),
  isDefault: z.boolean().optional(),
};
const addAddressSchema = z.object(addressFields);
const updateAddressSchema = z.object(addressFields).partial();

// --- Serialisers (never leak the password hash or token hashes) -------------

type LeanCustomer = Customer & { _id: unknown };
// A subdocument address carries its own _id even though the schema doesn't name it.
type AddressDoc = LeanCustomer['addresses'][number] & { _id: unknown };

function publicAddress(a: AddressDoc) {
  return {
    id: String(a._id),
    label: a.label ?? '',
    name: a.name,
    phone: a.phone,
    line1: a.line1,
    city: a.city,
    state: a.state,
    pin: a.pin,
    isDefault: Boolean(a.isDefault),
  };
}

function publicCustomer(c: LeanCustomer) {
  return {
    id: String(c._id),
    email: c.email,
    name: c.name,
    emailVerified: Boolean(c.emailVerified),
    addresses: ((c.addresses ?? []) as AddressDoc[]).map(publicAddress),
  };
}

// --- Signup / login / logout / me -------------------------------------------

accountRouter.post('/signup', loginLimiter, async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Check your details.' } });
      return;
    }
    const email = parsed.data.email.toLowerCase();
    if (await CustomerModel.exists({ email })) {
      res.status(409).json({ error: { message: 'An account with this email already exists.' } });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const { token, hash } = makeToken();
    const customer = await CustomerModel.create({
      email,
      passwordHash,
      name: parsed.data.name,
      verifyTokenHash: hash,
      verifyExpires: new Date(Date.now() + VERIFY_TTL_MS),
    });

    await sendVerifyEmail(email, token);

    // Log them in right away; email verification can happen afterwards.
    req.session.customerId = String(customer._id);
    await mergeGuestCart(res.locals.owner as string | undefined, String(customer._id));

    res.status(201).json({ data: publicCustomer(customer.toObject() as LeanCustomer) });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({ email: emailField, password: z.string().min(1) });

// A fixed hash to compare against when the email isn't found, so a missing
// account costs the same time as a wrong password (no email-enumeration oracle).
const DUMMY_HASH = bcrypt.hashSync('no-such-account', 10);

accountRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Enter your email and password.' } });
      return;
    }
    const customer = await CustomerModel.findOne({ email: parsed.data.email.toLowerCase() });
    // Always run bcrypt (dummy hash when there's no customer) for uniform timing.
    const ok = await bcrypt.compare(parsed.data.password, customer?.passwordHash ?? DUMMY_HASH);
    if (!customer || !ok) {
      res.status(401).json({ error: { message: 'Wrong email or password.' } });
      return;
    }

    req.session.customerId = String(customer._id);
    await mergeGuestCart(res.locals.owner as string | undefined, String(customer._id));

    res.json({ data: publicCustomer(customer.toObject() as LeanCustomer) });
  } catch (err) {
    next(err);
  }
});

accountRouter.post('/logout', (req, res) => {
  // Clear only the customer; leave any staff session in this browser alone.
  delete req.session.customerId;
  res.json({ data: { ok: true } });
});

accountRouter.get('/me', requireCustomer, (_req, res) => {
  res.json({ data: publicCustomer(res.locals.customer as LeanCustomer) });
});

// --- Email verification -----------------------------------------------------

async function sendVerifyEmail(email: string, token: string): Promise<void> {
  const link = `${config.FRONTEND_ORIGIN}/account/verify?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify your Stellar Bikes account',
    text: `Welcome to Stellar Bikes!\n\nVerify your email to link your past orders:\n${link}\n\nThis link expires in 24 hours.`,
  });
}

const tokenSchema = z.object({ token: z.string().trim().min(1) });

accountRouter.post('/verify', loginLimiter, async (req, res, next) => {
  try {
    const parsed = tokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Invalid verification link.' } });
      return;
    }
    const customer = await CustomerModel.findOne({
      verifyTokenHash: hashToken(parsed.data.token),
      verifyExpires: { $gt: new Date() },
    });
    if (!customer) {
      res.status(400).json({ error: { message: 'This link is invalid or has expired.' } });
      return;
    }

    customer.emailVerified = true;
    customer.verifyTokenHash = '';
    customer.verifyExpires = undefined;
    await customer.save();
    await claimGuestOrders(customer.email, String(customer._id));

    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

// --- Password reset (request + confirm) -------------------------------------

accountRouter.post('/password/forgot', loginLimiter, async (req, res, next) => {
  try {
    const parsed = z.object({ email: emailField }).safeParse(req.body);
    // Always answer the same way — never reveal which emails are registered.
    if (parsed.success) {
      const customer = await CustomerModel.findOne({ email: parsed.data.email.toLowerCase() });
      if (customer) {
        const { token, hash } = makeToken();
        customer.resetTokenHash = hash;
        customer.resetExpires = new Date(Date.now() + RESET_TTL_MS);
        await customer.save();
        const link = `${config.FRONTEND_ORIGIN}/reset-password?token=${token}`;
        await sendEmail({
          to: customer.email,
          subject: 'Reset your Stellar Bikes password',
          text: `Reset your password here:\n${link}\n\nThis link expires in 1 hour. If you didn't ask for this, ignore this email.`,
        });
      }
    }
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

accountRouter.post('/password/reset', loginLimiter, async (req, res, next) => {
  try {
    const parsed = z.object({ token: z.string().trim().min(1), password: passwordField }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Invalid reset link.' } });
      return;
    }
    const customer = await CustomerModel.findOne({
      resetTokenHash: hashToken(parsed.data.token),
      resetExpires: { $gt: new Date() },
    });
    if (!customer) {
      res.status(400).json({ error: { message: 'This link is invalid or has expired.' } });
      return;
    }

    customer.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    customer.resetTokenHash = '';
    customer.resetExpires = undefined;
    // Completing a reset proves control of the inbox — mark verified + claim.
    customer.emailVerified = true;
    await customer.save();
    await claimGuestOrders(customer.email, String(customer._id));

    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

// --- Address book -----------------------------------------------------------

// If this address is being made the default, clear the flag on all the others.
function applyDefault(customer: HydratedDocument<Customer>, makeDefaultId: string | null): void {
  if (!makeDefaultId) return;
  for (const addr of customer.addresses) {
    (addr as unknown as { isDefault: boolean }).isDefault = String((addr as { _id: unknown })._id) === makeDefaultId;
  }
}

accountRouter.post('/addresses', requireCustomer, async (req, res, next) => {
  try {
    const parsed = addAddressSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Check the address.' } });
      return;
    }
    const customer = await CustomerModel.findById(req.session.customerId);
    if (!customer) {
      res.status(401).json({ error: { message: 'Please sign in.' } });
      return;
    }
    // First address added is the default automatically.
    const makeDefault = parsed.data.isDefault || customer.addresses.length === 0;
    customer.addresses.push({ ...parsed.data, isDefault: makeDefault });
    const added = customer.addresses[customer.addresses.length - 1] as unknown as { _id: unknown };
    if (makeDefault) applyDefault(customer, String(added._id));
    await customer.save();
    res.status(201).json({ data: publicCustomer(customer.toObject() as LeanCustomer).addresses });
  } catch (err) {
    next(err);
  }
});

accountRouter.patch('/addresses/:id', requireCustomer, async (req, res, next) => {
  try {
    const parsed = updateAddressSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Check the address.' } });
      return;
    }
    const customer = await CustomerModel.findById(req.session.customerId);
    if (!customer) {
      res.status(401).json({ error: { message: 'Please sign in.' } });
      return;
    }
    const addr = customer.addresses.find((a) => String((a as { _id: unknown })._id) === req.params.id);
    if (!addr) {
      res.status(404).json({ error: { message: 'Address not found.' } });
      return;
    }
    const { isDefault, ...fields } = parsed.data;
    Object.assign(addr, fields);
    if (isDefault) applyDefault(customer, req.params.id);
    await customer.save();
    res.json({ data: publicCustomer(customer.toObject() as LeanCustomer).addresses });
  } catch (err) {
    next(err);
  }
});

accountRouter.delete('/addresses/:id', requireCustomer, async (req, res, next) => {
  try {
    const customer = await CustomerModel.findById(req.session.customerId);
    if (!customer) {
      res.status(401).json({ error: { message: 'Please sign in.' } });
      return;
    }
    const before = customer.addresses.length;
    customer.addresses = customer.addresses.filter(
      (a) => String((a as { _id: unknown })._id) !== req.params.id,
    ) as typeof customer.addresses;
    if (customer.addresses.length === before) {
      res.status(404).json({ error: { message: 'Address not found.' } });
      return;
    }
    // If we removed the default and others remain, promote the first one.
    if (customer.addresses.length > 0 && !customer.addresses.some((a) => (a as { isDefault?: boolean }).isDefault)) {
      (customer.addresses[0] as unknown as { isDefault: boolean }).isDefault = true;
    }
    await customer.save();
    res.json({ data: publicCustomer(customer.toObject() as LeanCustomer).addresses });
  } catch (err) {
    next(err);
  }
});
