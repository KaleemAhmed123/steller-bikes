import { Schema, model, InferSchemaType } from 'mongoose';

// Items are SNAPSHOTTED: name/sku/price are copied at purchase time so a later
// price or product change never rewrites order history. Money is paise.
const orderItemSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }, // paise, at purchase
  },
  { _id: false },
);

const addressSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pin: { type: String, required: true },
  },
  { _id: false },
);

// The online-payment record, captured from Razorpay at verify time. Empty for
// COD orders. `amount` is the paise actually captured (the source of truth for a
// refund), which should equal the order total.
const paymentSchema = new Schema(
  {
    provider: { type: String }, // 'razorpay'
    razorpayOrderId: { type: String }, // 'order_…'
    paymentId: { type: String }, // 'pay_…'
    method: { type: String }, // 'upi' | 'card' | 'netbanking' | 'wallet'
    amount: { type: Number }, // paise captured
    paidAt: { type: Date },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    owner: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: addressSchema, required: true },
    items: { type: [orderItemSchema], required: true },
    // All paise, all server-computed — never trusted from the client.
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['cod', 'razorpay'], default: 'cod' },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refund_required', 'refunded'],
      default: 'unpaid',
    },
    payment: { type: paymentSchema, required: false },
    fulfillmentStatus: {
      type: String,
      enum: ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'delivery_failed', 'cancelled'],
      default: 'confirmed',
    },
    tracking: { type: String, default: '' },
    // One-time id from the browser; the unique index stops a double-submit from
    // creating two orders.
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export type Order = InferSchemaType<typeof orderSchema>;
export const OrderModel = model('Order', orderSchema);
