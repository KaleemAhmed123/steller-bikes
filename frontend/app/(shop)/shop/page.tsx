import type { Metadata } from 'next';
import { getProducts } from '@/lib/api';
import { FilterBar } from '../components/FilterBar';
import { ProductGrid } from '../components/ProductGrid';

export const metadata: Metadata = {
  title: 'All bicycles — Stellar Bikes',
  description: 'Browse the full range of sample bicycles and accessories from Stellar Bikes, Kanpur.',
};

// The query params we forward to the API (filters + sort). Sort now runs
// server-side so paging + infinite scroll stay globally correct.
const FORWARD = ['category', 'q', 'minPrice', 'maxPrice', 'sort'] as const;

// The catalogue. Server component: reads filters from the URL, fetches the FIRST
// page from the API (so the first screen is server-rendered for SEO), then hands it
// to a client grid that appends more on scroll / "Load more".
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // The forwarded params as plain strings — also the ProductGrid remount key, so a
  // filter/sort change re-seeds page 1 instead of appending onto the old list.
  const params: Record<string, string> = {};
  for (const key of FORWARD) {
    const v = sp[key];
    if (typeof v === 'string' && v) params[key] = v;
  }
  const gridKey = new URLSearchParams(params).toString();

  let page;
  let error = '';
  try {
    page = await getProducts(sp, { page: 1 });
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

      {error && <div className="notice error">{error}</div>}

      {!error && page && (
        <>
          <FilterBar categories={page.categories} resultCount={page.pagination.total} />
          <ProductGrid
            key={gridKey}
            initialProducts={page.products}
            initialPagination={page.pagination}
            params={params}
          />
        </>
      )}
    </div>
  );
}
