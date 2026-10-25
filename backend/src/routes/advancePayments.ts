import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { config } from '../config.js';
import { OrderModel } from '../models/order.js';
import { requirePermission, type ActorStaff } from '../lib/auth.js';
import { applyLinkSnapshot } from '../lib/advancePayments.js';
import { orderDetail } from '../lib/orderDetail.js';
import {
  cancelPaymentLink,
  createPaymentLink,
  fetchPaymentLink,
  razorpayConfigured,
} from '../lib/razorpay.js';
import { logger } from '../lib/log.js';

const log = logger('advance');

// Staff side of advance-payment links, mounted at /api/admin/orders/:id/advance-payments.
// An agent calls the customer, agrees an amount, and raises a link here; the customer
// then pays it from their order page. Needs `orders.update` (managers do the calling).
export const advanceAdminRouter = Router({ mergeParams: true });

const MIN_PAISE = 100; // ₹1 — Razorpay's floor
const MAX_PAISE = 10_000_000; // ₹1,00,000 — a sanity cap, not a business rule

const createSchema = z.object({
  amount: z.coerce.number().int().min(MIN_PAISE, 'The minimum is ₹1.').max(MAX_PAISE, 'The maximum is ₹1,00,000.'),
  note: z.string().trim().max(140).default(''),
});

const notFound = { error: { message: 'Order not found.' } };

// POST / — raise a payment link for this order.
advanceAdminRouter.post('/', requirePermission('orders.update'), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!isValidObjectId(id)) {
      res.status(404).json(notFound);
      return;
    }
    if (!razorpayConfigured()) {
      res.status(503).json({ error: { message: 'Online payments aren’t set up yet (Razorpay keys are missing).' } });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Invalid request.' } });
      return;
    }
    const order = await OrderModel.findById(id);
    if (!order) {
      res.status(404).json(notFound);
      return;
    }
    if (order.fulfillmentStatus === 'cancelled') {
      res.status(422).json({ error: { message: 'This order is cancelled — you can’t request a payment for it.' } });
      return;
    }
    // One open request at a time, so the customer never sees two competing links.
    if (order.advancePayments.some((a) => a.status === 'created')) {
      res.status(409).json({ error: { message: 'There is already an open payment link. Cancel it first to make a new one.' } });
      return;
    }

    const link = await createPaymentLink({
      amountPaise: parsed.data.amount,
      description: parsed.data.note || `Advance for Stellar Bikes order ${id.slice(-8).toUpperCase()}`,
      referenceId: id,
      customer: { name: order.address.name, email: order.email, contact: order.address.phone },
      callbackUrl: `${config.FRONTEND_ORIGIN}/order/${id}`,
    });

    order.advancePayments.push({
      amount: parsed.data.amount,
      note: parsed.data.note,
      status: 'created',
      razorpayLinkId: link.id,
      shortUrl: link.shortUrl,
      createdBy: (res.locals.staff as ActorStaff).email,
    });
    await order.save();
    log.info('link created', { orderId: id, linkId: link.id, amount: parsed.data.amount });
    res.status(201).json({ data: await orderDetail(id) });
  } catch (err) {
    next(err);
  }
});

// Find one advance on an order, or answer 404 and return null.
async function findAdvance(req: { params: Record<string, string | string[] | undefined> }, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  const id = String(req.params.id);
  const advId = String(req.params.advId);
  if (!isValidObjectId(id) || !isValidObjectId(advId)) {
    res.status(404).json(notFound);
    return null;
  }
  const order = await OrderModel.findById(id).lean();
  const adv = order?.advancePayments?.find((a) => String(a._id) === advId);
  if (!order || !adv) {
    res.status(404).json({ error: { message: 'Payment link not found.' } });
    return null;
  }
  return { id, adv };
}

// POST /:advId/refresh — ask Razorpay what really happened to this link and record it.
// This is the safety net for "customer says they paid but we see nothing": it works
// even if the webhook never reached us.
advanceAdminRouter.post('/:advId/refresh', requirePermission('orders.update'), async (req, res, next) => {
  try {
    if (!razorpayConfigured()) {
      res.status(503).json({ error: { message: 'Online payments aren’t set up yet (Razorpay keys are missing).' } });
      return;
    }
    const found = await findAdvance(req, res);
    if (!found) return;
    const applied = await applyLinkSnapshot(await fetchPaymentLink(found.adv.razorpayLinkId));
    log.info('link refreshed', { orderId: found.id, linkId: found.adv.razorpayLinkId, applied: applied?.status ?? 'no change' });
    res.json({ data: await orderDetail(found.id) });
  } catch (err) {
    next(err);
  }
});

// POST /:advId/cancel — withdraw an open link (wrong amount, customer changed their mind).
advanceAdminRouter.post('/:advId/cancel', requirePermission('orders.update'), async (req, res, next) => {
  try {
    if (!razorpayConfigured()) {
      res.status(503).json({ error: { message: 'Online payments aren’t set up yet (Razorpay keys are missing).' } });
      return;
    }
    const found = await findAdvance(req, res);
    if (!found) return;
    if (found.adv.status !== 'created') {
      res.status(422).json({ error: { message: `This link is already ${found.adv.status}.` } });
      return;
    }
    // Razorpay refuses to cancel a link that was paid a moment ago; in that case record
    // the truth instead of failing, so the admin sees "paid" rather than an error.
    try {
      await applyLinkSnapshot(await cancelPaymentLink(found.adv.razorpayLinkId));
    } catch (err) {
      await applyLinkSnapshot(await fetchPaymentLink(found.adv.razorpayLinkId));
      log.warn('cancel failed; synced instead', { linkId: found.adv.razorpayLinkId, err: String(err) });
    }
    res.json({ data: await orderDetail(found.id) });
  } catch (err) {
    next(err);
  }
});
