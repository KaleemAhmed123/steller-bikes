import { ProductModel } from '../models/product.js';
import type { VariantInfo } from './cartView.js';

// Look up live info for a set of variant ids, from published products only.
// Shared by the cart and the checkout — both must price from live data.
export async function loadVariantMap(variantIds: string[]): Promise<Map<string, VariantInfo>> {
  const map = new Map<string, VariantInfo>();
  if (variantIds.length === 0) return map;

  const products = await ProductModel.find({
    'variants._id': { $in: variantIds },
    status: 'published',
  }).lean();

  const wanted = new Set(variantIds);
  for (const p of products) {
    for (const v of p.variants) {
      const id = String(v._id);
      if (!wanted.has(id)) continue;
      map.set(id, {
        variantId: id,
        name: p.name,
        slug: p.slug,
        image: p.image,
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: v.price,
        stock: v.stock,
      });
    }
  }
  return map;
}
