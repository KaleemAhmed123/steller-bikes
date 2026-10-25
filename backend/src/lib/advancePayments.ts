import { OrderModel } from '../models/order.js';

// Advance-payment links. An agent calls the customer, agrees an amount (usually the
// Delhivery delivery charge), and generates a Razorpay Payment Link on the order.
// The customer pays it from their order page. This file is the RULES for how a link
// moves; routes and the webhook call into it, so there is one copy of the logic.
//
// An advance is kept SEPARATE from the order's own paymentStatus (which is about the
// order total: COD/online). It is extra money for delivery, tracked on its own.

export type AdvanceStatus = 'created' | 'paid' | 'cancelled' | 'expired';

// What we read off a Razorpay payment-link entity (from the API or a webhook).
export interface LinkSnapshot {
  id: string; // plink_…
  status: string; // 'created' | 'partially_paid' | 'paid' | 'cancelled' | 'expired'
  amountPaid: number; // paise actually collected so far
  paymentId?: string; // pay_… of the successful payment, if any
  method?: string;
}

export interface AdvancePatch {
  status: AdvanceStatus;
  paymentId?: string;
  method?: string;
  paidAt?: Date;
}

// Decide what (if anything) changes for an advance that is currently `current`.
// Returns null for "leave it alone". Rules:
//  - only an OPEN link ('created') can change — paid/cancelled/expired are final, so a
//    late or repeated webhook can never un-pay a link or count a payment twice;
//  - it only becomes PAID when Razorpay says paid AND the amount collected covers the
//    amount we asked for (an under-payment stays open and is logged by the caller).
export function nextAdvanceState(
  current: { status: string; amount: number },
  link: LinkSnapshot,
  now = new Date(),
): AdvancePatch | null {
  if (current.status !== 'created') return null;
  if (link.status === 'paid') {
    if (link.amountPaid < current.amount) return null;
    return { status: 'paid', paymentId: link.paymentId, method: link.method, paidAt: now };
  }
  if (link.status === 'cancelled') return { status: 'cancelled' };
  if (link.status === 'expired') return { status: 'expired' };
  return null;
}

// Apply a Razorpay link snapshot to whichever order holds that link. Safe to call
// any number of times (webhook retries, the "check" button, the customer returning):
// the update is guarded on the link still being open, so it lands at most once.
// Returns the patch that was applied, or null if nothing changed / link unknown.
export async function applyLinkSnapshot(link: LinkSnapshot): Promise<AdvancePatch | null> {
  const order = await OrderModel.findOne({ 'advancePayments.razorpayLinkId': link.id }).lean();
  const adv = order?.advancePayments?.find((a) => a.razorpayLinkId === link.id);
  if (!order || !adv) return null;

  const patch = nextAdvanceState(adv, link);
  if (!patch) return null;

  const set: Record<string, unknown> = { 'advancePayments.$.status': patch.status };
  if (patch.paymentId) set['advancePayments.$.paymentId'] = patch.paymentId;
  if (patch.method) set['advancePayments.$.method'] = patch.method;
  if (patch.paidAt) set['advancePayments.$.paidAt'] = patch.paidAt;

  const res = await OrderModel.updateOne(
    { _id: order._id, advancePayments: { $elemMatch: { razorpayLinkId: link.id, status: 'created' } } },
    { $set: set },
  );
  return res.modifiedCount > 0 ? patch : null;
}
