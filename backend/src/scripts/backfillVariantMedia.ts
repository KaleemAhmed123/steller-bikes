import process from 'node:process';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { ProductModel } from '../models/product.js';

// One-off, safe to re-run: give every variant that has NO media of its own the
// product's photos (main image first, then the gallery), so nothing shows the
// "No Image Available" box just because it was created before variant media existed.
// Variants that already have media are left untouched.
//   npm run backfill:variant-media
async function run(): Promise<void> {
  await connectDb();
  let variantsFilled = 0;
  const products = await ProductModel.find({});
  for (const p of products) {
    const photos = [p.image, ...(p.images ?? [])].filter((u, i, all) => u && all.indexOf(u) === i);
    let changed = false;
    for (const v of p.variants) {
      if (v.media.length > 0) continue;
      photos.slice(0, 10).forEach((url, position) => v.media.push({ url, type: 'image', position }));
      variantsFilled++;
      changed = true;
    }
    if (changed) await p.save();
  }
  console.log(`Backfilled ${variantsFilled} variant(s) across ${products.length} product(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('backfill:variant-media failed:', err);
  process.exit(1);
});
