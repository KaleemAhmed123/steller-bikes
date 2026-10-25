export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

// Money rules: no tax, no discount. `shipping` is the delivery fee for the order's pincode
// (lib/delivery.ts decides it — a flat fee inside Kanpur, 0 elsewhere because an agent agrees
// the Delhivery charge by phone). All paise.
export function computeTotals(subtotal: number, shipping = 0): Totals {
  const discount = 0;
  const tax = 0;
  const total = subtotal - discount + shipping + tax;
  return { subtotal, discount, shipping, tax, total };
}
