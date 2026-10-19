import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { StaffModel } from '../models/staff.js';
import { loginLimiter } from '../lib/rateLimit.js';

export const authRouter = Router();

// A fixed hash to compare against when the email isn't found, so a missing
// account costs the same time as a wrong password (no email-enumeration oracle).
const DUMMY_HASH = bcrypt.hashSync('no-such-account', 10);

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// POST /api/auth/login — verify credentials, start a session. Rate-limited to
// blunt password brute-force against staff accounts.
authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Enter your email and password.' } });
      return;
    }
    const staff = await StaffModel.findOne({ email: parsed.data.email.toLowerCase() });
    // Always run bcrypt (against a dummy hash when there's no staff) so the
    // response time doesn't reveal whether the email exists.
    const ok = await bcrypt.compare(parsed.data.password, staff?.passwordHash ?? DUMMY_HASH);
    if (!staff || !staff.active || !ok) {
      res.status(401).json({ error: { message: 'Wrong email or password.' } });
      return;
    }
    req.session.staffId = String(staff._id);
    res.json({ data: { email: staff.email, role: staff.role } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout — end the session.
authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('rc_admin');
    res.json({ data: { ok: true } });
  });
});

// GET /api/auth/me — who am I? (401 if not signed in.)
authRouter.get('/me', async (req, res, next) => {
  try {
    const staffId = req.session.staffId;
    if (!staffId) {
      res.status(401).json({ error: { message: 'Not signed in.' } });
      return;
    }
    const staff = await StaffModel.findById(staffId).lean();
    if (!staff || !staff.active) {
      res.status(401).json({ error: { message: 'Not signed in.' } });
      return;
    }
    res.json({ data: { email: staff.email, role: staff.role } });
  } catch (err) {
    next(err);
  }
});
