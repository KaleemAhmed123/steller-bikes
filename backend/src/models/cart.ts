import { Schema, model, InferSchemaType } from 'mongoose';

// One line in a cart: WHICH variant and HOW MANY. No price here — price is
// always looked up live on the server (the cart is never trusted for money).
const cartItemSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const cartSchema = new Schema(
  {
    owner: { type: String, required: true, unique: true }, // e.g. "guest:<uuid>"
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

export type Cart = InferSchemaType<typeof cartSchema>;
export const CartModel = model('Cart', cartSchema);
