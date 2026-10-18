import { getProducts } from './api';
import type { Product } from './types';

// Frontend data-access / adapter layer for the storefront.
//
// Goal: the UI reads clean, derived shapes from here — never raw API payloads —
// so when the backend later gains real fields (a `featured` flag, popularity,
// galleries), we change this file, not every component.
//
// Honesty rule: every rail below is derived ONLY from fields the API really
// returns. Nothing is faked:
//   - New Arrivals  → the API already sorts newest-first (createdAt).
//   - Budget Picks  → cheapest variant price, ascending.
//   - Offers        → variants whose compareAt actually exceeds price.
//   - By category   → the product's real category.
//   - Featured      → a curated slug list (an editorial pick, NOT a sales claim).

// A card-ready view of a product. Decoupled from the raw Product shape.
export interface CardProduct {
  slug: string;
  name: string;
  category: string;
  image: string;
  fromPrice: number; // paise — cheapest variant
  fromCompareAt: number; // paise — the cheapest variant's "was" price, 0 if none
  hasOffer: boolean; // any variant genuinely discounted
  offerPct: number; // best genuine discount %, 0 if none
  colors: string[]; // distinct variant colours (for a swatch preview only)
  sizes: string[]; // distinct variant sizes
  variantCount: number;
  soleVariantId: string | null; // set only when there's exactly one variant (direct add-to-cart)
  inStock: boolean;
}

// Editorial "Staff Picks" — a curated spread across categories. Honestly a
// hand-picked selection, not a popularity ranking. A later backend `featured`
// flag can replace this constant.
export const FEATURED_SLUGS = [
  'metro-one',
  'velocity-r',
  'trail-29',
  'cafe-roadster',
  'lil-explorer-20',
  'guardian-helmet',
];

export function toCard(p: Product): CardProduct {
  const prices = p.variants.map((v) => v.price);
  const fromPrice = prices.length ? Math.min(...prices) : 0;
  const cheapest = p.variants.find((v) => v.price === fromPrice);
  const fromCompareAt =
    cheapest && cheapest.compareAt > cheapest.price ? cheapest.compareAt : 0;

  const discounted = p.variants.filter((v) => v.compareAt > v.price);
  const offerPct = discounted.reduce((best, v) => {
    const pct = Math.round(((v.compareAt - v.price) / v.compareAt) * 100);
    return pct > best ? pct : best;
  }, 0);

  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    image: p.image,
    fromPrice,
    fromCompareAt,
    hasOffer: discounted.length > 0,
    offerPct,
    colors: [...new Set(p.variants.map((v) => v.color))],
    sizes: [...new Set(p.variants.map((v) => v.size))],
    variantCount: p.variants.length,
    soleVariantId: p.variants.length === 1 ? p.variants[0]._id : null,
    inStock: p.variants.some((v) => v.stock > 0),
  };
}

export type SortKey = 'newest' | 'price-asc' | 'price-desc';

export function sortCards(cards: CardProduct[], sort: SortKey): CardProduct[] {
  if (sort === 'price-asc') return [...cards].sort((a, b) => a.fromPrice - b.fromPrice);
  if (sort === 'price-desc') return [...cards].sort((a, b) => b.fromPrice - a.fromPrice);
  return cards; // 'newest' — already newest-first from the API
}

export interface CatTile {
  name: string;
  image: string;
  count: number;
}

// Build one tile per real category, in a sensible fixed order, with a
// representative image (the newest card in that category).
const CAT_ORDER = ['Mountain', 'City', 'Road', 'Kids', 'Accessories'];
function catTiles(cards: CardProduct[]): CatTile[] {
  const names = [...new Set(cards.map((c) => c.category))];
  names.sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a);
    const ib = CAT_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return names.map((name) => {
    const inCat = cards.filter((c) => c.category === name);
    return { name, image: inCat[0]?.image ?? '', count: inCat.length };
  });
}

// Everything the homepage needs, fetched once and derived here.
export interface HomeData {
  categories: string[];
  total: number;
  tiles: CatTile[];
  newArrivals: CardProduct[];
  featured: CardProduct[];
  budget: CardProduct[];
  offers: CardProduct[];
  kids: CardProduct[];
  accessories: CardProduct[];
  heroNew: CardProduct | null; // the single newest, for the editorial lead
}

// Dedicated collection pages (the rails that moved off the trimmed homepage).
// Each derives from real fields only — same honesty rules as the homepage.
export const COLLECTIONS = {
  'new-arrivals': {
    eyebrow: 'Fresh off the stand',
    title: 'New arrivals',
    blurb: 'Every sample bike, newest first (by the date it was added to the catalogue).',
  },
  'staff-picks': {
    eyebrow: 'Hand-picked by us',
    title: 'Staff picks',
    blurb: 'An editorial selection across the range — not a popularity ranking.',
  },
  budget: {
    eyebrow: 'Easy on the wallet',
    title: 'Budget picks',
    blurb: 'Our most affordable sample bikes, cheapest first.',
  },
  offers: {
    eyebrow: 'Genuine markdowns',
    title: 'On offer',
    blurb: 'Only real sample discounts — the crossed-out price is the variant’s own compareAt.',
  },
} as const;

export type CollectionSlug = keyof typeof COLLECTIONS;

export interface CollectionData {
  eyebrow: string;
  title: string;
  blurb: string;
  cards: CardProduct[];
}

export async function loadCollection(slug: CollectionSlug): Promise<CollectionData> {
  const { products } = await getProducts({});
  const cards = products.map(toCard); // newest-first
  const bySlug = new Map(cards.map((c) => [c.slug, c]));

  let list: CardProduct[];
  switch (slug) {
    case 'new-arrivals':
      list = cards;
      break;
    case 'staff-picks':
      list = FEATURED_SLUGS.map((s) => bySlug.get(s)).filter((c): c is CardProduct => Boolean(c));
      break;
    case 'budget':
      list = sortCards(cards, 'price-asc');
      break;
    case 'offers':
      list = cards.filter((c) => c.hasOffer);
      break;
  }
  return { ...COLLECTIONS[slug], cards: list };
}

export async function loadHomeData(): Promise<HomeData> {
  const { products, categories } = await getProducts({});
  const cards = products.map(toCard); // API order = newest-first

  const byCat = (cat: string) => cards.filter((c) => c.category.toLowerCase() === cat.toLowerCase());
  const bySlug = new Map(cards.map((c) => [c.slug, c]));

  return {
    categories,
    total: cards.length,
    tiles: catTiles(cards),
    newArrivals: cards.slice(0, 8),
    heroNew: cards[0] ?? null,
    featured: FEATURED_SLUGS.map((s) => bySlug.get(s)).filter((c): c is CardProduct => Boolean(c)),
    budget: sortCards(cards, 'price-asc').slice(0, 8),
    offers: cards.filter((c) => c.hasOffer),
    kids: byCat('Kids'),
    accessories: byCat('Accessories'),
  };
}
