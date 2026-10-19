'use client';

import { useCallback, useState } from 'react';
import type { PageMeta } from './types';

// Simple infinite-list state over the backend's offset paging. No data-fetching
// library — plain fetch (passed in) + useState + useCallback.
//
// `fetchPage(page)` returns one page ({ data, pagination }); `loadMore()` fetches
// the NEXT page and APPENDS it (de-duped by id, so overlapping pages never show a
// row twice); `reset()` re-seeds from page 1 (used when a filter changes).

export type PageResult<T> = { data: T[]; pagination: PageMeta };
export type FetchPage<T> = (page: number) => Promise<PageResult<T>>;

interface Options<T> {
  getId: (item: T) => string;
  initialData?: T[];
  initialPagination?: PageMeta;
}

export function useInfiniteList<T>(fetchPage: FetchPage<T>, { getId, initialData, initialPagination }: Options<T>) {
  const [items, setItems] = useState<T[]>(initialData ?? []);
  const [pagination, setPagination] = useState<PageMeta | null>(initialPagination ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // hasMore is unknown until the first page lands; treat that as "try page 1".
  const hasMore = pagination ? pagination.hasMore : true;
  const total = pagination?.total ?? items.length;

  const append = useCallback(
    (incoming: T[]) =>
      setItems((cur) => {
        const seen = new Set(cur.map(getId));
        const merged = [...cur];
        for (const it of incoming) {
          const id = getId(it);
          if (!seen.has(id)) {
            seen.add(id);
            merged.push(it);
          }
        }
        return merged;
      }),
    [getId],
  );

  const loadMore = useCallback(async () => {
    if (loading || (pagination && !pagination.hasMore)) return;
    const nextPage = (pagination?.page ?? 0) + 1;
    setLoading(true);
    setError('');
    try {
      const res = await fetchPage(nextPage);
      append(res.data);
      setPagination(res.pagination);
    } catch (e) {
      // Keep the items already shown; the trigger offers a retry.
      setError(e instanceof Error ? e.message : 'Could not load more');
    } finally {
      setLoading(false);
    }
  }, [fetchPage, loading, pagination, append]);

  const reset = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPage(1);
      setItems(res.data);
      setPagination(res.pagination);
    } catch (e) {
      setItems([]);
      setPagination(null);
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  return { items, setItems, pagination, loading, error, hasMore, total, loadMore, reset };
}
