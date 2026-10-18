import type { Request, Response, NextFunction } from 'express';
import { StaffModel } from '../models/staff.js';
import { can, type Permission, type Role } from './permissions.js';

// Tell express-session we keep the logged-in staff id on the session.
declare module 'express-session' {
  interface SessionData {
    staffId?: string;
  }
}

export interface ActorStaff {
  id: string;
  email: string;
  role: Role;
}

// Gate: require a signed-in, active staff member. Loads them onto res.locals.staff.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const staffId = req.session.staffId;
    if (!staffId) {
      res.status(401).json({ error: { message: 'Please sign in.' } });
      return;
    }
    const staff = await StaffModel.findById(staffId).lean();
    if (!staff || !staff.active) {
      req.session.destroy(() => undefined);
      res.status(401).json({ error: { message: 'Please sign in.' } });
      return;
    }
    res.locals.staff = { id: String(staff._id), email: staff.email, role: staff.role as Role };
    next();
  } catch (err) {
    next(err);
  }
}

// Gate: require one permission. Use after requireAuth.
export function requirePermission(permission: Permission) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const staff = res.locals.staff as ActorStaff | undefined;
    if (!staff || !can(staff.role, permission)) {
      res.status(403).json({ error: { message: 'You do not have permission for this.' } });
      return;
    }
    next();
  };
}
