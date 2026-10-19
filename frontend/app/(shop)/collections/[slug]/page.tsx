import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  COLLECTIONS,
  INFINITE_COLLECTIONS,
  isInfiniteCollection,
  loadDerivedCollection,
  type CollectionSlug,
} from '@/lib/catalogue';
import { getProducts } from '@/lib/api';
import { ProductCard } from '../../components/ProductCard';
import { ProductGrid } from '../../components/ProductGrid';

type Params = { params: Promise<{ slug: string }> };

function isSlug(s: string): s is CollectionSlug {
  return s in COLLECTIONS;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlug(slug)) return { title: 'Not found — Stellar Bikes' };
  return { title: `${COLLECTIONS[slug].title} — Stellar Bikes`, description: COLLECTIONS[slug].blurb };
}

// A dedicated landing page for one curated collection.
//   - new-arrivals / budget → a real server query, so true infinite scroll (seed
//     page 1 server-side for SEO, then the client grid appends more).
//   - staff-picks / offers / popular → derived rails the backend can't query, so one
//     big page (limit=100) rendered server-side, no infinite scroll.
export default async function CollectionPage({ params }: Params) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();

  const meta = COLLECTIONS[slug];

  return (
    <div className="rc-shop container">
      <header className="rc-shop-head">
        <span className="rc-eyebrow" style={{ ['--rc-accent' as string]: '#c0974a' }}>
          {meta.eyebrow}
        </span>
        <h1 className="rc-shop-title">{meta.title}</h1>
        <p className="rc-sec-blurb">{meta.blurb}</p>
        <p className="rc-collection-links">
          <Link href="/shop">All bicycles</Link> · <Link href="/">Home</Link>
        </p>
      </header>

      {isInfiniteCollection(slug) ? (
        <InfiniteCollection slug={slug} />
      ) : (
        <DerivedCollection slug={slug} />
      )}
    </div>
  );
}

// new-arrivals / budget — seed page 1 server-side, hydrate the appending grid.
async function InfiniteCollection({ slug }: { slug: keyof typeof INFINITE_COLLECTIONS }) {
  const queryParams = { ...INFINITE_COLLECTIONS[slug] } as Record<string, string>;
  try {
    const page = await getProducts(queryParams, { page: 1 });
    return (
      <ProductGrid
        initialProducts={page.products}
        initialPagination={page.pagination}
        params={queryParams}
      />
    );
  } catch {
    return <div className="notice error">Could not load this collection. Is the API running?</div>;
  }
}

// staff-picks / offers / popular — derived from one big page, rendered server-side.
async function DerivedCollection({ slug }: { slug: 'staff-picks' | 'offers' | 'popular' }) {
  let cards;
  try {
    cards = await loadDerivedCollection(slug);
  } catch {
    return <div className="notice error">Could not load this collection. Is the API running?</div>;
  }

  if (cards.length === 0) {
    return (
      <div className="empty">
        <span className="empty-mark">🛈</span>
        Nothing here right now. <Link href="/shop">Browse all bicycles →</Link>
      </div>
    );
  }

  return (
    <div className="rc-grid">
      {cards.map((c) => (
        <div data-reveal key={c.slug}>
          <ProductCard card={c} />
        </div>
      ))}
    </div>
  );
}
