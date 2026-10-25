import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { OrderModel } from '../models/order.js';
import { ProductModel } from '../models/product.js';
import { SettingsModel } from '../models/settings.js';
import { InventoryMovementModel } from '../models/inventoryMovement.js';
import { requirePermission, type ActorStaff } from '../lib/auth.js';
import { transitionOrder, TransitionError } from '../lib/fulfillment.js';
import { adjustStock, InventoryError } from '../lib/inventory.js';
import { productInputSchema, productUpdateSchema } from '../lib/productInput.js';
import { siteContentShape, toOfferKey, withSiteContent } from '../lib/siteContent.js';
import { buildDashboard, rangeStart } from '../lib/dashboard.js';
import { isDuplicateKeyError, escapeRegex } from '../lib/mongo.js';
import { parsePagination, pageMeta } from '../lib/pagination.js';
import { orderDetail } from '../lib/orderDetail.js';

export const adminRouter = Router();

const actor = (res: { locals: Record<string, unknown> }) => (res.locals.staff as ActorStaff).email;

// Flatten all variants (across products) into a single list for the inventory screen.
async function loadInventory() {
  const products = await ProductModel.find({}).lean();
  const variants = [];
  for (const p of products) {
    for (const v of p.variants) {
      variants.push({
        variantId: String(v._id),
        productName: p.name,
        slug: p.slug,
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: v.price,
        stock: v.stock,
        lowStock: v.lowStock,
      });
    }
  }
  const movements = await InventoryMovementModel.find({}).sort({ createdAt: -1 }).limit(100).lean();
  return { variants, movements };
}

// GET /api/admin/dashboard?range=today|7d|15d|30d|all — the operator dashboard,
// every figure scoped to the chosen range (default 30d).
adminRouter.get('/dashboard', requirePermission('dashboard.read'), async (req, res, next) => {
  try {
    const range = typeof req.query.range === 'string' ? req.query.range : '30d';
    res.json({ data: await buildDashboard(rangeStart(range)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders?status=&q= — the order queue.
adminRouter.get('/orders', requirePermission('orders.read'), async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filter: Record<string, unknown> = {};
    if (status) filter.fulfillmentStatus = status;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      const or: Record<string, unknown>[] = [{ email: rx }, { 'address.phone': rx }];
      if (isValidObjectId(q)) or.push({ _id: q });
      filter.$or = or;
    }
    const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const [orders, total] = await Promise.all([
      OrderModel.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
      OrderModel.countDocuments(filter),
    ]);
    res.json({ data: orders, pagination: pageMeta(total, pg) });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/:id — one order + its legal next states.
adminRouter.get('/orders/:id', requirePermission('orders.read'), async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(404).json({ error: { message: 'Order not found.' } });
      return;
    }
    const detail = await orderDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: { message: 'Order not found.' } });
      return;
    }
    res.json({ data: detail });
  } catch (err) {
    next(err);
  }
});

const transitionSchema = z.object({
  status: z.string().min(1),
  tracking: z.string().max(200).default(''),
});

// POST /api/admin/orders/:id/transition — move the order through the state machine.
adminRouter.post('/orders/:id/transition', requirePermission('orders.update'), async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(404).json({ error: { message: 'Order not found.' } });
      return;
    }
    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Invalid request.' } });
      return;
    }
    await transitionOrder(actor(res), req.params.id, parsed.data.status, parsed.data.tracking);
    res.json({ data: await orderDetail(req.params.id) });
  } catch (err) {
    if (err instanceof TransitionError) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'CONCURRENT' ? 409 : 422;
      res.status(status).json({ error: { message: err.message } });
      return;
    }
    next(err);
  }
});

// GET /api/admin/inventory — variants + recent stock movements.
adminRouter.get('/inventory', requirePermission('inventory.read'), async (_req, res, next) => {
  try {
    res.json({ data: await loadInventory() });
  } catch (err) {
    next(err);
  }
});

const adjustSchema = z.object({
  variantId: z.string().refine(isValidObjectId, 'invalid variant'),
  delta: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, 'Adjustment cannot be zero.')
    .refine((n) => Math.abs(n) <= 100000, 'Adjustment is too large.'),
  reason: z.string().trim().min(3).max(300),
});

