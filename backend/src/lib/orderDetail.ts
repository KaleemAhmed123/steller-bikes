import { OrderModel } from '../models/order.js';
import { TRANSITIONS } from './fulfillment.js';
import { razorpayConfigured } from './razorpay.js';

// What the admin order page needs in one object: the order, the legal next
// fulfilment states, and whether advance-payment links can be created at all
// (Razorpay keys present). One builder so every admin route answers identically.
export async function orderDetail(orderId: string) {
  const order = await OrderModel.findById(orderId).lean();
  if (!order) return null;
  return {
    order,
    nextStates: TRANSITIONS[order.fulfillmentStatus] ?? [],
    advanceEnabled: razorpayConfigured(),
  };
}

// The customer-facing copy of an order: same data minus anything internal
// (which staff member raised an advance link).
export function publicOrder<T extends { advancePayments?: { createdBy?: string | null }[] | null }>(order: T): T {
  if (!order.advancePayments?.length) return order;
  return {
    ...order,
    advancePayments: order.advancePayments.map(({ createdBy: _createdBy, ...rest }) => rest),
  } as T;
}
