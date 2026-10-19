// Payment-status changes the owner may make BY HAND from the Payments tab.
// (The automatic ones — unpaid→paid online, →refund_required — happen in the
// checkout flow, not here.) Pure rules so they have one home and a test.

export class PaymentError extends Error {
  constructor(
    public code: 'ILLEGAL',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// The statuses the owner can move a payment TO, given its method + current status.
//  - COD cash collected on delivery:         unpaid → paid
//  - refund issued in the Razorpay dashboard: refund_required → refunded
export function nextPaymentStatuses(method: string, from: string): string[] {
  const out: string[] = [];
  if (method === 'cod' && from === 'unpaid') out.push('paid');
  if (from === 'refund_required') out.push('refunded');
  return out;
}

export function assertPaymentTransition(method: string, from: string, to: string): void {
  if (!nextPaymentStatuses(method, from).includes(to)) {
    throw new PaymentError('ILLEGAL', `Cannot change payment from ${from} to ${to}.`);
  }
}
