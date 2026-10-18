import mongoose from 'mongoose';
import { OrderModel } from '../models/order.js';
import { ProductModel } from '../models/product.js';
import { InventoryMovementModel } from '../models/inventoryMovement.js';

// The order lifecycle. Only these moves are legal; everything else is rejected.
// Ported verbatim from v1 (lib/domain.ts).
export const TRANSITIONS: Record<string, string[]> = {
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'delivery_failed'],
  delivery_failed: ['shipped', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function allowTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export type TransitionCode = 'NOT_FOUND' | 'ILLEGAL' | 'TRACKING_REQUIRED' | 'CONCURRENT';
export class TransitionError extends Error {
  constructor(
    public code: TransitionCode,
    message: string,
  ) {
    super(message);
    this.name = 'TransitionError';
  }
}

// Move an order to a new fulfillment state. Cancelling restores stock exactly
// once: the status update is guarded on the current state, so a competing
// transition changes the state first and this one sees 0 matches and aborts —
// no double restore. All in one transaction.
export async function transitionOrder(
  actor: string,
  orderId: string,
  to: string,
  tracking: string,
): Promise<void> {
  const order = await OrderModel.findById(orderId).lean();
  if (!order) throw new TransitionError('NOT_FOUND', 'Order not found.');

  const from = order.fulfillmentStatus;
  if (!allowTransition(from, to)) {
    throw new TransitionError('ILLEGAL', 'That status change is not allowed.');
  }
  if (to === 'shipped' && !tracking.trim()) {
    throw new TransitionError('TRACKING_REQUIRED', 'Add a tracking reference before shipping.');
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const set: Record<string, unknown> = { fulfillmentStatus: to };
      if (to === 'shipped') set.tracking = tracking.trim();
      if (to === 'cancelled' && order.paymentStatus === 'paid') set.paymentStatus = 'refund_required';

      const updated = await OrderModel.updateOne(
        { _id: orderId, fulfillmentStatus: from },
        { $set: set },
        { session },
      );
      if (updated.matchedCount === 0) {
        throw new TransitionError('CONCURRENT', 'Order changed; refresh and try again.');
      }

      if (to === 'cancelled') {
        for (const item of order.items) {
          const prod = await ProductModel.findOne(
            { 'variants._id': item.variantId },
            { 'variants.$': 1 },
            { session },
          );
          const before = prod?.variants?.[0]?.stock ?? 0;
          await ProductModel.updateOne(
            { 'variants._id': item.variantId },
            { $inc: { 'variants.$.stock': item.quantity } },
            { session },
          );
          await InventoryMovementModel.create(
            [{ variantId: item.variantId, actor, reason: `Cancel ${orderId}`, before, after: before + item.quantity }],
            { session },
          );
        }
      }
    });
  } finally {
    await session.endSession();
  }
}
