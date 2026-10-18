import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { StaffModel } from '../models/staff.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// POST /api/auth/login — verify credentials, start a session.
authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Enter your email and password.' } });
      return;
    }
    const staff = await StaffModel.findOne({ email: parsed.data.email.toLowerCase() });
    let ok = false;
    if (staff && staff.active) ok = await bcrypt.compare(parsed.data.password, staff.passwordHash);
    if (!staff || !ok) {
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