// POST /api/admin/inventory/adjust — change a variant's stock (+ reason).
adminRouter.post('/inventory/adjust', requirePermission('inventory.adjust'), async (req, res, next) => {
  try {
    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Invalid adjustment.' } });
      return;
    }
    await adjustStock(actor(res), parsed.data.variantId, parsed.data.delta, parsed.data.reason);
    res.json({ data: await loadInventory() });
  } catch (err) {
    if (err instanceof InventoryError) {
      res.status(err.code === 'NOT_FOUND' ? 404 : 422).json({ error: { message: err.message } });
      return;
    }
    next(err);
  }
});

// --- Products (full CRUD) ---------------------------------------------------
// A duplicate slug trips the unique index → isDuplicateKeyError (Mongo 11000).

// GET /api/admin/products?q= — every product, ANY status (newest first). `q`
// matches name / slug / category (case-insensitive). Unlike the storefront's
// published-only filter, this searches drafts and archived too.
adminRouter.get('/products', requirePermission('products.manage'), async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filter: Record<string, unknown> = {};
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { slug: rx }, { category: rx }];
    }
    const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const [products, total] = await Promise.all([
      ProductModel.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
      ProductModel.countDocuments(filter),
    ]);
    res.json({ data: products, pagination: pageMeta(total, pg) });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/products/:id — one product for the edit form.
adminRouter.get('/products/:id', requirePermission('products.manage'), async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(404).json({ error: { message: 'Product not found.' } });
      return;
    }
    const product = await ProductModel.findById(req.params.id).lean();
    if (!product) {
      res.status(404).json({ error: { message: 'Product not found.' } });
      return;
    }
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products — create a product.
adminRouter.post('/products', requirePermission('products.manage'), async (req, res, next) => {
  try {
    const parsed = productInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Check the product details.' } });
      return;
    }
    const badTag = await firstUnknownOfferType(parsed.data.offerTypes);
    if (badTag) {
      res.status(400).json({ error: { message: `“${badTag}” isn’t an offer type. Add it on the Platform page first.` } });
      return;
    }
    const product = await ProductModel.create(parsed.data);
    res.status(201).json({ data: product.toObject() });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      res.status(409).json({ error: { message: 'A product with this slug already exists.' } });
      return;
    }
    next(err);
  }
});

// PATCH /api/admin/products/:id — update any subset of a product's fields.
adminRouter.patch('/products/:id', requirePermission('products.manage'), async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(404).json({ error: { message: 'Product not found.' } });
      return;
    }
    const parsed = productUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Check the product details.' } });
      return;
    }
    const badTag = await firstUnknownOfferType(parsed.data.offerTypes);
    if (badTag) {
      res.status(400).json({ error: { message: `“${badTag}” isn’t an offer type. Add it on the Platform page first.` } });
      return;
    }
    const product = await ProductModel.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!product) {
      res.status(404).json({ error: { message: 'Product not found.' } });
      return;
    }
    res.json({ data: product });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      res.status(409).json({ error: { message: 'A product with this slug already exists.' } });
      return;
    }
    next(err);
  }
});

// DELETE /api/admin/products/:id — hard delete. Order history is safe (items are
// snapshotted). To hide without deleting, set status to 'archived' instead.
adminRouter.delete('/products/:id', requirePermission('products.manage'), async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(404).json({ error: { message: 'Product not found.' } });
      return;
    }
    const deleted = await ProductModel.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      res.status(404).json({ error: { message: 'Product not found.' } });
      return;
    }
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

// --- Store settings ---------------------------------------------------------
const settingsSchema = z.object({
  addressLine1: z.string().trim().max(200),
  city: z.string().trim().max(80),
  state: z.string().trim().max(80),
  pin: z.string().trim().max(10),
  phone: z.string().trim().max(30),
  whatsapp: z.string().trim().max(30),
  hours: z.string().trim().max(200),
  deliveryPolicy: z.string().trim().max(500),
  email: z.string().trim().max(120),
  // Delivery rules: pincodes charged the flat Fitted Delivery fee, and that fee in paise.
  kanpurPincodes: z.array(z.string().trim().regex(/^\d{6}$/, 'Pincodes must be 6 digits.')).min(1, 'Keep at least one pincode.').max(200),
  kanpurDeliveryFee: z.coerce.number().int().min(0).max(1_000_000),
  // Operational config (Platform tab). `categories` is NOT here — it is managed
  // by the dedicated category endpoints, so a settings save can never touch it.
  codEnabled: z.boolean(),
  onlinePaymentEnabled: z.boolean(),
  announcement: z.string().trim().max(300),
  // Site content tab (hero text, offer rail, retailers) — rules + defaults in lib/siteContent.ts.
  ...siteContentShape,
});

