// Honest popularity, derived from real orders only — never a counter bumped at
// checkout. `soldCount` = units actually ordered (and not cancelled).
//
// This module holds the PURE part (the per-product sum) so it can be unit-tested
// without a database. The route does the one read-only aggregation and passes
// the resulting variantId -> units map in here.

// Stamp each product with a soldCount = the sum of its variants' sold units.
// Works on lean product docs (variants carry an _id of some Mongo id type).
export function attachSoldCount<T extends { variants: { _id: unknown }[] }>(
  products: T[],
  unitsByVariant: Map<string, number>,
): (T & { soldCount: number })[] {
  return products.map((p) => {
    let soldCount = 0;
    for (const v of p.variants) soldCount += unitsByVariant.get(String(v._id)) ?? 0;
    return { ...p, soldCount };
  });
}
