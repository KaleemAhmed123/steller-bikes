import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COLLECTIONS, loadCollection, type CollectionSlug } from '@/lib/catalogue';
import { ProductCard } from '../../components/ProductCard';

type Params = { params: Promise<{ slug: string }> };

function isSlug(s: string): s is CollectionSlug {
  return s in COLLECTIONS;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlug(slug)) return { title: 'Not found — Stellar Bikes' };
  return { title: `${COLLECTIONS[slug].title} — Stellar Bikes`, description: COLLECTIONS[slug].blurb };
}

// A dedicated landing page for one curated collection (new-arrivals / staff-picks
// / budget / offers) — the rails that moved off the trimmed, 3D-forward homepage.
export default async function CollectionPage({ params }: Params) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();

  let data;
  let error = '';
  try {
    data = await loadCollection(slug);
  } catch {
    error = 'Could not load this collection. Is the API running?';
  }

  return (
    <div className="rc-shop container">
      <header className="rc-shop-head">
        <span className="rc-eyebrow" style={{ ['--rc-accent' as string]: '#c0974a' }}>
          {data?.eyebrow ?? 'Collection'}
        </span>
        <h1 className="rc-shop-title">{data?.title ?? COLLECTIONS[slug].title}</h1>
        <p className="rc-sec-blurb">{data?.blurb ?? COLLECTIONS[slug].blurb}</p>
        <p className="rc-collection-links">
          <Link href="/shop">All bicycles</Link> · <Link href="/">Home</Link>
        </p>
      </header>

      {error && <div className="notice error">{error}</div>}

      {!error && data && data.cards.length > 0 && (
        <div className="rc-grid">
          {data.cards.map((c) => (
            <div data-reveal key={c.slug}>
              <ProductCard card={c} />
            </div>
          ))}
        </div>
      )}

      {!error && data && data.cards.length === 0 && (
        <div className="empty">
          <span className="empty-mark">🛈</span>
          Nothing here right now. <Link href="/shop">Browse all bicycles →</Link>
        </div>
      )}
    </div>
  );
}
