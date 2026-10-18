import mongoose from 'mongoose';
import { connectDb } from './db.js';
import { ProductModel } from './models/product.js';

// Clearly-labelled SAMPLE catalogue for the storefront redesign. ~25 products
// across Mountain / City / Road / Kids / Accessories, with multi-size/colour
// variants, a few real compareAt discounts (for the Offers rail), and a couple
// of out-of-stock / low-stock variants so those UI states are exercised.
//
// This is DATA ONLY — no route, schema, migration, or business-logic change.
// Everything here is illustrative: the storefront labels it "sample" and never
// presents it as real business inventory. Photos reuse the three existing
// illustrative bike images; kids/accessories use branded sample SVGs.
//
// Money is stored in paise (₹1 = 100 paise). createdAt is staggered so the
// "New Arrivals" rail (which the API serves newest-first) reflects a real order.

const PAISE = 100;
const DAY = 24 * 60 * 60 * 1000;

type V = { sku: string; size: string; color: string; price: number; stock: number; compareAt?: number };
// variant helper — prices/compareAt given in rupees, converted to paise here.
function v(sku: string, size: string, color: string, priceR: number, stock: number, compareR = 0): V {
  return { sku, size, color, price: priceR * PAISE, stock, compareAt: compareR * PAISE };
}

const IMG = {
  mountain: '/images/mountain-bike.jpg',
  city: '/images/city-bike.jpg',
  road: '/images/road-bike.jpg',
  kids: '/images/sample-kids.svg',
  acc: '/images/sample-accessory.svg',
};

type Seed = {
  slug: string;
  name: string;
  category: string;
  description: string;
  image: string;
  specs: Record<string, string>;
  variants: V[];
};

