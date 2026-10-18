import type { Request, Response, NextFunction } from 'express';
import { CustomerModel } from '../models/customer.js';
import { CartModel } from '../models/cart.js';
import { OrderModel } from '../models/order.js';

// We keep the logged-in customer's id on the shared session (same cookie staff
// use; a browser is only ever one or the other on the storefront).
declare module 'express-session' {
  interface SessionData {
    customerId?: string;
  }
}

// Gate: require a signed-in customer. Loads the lean customer onto res.locals.
export async function requireCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.session.customerId;
    if (!id) {
      res.status(401).json({ error: { message: 'Please sign in.' } });
      return;
    }
    const customer = await CustomerModel.findById(id).lean();
    if (!customer) {
      delete req.session.customerId;
      res.status(401).json({ error: { message: 'Please sign in.' } });
      return;
    }
    res.locals.customer = customer;
    next();
  } catch (err) {
    next(err);
  }
}

// On login/signup, fold the guest cart (from the rc_guest cookie) into the
// customer's cart: union by variant, summing quantities. The guest cart row is
// removed afterward so it can't resurface.
export async function mergeGuestCart(guestOwner: string | undefined, customerId: string): Promise<void> {
  if (!guestOwner || !guestOwner.startsWith('guest:')) return;

  const guest = await CartModel.findOne({ owner: guestOwner });
  if (!guest || guest.items.length === 0) {
    if (guest) await guest.deleteOne();
    return;
  }

  const customerOwner = `customer:${customerId}`;
  const cart =
    (await CartModel.findOne({ owner: customerOwner })) ??
    new CartModel({ owner: customerOwner, items: [] });

  for (const gi of guest.items) {
    const line = cart.items.find((i) => String(i.variantId) === String(gi.variantId));
    if (line) line.quantity += gi.quantity;
    else cart.items.push({ variantId: gi.variantId, quantity: gi.quantity });
  }

  await cart.save();
  await guest.deleteOne();
}

// Link orders this person placed as a guest (same email) to their account, so
// they show up in order history. Called ONLY after the email is PROVEN
// (verification link clicked, or password reset completed) — email alone isn't
// proof of ownership, so we never claim on plain signup/login.
export async function claimGuestOrders(email: string, customerId: string): Promise<void> {
  await OrderModel.updateMany(
    { email: email.toLowerCase(), owner: { $regex: '^guest:' } },
    { $set: { owner: `customer:${customerId}` } },
  );
}
