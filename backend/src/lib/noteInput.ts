import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

export const NOTE_TYPES = ['order', 'product', 'inventory', 'general'] as const;

// What the admin sends to create a note. A tagged note (order/product/inventory)
// needs a valid target id; a general note needs none. Kept here (not inline in the
// route) so the validation rule has one home and a test.
export const noteInputSchema = z
  .object({
    type: z.enum(NOTE_TYPES),
    refId: z.string().trim().optional(),
    body: z.string().trim().min(1, 'Write something first.').max(2000, 'Note is too long.'),
  })
  .refine((d) => d.type === 'general' || (!!d.refId && isValidObjectId(d.refId)), {
    message: 'A valid target is required.',
    path: ['refId'],
  });

export type NoteInput = z.infer<typeof noteInputSchema>;
