import { Schema, model, InferSchemaType } from 'mongoose';

// One photo or video shown for a variant. `position` is the order it appears in
// on the product page (0 = first); the API keeps positions as 0..n-1 with no gaps.
const mediaSchema = new Schema(
  {
    url: { type: String, required: true }, // /path or https:// link (Cloudinary)
    type: { type: String, enum: ['image', 'video'], required: true },
    position: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

// One buyable version of a cycle (a size/colour), with its own price and stock.
// All money is in paise (1 rupee = 100 paise), stored as integers.
const variantSchema = new Schema(
  {
    sku: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    price: { type: Number, required: true, min: 0 }, // paise
    compareAt: { type: Number, default: 0, min: 0 }, // paise, 0 = none
    stock: { type: Number, required: true, min: 0 },
    lowStock: { type: Number, default: 3, min: 0 },
    // This variant's own gallery. Empty = the shop shows a "No Image Available" box
    // (it deliberately does NOT borrow the product's photos).
    media: { type: [mediaSchema], default: [] },
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }, // primary / card thumbnail
    images: { type: [String], default: [] }, // extra gallery shots (empty = single-image)
    featured: { type: Boolean, default: false }, // editorial "Staff picks" flag (set via seed)
    offerTypes: { type: [String], default: [] }, // offer keys this product is part of, e.g. ['diwali']
    specs: { type: Map, of: String, default: {} },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    variants: { type: [variantSchema], required: true },
  },
  { timestamps: true }, // adds createdAt / updatedAt
);

export type Product = InferSchemaType<typeof productSchema>;
export const ProductModel = model('Product', productSchema);
