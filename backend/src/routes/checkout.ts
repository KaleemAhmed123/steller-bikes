import { Router } from 'express';
import { z } from 'zod';
import { placeOrder, CheckoutError } from '../lib/checkout.js';

export const checkoutRouter = Router();

const addressSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().regex(/^\d{10}$/, 'Enter a 10-digit phone number.'),
  line1: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  pin: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code.'),
});

const checkoutSchema = z.object({
  email: z.string().trim().email(),
  address: addressSchema,
  idempotencyKey: z.string().trim().min(8),
});

// POST /api/checkout — place a COD order for the current guest cart.
checkoutRouter.post('/', async (req, res, next) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Please check your details.';
      res.status(400).json({ error: { message } });
      return;
    }

    const orderId = await placeOrder({
      owner: res.locals.owner as string,
      ...parsed.data,
    });
    res.status(201).json({ data: { orderId } });
  } catch (err) {
    if (err instanceof CheckoutError) {
      res.status(err.code === 'EMPTY' ? 400 : 409).json({ error: { message: err.message } });
      return;
    }
    next(err);
  }
});