// GET /api/admin/settings — current shop details (empty object if unset).
adminRouter.get('/settings', requirePermission('settings.manage'), async (_req, res, next) => {
  try {
    const doc = await SettingsModel.findOne().lean();
    res.json({ data: withSiteContent(doc) }); // defaults merged so the form is never blank
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/settings — upsert the single settings document.
adminRouter.patch('/settings', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const parsed = settingsSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Check the settings.' } });
      return;
    }
    // Guard: never leave the shop unbuyable. Check the patch against the live doc —
    // the effective flags after this save must keep at least one payment method on.
    if ('codEnabled' in parsed.data || 'onlinePaymentEnabled' in parsed.data) {
      const current = await SettingsModel.findOne().lean();
      const cod = parsed.data.codEnabled ?? current?.codEnabled ?? true;
      const online = parsed.data.onlinePaymentEnabled ?? current?.onlinePaymentEnabled ?? true;
      if (!cod && !online) {
        res.status(400).json({ error: { message: 'Keep at least one payment method on (COD or online).' } });
        return;
      }
    }
    const doc = await SettingsModel.findOneAndUpdate({}, { $set: parsed.data }, { new: true, upsert: true }).lean();
    res.json({ data: withSiteContent(doc) });
  } catch (err) {
    next(err);
  }
});

// --- Categories (config-driven) ---------------------------------------------
// The canonical list lives on the settings doc; the dropdown the product form
// shows is the UNION of that list and the categories actually on products, so
// nothing is ever orphaned and no data migration is needed.

// Read the stored category list (empty if no settings doc yet).
async function storedCategories(): Promise<string[]> {
  const doc = await SettingsModel.findOne().lean();
  return doc?.categories ?? [];
}

// Every category name → how many products use it. Union of stored + in-use.
async function categoriesWithCounts(): Promise<{ name: string; count: number }[]> {
  const [stored, grouped] = await Promise.all([
    storedCategories(),
    ProductModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);
  const counts = new Map(grouped.map((g) => [g._id, g.count]));
  const names = new Set<string>([...stored, ...counts.keys()]);
  return [...names]
    .filter((n) => n) // drop any empty/null category
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, count: counts.get(name) ?? 0 }));
}

// GET /api/admin/categories — the dropdown source (managers need it for the
// product form), each with its product count for the Platform manager.
adminRouter.get('/categories', requirePermission('products.manage'), async (_req, res, next) => {
  try {
    res.json({ data: await categoriesWithCounts() });
  } catch (err) {
    next(err);
  }
});

const categoryNameSchema = z.string().trim().min(1).max(60);

