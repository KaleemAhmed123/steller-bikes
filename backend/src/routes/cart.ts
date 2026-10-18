import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { CartModel } from '../models/cart.js';
import { computeCartView } from '../lib/cartView.js';
import { loadVariantMap } from '../lib/variants.js';

export const cartRouter = Router();

// Build the recomputed cart view for an owner (prices/stock looked up live).
async function cartView(owner: string) {
  const cart = await CartModel.findOne({ owner }).lean();
  const items = (cart?.items ?? []).map((i) => ({
    variantId: String(i.variantId),
    quantity: i.quantity,
  }));
  const variants = await loadVariantMap(items.map((i) => i.variantId));
  return computeCartView(items, variants);
}

function owner(res: { locals: Record<string, unknown> }): string {
  return res.locals.owner as string;
}

// GET /api/cart — the current cart, recomputed live.
cartRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ data: await cartView(owner(res)) });
  } catch (err) {
    next(err);
  }
});

const addSchema = z.object({
  variantId: z.string().refine(isValidObjectId, 'invalid variant id'),
  quantity: z.coerce.number().int().min(1).default(1),
});

// POST /api/cart/items — add a variant (or add to its quantity), capped at stock.
cartRouter.post('/items', async (req, res, next) => {
  try {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Invalid cart item.' } });
      return;
    }
    const { variantId, quantity } = parsed.data;

    const variant = (await loadVariantMap([variantId])).get(variantId);
    if (!variant) {
      res.status(404).json({ error: { message: 'That option is no longer available.' } });
      return;
    }
    if (variant.stock <= 0) {
      res.status(409).json({ error: { message: 'That option is out of stock.' } });
      return;
    }

    const cart = (await CartModel.findOne({ owner: owner(res) })) ?? new CartModel({ owner: owner(res) });
    const existing = cart.items.find((i) => String(i.variantId) === variantId);
    const desired = (existing?.quantity ?? 0) + quantity;
    const capped = Math.min(desired, variant.stock); // never exceed on-hand stock

    if (existing) existing.quantity = capped;
    else cart.items.push({ variantId: variant.variantId, quantity: capped });

    await cart.save();
    res.json({ data: await cartView(owner(res)) });
  } catch (err) {
    next(err);
  }
});

const qtySchema = z.object({ quantity: z.coerce.number().int().min(0) });

// PATCH /api/cart/items/:variantId — set a line's quantity (0 removes it), capped at stock.
cartRouter.patch('/items/:variantId', async (req, res, next) => {
  try {
    const { variantId } = req.params;
    const parsed = qtySchema.safeParse(req.body);
    if (!isValidObjectId(variantId) || !parsed.success) {
      res.status(400).json({ error: { message: 'Invalid quantity.' } });
      return;
    }

    const cart = await CartModel.findOne({ owner: owner(res) });
    if (cart) {
      if (parsed.data.quantity === 0) {
        const idx = cart.items.findIndex((i) => String(i.variantId) === variantId);
        if (idx !== -1) cart.items.splice(idx, 1);
      } else {
        const variant = (await loadVariantMap([variantId])).get(variantId);
        const item = cart.items.find((i) => String(i.variantId) === variantId);
        if (variant && item) item.quantity = Math.min(parsed.data.quantity, variant.stock);
      }
      await cart.save();
    }
    res.json({ data: await cartView(owner(res)) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/items/:variantId — remove a line.
cartRouter.delete('/items/:variantId', async (req, res, next) => {
  try {
    const { variantId } = req.params;
    const cart = await CartModel.findOne({ owner: owner(res) });
    if (cart) {
      const idx = cart.items.findIndex((i) => String(i.variantId) === variantId);
      if (idx !== -1) cart.items.splice(idx, 1);
      await cart.save();
    }
    res.json({ data: await cartView(owner(res)) });
  } catch (err) {
    next(err);
  }
});
