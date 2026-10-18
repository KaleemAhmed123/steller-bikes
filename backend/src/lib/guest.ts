import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

const COOKIE = 'rc_guest';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Read one cookie value from the raw Cookie header (no cookie-parser dependency
// needed — we only have this one cookie for now).
function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

// Ensure every request carries a stable guest identity, stored in an httpOnly
// cookie and exposed as res.locals.owner (e.g. "guest:<uuid>"). New visitors get
// a fresh id + Set-Cookie. Cross-site in production (Vercel ↔ Render) needs
// SameSite=None; Secure; localhost dev is same-site so Lax is enough.
export function guestCart(req: Request, res: Response, next: NextFunction): void {
  // A logged-in customer owns their cart/orders by account id, not the guest
  // cookie — so cart, checkout and order history all follow them across devices.
  const customerId = req.session?.customerId;
  if (customerId) {
    res.locals.owner = `customer:${customerId}`;
    next();
    return;
  }

  let owner = readCookie(req.headers.cookie, COOKIE);

  if (!owner || !owner.startsWith('guest:')) {
    owner = `guest:${randomUUID()}`;
    const prod = config.NODE_ENV === 'production';
    res.cookie(COOKIE, owner, {
      httpOnly: true,
      sameSite: prod ? 'none' : 'lax',
      secure: prod,
      maxAge: THIRTY_DAYS_MS,
      path: '/',
    });
  }

  res.locals.owner = owner;
  next();
}