// POST /api/admin/categories — add a category to the stored list (owner only).
adminRouter.post('/categories', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({ name: categoryNameSchema }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Enter a category name (1–60 characters).' } });
      return;
    }
    const name = parsed.data.name;
    const stored = await storedCategories();
    if (stored.some((c) => c.toLowerCase() === name.toLowerCase())) {
      res.status(409).json({ error: { message: 'That category already exists.' } });
      return;
    }
    await SettingsModel.findOneAndUpdate({}, { $push: { categories: name } }, { upsert: true });
    res.status(201).json({ data: await categoriesWithCounts() });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/categories — rename (owner only). Bulk-updates every product
// with the old category, then renames it in the stored list. One updateMany.
adminRouter.patch('/categories', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({ from: categoryNameSchema, to: categoryNameSchema }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Enter both the old and new category name.' } });
      return;
    }
    const { from, to } = parsed.data;
    if (from === to) {
      res.json({ data: await categoriesWithCounts() });
      return;
    }
    const all = await categoriesWithCounts();
    if (all.some((c) => c.name.toLowerCase() === to.toLowerCase())) {
      res.status(409).json({ error: { message: 'A category with the new name already exists.' } });
      return;
    }
    await ProductModel.updateMany({ category: from }, { $set: { category: to } });
    // Rename in the stored list: drop the old name, add the new (works whether or
    // not `from` was stored — a purely in-use category becomes stored under `to`).
    await SettingsModel.findOneAndUpdate({}, { $pull: { categories: from } }, { upsert: true });
    await SettingsModel.findOneAndUpdate({}, { $addToSet: { categories: to } }, { upsert: true });
    res.json({ data: await categoriesWithCounts() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/categories/:name — delete (owner only). BLOCKED while any
// product still uses it (409 + the count); otherwise removed from the stored list.
adminRouter.delete('/categories/:name', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const name = req.params.name;
    const count = await ProductModel.countDocuments({ category: name });
    if (count > 0) {
      res.status(409).json({
        error: { message: `${count} product${count === 1 ? '' : 's'} still use “${name}”. Reassign them first.` },
      });
      return;
    }
    await SettingsModel.findOneAndUpdate({}, { $pull: { categories: name } });
    res.json({ data: await categoriesWithCounts() });
  } catch (err) {
    next(err);
  }
});

// --- Offer types (config-driven, like categories) ---------------------------
// The master list lives on the settings doc; a product's `offerTypes` tags must come
// from it. The list the admin sees is the UNION of stored + in-use keys, so nothing
// is ever orphaned. No rename (ponytail: delete + re-tag if a key must change).

async function storedOfferTypes(): Promise<string[]> {
  const doc = await SettingsModel.findOne().lean();
  return doc?.offerTypes ?? [];
}

// First tag in `tags` that is not in the master list, or undefined if all are fine.
async function firstUnknownOfferType(tags: string[] | undefined): Promise<string | undefined> {
  if (!tags?.length) return undefined;
  const known = new Set(await storedOfferTypes());
  return tags.find((t) => !known.has(t));
}

async function offerTypesWithCounts(): Promise<{ key: string; count: number }[]> {
  const [stored, grouped] = await Promise.all([
    storedOfferTypes(),
    ProductModel.aggregate<{ _id: string; count: number }>([
      { $unwind: '$offerTypes' },
      { $group: { _id: '$offerTypes', count: { $sum: 1 } } },
    ]),
  ]);
  const counts = new Map(grouped.map((g) => [g._id, g.count]));
  return [...new Set<string>([...stored, ...counts.keys()])]
    .filter((k) => k)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ key, count: counts.get(key) ?? 0 }));
}

// GET /api/admin/offer-types — the product form's checkboxes + the Platform manager.
adminRouter.get('/offer-types', requirePermission('products.manage'), async (_req, res, next) => {
  try {
    res.json({ data: await offerTypesWithCounts() });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/offer-types — add one (owner only). The admin types a name
// ("New Year"); we store the key ("new-year").
adminRouter.post('/offer-types', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({ name: z.string().trim().min(1).max(60) }).safeParse(req.body);
    const key = parsed.success ? toOfferKey(parsed.data.name) : '';
    if (!key) {
      res.status(400).json({ error: { message: 'Enter an offer name, e.g. Diwali or New Year.' } });
      return;
    }
    if ((await storedOfferTypes()).includes(key)) {
      res.status(409).json({ error: { message: 'That offer type already exists.' } });
      return;
    }
    await SettingsModel.findOneAndUpdate({}, { $addToSet: { offerTypes: key } }, { upsert: true });
    res.status(201).json({ data: await offerTypesWithCounts() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/offer-types/:key — owner only; BLOCKED while any product carries it.
adminRouter.delete('/offer-types/:key', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const key = req.params.key;
    const count = await ProductModel.countDocuments({ offerTypes: key });
    if (count > 0) {
      res.status(409).json({
        error: { message: `${count} product${count === 1 ? '' : 's'} still use “${key}”. Untag them first.` },
      });
      return;
    }
    await SettingsModel.findOneAndUpdate({}, { $pull: { offerTypes: key } });
    res.json({ data: await offerTypesWithCounts() });
  } catch (err) {
    next(err);
  }
});
