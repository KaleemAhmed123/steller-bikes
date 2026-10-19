import { Schema, model, InferSchemaType } from 'mongoose';

// A staff note. Either tagged to one entity (order/product/inventory variant) or
// 'general'. `targetId` is absent for general notes. Admin-only.
const noteSchema = new Schema(
  {
    author: { type: String, required: true }, // staff email who wrote it
    body: { type: String, required: true, maxlength: 2000 },
    targetType: {
      type: String,
      enum: ['order', 'product', 'inventory', 'general'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: false },
  },
  { timestamps: true },
);

// Fast "notes for this entity, newest first" lookups.
noteSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export type Note = InferSchemaType<typeof noteSchema>;
export const NoteModel = model('Note', noteSchema);
