import type { Metadata } from 'next';
import Link from 'next/link';
import { getProducts } from '@/lib/api';
import { toCard, sortCards, type SortKey, type CardProduct } from '@/lib/catalogue';
import { ProductCard } from '../components/ProductCard';
import { FilterBar } from '../components/FilterBar';

export const metadata: Metadata = {
  title: 'All bicycles — Raju Cycles',
  description: 'Browse the full range of sample bicycles and accessories from Raju Cycles, Kanpur.',
};

const SORTS: SortKey[] = ['newest', 'price-asc', 'price-desc', 'popular'];

// The catalogue. Server component: reads filters from the URL, fetches the
// matching products from the API, and renders them. Sort is applied here
// (newest comes from the API; price sort is derived) via lib/catalogue.
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawSort = typeof sp.sort === 'string' ? sp.sort : 'newest';
  const sort: SortKey = (SORTS as string[]).includes(rawSort) ? (rawSort as SortKey) : 'newest';

  let cards: CardProduct[] = [];
  let categories: string[] = [];
  let error = '';
  try {
    const { products, categories: cats } = await getProducts(sp);
    cards = sortCards(products.map(toCard), sort);
    categories = cats;
  } catch {
    error = 'Could not load the catalogue. Is the API running?';
  }

  return (
    <div className="rc-shop container">
      <header className="rc-shop-head">
        <span className="rc-eyebrow" style={{ ['--rc-accent' as string]: '#c0974a' }}>
          The catalogue
        </span>
        <h1 className="rc-shop-title">All bicycles</h1>
        <p className="rc-sec-blurb">
          Clearly-labelled sample data. Prices, stock and discounts shown are illustrative until the
          real catalogue is loaded.
        </p>
      </header>

      {!error && <FilterBar categories={categories} resultCount={cards.length} />}

      {error && <div className="notice error">{error}</div>}

      {!error && cards.length > 0 && (
        <div className="rc-grid">
          {cards.map((c) => (
            <div data-reveal key={c.slug}>
              <ProductCard card={c} />
            </div>
          ))}
        </div>
      )}

      {!error && cards.length === 0 && (
        <div className="empty">
          <span className="empty-mark">🔍</span>
          No cycles match these filters.{' '}
          <Link href="/shop">Clear them and start over</Link>.
        </div>
      )}
    </div>
  );
}
