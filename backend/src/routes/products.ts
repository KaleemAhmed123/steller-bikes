import { Router } from 'express';
import { ProductModel } from '../models/product.js';
import { OrderModel } from '../models/order.js';
import { productQuerySchema, buildProductFilter } from '../lib/productQuery.js';
import { attachSoldCount } from '../lib/popularity.js';
import { parsePagination, pageMeta } from '../lib/pagination.js';

export const productsRouter = Router();

// GET /api/products[?category=&q=&minPrice=&maxPrice=]
// The published catalogue, optionally filtered. Also returns the full list of
// published categories (over ALL published products, not the filtered set) so the
// storefront's category buttons stay stable while a filter is active.
productsRouter.get('/', async (req, res, next) => {
  try {
    const parsed = productQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Invalid filter parameters.' } });
      return;
    }

    const filter = buildProductFilter(parsed.data);
    const pg = parsePagination(req.query); // default 24/page, max 100
    // ponytail: one aggregation over all orders per catalogue fetch — fine for a
    // small shop. If catalogue traffic grows, cache this map or materialise a
    // stored soldCount per product and $inc it on delivery.
    const [products, total, categories, sold] = await Promise.all([
      ProductModel.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
      ProductModel.countDocuments(filter),
      ProductModel.distinct('category', { status: 'published' }),
      OrderModel.aggregate<{ _id: unknown; units: number }>([
        { $match: { fulfillmentStatus: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.variantId', units: { $sum: '$items.quantity' } } },
      ]),
    ]);

    const unitsByVariant = new Map(sold.map((row) => [String(row._id), row.units]));
    res.json({
      data: attachSoldCount(products, unitsByVariant),
      categories: categories.sort(),
      pagination: pageMeta(total, pg),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug — one published product by its URL slug.
productsRouter.get('/:slug', async (req, res, next) => {
  try {
    const product = await ProductModel.findOne({
      slug: req.params.slug,
      status: 'published',
    }).lean();

    if (!product) {
      res.status(404).json({ error: { message: 'Product not found.' } });
      return;
    }

    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});
