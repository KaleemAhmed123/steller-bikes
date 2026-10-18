export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

// MVP money rules: free shipping, no tax, no discount. All paise.
// ponytail: constants now; these become the settings document in build step 6
// (shipping fee, free-ship threshold, tax rate) — the shape here won't change.
export function computeTotals(subtotal: number): Totals {
  const discount = 0;
  const shipping = 0;
  const tax = 0;
  const total = subtotal - discount + shipping + tax;
  return { subtotal, discount, shipping, tax, total };
}
