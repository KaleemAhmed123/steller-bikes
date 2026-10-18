import { z } from 'zod';
import type { FilterQuery } from 'mongoose';

// Validate the storefront's filter query params at the API boundary.
// Unknown/garbage values are rejected here so they never reach the database query.
// Prices are in paise (integers) — the frontend converts rupees → paise before calling.
export const productQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

// Escape regex-special characters so a user's search text is matched literally
// (e.g. "29." doesn't become a wildcard). Prevents regex errors and injection.
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Turn validated filters into a MongoDB query. Always scoped to published products.
export function buildProductFilter(q: ProductQuery): FilterQuery<unknown> {
  const filter: FilterQuery<unknown> = { status: 'published' };

  if (q.category) filter.category = q.category;

  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i'); // case-insensitive
    filter.$or = [{ name: rx }, { description: rx }];
  }

  // Match products that have at least ONE variant whose price is in range.
  // $elemMatch keeps both bounds on the SAME variant (not one variant over min
  // and a different one under max).
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    const price: Record<string, number> = {};
    if (q.minPrice !== undefined) price.$gte = q.minPrice;
    if (q.maxPrice !== undefined) price.$lte = q.maxPrice;
    filter.variants = { $elemMatch: { price } };
  }

  return filter;
}
