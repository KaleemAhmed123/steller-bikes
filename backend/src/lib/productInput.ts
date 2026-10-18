import { z } from 'zod';

// Validate an admin product create/update payload at the API boundary, so no
// garbage reaches the database. Money is in paise (integers) — the admin UI
// converts rupees → paise before sending; the server re-checks it here.

const money = z.coerce.number().int().nonnegative(); // paise
const slugField = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words joined by hyphens.');

export const variantInputSchema = z.object({
  // Preserved on edit so an existing variant keeps its id (carts, orders and
  // inventory history reference it). Omitted for a brand-new variant.
  _id: z.string().trim().optional(),
  sku: z.string().trim().min(1).max(60),
  size: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1).max(40),
  price: money,
  compareAt: money.default(0),
  stock: z.coerce.number().int().nonnegative(),
  lowStock: z.coerce.number().int().nonnegative().default(3),
});

export const productInputSchema = z.object({
  slug: slugField,
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(4000),
  image: z.string().trim().min(1).max(500), // primary / card thumbnail (URL or /path)
  images: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
  featured: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  specs: z.record(z.string(), z.string()).default({}),
  variants: z.array(variantInputSchema).min(1, 'Add at least one variant.'),
});

export type ProductInput = z.infer<typeof productInputSchema>;

// Update allows any subset of the same fields (PATCH semantics); a sent
// `variants` must still be a non-empty, valid list.
export const productUpdateSchema = productInputSchema.partial();