const catalogue: Seed[] = [
  // ---- Mountain (6) ----
  { slug: 'trail-29', name: 'Trail 29', category: 'Mountain', image: IMG.mountain,
    description: 'Built for the route less travelled. Responsive handling and a frame that shrugs off rough ground.',
    specs: { 'Wheel size': '29 inch', Frame: 'Alloy (sample spec)', Gears: '21-speed', Sample: 'Yes' },
    variants: [v('DEMO-TRAIL29-S', '16 inch', 'Blue', 24999, 8), v('DEMO-TRAIL29-M', '18 inch', 'Blue', 24999, 10), v('DEMO-TRAIL29-L', '20 inch', 'Graphite', 25999, 5)] },
  { slug: 'ridge-27', name: 'Ridge 27 Comp', category: 'Mountain', image: IMG.mountain,
    description: 'A sample trail hardtail tuned for weekend climbs and fast descents.',
    specs: { 'Wheel size': '27.5 inch', Frame: 'Alloy (sample spec)', Gears: '24-speed', Sample: 'Yes' },
    variants: [v('DEMO-RIDGE27-M', '18 inch', 'Red', 21999, 6, 25999), v('DEMO-RIDGE27-L', '20 inch', 'Black', 22999, 4, 26999)] },
  { slug: 'summit-x', name: 'Summit X', category: 'Mountain', image: IMG.mountain,
    description: 'Sample all-rounder for mixed terrain — forgiving geometry, confident braking.',
    specs: { 'Wheel size': '29 inch', Frame: 'Alloy (sample spec)', Gears: '21-speed', Sample: 'Yes' },
    variants: [v('DEMO-SUMMITX-M', '18 inch', 'Green', 18999, 12), v('DEMO-SUMMITX-L', '20 inch', 'Green', 19499, 7)] },
  { slug: 'boulder-lite', name: 'Boulder Lite', category: 'Mountain', image: IMG.mountain,
    description: 'An entry sample mountain bike — light, simple, and easy to live with.',
    specs: { 'Wheel size': '26 inch', Frame: 'Steel (sample spec)', Gears: '18-speed', Sample: 'Yes' },
    variants: [v('DEMO-BOULDER-S', '15 inch', 'Orange', 12999, 15), v('DEMO-BOULDER-M', '17 inch', 'Grey', 12999, 9)] },
  { slug: 'apex-trail-pro', name: 'Apex Trail Pro', category: 'Mountain', image: IMG.mountain,
    description: 'Top of the sample trail range — sharper spec for riders who push harder.',
    specs: { 'Wheel size': '29 inch', Frame: 'Alloy (sample spec)', Gears: '27-speed', Sample: 'Yes' },
    variants: [v('DEMO-APEX-M', '18 inch', 'Black', 32999, 3), v('DEMO-APEX-L', '20 inch', 'Black', 33999, 0)] },
  { slug: 'foothill-1', name: 'Foothill 1', category: 'Mountain', image: IMG.mountain,
    description: 'Sample trail starter for new riders — stable, affordable, ready for the weekend.',
    specs: { 'Wheel size': '27.5 inch', Frame: 'Steel (sample spec)', Gears: '21-speed', Sample: 'Yes' },
    variants: [v('DEMO-FOOT1-M', '17 inch', 'Blue', 10999, 20)] },

  // ---- City (6) ----
  { slug: 'metro-one', name: 'Metro One', category: 'City', image: IMG.city,
    description: 'Turn the everyday commute into your favourite part of the day. Sample city bicycle.',
    specs: { 'Wheel size': '700C', Frame: 'Alloy (sample spec)', Gears: '7-speed', Sample: 'Yes' },
    variants: [v('DEMO-METRO-S', 'Small', 'Black', 15999, 10), v('DEMO-METRO-M', 'Medium', 'Black', 15999, 8), v('DEMO-METRO-M-W', 'Medium', 'White', 16499, 6)] },
  { slug: 'commuter-7', name: 'Commuter 7', category: 'City', image: IMG.city,
    description: 'Seven gears, mudguards, and a rack mount — a sample bike for real city life.',
    specs: { 'Wheel size': '700C', Frame: 'Alloy (sample spec)', Gears: '7-speed', Sample: 'Yes' },
    variants: [v('DEMO-COMM7-M', 'Medium', 'Teal', 17999, 9), v('DEMO-COMM7-L', 'Large', 'Teal', 18499, 5)] },
  { slug: 'lane-cruiser', name: 'Lane Cruiser', category: 'City', image: IMG.city,
    description: 'Relaxed, upright, easy — a sample cruiser for unhurried rides.',
    specs: { 'Wheel size': '26 inch', Frame: 'Steel (sample spec)', Gears: 'Single-speed', Sample: 'Yes' },
    variants: [v('DEMO-LANE-M', 'Medium', 'Cream', 11999, 14), v('DEMO-LANE-M-R', 'Medium', 'Red', 11999, 2)] },
  { slug: 'urban-step', name: 'Urban Step-Through', category: 'City', image: IMG.city,
    description: 'Low step-through frame for easy on-and-off. Sample everyday city bike.',
    specs: { 'Wheel size': '700C', Frame: 'Alloy (sample spec)', Gears: '3-speed', Sample: 'Yes' },
    variants: [v('DEMO-URBAN-S', 'Small', 'Mint', 14499, 11), v('DEMO-URBAN-M', 'Medium', 'Mint', 14499, 7)] },
  { slug: 'daily-ride', name: 'Daily Ride', category: 'City', image: IMG.city,
    description: 'The honest sample workhorse — no frills, just a dependable daily commuter.',
    specs: { 'Wheel size': '700C', Frame: 'Steel (sample spec)', Gears: '6-speed', Sample: 'Yes' },
    variants: [v('DEMO-DAILY-M', 'Medium', 'Grey', 8999, 18, 10999), v('DEMO-DAILY-L', 'Large', 'Grey', 9499, 10, 11499)] },
  { slug: 'cafe-roadster', name: 'Café Roadster', category: 'City', image: IMG.city,
    description: 'A sample classic-styled roadster with a modern drivetrain.',
    specs: { 'Wheel size': '700C', Frame: 'Steel (sample spec)', Gears: '8-speed', Sample: 'Yes' },
    variants: [v('DEMO-CAFE-M', 'Medium', 'British Racing Green', 19999, 6)] },

  // ---- Road (5) ----
  { slug: 'sprint-road', name: 'Sprint Road', category: 'Road', image: IMG.road,
    description: 'Find a new rhythm on the open road. Sample road bicycle for everyday adventures.',
    specs: { 'Wheel size': '700C', Frame: 'Alloy (sample spec)', Gears: '16-speed', Sample: 'Yes' },
    variants: [v('DEMO-SPRINT-54', '54 cm', 'Silver', 32999, 5), v('DEMO-SPRINT-56', '56 cm', 'Silver', 32999, 4)] },
  { slug: 'velocity-r', name: 'Velocity R', category: 'Road', image: IMG.road,
    description: 'Sample endurance road bike — long-day comfort without giving up speed.',
    specs: { 'Wheel size': '700C', Frame: 'Carbon (sample spec)', Gears: '22-speed', Sample: 'Yes' },
    variants: [v('DEMO-VELO-54', '54 cm', 'Black', 44999, 3, 52999), v('DEMO-VELO-56', '56 cm', 'Black', 45999, 2, 53999)] },
  { slug: 'aero-one', name: 'Aero One', category: 'Road', image: IMG.road,
    description: 'Sample aero road frame for riders chasing a personal best.',
    specs: { 'Wheel size': '700C', Frame: 'Alloy (sample spec)', Gears: '18-speed', Sample: 'Yes' },
    variants: [v('DEMO-AERO-56', '56 cm', 'White', 28999, 6)] },
  { slug: 'grand-tour', name: 'Grand Tour', category: 'Road', image: IMG.road,
    description: 'Sample touring bike built to carry you and your kit over long distances.',
    specs: { 'Wheel size': '700C', Frame: 'Steel (sample spec)', Gears: '27-speed', Sample: 'Yes' },
    variants: [v('DEMO-TOUR-54', '54 cm', 'Navy', 36999, 4), v('DEMO-TOUR-58', '58 cm', 'Navy', 37999, 3)] },
  { slug: 'club-racer', name: 'Club Racer', category: 'Road', image: IMG.road,
    description: 'An affordable sample entry to road riding — crisp and eager.',
    specs: { 'Wheel size': '700C', Frame: 'Alloy (sample spec)', Gears: '14-speed', Sample: 'Yes' },
    variants: [v('DEMO-CLUB-52', '52 cm', 'Yellow', 21999, 8)] },

  // ---- Kids (4) ----
  { slug: 'junior-16', name: 'Junior 16', category: 'Kids', image: IMG.kids,
    description: 'Sample first big-kid bike with training wheels included.',
    specs: { 'Wheel size': '16 inch', 'Age guide': '4–6 years (sample)', Frame: 'Steel (sample spec)', Sample: 'Yes' },
    variants: [v('DEMO-JR16-R', 'One size', 'Red', 6499, 12), v('DEMO-JR16-P', 'One size', 'Pink', 6499, 10)] },
  { slug: 'lil-explorer-20', name: "Lil' Explorer 20", category: 'Kids', image: IMG.kids,
    description: 'Sample kids’ bike for growing riders ready for gears.',
    specs: { 'Wheel size': '20 inch', 'Age guide': '6–9 years (sample)', Gears: '6-speed', Sample: 'Yes' },
    variants: [v('DEMO-LIL20-B', 'One size', 'Blue', 7999, 9), v('DEMO-LIL20-G', 'One size', 'Green', 7999, 6)] },
  { slug: 'first-pedal-14', name: 'First Pedal 14', category: 'Kids', image: IMG.kids,
    description: 'Sample starter bike for the very first rides.',
    specs: { 'Wheel size': '14 inch', 'Age guide': '3–5 years (sample)', Frame: 'Steel (sample spec)', Sample: 'Yes' },
    variants: [v('DEMO-FP14-Y', 'One size', 'Yellow', 4999, 20)] },
  { slug: 'teen-trail-24', name: 'Teen Trail 24', category: 'Kids', image: IMG.kids,
    description: 'Sample youth mountain bike that bridges to adult sizes.',
    specs: { 'Wheel size': '24 inch', 'Age guide': '9–12 years (sample)', Gears: '18-speed', Sample: 'Yes' },
    variants: [v('DEMO-TT24-B', 'One size', 'Black', 9999, 5, 12499)] },

  // ---- Accessories (4) ----
  { slug: 'guardian-helmet', name: 'Guardian Helmet', category: 'Accessories', image: IMG.acc,
    description: 'Sample vented helmet with adjustable fit dial.',
    specs: { Type: 'Helmet', Standard: 'Illustrative only', Sample: 'Yes' },
    variants: [v('DEMO-HELM-S', 'Small', 'Black', 1499, 25), v('DEMO-HELM-M', 'Medium', 'Black', 1499, 18), v('DEMO-HELM-L', 'Large', 'White', 1599, 12)] },
  { slug: 'steel-u-lock', name: 'Steel U-Lock', category: 'Accessories', image: IMG.acc,
    description: 'Sample hardened U-lock with two keys.',
    specs: { Type: 'Lock', Sample: 'Yes' },
    variants: [v('DEMO-LOCK-1', 'One size', 'Black', 899, 40)] },
  { slug: 'led-beam-lights', name: 'LED Beam Light Set', category: 'Accessories', image: IMG.acc,
    description: 'Sample front + rear USB-rechargeable light set.',
    specs: { Type: 'Lights', Sample: 'Yes' },
    variants: [v('DEMO-LIGHT-1', 'One size', 'Black', 1299, 30, 1699)] },
  { slug: 'front-haul-basket', name: 'Front Haul Basket', category: 'Accessories', image: IMG.acc,
    description: 'Sample quick-release front basket for city runs.',
    specs: { Type: 'Basket', Sample: 'Yes' },
    variants: [v('DEMO-BASKET-1', 'One size', 'Silver', 1199, 22)] },
];

