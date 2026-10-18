import { Schema, model, InferSchemaType } from 'mongoose';

// An audit row for every stock change: a sale, a manual adjustment, or a
// cancel-restock. before/after snapshot the stock around the change so the
// history is self-explanatory. Append-only; never edited.
const inventoryMovementSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, required: true },
    actor: { type: String, required: true }, // staff email, or "customer:<owner>" for a sale
    reason: { type: String, required: true },
    before: { type: Number, required: true },
    after: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type InventoryMovement = InferSchemaType<typeof inventoryMovementSchema>;
export const InventoryMovementModel = model('InventoryMovement', inventoryMovementSchema);
