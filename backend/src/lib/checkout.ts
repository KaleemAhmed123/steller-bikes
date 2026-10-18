import mongoose from 'mongoose';
import { ProductModel } from '../models/product.js';
import { CartModel } from '../models/cart.js';
import { OrderModel } from '../models/order.js';
import { InventoryMovementModel } from '../models/inventoryMovement.js';
import { loadVariantMap } from './variants.js';
import { computeCartView } from './cartView.js';
import { computeTotals } from './pricing.js';

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

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

// Place a COD order for a guest. Returns the order id.
//
// Safety comes from three things working together:
//  - idempotency: an order already made for this key is returned, not duplicated;
//  - a transaction: the stock decrements + order insert + cart clear all commit or none do;
//  - an atomic guarded decrement: a variant is only reduced if it still has enough stock,
//    so two shoppers racing for the last unit can't both succeed.
export async function placeOrder(input: CheckoutInput): Promise<string> {
  const { owner, email, address, idempotencyKey } = input;

  // Idempotency short-circuit: same attempt again → same order.
  const already = await OrderModel.findOne({ idempotencyKey }).lean();
  if (already) return String(already._id);

  const cart = await CartModel.findOne({ owner });
  const rawItems = (cart?.items ?? []).map((i) => ({
    variantId: String(i.variantId),
    quantity: i.quantity,
  }));
  if (rawItems.length === 0) throw new CheckoutError('EMPTY', 'Your cart is empty.');

  // Recompute from LIVE product data — never trust the cart/client for price or stock.
  const variants = await loadVariantMap(rawItems.map((i) => i.variantId));
  const view = computeCartView(rawItems, variants);
  if (view.items.some((l) => !l.available || l.inStock === false)) {
    throw new CheckoutError('CHANGED', 'Some items changed or ran low on stock. Please review your cart.');
  }

  const totals = computeTotals(view.subtotal);
  const orderItems = view.items.map((l) => ({
    variantId: new mongoose.Types.ObjectId(l.variantId),
    name: l.name!,
    sku: l.sku!,
    quantity: l.quantity,
    price: l.price!,
  }));

  const session = await mongoose.startSession();
  try {
    let orderId = '';
    await session.withTransaction(async () => {
      // Atomic guarded decrement: match a variant that still has stock >= qty and
      // reduce it in one step. 0 matched → not enough stock → abort the whole order.
      // We also capture before/after so each sale is recorded in the stock history.
      const moves: { variantId: mongoose.Types.ObjectId; before: number; after: number }[] = [];
      for (const line of view.items) {
        const vid = new mongoose.Types.ObjectId(line.variantId);
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
            method: 'cod',
            paymentStatus: 'unpaid',
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
  } catch (err) {
    // Two requests with the same key raced: the loser hits the unique index.
    // Its transaction already rolled back (no double decrement) — return the winner's order.
    if (isDuplicateKey(err)) {
      const winner = await OrderModel.findOne({ idempotencyKey }).lean();
      if (winner) return String(winner._id);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}
