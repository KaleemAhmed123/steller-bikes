import { Router } from 'express';
import { z } from 'zod';
import { placeOrder, finalizePaidOrder, computeCartTotal, CheckoutError } from '../lib/checkout.js';
import {
  razorpayConfigured,
  razorpayKeyId,
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchPayment,
} from '../lib/razorpay.js';
import { logger } from '../lib/log.js';

const log = logger('pay');

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

// Map a CheckoutError to its HTTP status (empty cart is a 400, stock/price
// changes are a 409 conflict).
function checkoutStatus(err: CheckoutError): number {
  return err.code === 'EMPTY' ? 400 : 409;
}

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
      res.status(checkoutStatus(err)).json({ error: { message: err.message } });
      return;
    }
    next(err);
  }
});

// POST /api/checkout/razorpay/order — create a Razorpay payment order for this
// cart. The amount is computed server-side from live prices, so the browser
// can't change what it's charged. No stock is touched yet.
checkoutRouter.post('/razorpay/order', async (req, res, next) => {
  try {
    if (!razorpayConfigured()) {
      res.status(503).json({ error: { message: 'Online payment is not available right now.' } });
      return;
    }
    const owner = res.locals.owner as string;
    const amount = await computeCartTotal(owner);
    const order = await createRazorpayOrder(amount, `rc_${Date.now().toString(36)}`);
    log.info('create: razorpay order', { razorpayOrderId: order.id, amount: order.amount, owner });
    res.status(201).json({
      data: { razorpayOrderId: order.id, amount: order.amount, keyId: razorpayKeyId() },
    });
  } catch (err) {
    if (err instanceof CheckoutError) {
      log.warn('create: cart not ready', { code: err.code });
      res.status(checkoutStatus(err)).json({ error: { message: err.message } });
      return;
    }
    // e.g. Razorpay API error — log it; the client gets a generic 500.
    log.error('create: failed', { message: err instanceof Error ? err.message : String(err) });
    next(err);
  }
});

const verifySchema = z.object({
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  razorpaySignature: z.string().trim().min(1),
  email: z.string().trim().email(),
  address: addressSchema,
});

// POST /api/checkout/razorpay/verify — the browser sends back what Razorpay gave
// it. We re-compute the signature with our secret: a match proves the payment is
// real (the browser can't forge it). Only then do we decrement stock + create the
// PAID order. A paid-but-out-of-stock order comes back flagged for refund.
checkoutRouter.post('/razorpay/verify', async (req, res, next) => {
  try {
    if (!razorpayConfigured()) {
      res.status(503).json({ error: { message: 'Online payment is not available right now.' } });
      return;
    }
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn('verify: incomplete body');
      res.status(400).json({ error: { message: 'Payment details are incomplete.' } });
      return;
    }
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, email, address } = parsed.data;
    const owner = res.locals.owner as string;

    // 1. Signature — proves the payload is authentic (the browser can't forge it).
    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      log.warn('verify: signature mismatch', { razorpayOrderId, razorpayPaymentId, owner });
      res.status(400).json({ error: { message: 'Payment could not be verified.' } });
      return;
    }

    // 2. Fetch the payment from Razorpay — proves what ACTUALLY happened, not just
    // what the browser sent. A valid signature alone doesn't prove the money was
    // captured, nor the amount. We trust this, never the client.
    const payment = await fetchPayment(razorpayPaymentId);
    if (payment.orderId !== razorpayOrderId) {
      log.error('verify: payment/order mismatch', {
        razorpayOrderId,
        paymentOrderId: payment.orderId,
        razorpayPaymentId,
      });
      res.status(400).json({ error: { message: 'Payment could not be verified.' } });
      return;
    }
    if (payment.status !== 'captured') {
      // e.g. 'authorized' (auto-capture off) or 'failed' — money not collected.
      log.warn('verify: payment not captured', {
        razorpayOrderId,
        razorpayPaymentId,
        status: payment.status,
      });
      res.status(409).json({ error: { message: 'Your payment did not complete. Please try again.' } });
      return;
    }

    // 3. Captured for real → place the order. finalizePaidOrder confirms the paid
    // amount against the live cart and flags a refund if it can't fulfill cleanly.
    log.info('verify: captured, finalizing', {
      razorpayOrderId,
      razorpayPaymentId,
      amount: payment.amount,
      owner,
    });
    const { orderId, refundRequired } = await finalizePaidOrder(
      { owner, email, address, idempotencyKey: razorpayOrderId },
      {
        provider: 'razorpay',
        razorpayOrderId,
        paymentId: razorpayPaymentId,
        method: payment.method,
        amount: payment.amount,
        paidAt: payment.createdAt ? new Date(payment.createdAt * 1000) : new Date(),
      },
    );
    if (refundRequired) {
      log.error('verify: order needs refund (paid, not fulfilled)', {
        orderId,
        razorpayPaymentId,
        amount: payment.amount,
      });
    } else {
      log.info('verify: order placed', { orderId, razorpayPaymentId, amount: payment.amount });
    }
    res.status(201).json({ data: { orderId, refundRequired } });
  } catch (err) {
    if (err instanceof CheckoutError) {
      log.warn('verify: checkout error', { code: err.code });
      res.status(checkoutStatus(err)).json({ error: { message: err.message } });
      return;
    }
    // Money may be captured but we failed to record the order (e.g. Razorpay fetch
    // or DB error). Logged loudly; the webhook (post-deploy) is the recovery path.
    log.error('verify: unexpected error', { message: err instanceof Error ? err.message : String(err) });
    next(err);
  }
});
