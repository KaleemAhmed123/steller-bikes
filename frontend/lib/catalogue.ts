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
//   - Featured      → the product's real `featured` flag (an editorial pick).
//   - Popular       → real units sold (soldCount), from orders — shown only when > 0.

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
  featured: boolean; // editorial "Staff picks" flag (from the backend)
  soldCount: number; // real units sold (0 when none)
  offerTypes: string[]; // offer keys, e.g. ['diwali'] (empty when none)
}

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
    featured: p.featured ?? false,
    soldCount: p.soldCount ?? 0,
    offerTypes: p.offerTypes ?? [],
  };
}

export type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'popular';

export function sortCards(cards: CardProduct[], sort: SortKey): CardProduct[] {
  if (sort === 'price-asc') return [...cards].sort((a, b) => a.fromPrice - b.fromPrice);
  if (sort === 'price-desc') return [...cards].sort((a, b) => b.fromPrice - a.fromPrice);
  if (sort === 'popular') return [...cards].sort((a, b) => b.soldCount - a.soldCount);
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

// What the homepage needs: one tile per real category (the rest of the homepage
// is admin-driven content, see the Site content page).
export interface HomeData {
  tiles: CatTile[];
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
  popular: {
    eyebrow: 'Most ordered',
    title: 'Popular right now',
    blurb: 'Ranked by units actually ordered — real sales, not an editorial pick. Empty until orders exist.',
  },
} as const;

export type CollectionSlug = keyof typeof COLLECTIONS;

// Collections backed by a real server query get TRUE infinite scroll: the page
// seeds page 1 and appends more. The value is the query params to forward.
//   - new-arrivals → the API's default newest-first order.
//   - budget       → server-side price-asc sort (globally correct across pages).
export const INFINITE_COLLECTIONS = {
  'new-arrivals': {},
  budget: { sort: 'price-asc' },
} as const satisfies Partial<Record<CollectionSlug, Record<string, string>>>;

export type InfiniteCollectionSlug = keyof typeof INFINITE_COLLECTIONS;
export type DerivedCollectionSlug = Exclude<CollectionSlug, InfiniteCollectionSlug>;

export function isInfiniteCollection(slug: CollectionSlug): slug is InfiniteCollectionSlug {
  return slug in INFINITE_COLLECTIONS;
}

// The derived rails (staff-picks / offers / popular) can't be a server query — the
// backend has no featured/on-offer/sold filter — so we fetch one big page and derive
// client-side, as before. ponytail: caps these three at the first 100 products (the
// API's max page); add server-side filters if the catalogue ever outgrows that.
export async function loadDerivedCollection(slug: DerivedCollectionSlug): Promise<CardProduct[]> {
  const { products } = await getProducts({}, { limit: 100 });
  const cards = products.map(toCard); // newest-first
  switch (slug) {
    case 'staff-picks':
      return cards.filter((c) => c.featured);
    case 'offers':
      return cards.filter((c) => c.hasOffer);
    case 'popular':
      return sortCards(cards.filter((c) => c.soldCount > 0), 'popular');
  }
}

export async function loadHomeData(): Promise<HomeData> {
  // limit=100 (the API max) so the tiles derive from the whole small catalogue.
  // ponytail: a shop with >100 products needs a dedicated categories endpoint.
  const { products } = await getProducts({}, { limit: 100 });
  return { tiles: catTiles(products.map(toCard)) };
}
