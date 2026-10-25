import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { OrderModel } from '../models/order.js';
import { parsePagination, pageMeta } from '../lib/pagination.js';
import { applyLinkSnapshot } from '../lib/advancePayments.js';
import { publicOrder } from '../lib/orderDetail.js';
import { fetchPaymentLink, razorpayConfigured } from '../lib/razorpay.js';
import { rateLimit } from '../lib/rateLimit.js';

export const ordersRouter = Router();

// GET /api/orders — list this owner's orders, newest first (order history).
// Scoped to res.locals.owner, so a customer sees their orders and a guest sees
// only this browser's.
ordersRouter.get('/', async (req, res, next) => {
  try {
    const owner = res.locals.owner as string;
    const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const [orders, total] = await Promise.all([
      OrderModel.find({ owner }).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
      OrderModel.countDocuments({ owner }),
    ]);
    res.json({ data: orders.map(publicOrder), pagination: pageMeta(total, pg) });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id — a guest can read ONLY their own order (scoped by the
// guest cookie owner), so order ids can't be walked by strangers.
ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(404).json({ error: { message: 'Order not found.' } });
      return;
    }

    const order = await OrderModel.findOne({ _id: id, owner: res.locals.owner as string }).lean();
    if (!order) {
      res.status(404).json({ error: { message: 'Order not found.' } });
      return;
    }

    res.json({ data: publicOrder(order) });
  } catch (err) {
    next(err);
  }
});

// Each call asks Razorpay, so keep it cheap to abuse: a few a minute per IP is plenty
// for "I just paid, show me".
const syncLimiter = rateLimit({ windowMs: 60_000, max: 12 });

// POST /api/orders/:id/advance-payments/sync — the customer came back from paying (or
// pressed "I've paid"): ask Razorpay about this order's OPEN links and record the truth.
// The server decides from Razorpay's answer; nothing the browser sends is trusted.
ordersRouter.post('/:id/advance-payments/sync', syncLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(404).json({ error: { message: 'Order not found.' } });
      return;
    }
    const owner = res.locals.owner as string;
    const order = await OrderModel.findOne({ _id: id, owner }).lean();
    if (!order) {
      res.status(404).json({ error: { message: 'Order not found.' } });
      return;
    }
    if (razorpayConfigured()) {
      for (const adv of order.advancePayments.filter((a) => a.status === 'created')) {
        await applyLinkSnapshot(await fetchPaymentLink(adv.razorpayLinkId));
      }
    }
    const fresh = await OrderModel.findOne({ _id: id, owner }).lean();
    res.json({ data: publicOrder(fresh!) });
  } catch (err) {
    next(err);
  }
});
