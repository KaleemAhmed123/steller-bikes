// How the shop describes the ways to pay, driven by the two switches in Admin → Platform
// (Cash on delivery, Online payment). Both on is the normal case. Never returns an empty string.
export function paymentLabel({ codEnabled, onlinePaymentEnabled }: { codEnabled: boolean; onlinePaymentEnabled: boolean }): string {
  if (codEnabled && onlinePaymentEnabled) return 'Pay Your Way · Online or at Delivery';
  if (onlinePaymentEnabled) return 'Online payment';
  return 'Cash on delivery';
}
