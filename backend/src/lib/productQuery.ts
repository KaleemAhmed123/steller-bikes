import { z } from 'zod';
import type { FilterQuery } from 'mongoose';
import { escapeRegex } from './mongo.js';
import { offerKeySchema } from './siteContent.js';

// Validate the storefront's filter query params at the API boundary.
// Unknown/garbage values are rejected here so they never reach the database query.
// Prices are in paise (integers) — the frontend converts rupees → paise before calling.
export const productQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  // Comma-separated offer keys: ?offerType=diwali,new-year → products with ANY of them.
  offerType: z
    .string()
    .transform((v) => v.split(',').map((k) => k.trim()).filter(Boolean))
    .pipe(z.array(offerKeySchema).min(1).max(10))
    .optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  // Lenient like pagination: an unknown/garbage sort falls back to 'newest' rather
  // than 400ing a plain read.
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'popular']).catch('newest'),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type ProductSort = ProductQuery['sort'];

// The MongoDB sort spec for each catalogue sort. `_id` is the last tiebreaker so
// paging is STABLE — without it, equal keys (same price / same soldCount) could
// reorder between page requests and drop or duplicate a product across pages.
// `fromPrice` and `soldCount` are fields the products aggregation adds (see
// routes/products.ts); they are not stored on the document.
export function productSortSpec(sort: ProductSort): Record<string, 1 | -1> {
  switch (sort) {
    case 'price-asc':
      return { fromPrice: 1, _id: 1 };
    case 'price-desc':
      return { fromPrice: -1, _id: 1 };
    case 'popular':
      return { soldCount: -1, createdAt: -1, _id: 1 };
    default:
      return { createdAt: -1, _id: 1 };
  }
}

// Turn validated filters into a MongoDB query. Always scoped to published products.
export function buildProductFilter(q: ProductQuery): FilterQuery<unknown> {
  const filter: FilterQuery<unknown> = { status: 'published' };

  if (q.category) filter.category = q.category;
  if (q.offerType) filter.offerTypes = { $in: q.offerType };

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
