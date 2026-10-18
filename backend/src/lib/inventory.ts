import mongoose from 'mongoose';
import { ProductModel } from '../models/product.js';
import { InventoryMovementModel } from '../models/inventoryMovement.js';

export type InventoryCode = 'NOT_FOUND' | 'INSUFFICIENT';
export class InventoryError extends Error {
  constructor(
    public code: InventoryCode,
    message: string,
  ) {
    super(message);
    this.name = 'InventoryError';
  }
}

// Manually change a variant's stock by `delta` (+ receive, − shrinkage/correction),
// recording a movement with before/after. A negative delta is applied with an
// atomic guard so stock can never go below zero.
export async function adjustStock(
  actor: string,
  variantId: string,
  delta: number,
  reason: string,
): Promise<{ before: number; after: number }> {
  const vid = new mongoose.Types.ObjectId(variantId);

  const prod = await ProductModel.findOne({ 'variants._id': vid }, { 'variants.$': 1 });
  if (!prod || !prod.variants?.[0]) throw new InventoryError('NOT_FOUND', 'Variant not found.');

  const before = prod.variants[0].stock;
  const after = before + delta;
  if (after < 0) throw new InventoryError('INSUFFICIENT', 'Not enough stock to remove that many.');

  // $elemMatch keeps the stock>=|delta| guard on the SAME variant the positional $ updates.
  const filter =
    delta < 0
      ? { variants: { $elemMatch: { _id: vid, stock: { $gte: -delta } } } }
      : { 'variants._id': vid };
  const updated = await ProductModel.updateOne(filter, { $inc: { 'variants.$.stock': delta } });
  if (updated.matchedCount === 0) {
    throw new InventoryError('INSUFFICIENT', 'Not enough stock to remove that many.');
  }

  await InventoryMovementModel.create({ variantId: vid, actor, reason, before, after });
  return { before, after };
}
