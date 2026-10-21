'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { getProducts } from '@/lib/api';
import { toCard } from '@/lib/catalogue';
import { useInfiniteList } from '@/lib/useInfiniteList';
import type { PageMeta, Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { LoadMore } from '@/components/LoadMore';

// The catalogue grid as a client list seeded with the server's first page (so the
// first screen is still SSR'd for SEO). Appends more as you scroll / click Load more.
// `params` are the forwarded filter + sort query params; the parent keys this
// component by them, so changing a filter remounts it with a fresh page-1 seed.
export function ProductGrid({
  initialProducts,
  initialPagination,
  params,
}: {
  initialProducts: Product[];
  initialPagination: PageMeta;
  params: Record<string, string>;
}) {
  const fetchPage = useCallback(
    async (page: number) => {
      const r = await getProducts(params, { page });
      return { data: r.products, pagination: r.pagination };
    },
    [params],
  );

  const { items, loading, error, hasMore, total, loadMore } = useInfiniteList<Product>(fetchPage, {
    getId: (p) => p._id,
    initialData: initialProducts,
    initialPagination,
  });

  if (items.length === 0) {
    return (
      <div className="empty">
        <SearchX className="empty-mark" size={34} strokeWidth={1.5} aria-hidden />
        No cycles match these filters. <Link href="/shop">Clear them and start over</Link>.
      </div>
    );
  }

  return (
    <>
      <div className="rc-grid">
        {items.map((p) => {
          const card = toCard(p);
          return (
            <div data-reveal key={card.slug}>
              <ProductCard card={card} />
            </div>
          );
        })}
      </div>
      <LoadMore
        onLoadMore={loadMore}
        hasMore={hasMore}
        loading={loading}
        error={error}
        count={items.length}
        total={total}
        label="bikes"
      />
    </>
  );
}
