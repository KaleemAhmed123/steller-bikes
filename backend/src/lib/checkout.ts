import mongoose from 'mongoose';
import { ProductModel } from '../models/product.js';
import { CartModel } from '../models/cart.js';
import { OrderModel } from '../models/order.js';
import { InventoryMovementModel } from '../models/inventoryMovement.js';
import { loadVariantMap } from './variants.js';
import { computeCartView } from './cartView.js';
import { computeTotals, type Totals } from './pricing.js';
import { logger } from './log.js';

const log = logger('pay');

export type CheckoutCode = 'EMPTY' | 'CHANGED' | 'OUT_OF_STOCK';

export class CheckoutError extends Error {
  constructor(
    public code: CheckoutCode,
    message: string,
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

export interface CheckoutInput {
  owner: string;
  email: string;
  address: { name: string; phone: string; line1: string; city: string; state: string; pin: string };
  idempotencyKey: string;
}

type OrderItem = {
  variantId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  price: number;
};

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

// Recompute the cart from LIVE product data — never trust the cart/client for
// price or stock. Throws EMPTY (nothing to buy) or CHANGED (an item vanished or
// ran low). Returns the server-computed totals + the snapshotted order items.
// Shared by every checkout path so the money/stock truth is computed one way.
async function loadCheckoutView(owner: string): Promise<{ totals: Totals; orderItems: OrderItem[] }> {
  const cart = await CartModel.findOne({ owner });
  const rawItems = (cart?.items ?? []).map((i) => ({
    variantId: String(i.variantId),
    quantity: i.quantity,
  }));
  if (rawItems.length === 0) throw new CheckoutError('EMPTY', 'Your cart is empty.');

  const variants = await loadVariantMap(rawItems.map((i) => i.variantId));
  const view = computeCartView(rawItems, variants);
  if (view.items.some((l) => !l.available || l.inStock === false)) {
    throw new CheckoutError('CHANGED', 'Some items changed or ran low on stock. Please review your cart.');
  }

  const totals = computeTotals(view.subtotal);
  const orderItems: OrderItem[] = view.items.map((l) => ({
    variantId: new mongoose.Types.ObjectId(l.variantId),
    name: l.name!,
    sku: l.sku!,
    quantity: l.quantity,
    price: l.price!,
  }));
  return { totals, orderItems };
}

// The live, server-authoritative total (paise) for this owner's cart — used to
// tell Razorpay how much to charge BEFORE payment. Validates the cart the same
// way checkout does (EMPTY / CHANGED), so you can't start a payment for a stale
// or empty cart.
export async function computeCartTotal(owner: string): Promise<number> {
  const { totals } = await loadCheckoutView(owner);
  return totals.total;
}

// The ONE place stock is reduced + a fulfillable order row is written, for both
// COD and a verified online payment.
//
// Safety comes from three things working together:
//  - a transaction: the stock decrements + order insert + cart clear all commit or none do;
//  - an atomic guarded decrement: a variant is only reduced if it still has enough stock,
//    so two shoppers racing for the last unit can't both succeed;
//  - a unique idempotencyKey: a replayed attempt can't create a second order.
//
// Throws OUT_OF_STOCK if any line can't be stocked (nothing is committed), or a
// duplicate-key error if the idempotency key already exists. Callers decide what
// that means for their payment method.
async function runOrderTransaction(args: {
  owner: string;
  email: string;
  address: CheckoutInput['address'];
  idempotencyKey: string;
  method: 'cod' | 'razorpay';
  paymentStatus: 'unpaid' | 'paid';
  totals: Totals;
  orderItems: OrderItem[];
}): Promise<string> {
  const { owner, email, address, idempotencyKey, method, paymentStatus, totals, orderItems } = args;
  const cart = await CartModel.findOne({ owner });

  const session = await mongoose.startSession();
  try {
    let orderId = '';
    await session.withTransaction(async () => {
      // Atomic guarded decrement: match a variant that still has stock >= qty and
      // reduce it in one step. 0 matched → not enough stock → abort the whole order.
      // We also capture before/after so each sale is recorded in the stock history.
      const moves: { variantId: mongoose.Types.ObjectId; before: number; after: number }[] = [];
      for (const line of orderItems) {
        const vid = line.variantId;
        const prod = await ProductModel.findOne({ 'variants._id': vid }, { 'variants.$': 1 }, { session });
        const before = prod?.variants?.[0]?.stock ?? 0;
        const result = await ProductModel.updateOne(
          { variants: { $elemMatch: { _id: vid, stock: { $gte: line.quantity } } } },
          { $inc: { 'variants.$.stock': -line.quantity } },
          { session },
        );
        if (result.matchedCount === 0) {
          throw new CheckoutError('OUT_OF_STOCK', 'An item just went out of stock.');
        }
        moves.push({ variantId: vid, before, after: before - line.quantity });
      }

      const [order] = await OrderModel.create(
        [
          {
            owner,
            email,
            address,
            items: orderItems,
            subtotal: totals.subtotal,
            discount: totals.discount,
            shipping: totals.shipping,
            tax: totals.tax,
            total: totals.total,
            method,
            paymentStatus,
            fulfillmentStatus: 'confirmed',
            idempotencyKey,
          },
        ],
        { session },
      );
      orderId = String(order._id);

      // Record each sale in the stock history (completes the audit started here).
      await InventoryMovementModel.insertMany(
        moves.map((m) => ({
          variantId: m.variantId,
          actor: owner,
          reason: `Sale ${orderId}`,
          before: m.before,
          after: m.after,
        })),
        { session },
      );

      if (cart) {
        cart.items.splice(0, cart.items.length);
        await cart.save({ session });
      }
    });
    return orderId;
  } finally {
    await session.endSession();
  }
}

// Record a paid-but-unfulfillable order so the money is never silently lost. No
// stock is moved and the cart is left intact. Idempotency-safe: a racing retry
// returns the already-recorded order instead of erroring.
async function recordRefundRequired(args: {
  owner: string;
  email: string;
  address: CheckoutInput['address'];
  idempotencyKey: string;
  totals: Totals;
  orderItems: OrderItem[];
}): Promise<{ orderId: string; refundRequired: true }> {
  const { owner, email, address, idempotencyKey, totals, orderItems } = args;
  try {
    const [order] = await OrderModel.create([
      {
        owner,
        email,
        address,
        items: orderItems,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        tax: totals.tax,
        total: totals.total,
        method: 'razorpay',
        paymentStatus: 'refund_required',
        fulfillmentStatus: 'cancelled',
        idempotencyKey,
      },
    ]);
    return { orderId: String(order._id), refundRequired: true };
  } catch (err) {
    if (isDuplicateKey(err)) {
      const winner = await OrderModel.findOne({ idempotencyKey }).lean();
      if (winner) return { orderId: String(winner._id), refundRequired: true };
    }
    throw err;
  }
}

// Place a COD order for a guest. Returns the order id. (COD never pays up front,
// so an out-of-stock just throws and the shopper retries — nothing is lost.)
export async function placeOrder(input: CheckoutInput): Promise<string> {
  const already = await OrderModel.findOne({ idempotencyKey: input.idempotencyKey }).lean();
  if (already) return String(already._id);

  const { totals, orderItems } = await loadCheckoutView(input.owner);
  try {
    return await runOrderTransaction({ ...input, method: 'cod', paymentStatus: 'unpaid', totals, orderItems });
  } catch (err) {
    // Two requests with the same key raced: the loser returns the winner's order.
    if (isDuplicateKey(err)) {
      const winner = await OrderModel.findOne({ idempotencyKey: input.idempotencyKey }).lean();
      if (winner) return String(winner._id);
    }
    throw err;
  }
}

// Finalize an online order AFTER its Razorpay payment has been verified AND the
// captured amount confirmed server-side. `paidAmount` is the real amount Razorpay
// captured (paise) — the authority for what the customer actually paid.
//
// The money is already taken, so this NEVER throws away a payment: anything that
// stops a clean fulfillment (cart emptied/changed in the pay window, amount no
// longer matches, or the last unit just sold) becomes a `refund_required` order
// for the owner. Only a clean match decrements stock and places a paid order.
// Stock is reduced only here, never at pay-start, so abandoned payments hold none.
export async function finalizePaidOrder(
  input: CheckoutInput,
  paidAmount: number,
): Promise<{ orderId: string; refundRequired: boolean }> {
  const { owner, idempotencyKey } = input;

  // Idempotency: the Razorpay order id is the key, so a retried/duplicated verify
  // returns the same order rather than creating or refunding twice.
  const already = await OrderModel.findOne({ idempotencyKey }).lean();
  if (already) return { orderId: String(already._id), refundRequired: already.paymentStatus === 'refund_required' };

  // Re-read the cart. If it vanished/changed in the pay window we can't fulfill
  // cleanly — record a refund against what they actually paid.
  let totals: Totals;
  let orderItems: OrderItem[];
  try {
    ({ totals, orderItems } = await loadCheckoutView(owner));
  } catch (err) {
    if (err instanceof CheckoutError) {
      log.warn('paid but cart unusable at verify → refund', { code: err.code, idempotencyKey, paidAmount });
      const refundTotals: Totals = { subtotal: paidAmount, discount: 0, shipping: 0, tax: 0, total: paidAmount };
      return recordRefundRequired({ ...input, totals: refundTotals, orderItems: [] });
    }
    throw err;
  }

  // The captured amount must equal the current cart total. A mismatch means the
  // cart moved after Razorpay locked the amount → don't fulfill, refund instead.
  if (paidAmount !== totals.total) {
    log.warn('paid amount != cart total → refund', { idempotencyKey, paidAmount, cartTotal: totals.total });
    return recordRefundRequired({ ...input, totals, orderItems });
  }

  try {
    const orderId = await runOrderTransaction({
      ...input,
      method: 'razorpay',
      paymentStatus: 'paid',
      totals,
      orderItems,
    });
    return { orderId, refundRequired: false };
  } catch (err) {
    if (isDuplicateKey(err)) {
      const winner = await OrderModel.findOne({ idempotencyKey }).lean();
      if (winner) return { orderId: String(winner._id), refundRequired: winner.paymentStatus === 'refund_required' };
    }
    // Paid, but the last unit sold out in the race window: transaction rolled
    // back (no stock moved), so record the refund from the snapshot.
    if (err instanceof CheckoutError && err.code === 'OUT_OF_STOCK') {
      log.warn('paid but out of stock → refund', { idempotencyKey, paidAmount });
      return recordRefundRequired({ ...input, totals, orderItems });
    }
    throw err;
  }
}
