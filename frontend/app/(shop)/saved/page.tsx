'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProducts } from '@/lib/api';
import { toCard, type CardProduct } from '@/lib/catalogue';
import { useWishlist } from '../components/WishlistProvider';
import { ProductCard } from '../components/ProductCard';

// The wishlist page. Client-side: the saved slugs live in localStorage (no
// backend), so we load the catalogue once and keep the ones that are saved.
export default function SavedPage() {
  const { slugs, ready } = useWishlist();
  const [all, setAll] = useState<CardProduct[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getProducts({})
      .then(({ products }) => setAll(products.map(toCard)))
      .catch(() => setError('Could not load your saved cycles. Is the API running?'));
  }, []);

  const saved = all?.filter((c) => slugs.has(c.slug)) ?? [];
  const loading = !ready || (all === null && !error);

  return (
    <div className="rc-shop container">
      <header className="rc-shop-head">
        <span className="rc-eyebrow" style={{ ['--rc-accent' as string]: '#ff5633' }}>
          Your list
        </span>
        <h1 className="rc-shop-title">Saved cycles</h1>
        <p className="rc-sec-blurb">
          Saved on this device only (there’s no account sync yet). Clearing your browser data clears
          this list.
        </p>
      </header>

      {error && <div className="notice error">{error}</div>}
      {loading && !error && <div className="cart-status">Loading…</div>}

      {!loading && !error && saved.length > 0 && (
        <div className="rc-grid">
          {saved.map((c) => (
            <ProductCard card={c} key={c.slug} />
          ))}
        </div>
      )}

      {!loading && !error && saved.length === 0 && (
        <div className="empty">
          <span className="empty-mark">♡</span>
          Nothing saved yet. <Link href="/shop">Browse the catalogue</Link> and tap the heart on any
          cycle.
        </div>
      )}
    </div>
  );
}
