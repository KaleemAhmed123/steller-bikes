import { Router } from 'express';
import { ProductModel } from '../models/product.js';
import { productQuerySchema, buildProductFilter, productSortSpec } from '../lib/productQuery.js';
import { parsePagination, pageMeta } from '../lib/pagination.js';

export const productsRouter = Router();

// GET /api/products[?category=&q=&minPrice=&maxPrice=&sort=&page=&limit=]
// The published catalogue, optionally filtered and sorted, one page at a time.
// Also returns the full list of published categories (over ALL published products,
// not the filtered set) so the storefront's category buttons stay stable while a
// filter is active.
//
// Sort runs in the database over the WHOLE matching set before paging, so infinite
// scroll is globally correct. Two of the sort keys are derived, not stored, so the
// aggregation computes them:
//   - fromPrice  = the cheapest variant's price   ($min over variants.price)
//   - soldCount  = units actually ordered (not cancelled), summed across the
//                  product's variants ($lookup into orders)
// ponytail: the $lookup runs per matched product (O(products × order-items)) — fine
// for a small shop. If the catalogue/orders ever grow, denormalise soldCount onto the
// product and $inc it on delivery, then $sort on the stored field (drop the $lookup).
productsRouter.get('/', async (req, res, next) => {
  try {
    const parsed = productQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Invalid filter parameters.' } });
      return;
    }

    const filter = buildProductFilter(parsed.data);
    const pg = parsePagination(req.query); // default 24/page, max 100

    const [products, total, categories] = await Promise.all([
      ProductModel.aggregate([
        { $match: filter },
        { $addFields: { fromPrice: { $min: '$variants.price' } } },
        {
          $lookup: {
            from: 'orders',
            let: { vids: '$variants._id' },
            pipeline: [
              { $match: { fulfillmentStatus: { $ne: 'cancelled' } } },
              { $unwind: '$items' },
              { $match: { $expr: { $in: ['$items.variantId', '$$vids'] } } },
              { $group: { _id: null, units: { $sum: '$items.quantity' } } },
            ],
            as: '_sold',
          },
        },
        { $addFields: { soldCount: { $ifNull: [{ $arrayElemAt: ['$_sold.units', 0] }, 0] } } },
        { $sort: productSortSpec(parsed.data.sort) },
        { $skip: pg.skip },
        { $limit: pg.limit },
        { $project: { _sold: 0, fromPrice: 0 } },
      ]),
      ProductModel.countDocuments(filter),
      ProductModel.distinct('category', { status: 'published' }),
    ]);

    res.json({
      data: products,
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
