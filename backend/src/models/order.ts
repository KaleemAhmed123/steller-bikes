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

// An advance-payment request raised by an agent (usually the Delhivery delivery charge,
// agreed on a call). Backed by a Razorpay Payment Link the customer pays from their
// order page. Kept apart from `paymentStatus`, which is about the order total.
// Statuses: created (open, awaiting payment) -> paid | cancelled | expired (all final).
const advancePaymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 100 }, // paise
    note: { type: String, default: '' }, // shown to the customer, e.g. "Delivery to Lucknow"
    status: { type: String, enum: ['created', 'paid', 'cancelled', 'expired'], default: 'created' },
    razorpayLinkId: { type: String, required: true }, // 'plink_…'
    shortUrl: { type: String, required: true }, // the page the customer pays on
    paymentId: { type: String }, // 'pay_…' once paid
    method: { type: String }, // 'upi' | 'card' | …
    paidAt: { type: Date },
    createdBy: { type: String, default: '' }, // staff email
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
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
      enum: ['unpaid', 'paid', 'refund_required', 'refunded'],
      default: 'unpaid',
    },
    payment: { type: paymentSchema, required: false },
    advancePayments: { type: [advancePaymentSchema], default: [] },
    fulfillmentStatus: {
      type: String,
      enum: ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'delivery_failed', 'cancelled'],
      default: 'confirmed',
    },
    tracking: { type: String, default: '' },
    // One-time id from the browser; the compound unique index below stops a
    // double-submit from creating two orders FOR THE SAME OWNER.
    idempotencyKey: { type: String, required: true },
  },
  { timestamps: true },
);

// Idempotency is scoped to the owner: a key only has to be unique per owner, so
// two different shoppers reusing the same client-chosen key can't collide (one
// would otherwise be handed the other's order). A buyer's own double-submit is
// still blocked. ponytail: if a DB already carried the old single-field unique
// index on idempotencyKey, drop it once — Mongoose won't remove it for you.
orderSchema.index({ owner: 1, idempotencyKey: 1 }, { unique: true });

// Indexes for the hot queries.
orderSchema.index({ owner: 1, createdAt: -1 }); // customer/guest order history
orderSchema.index({ createdAt: -1 }); // admin tables + dashboard "recent"
orderSchema.index({ fulfillmentStatus: 1, createdAt: -1 }); // order-queue filter
orderSchema.index({ paymentStatus: 1, createdAt: -1 }); // payments-tab filter
orderSchema.index({ 'advancePayments.razorpayLinkId': 1 }, { sparse: true }); // webhook lookup

export type Order = InferSchemaType<typeof orderSchema>;
export const OrderModel = model('Order', orderSchema);
