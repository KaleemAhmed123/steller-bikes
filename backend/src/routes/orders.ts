import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { OrderModel } from '../models/order.js';
import { parsePagination, pageMeta } from '../lib/pagination.js';

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
    res.json({ data: orders, pagination: pageMeta(total, pg) });
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

    res.json({ data: order });
  } catch (err) {
    next(err);
  }
});
