import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { OrderModel } from '../models/order.js';
import { requirePermission } from '../lib/auth.js';
import { assertPaymentTransition, nextPaymentStatuses, PaymentError } from '../lib/payments.js';
import { logger } from '../lib/log.js';
import { escapeRegex } from '../lib/mongo.js';

const log = logger('pay');

export const paymentsRouter = Router();

// What the Payments table needs per row (keep order items/address out of the list).
const LIST_FIELDS = 'email address.phone total method paymentStatus payment createdAt';

// GET /api/admin/payments?status=&method=&q= — the payments table.
paymentsRouter.get('/', requirePermission('payments.manage'), async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const method = typeof req.query.method === 'string' ? req.query.method : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filter: Record<string, unknown> = {};
    if (status) filter.paymentStatus = status;
    if (method) filter.method = method;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      const or: Record<string, unknown>[] = [{ email: rx }, { 'address.phone': rx }, { 'payment.paymentId': rx }];
      if (isValidObjectId(q)) or.push({ _id: q });
      filter.$or = or;
    }
    const orders = await OrderModel.find(filter)
      .select(LIST_FIELDS)
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/payments/:id — one payment's full detail + the owner's legal next
// statuses (so the UI only offers valid actions).
paymentsRouter.get('/:id', requirePermission('payments.manage'), async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(404).json({ error: { message: 'Payment not found.' } });
      return;
    }
    const order = await OrderModel.findById(req.params.id).lean();
    if (!order) {
      res.status(404).json({ error: { message: 'Payment not found.' } });
      return;
    }
    res.json({ data: { order, nextStatuses: nextPaymentStatuses(order.method, order.paymentStatus) } });
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({ status: z.string().min(1) });

// POST /api/admin/payments/:id/status — the owner's manual reconciliation:
//   COD cash collected (unpaid→paid) · refund issued (refund_required→refunded).
paymentsRouter.post('/:id/status', requirePermission('payments.manage'), async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(404).json({ error: { message: 'Payment not found.' } });
      return;
    }
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Invalid request.' } });
      return;
    }
    const order = await OrderModel.findById(req.params.id);
    if (!order) {
      res.status(404).json({ error: { message: 'Payment not found.' } });
      return;
    }

    try {
      assertPaymentTransition(order.method, order.paymentStatus, parsed.data.status);
    } catch (err) {
      if (err instanceof PaymentError) {
        res.status(422).json({ error: { message: err.message } });
        return;
      }
      throw err;
    }

    order.paymentStatus = parsed.data.status as typeof order.paymentStatus;
    await order.save();
    log.info('status changed by owner', { orderId: String(order._id), to: parsed.data.status });
    const lean = order.toObject();
    res.json({ data: { order: lean, nextStatuses: nextPaymentStatuses(lean.method, lean.paymentStatus) } });
  } catch (err) {
    next(err);
  }
});