// Curated "Staff picks" — an editorial spread across categories. Sets the real
// `featured` flag the storefront reads (replacing the old hardcoded slug list).
const FEATURED = new Set([
  'metro-one',
  'velocity-r',
  'trail-29',
  'cafe-roadster',
  'lil-explorer-20',
  'guardian-helmet',
]);

async function seed(): Promise<void> {
  await connectDb();

  const now = Date.now();
  // Freshness base per category (days ago) so bikes read as the newest arrivals
  // and accessories/kids as older stock. Bases overlap so the bike categories
  // interleave in the "New Arrivals" rail rather than clustering by type.
  const FRESH: Record<string, number> = { Mountain: 0, City: 2, Road: 4, Kids: 20, Accessories: 26 };
  const seen: Record<string, number> = {};
  const docs = catalogue.map((p) => {
    const n = seen[p.category] ?? 0;
    seen[p.category] = n + 1;
    const daysAgo = (FRESH[p.category] ?? 15) + n;
    const when = new Date(now - daysAgo * DAY);
    return { ...p, featured: FEATURED.has(p.slug), status: 'published', createdAt: when, updatedAt: when };
  });

  await ProductModel.deleteMany({ slug: { $in: catalogue.map((p) => p.slug) } });
  // timestamps:false so our staggered createdAt stands instead of being overwritten.
  // Mongoose honours this option at runtime; its typings for this version omit it.
  await ProductModel.insertMany(docs, { timestamps: false } as Record<string, unknown>);

  console.log(`Seeded ${docs.length} SAMPLE products across Mountain/City/Road/Kids/Accessories.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
